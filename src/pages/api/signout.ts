import type { APIRoute } from 'astro';
import { createSupabaseApiClient } from '../../lib/supabase-server';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  // CSRF guard: signout is a state change triggered by a same-origin form, so
  // reject cross-site POSTs. The Origin header is attached by browsers to all
  // form POSTs; if present it must match the request host (CWE-352).
  const origin = request.headers.get('origin');
  if (origin) {
    const host = request.headers.get('host');
    let originHost = '';
    try { originHost = new URL(origin).host; } catch { /* malformed */ }
    if (!host || originHost !== host) {
      return new Response('Cross-origin request rejected', { status: 403 });
    }
  }

  const { client, responseHeaders } = createSupabaseApiClient(request);
  await client.auth.signOut();

  // Clear all Supabase auth cookies by setting them expired
  const cookieHeader = request.headers.get('Cookie') ?? '';
  const cookies = cookieHeader.split(';').map(c => c.trim().split('=')[0]);
  for (const name of cookies) {
    if (name.startsWith('sb-')) {
      responseHeaders.append(
        'Set-Cookie',
        `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`
      );
    }
  }

  responseHeaders.set('Location', '/');
  return new Response(null, { status: 302, headers: responseHeaders });
};
