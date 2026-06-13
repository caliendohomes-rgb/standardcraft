import type { APIRoute } from 'astro';
import { createSupabaseApiClient } from '../../lib/supabase-server';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
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
