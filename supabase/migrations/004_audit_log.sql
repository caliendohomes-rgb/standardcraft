-- Audit log for SOC 2 CC6.1 / CC7.2 — records all security-relevant events
CREATE TABLE IF NOT EXISTS audit_log (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_type      TEXT        NOT NULL,
  user_id         UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  resource_type   TEXT,
  resource_id     TEXT,
  ip_address      TEXT,
  user_agent      TEXT,
  metadata        JSONB
);

CREATE INDEX IF NOT EXISTS audit_log_user_id_idx    ON audit_log (user_id);
CREATE INDEX IF NOT EXISTS audit_log_event_type_idx ON audit_log (event_type);
CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON audit_log (created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Only the service-role key can write or read audit records.
-- Anon and authenticated roles have no access.
CREATE POLICY "service_role_only" ON audit_log
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Automatically purge entries older than 2 years (data retention: CC6.5 / A1.2).
-- Run this via a cron job or pg_cron if available on your Supabase plan.
-- Example pg_cron (run weekly):
-- SELECT cron.schedule('purge-audit-log', '0 3 * * 0',
--   $$DELETE FROM audit_log WHERE created_at < NOW() - INTERVAL '2 years'$$);
