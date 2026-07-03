/**
 * Normalized Supabase connection values.
 *
 * The Supabase JS client expects the *base* project URL
 * (https://<ref>.supabase.co) and appends its own /auth/v1, /rest/v1, and
 * /storage/v1 paths. If PUBLIC_SUPABASE_URL is misconfigured with a trailing
 * /rest/v1 (a common paste error from the API settings page), every auth and
 * storage call builds a broken URL. Strip it here so the app is resilient
 * regardless of how the env var is entered.
 */
function normalizeUrl(raw: string | undefined): string {
  if (!raw) return '';
  return raw
    .trim()
    .replace(/\/(rest|auth|storage|realtime)\/v1\/?$/i, '') // drop an appended API path
    .replace(/\/+$/, ''); // drop any trailing slash
}

export const SUPABASE_URL = normalizeUrl(import.meta.env.PUBLIC_SUPABASE_URL);

/**
 * True when the value in SUPABASE_SERVICE_ROLE_KEY is actually a service_role
 * JWT. A very common misconfiguration is pasting the anon key into this slot,
 * which silently strips every admin operation (createUser, RLS bypass) of its
 * privileges. We decode the role claim (no verification needed — we only read
 * a self-reported field to surface a clear diagnostic).
 */
export function serviceRoleKeyLooksValid(key: string | undefined): boolean {
  if (!key) return false;
  const parts = key.split('.');
  if (parts.length !== 3) return true; // not a JWT we can inspect — assume caller knows
  try {
    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    );
    return payload?.role === 'service_role';
  } catch {
    return true; // undecodable — don't block on a parse failure
  }
}
