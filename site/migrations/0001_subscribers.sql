-- site/migrations/0001_subscribers.sql
--
-- Initial schema for the kernelcad-subscribers D1 database.
-- Applied once via `wrangler d1 execute kernelcad-subscribers --file=...`
-- by the one-time setup workflow (.github/workflows/setup-user-tracking.yml).

CREATE TABLE IF NOT EXISTS subscribers (
  email      TEXT PRIMARY KEY,
  source     TEXT NOT NULL DEFAULT 'direct',
  ip_country TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subscribers_created_at
  ON subscribers (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscribers_source
  ON subscribers (source);
