import { defineMiddleware } from 'astro:middleware';
import { createServerClient, parseCookieHeader, type CookieOptions } from '@supabase/ssr';
import { SUPABASE_URL } from './lib/supabase-config';

export const onRequest = defineMiddleware(async (context, next) => {
  // Only process HTML requests — skip API routes, assets, etc.
  const path = context.url.pathname;
  const needsSessionRefresh =
    path.startsWith('/dashboard') ||
    path.startsWith('/account') ||
    path.startsWith('/claim-free') ||
    path.startsWith('/sign-in') ||
    path.startsWith('/signin') ||
    path.startsWith('/suggest-lesson') ||
    path.startsWith('/free-resource-library');

  if (!needsSessionRefresh) {
    return next();
  }

  const accept = context.request.headers.get('accept') ?? '';
  if (!accept.includes('text/html')) {
    return next();
  }

  const supabase = createServerClient(
    SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(context.request.headers.get('Cookie') ?? '');
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            context.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired — this sets new cookie headers automatically
  await supabase.auth.getUser();

  return next();
});
