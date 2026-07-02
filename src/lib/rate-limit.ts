// Fixed-window, in-memory rate limiter for Netlify Functions.
// Per-instance only: a cold start resets counts and concurrent instances
// don't share state, so limits are a floor rather than an exact guarantee.
// That is enough to stop naive scripted abuse (credit farming, form spam)
// without adding an external store.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

export function clientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

export function rateLimit(
  request: Request,
  route: string,
  limit: number,
  windowMs: number
): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  const now = Date.now();
  const key = `${route}:${clientIp(request)}`;
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) {
      for (const [k, b] of buckets) {
        if (b.resetAt <= now) buckets.delete(k);
      }
      if (buckets.size >= MAX_BUCKETS) buckets.clear();
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { allowed: true };
}

export function tooManyRequests(retryAfterSeconds: number): Response {
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please wait a moment and try again.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSeconds),
      },
    }
  );
}
