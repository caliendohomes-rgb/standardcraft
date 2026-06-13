import type { APIRoute } from 'astro';
import { createSupabaseAdmin, createSupabaseApiClient } from '../../lib/supabase-server';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { client: anonClient } = createSupabaseApiClient(request);
    const { data: { user }, error: userError } = await anonClient.auth.getUser();

    if (userError || !user) {
      return json({ error: 'Authentication required.' }, 401);
    }

    const body = await request.json();
    const { resource_slug } = body;

    if (!resource_slug || typeof resource_slug !== 'string') {
      return json({ error: 'Resource slug is required.' }, 400);
    }

    const admin = createSupabaseAdmin();

    // Load resource
    const { data: resource, error: resourceError } = await admin
      .from('resources')
      .select('id, title, slug, file_path, credit_cost, status')
      .eq('slug', resource_slug)
      .eq('status', 'published')
      .single();

    if (resourceError || !resource) {
      return json({ error: 'Resource not found.' }, 404);
    }

    const creditCost = 1;

    // Check if already downloaded (allow re-download without credit cost)
    const { data: existingDownload } = await admin
      .from('downloads')
      .select('id')
      .eq('user_id', user.id)
      .eq('resource_slug', resource_slug)
      .maybeSingle();

    if (existingDownload) {
      // Re-download: generate signed URL without deducting credits
      const { data: signedUrlData, error: urlError } = await admin
        .storage
        .from('resources')
        .createSignedUrl(resource.file_path, 120); // 2-minute expiry

      if (urlError || !signedUrlData) {
        return json({ success: true, url: `/downloads/${resource.slug}.md`, redownload: true, fallback: true });
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

    // Atomic deduction via RPC function
    const { data: txResult, error: txError } = await admin.rpc('redeem_credit_for_download', {
      p_user_id: user.id,
      p_resource_id: resource.id,
      p_resource_slug: resource_slug,
      p_credit_cost: creditCost,
    });

    if (txError || !txResult?.success) {
      console.error('Transaction error:', txError, txResult);
      return json({ error: txResult?.error ?? 'Download transaction failed.', code: 'TX_FAILED' }, 500);
    }

    // Generate signed URL (2-minute expiry)
    const { data: signedUrlData, error: urlError } = await admin
      .storage
      .from('resources')
      .createSignedUrl(resource.file_path, 120);

    if (urlError || !signedUrlData) {
      // Transaction committed but URL failed — log but don't re-deduct
      console.error('Signed URL error:', urlError);
      return json({
        success: true,
        url: `/downloads/${resource.slug}.md`,
        title: resource.title,
        fallback: true,
      });
    }

    return json({
      success: true,
      url: signedUrlData.signedUrl,
      title: resource.title,
      redownload: txResult?.redownload === true,
    });

  } catch (err: any) {
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
