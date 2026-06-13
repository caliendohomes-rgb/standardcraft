import { defineMiddleware } from 'astro:middleware';
import { createServerClient, parseCookieHeader } from '@supabase/ssr';

export const onRequest = defineMiddleware(async (context, next) => {
  // Only process HTML requests — skip API routes, assets, etc.
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

  // Refresh session if expired — this sets new cookie headers automatically
  await supabase.auth.getUser();

  return next();
});
