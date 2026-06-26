import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';

/** Server client for Astro pages — reads/writes cookies via Astro.cookies */
export function createSupabaseServerClient(
  request: Request,
  cookies: AstroCookies
) {
  return createServerClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(request.headers.get('Cookie') ?? '');
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookies.set(name, value, options)
          );
        },
      },
    }
  );
}

/** Admin client — never expose to client. Service role bypasses RLS. */
export function createSupabaseAdmin() {
  return createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/** Server client for Netlify Function / API Route — uses raw Request headers */
export function createSupabaseApiClient(request: Request) {
  const responseHeaders = new Headers();
  const client = createServerClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(request.headers.get('Cookie') ?? '');
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const cookieStr = `${name}=${value}; Path=${options?.path ?? '/'}; HttpOnly; SameSite=Lax${options?.secure ? '; Secure' : ''}${options?.maxAge ? `; Max-Age=${options.maxAge}` : ''}`;
            responseHeaders.append('Set-Cookie', cookieStr);
          });
        },
      },
    }
  );
  return { client, responseHeaders };
}
