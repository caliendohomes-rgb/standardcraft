import type { APIRoute } from 'astro';
import { createSupabaseAdmin, createSupabaseApiClient } from '../../lib/supabase-server';
import { requireJson, requireString, ValidationError, validationResponse } from '../../lib/validate';
import { logAudit } from '../../lib/audit';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    requireJson(request);
    const { client: anonClient } = createSupabaseApiClient(request);
    const { data: { user }, error: userError } = await anonClient.auth.getUser();

    if (userError || !user) {
      return json({ error: 'Authentication required.' }, 401);
    }

    const body = await request.json();
    const resource_slug = requireString(body.resource_slug, 'Resource slug', 200);

    const admin = createSupabaseAdmin();

    // Try to load resource from DB (optional — table may not be seeded yet)
    const { data: resource } = await admin
      .from('resources')
      .select('id, title, slug, file_path, credit_cost, status')
      .eq('slug', resource_slug)
      .eq('status', 'published')
      .maybeSingle();

    // Enforce slug format as a defence-in-depth path traversal guard
    if (!/^[a-z0-9-]+$/.test(resource_slug)) {
      return json({ error: 'Resource not found.' }, 404);
    }

    const creditCost = resource?.credit_cost ?? 1;

    // Check if already downloaded (allow re-download without credit cost)
    const { data: existingDownload } = await admin
      .from('downloads')
      .select('id')
      .eq('user_id', user.id)
      .eq('resource_slug', resource_slug)
      .maybeSingle();

    if (existingDownload) {
      await logAudit('download.redownload', { userId: user.id, resourceId: resource_slug, request });
      // Re-download: generate signed URL without deducting credits
      if (!resource?.file_path) {
        return json({ success: true, url: `/downloads/${resource_slug}.md`, redownload: true, fallback: true });
      }
      const { data: signedUrlData, error: urlError } = await admin
        .storage
        .from('resources')
        .createSignedUrl(resource.file_path, 120); // 2-minute expiry

      if (urlError || !signedUrlData) {
        return json({ success: true, url: `/downloads/${resource_slug}.md`, redownload: true, fallback: true });
      }

      return json({ success: true, url: signedUrlData.signedUrl, redownload: true });
    }

    // Load credits
    const { data: credits } = await admin
      .from('credits')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    if (!credits || credits.balance < creditCost) {
      return json({
        error: 'Insufficient credits.',
        code: 'INSUFFICIENT_CREDITS',
        balance: credits?.balance ?? 0,
      }, 402);
    }

    // Atomic deduction via RPC function (resource_id is nullable)
    const { data: txResult, error: txError } = await admin.rpc('redeem_credit_for_download', {
      p_user_id: user.id,
      p_resource_id: resource?.id ?? null,
      p_resource_slug: resource_slug,
      p_credit_cost: creditCost,
    });

    if (txError || !txResult?.success) {
      console.error('Transaction error:', txError, txResult);
      return json({ error: txResult?.error ?? 'Download transaction failed.', code: 'TX_FAILED' }, 500);
    }

    // Generate signed URL (2-minute expiry) — only possible if resource has a file_path
    if (!resource?.file_path) {
      return json({
        success: true,
        url: `/downloads/${resource_slug}.md`,
        title: resource?.title ?? resource_slug,
        fallback: true,
      });
    }

    const { data: signedUrlData, error: urlError } = await admin
      .storage
      .from('resources')
      .createSignedUrl(resource.file_path, 120);

    if (urlError || !signedUrlData) {
      console.error('Signed URL error:', urlError);
      return json({
        success: true,
        url: `/downloads/${resource_slug}.md`,
        title: resource.title,
        fallback: true,
      });
    }

    await logAudit('download.success', { userId: user.id, resourceId: resource_slug, request });
    return json({
      success: true,
      url: signedUrlData.signedUrl,
      title: resource.title,
      redownload: txResult?.redownload === true,
    });

  } catch (err: any) {
    if (err instanceof ValidationError) return validationResponse(err);
    console.error('Download API error:', err);
    return json({ error: 'Download failed. Please try again.' }, 500);
  }
};

function json(data: object, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
