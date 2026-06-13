import { defineMiddleware } from 'astro:middleware';
import { createServerClient, parseCookieHeader } from '@supabase/ssr';

export const onRequest = defineMiddleware(async (context, next) => {
  // Only process HTML requests â€” skip API routes, assets, etc.
  const path = context.url.pathname;
  const needsSessionRefresh =
    path.startsWith('/dashboard') ||
    path.startsWith('/account') ||
    path.startsWith('/claim-free') ||
    path.startsWith('/sign-in') ||
    path.startsWith('/signin') ||
    path.startsWith('/free-resource-library');

  if (!needsSessionRefresh) {
    return next();
  }

  const accept = context.request.headers.get('accept') ?? '';
  if (!accept.includes('text/html')) {
    return next();
  }

  const supabase = createServerClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(context.request.headers.get('Cookie') ?? '');
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            context.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired â€” this sets new cookie headers automatically
  await supabase.auth.getUser();

  return next();
});
