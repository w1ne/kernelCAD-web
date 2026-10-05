-- site/migrations/0003_feedback_context.sql
--
-- Where a feedback submission came from: a JSON object with any of
-- { surface, slug, revision, url }. Sent by the ChatGPT viewer and the
-- /p/<slug> page (see site/functions/api/feedback.ts). NULL for the Studio's
-- plain form. Apply BEFORE deploying the function that writes it (the
-- function falls back to the old insert if the column is missing, but then
-- the context is dropped from D1; it still reaches the founder email).
--
--   npx wrangler d1 execute kernelcad-subscribers --remote \
--     --file=site/migrations/0003_feedback_context.sql

ALTER TABLE feedback ADD COLUMN context TEXT;
