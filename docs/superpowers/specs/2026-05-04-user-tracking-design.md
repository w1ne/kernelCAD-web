# User Tracking — Design Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:writing-plans` to convert this spec into a task-by-task plan, then `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to execute it.

**Goal:** Stand up the smallest privacy-respecting pipeline that tells us who visits `kernelcad.com`, who downloads the project, and who opts into a release-notes email list — using the existing Cloudflare Pages stack with one new vendor (Resend) for email storage. No analytics on user code, no telemetry phoning home from the CLI, no third-party JS embedded in the kernel.

**Architecture:** Three independent signals, each captured at the outer perimeter. (1) **Cloudflare Web Analytics** — drop-in beacon snippet on `site/index.html`, captures pageviews + uniques without cookies; dashboard inside the existing Cloudflare account. (2) **Email opt-in form** on `kernelcad.com` posts to a Pages Function (`site/functions/api/subscribe.ts`) that forwards to **Resend Audiences API**; emails live in Resend's dashboard, no DB to maintain. (3) **Daily-cron dashboard** — GitHub Action runs `gh api .../traffic/clones`, `.../traffic/views`, plus `npm view kernelcad downloads` once published, appends a row to a checked-in markdown table at `docs/usage/daily.md`. No DB, no third-party analytics service, no cookies.

**Tech Stack:** Cloudflare Web Analytics (free tier, drop-in snippet); Cloudflare Pages Functions (existing — site already deploys there); Resend Audiences API (free up to 1k contacts; dashboard + dedup + later campaign sends); GitHub Actions (existing) for the daily cron. No new local tooling beyond editing `site/`. No `wrangler` install required for the form path; the Pages Function is just a TypeScript file in `site/functions/` that Cloudflare's Pages build picks up automatically.

---

## Why this iteration

You've shipped four PRs today (website, memorable-builds-policy, v0.2-finish, CI parallelization) and have a published `v0.2.1` release. Repo state: **1 star, 0 forks, 6535 GitHub clones from 515 unique cloners over the last 14 days, 0 GitHub Pages views (site is on `kernelcad.com` not `*.github.io`), 0 npm downloads (package not yet published)**.

The 515 unique cloners is the most provocative datum. It's a mix of CI runs and real humans. Without instrumentation we can't tell which is which, and we can't reach the humans. Build-in-public Day 2+ depends on having something concrete to point at — *"100 sign-ups this week"* is a real story; *"515 anonymous cloners"* is not.

This iteration captures the three signals at the only places they exist: **the marketing site (visitors), the GitHub repo (clones / stars), and a voluntary email opt-in (committed users)**.

## Scope (closed-set list)

**In:**

- **Cloudflare Web Analytics** snippet appended to `site/index.html` `<head>`. Single `<script defer>` tag from Cloudflare; tag becomes the beacon. Site token configured in Cloudflare dashboard (manual, one-time, by the user — captured in the implementation plan as a prereq).
- **Email opt-in form** on `kernelcad.com` landing page. Single email field + submit button + minimal copy: *"Get notified when major versions ship. ~1 email per release. No spam. Unsubscribe anytime."* Plus a small UTM-source tracking via `?ref=` query param (e.g., `kernelcad.com/?ref=hn` increments a hidden field).
- **`site/functions/api/subscribe.ts`** Cloudflare Pages Function — accepts `POST { email: string, source?: string }`, validates email shape, forwards to Resend Audiences API via `RESEND_API_KEY` (Cloudflare Pages environment variable; user adds via dashboard, not committed to repo). On success returns 204; on Resend error returns 502 with a generic message. Rate-limit via Cloudflare's built-in (no custom rate-limit logic needed for v1).
- **Resend Audience** — one shared audience for the kernelCAD release-notes list. Created once via Resend dashboard or API (one-time setup; documented in the plan).
- **`.github/workflows/usage-stats.yml`** — daily cron that pulls GitHub traffic + npm downloads (when published) and appends a row to `docs/usage/daily.md`. Markdown checked-in table, easy to scan and chart later. No external dashboard.
- **Privacy / opt-in copy** in `site/index.html` near the form: 1-2 sentences explaining what we collect and that we don't track on-page behavior beyond Cloudflare's anonymized beacon.

**Out:**

- **CLI telemetry** (`kernelcad evaluate` / `kernelcad mcp` phoning home) — explicitly deferred. Privacy-sensitive, requires consent flow, premature for the current scale.
- **Per-tool MCP usage stats** — same.
- **Any cookies, fingerprinting, or third-party JS in the kernel itself** — out.
- **Newsletter campaigns / drip emails** — out. The form captures emails to Resend; sending the actual emails happens via the Resend dashboard manually whenever the user wants to ship a release-notes email. No automation in this iteration.
- **D1 / sqlite / any custom DB** — out. Resend's audience IS the storage.
- **Identity verification** (double opt-in / confirm email link) — out for v1; can add later via Resend's built-in confirmation flow.
- **Dashboard UI** — out. Cloudflare Web Analytics dashboard + Resend dashboard + the markdown report cover the surfaces. No bespoke admin page in this iteration.
- **Stargazer-list pulling** (which specific GitHub users starred us) — out. Counts only. The "who starred you" list is available manually via GitHub UI; not worth automating until there are >50 stars.

## Architecture decisions

### A1 — Cloudflare Web Analytics, not Plausible / Umami / Fathom

Cloudflare's Web Analytics is free, privacy-respecting (no cookies, no IP storage, no consent banner needed in EU), and lives inside the same dashboard the site already deploys to. Plausible / Umami / Fathom would each add $9-14/mo and a separate vendor for marginal feature gain (better dashboards, but the metrics that matter — pageviews / uniques / referrer / country — are all in Cloudflare's view).

Cost of switching later if the dashboard limits us: replace one `<script>` tag.

### A2 — Resend Audiences, not D1 / sqlite / self-host

D1 + a custom admin endpoint adds: schema migration, wrangler config, a UI to view + export emails, an unsubscribe handler, and email-sending plumbing. Resend gives you all of that for free up to 1k contacts. The form's POST handler becomes a single `fetch('https://api.resend.com/audiences/...').` call. Dedup, unsubscribe links, and the campaign-send pathway are Resend's problem.

Trade-off: vendor lock-in on the contact list. Mitigation: Resend has a CSV export. If we ever need to migrate, dump to CSV, import into the next thing. Until you have >1k contacts, the lock-in is invisible.

### A3 — `RESEND_API_KEY` is a Cloudflare Pages env var, not a GitHub secret

The Pages Function reads `RESEND_API_KEY` from its runtime environment at request time. Cloudflare Pages has a per-project env-vars panel in the dashboard. The user adds the key there once; it's never in the repo, never in GitHub Actions logs, never sent to a build runner.

The existing `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_API_TOKEN` GitHub secrets stay scoped to the deploy job; they don't need access to Resend.

### A4 — Form is no-JS-fallback friendly

The form is a plain `<form action="/api/subscribe" method="POST">` — works without JavaScript. The Pages Function returns a 303 redirect to a `/thanks` route on success, or back to the form with `?error=invalid_email` on failure. Progressive enhancement: a tiny JS handler can intercept the submit for an inline confirmation, but the no-JS path is the source of truth.

This matters because: (a) some agent-on-the-internet visitors run JS-disabled scrapers, (b) JS-required forms have measurably worse conversion in privacy-conscious audiences, (c) it's simpler — fewer moving parts.

### A5 — Daily-cron stats land in a checked-in markdown file, not a database

`docs/usage/daily.md` is a literal markdown table. Each cron run appends a row: `2026-05-04 | clones=46 (uniques=8) | views=12 (uniques=4) | stars=1 | npm_dl=0 | ...`. Pros: zero infra, easy to read, easy to chart later (just read the markdown), version-controlled (history is git history). Cons: doesn't scale past ~1000 rows (3 years of daily data). For a 1-star project this is the right tool; we're not building Datadog.

### A6 — Source attribution via `?ref=` URL params, not third-party tracking

External marketing channels (X posts, LinkedIn, HN comments) link to `kernelcad.com/?ref=x`, `?ref=linkedin`, `?ref=hn`. The form reads `URLSearchParams` and includes the `ref` value as a Resend contact-attribute. No third-party pixel, no cross-site tracking — just a self-described referrer that we control.

### A7 — Privacy copy is honest, short, and physically near the form

Below the email field, in small text:
> *"We use Cloudflare Web Analytics for visitor counts (no cookies, no IP storage). The email above goes to Resend; we'll only email you when a major version ships. You can unsubscribe at any time."*

No legal-ese. No checkbox. No GDPR consent banner needed because Cloudflare Web Analytics doesn't use cookies and the email opt-in is explicitly user-initiated.

## Data flow

**Visitor analytics:**
```
visitor → kernelcad.com → Cloudflare beacon
                        → Cloudflare Web Analytics dashboard
```

**Email opt-in:**
```
visitor fills form
  → POST /api/subscribe (Pages Function)
  → POST https://api.resend.com/audiences/{ID}/contacts (Resend API)
  → 303 redirect to /thanks (or back with ?error=...)
                                   → Resend dashboard (storage, export, send)
```

**Daily stats cron:**
```
GitHub Action (1×/day)
  → gh api repos/.../traffic/clones, /views, /, npm registry
  → append row to docs/usage/daily.md
  → commit + push to develop (auto)
```

## Components

| Component | File / Location | Responsibility |
|---|---|---|
| CF Web Analytics snippet | `site/index.html` `<head>` | Anonymous beacon for pageviews/uniques. Token from Cloudflare dashboard. |
| Email form | `site/index.html` body | Single email field + submit; uses `<form action="/api/subscribe" method="POST">`. |
| Pages Function | `site/functions/api/subscribe.ts` | Validate email; forward to Resend Audiences API; redirect on success/failure. |
| Privacy copy | `site/index.html` (near form) | Plain-English disclosure. |
| Thanks page | `site/thanks.html` | Static "✓ Subscribed. We'll be in touch when v1 ships." |
| Daily-stats cron | `.github/workflows/usage-stats.yml` | 1×/day pull from GH + npm; append to markdown report; auto-commit. |
| Daily-stats report | `docs/usage/daily.md` | Append-only markdown table. |
| Cloudflare env | Cloudflare Pages dashboard (manual) | `RESEND_API_KEY` (added once by user). |
| Resend audience | Resend dashboard (manual) | Audience created once; ID hardcoded in Pages Function or env-var-injected. |

## Error handling

**Pages Function:**
- Invalid email shape → 303 redirect to `/?error=invalid_email`. Form re-renders with an inline error.
- Resend 4xx (invalid email per Resend's stricter validation) → same 303 with error.
- Resend 5xx / network error → 303 redirect with `?error=temporary` ("Something went wrong, please try again later"). Log the error to Cloudflare's standard log surface (no DB).
- Duplicate email (already subscribed) → 303 to `/thanks` (success). Resend dedups; we treat it as success.
- Rate-limit (Cloudflare's built-in for Pages Functions: 100k req/day on free tier) → very unlikely to hit; if hit, Cloudflare returns 429 itself, which the form HTML can handle gracefully ("we're getting a lot of signups right now, try again in a moment").

**Daily-stats cron:**
- GitHub API rate-limit → workflow fails loudly; user retries manually next day.
- npm-downloads endpoint 404 (package unpublished) → record `0` and continue.
- Markdown commit conflict (very rare) → workflow fails loudly; user resolves manually. Idempotent: re-running tomorrow is fine.

## Testing

- **Local form preview**: `npm run site:dev` (existing) renders the form. Manually click submit; in dev mode the function route returns a stub success.
- **Pages Function unit test**: `site/functions/api/subscribe.test.ts` (Vitest). Mock the Resend `fetch` call. Cases: valid email → 303 to /thanks, invalid email → 303 with error, Resend 5xx → 303 with temporary error, missing email → 303 with error.
- **Cron dry-run**: workflow has a `workflow_dispatch` trigger; manually run it to verify it can pull GH stats + append to markdown without error.
- **Privacy verification**: visit `kernelcad.com` with browser devtools; confirm no cookies set, no third-party JS loaded beyond Cloudflare's beacon.
- **End-to-end (manual smoke after deploy)**: visit production, fill form with a test email, verify the email lands in Resend's audience dashboard, verify redirect to `/thanks`.

## Anchor-property check

This iteration touches the marketing surface and a tiny serverless backend. No kernel API, no MCP surface, no AST, no diagnostic codes.

- **Agent-first** ✓ — agents (and humans) can subscribe with a no-JS form via a single POST.
- **MCP-native** ✓ (untouched) — no kernel-side telemetry; CLI / MCP server are unchanged.
- **AST-edit-primacy** ✓ (untouched).
- **Diagnostic-rigorous** ✓ (untouched).

## Risks

1. **Resend rate-limits or pricing change** — free tier is 1k contacts. If the project takes off and we hit 1k subs in a month, the next tier is ~$20/mo. Acceptable; we'd celebrate the milestone first.
2. **Cloudflare Web Analytics privacy claims** — Cloudflare's marketing says no cookies / no PII. If a future audit finds them collecting more than they advertise, switch to self-hosted Umami. Mitigation: keep the analytics snippet as a single line, easy to swap.
3. **Spam signups** — bots will hit `/api/subscribe`. Mitigation: Cloudflare's free Bot Management catches the worst; Resend dedups identical emails; if it gets bad, add a hCaptcha challenge later.
4. **Form abuse to send spam to others** — `/api/subscribe` only adds emails to *our* audience; we never email arbitrary recipients on a third party's behalf. Resend's terms forbid such use.
5. **GDPR / CCPA compliance** — Cloudflare Web Analytics is cookieless and stateless, no consent banner needed. Resend acts as a data processor; standard SCC apply. The privacy copy on the page covers what we collect. If we ever target EU users with a marketing campaign (vs release-notes), revisit.
6. **CLI users not captured** — the iteration deliberately doesn't track CLI usage. If you want CLI users in the funnel later, the natural next iteration is `kernelcad register --email` (already proposed in brainstorm history). Defer.

## Implementation tasks (handoff to writing-plans)

Plan should organize roughly into these task buckets:

1. **One-time Cloudflare setup** (user runs in dashboard, not code):
   - Enable Web Analytics on `kernelcad.com` site → copy snippet's site-token into the spec / a comment in `site/index.html`.
   - Add `RESEND_API_KEY` to Cloudflare Pages project env-vars.
2. **One-time Resend setup** (user runs in dashboard or via curl):
   - Create a Resend account on the project email.
   - Create an audience named "kernelCAD release notes". Capture the audience ID.
   - Generate an API key restricted to "send to audience" + "create contact" scopes.
3. **`site/index.html` edits**:
   - Add CF Web Analytics `<script>` to `<head>`.
   - Add the email form section + privacy copy.
4. **`site/thanks.html`** — minimal success page.
5. **`site/functions/api/subscribe.ts`** — Pages Function with validation + Resend POST + redirect logic.
6. **`site/functions/api/subscribe.test.ts`** — Vitest test for the Pages Function (mocked Resend).
7. **`.github/workflows/usage-stats.yml`** — daily cron pulling GH traffic + npm downloads + writing to `docs/usage/daily.md`.
8. **`docs/usage/daily.md`** — initial empty table + column headers.
9. **`CHANGELOG.md` `[Unreleased]`** — entry describing the new infrastructure.
10. **PR + auto-merge** — same flow as PR #66.

## What this milestone is NOT

- A CLI telemetry pipeline. CLI / MCP server are untouched.
- A user-facing "log in to kernelCAD" sign-up flow. There is no account system.
- A newsletter cadence. Emails are stored; sending happens manually via Resend's dashboard whenever the user decides to ship a release-notes email.
- A bespoke admin dashboard. Cloudflare's analytics dashboard, Resend's audience dashboard, and the checked-in markdown report cover the three surfaces.
- A way to email everyone who ever cloned the repo. We can only email people who explicitly subscribed.

---

**Next step:** invoke `superpowers:writing-plans` to convert this spec into a task-by-task implementation plan on the `feat/user-tracking` branch.
