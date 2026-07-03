import { createBrowserClient } from '@supabase/ssr';
import { SUPABASE_URL } from './supabase-config';

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY
  );
}

// Singleton for use in client-side scripts
let _client: ReturnType<typeof createSupabaseBrowserClient> | null = null;
export function getSupabaseBrowserClient() {
  if (!_client) _client = createSupabaseBrowserClient();
  return _client;
}
