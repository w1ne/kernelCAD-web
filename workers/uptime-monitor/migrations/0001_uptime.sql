-- workers/uptime-monitor/migrations/0001_uptime.sql
--
-- History and alert state of the prod uptime monitor (workers/uptime-monitor).
-- Lives in the kernelcad-subscribers D1 database next to the site tables; the
-- monitor reads and writes only the two uptime_* tables. No personal data:
-- check ids, timings, error text and /healthz pool numbers.
--
-- Apply once (idempotent):
--   npx wrangler d1 execute kernelcad-subscribers --remote \
--     --file=workers/uptime-monitor/migrations/0001_uptime.sql
--
-- Read:
--   npx wrangler d1 execute kernelcad-subscribers --remote \
--     --command "SELECT datetime(ts/1000,'unixepoch'), check_id, ok, latency_ms, error FROM uptime_results ORDER BY ts DESC LIMIT 40"

-- One row per check per run. ts is Unix milliseconds. detail is the healthz
-- pool JSON (commit, kills, respawns, rssMb, ...), NULL for other checks.
-- Rows older than 8 days are pruned by the Worker.
CREATE TABLE IF NOT EXISTS uptime_results (
  ts          INTEGER NOT NULL,
  check_id    TEXT    NOT NULL,
  ok          INTEGER NOT NULL,
  latency_ms  INTEGER NOT NULL,
  error       TEXT,
  detail      TEXT
);
CREATE INDEX IF NOT EXISTS uptime_results_ts ON uptime_results (ts);
CREATE INDEX IF NOT EXISTS uptime_results_check_ts ON uptime_results (check_id, ts);

-- Two JSON rows: key 'states' (alert state per check) and key 'meta' (last
-- commit, last good healthz, last deploy, last summary day).
CREATE TABLE IF NOT EXISTS uptime_state (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL
);
