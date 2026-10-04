-- site/migrations/0002_feedback.sql
--
-- In-app product feedback from the Studio (POST /api/feedback, see
-- site/functions/api/feedback.ts). Lives in the same kernelcad-subscribers D1
-- database (binding `DB`). This table is the source of truth for feedback.
--
-- Apply once (idempotent):
--   npx wrangler d1 execute kernelcad-subscribers --remote \
--     --file=site/migrations/0002_feedback.sql
--
-- Read:
--   npx wrangler d1 execute kernelcad-subscribers --remote \
--     --command "SELECT id, datetime(created_at,'unixepoch'), category, email, user_email, path, message FROM feedback ORDER BY id DESC LIMIT 50"

CREATE TABLE IF NOT EXISTS feedback (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at  INTEGER NOT NULL,
  category    TEXT    NOT NULL DEFAULT 'general',
  message     TEXT    NOT NULL,
  -- Reply address the user typed (optional).
  email       TEXT,
  -- Supabase user id / email as reported by the Studio client. Not verified
  -- server-side; treat as a hint, not an identity.
  user_id     TEXT,
  user_email  TEXT,
  path        TEXT,
  app_version TEXT,
  user_agent  TEXT,
  -- FNV-1a hash of the client IP. Used only for the per-IP rate limit.
  ip_hash     TEXT    NOT NULL,
  ip_country  TEXT
);

CREATE INDEX IF NOT EXISTS idx_feedback_created_at
  ON feedback (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_ip_hash_created_at
  ON feedback (ip_hash, created_at);

CREATE INDEX IF NOT EXISTS idx_feedback_user_id_created_at
  ON feedback (user_id, created_at);
