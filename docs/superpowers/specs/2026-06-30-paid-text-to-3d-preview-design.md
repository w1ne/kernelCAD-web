# Paid Tier: Built-in Agent Paywall + Text-to-3D Preview — Design

Date: 2026-06-30
Branch: `feat/paid-text-to-3d-preview` (off `develop`)
Repos: `kernelCAD-web` (frontend/Studio), `kernelCAD-server` (API/MCP)

## Summary

Two coupled deliverables, both gated by the **same** existing per-user monthly
plan meter:

- **Part A — close the agent paywall gap.** The in-Studio "build with agent"
  flow currently calls the **anonymous** `POST /api/v1/generate`
  (IP-rate-limited 5/hr only, no per-user quota). Make that endpoint enforce the
  per-user monthly quota for authenticated users (free = 5/mo, pro = unlimited),
  returning `402` over cap, while keeping a small anonymous IP allowance for the
  public marketing-funnel teaser only.

- **Part B — Text-to-3D preview (paid feature).** A new authenticated, paid-gated
  action: prompt → Tripo/Meshy preview mesh → shown in the Studio viewer and
  saved as a `PreviewAsset`. It draws from the **same** monthly counter as agent
  runs (shared pool), **weighted** because each preview costs more to serve
  (~$0.10–0.60 provider cost vs ~$0.01 of agent inference).

**Ship the paywall live now; Stripe later.** Gating reads the existing
`users.sub_status`. The free cap is enforced and the upgrade CTA is shown
immediately. The Stripe checkout + webhook that flips `free → pro_active` is
stubbed and wired when the API hooks are provided. Result: a real, deployable
paywall even before anyone can pay.

## Non-Goals (v1)

Per the scope decision (preview-only v1):

- ❌ Spec extraction (stage 3) — bounding box / openings / wall thickness from the
  preview. Button present but **stubbed**.
- ❌ KernelCAD parametric rebuild (stage 4) — CadQuery/feature-tree codegen +
  manufacturability checks. Fast-follow, separate spec.
- ❌ A true token-credit ledger. We reuse the existing **per-call** generation
  counter, not per-token accounting. (If a real ledger is wanted later, that is a
  separate, larger project.)
- ❌ Self-hosted 3D model inference (TRELLIS/Hunyuan/etc.). API providers only.
- ❌ Rodin/premium provider in v1 (abstraction leaves room; ship Tripo first).

## Background: how billing actually works today

Verified against the current tree (not memory):

| Concern | Location | Behavior |
|---|---|---|
| Anon teaser limit | `kernelCAD-server/src/routes/generate.ts:25` | `anonLimiter` = 5/IP/hour, returns `429` |
| In-Studio agent endpoint | web `src/studio/StudioGenerate.tsx` → `funnel/hooks/useGeneration.ts` → `funnel/lib/generateClient.ts` → `POST /api/v1/generate` | **anonymous** — header in `StudioGenerate.tsx:12` says "no sign-in wall" |
| Plan/tier read | `kernelCAD-server/src/lib/usersRepo.ts:16` `getUserBilling()` | `users.sub_status`: `free \| pro_active \| pro_canceled` |
| Monthly usage count | `src/lib/usageRepo.ts:11` `countDoneGenerationsThisMonth()` | counts `generations` rows since UTC month start |
| Free quota value | `src/lib/usageRepo.ts:72` `getFreePlanMonthlyQuota()` | default 5, env-overridable |
| Quota gate (MCP only) | `src/tools/billableExecution.ts:148` | free over quota → `quota_exceeded`; **only invoked from the MCP path (`mcp.ts`)**, NOT from `/api/v1/generate` |
| Auth helpers | `src/lib/auth.ts:15` `requireUser`, `:51` `optionalUser` | Bearer token → Supabase `auth.getUser()` |
| Outbound inference provider | `src/lib/llmClient.ts:6` `getLLM()` | OpenAI-compatible client, `LLM_API_KEY` / `LLM_BASE_URL` (DeepInfra) |

**The gap:** the per-user paywall exists but is only wired to the external MCP
surface. The in-app agent everyone actually uses on `app.kernelcad.com` is
anonymous. Part A fixes exactly this.

## Architecture

### Shared meter (the spine of both parts)

A single function decides "may this user run a billable action of weight N this
month?". It already exists in spirit inside `billableExecution.ts`; we extract a
reusable guard:

```
checkAndReserveQuota(userId, weight) -> { ok } | { ok:false, resetAt }
```

- Reads `getUserBilling(userId)`. `pro_active`/`pro_canceled` → unlimited → ok.
- Else `used = countDoneGenerationsThisMonth(userId)`; if
  `used + weight > getFreePlanMonthlyQuota()` → `{ ok:false, resetAt }`.
- "Reservation" is logical: the `generations` row written on success (with its
  `weight`) is what `countDoneGenerationsThisMonth` sums. A preview row carries
  `weight = TEXT_TO_3D_PREVIEW_WEIGHT` (default 2); agent rows weight 1.
  - Requires a `weight` column on `generations` (migration), and
    `countDoneGenerationsThisMonth` to `SUM(weight)` instead of `COUNT(*)`.
    Existing rows backfill to `weight = 1`.

### Part A — gate `/api/v1/generate`

`generate.ts` request handling becomes:

1. `const user = optionalUser(req)`.
2. **Anonymous** (no token): keep `anonLimiter` (IP 5/hr) — the public funnel
   teaser. Unchanged.
3. **Authenticated**: skip the IP limiter; call `checkAndReserveQuota(userId, 1)`.
   Over cap → respond `402` with `{ error: 'quota_exceeded', resetAt }` (SSE
   `error` event for the streaming path).
4. On a successful `done` generation, write the `generations` row with
   `userId` + `weight = 1` (so it counts). Anonymous runs are not metered per-user
   (only IP), matching today's funnel behavior.

Frontend: `useGeneration` / `RateLimitedPanel` already distinguish
authenticated vs anon and route to sign-in vs checkout. Extend the panel to
handle the `quota_exceeded` (`402`) phase → show the upgrade CTA (authenticated)
or sign-in (anon). Studio cost-bearing generation requires login (consistent
with the studio sign-in gate = cost protection).

### Part B — Text-to-3D preview

**Server:**
- New provider client `src/lib/tripoClient.ts` mirroring `llmClient.ts`:
  env `TRIPO_API_KEY`, `TRIPO_BASE_URL`. Submits a text-to-model job, polls to
  completion, returns a GLB URL + provider cost. Provider is selected behind a
  thin interface (`Text3dProvider`) so Meshy/Rodin can slot in later via
  `TEXT_3D_PROVIDER` env.
- New route `POST /api/v1/preview/text-to-3d` (`src/routes/preview.ts`):
  1. `requireUser(req)` — **authenticated only** (paid feature).
  2. `checkAndReserveQuota(userId, TEXT_TO_3D_PREVIEW_WEIGHT)`; over cap → `402`.
  3. Submit to the provider; SSE-stream progress (reuse the `generate.ts` SSE
     pattern). Job is expected < 45s (provider preview latency); if it risks the
     request timeout, fall back to a `jobId` + `GET /api/v1/preview/:id` poll.
  4. On success: persist a `PreviewAsset` (GLB stored in existing asset storage),
     write a `generations` row (`model = 'tripo-preview'`, `weight`, `cost_usd`,
     prompt), return the asset ref.

**Frontend:**
- `useTextTo3dPreview()` hook (mirrors `useGeneration`) — POST + SSE.
- Studio surface: a "Generate concept (preview)" entry alongside the agent.
  Paid-gated: free users see it disabled with the upgrade CTA; pro users use it.
- Viewer renders the returned GLB. A **"Rebuild as parametric CAD"** button is
  shown but **stubbed** in v1 (records intent / shows "coming soon"), establishing
  the UX seam for stage 3–4 later.

### Stripe-later seam

- Entitlement is read from `users.sub_status` only. Nothing in Parts A/B calls
  Stripe directly.
- The upgrade CTA targets the existing `billing.ts` checkout route; if Stripe
  keys are absent, that route returns a "coming soon" / waitlist response (no
  crash). A single env flag (`BILLING_CHECKOUT_ENABLED`) toggles real checkout vs
  placeholder.
- When the user provides Stripe hooks: wire the webhook that sets
  `sub_status = pro_active` (the read path already works), flip the flag. No
  changes to the gating logic.

## Data / config changes

- Migration: `ALTER TABLE generations ADD COLUMN weight int NOT NULL DEFAULT 1;`
  (+ `cost_usd` if not already present). Update `countDoneGenerationsThisMonth`
  to `SUM(weight)`.
- Env (server): `TRIPO_API_KEY`, `TRIPO_BASE_URL`, `TEXT_3D_PROVIDER=tripo`,
  `TEXT_TO_3D_PREVIEW_WEIGHT=2`, `BILLING_CHECKOUT_ENABLED=false`.

## Error handling

- Provider failure / timeout: SSE `error` event, **no** `generations` row written
  (user is not charged for a failed preview), surfaced as a retryable state.
- Over quota: `402 quota_exceeded` + `resetAt` → upgrade/sign-in CTA.
- Missing provider key in prod: route returns `503 feature_unavailable`, logged;
  feature hidden in UI via a capability flag.

## Testing

- `checkAndReserveQuota`: free under/at/over cap, weighting (1 preview = 2 units),
  pro unlimited, month-boundary reset.
- `generate.ts`: anon path still IP-limited; authed path meters + `402` over cap.
- `preview.ts`: requires auth (401 anon); meters with weight; no row on provider
  failure; happy path persists `PreviewAsset` + `generations` row.
- `tripoClient`: submit/poll/parse against a mocked provider; cost extraction.
- Frontend: `useTextTo3dPreview` SSE parsing; gate states (free disabled / pro
  enabled / over-quota CTA); stubbed rebuild button renders.

## Rollout

1. Migration + `SUM(weight)` (backward-compatible; existing rows weight 1).
2. Part A (agent paywall) behind no flag — it's a correctness fix; deploy to
   `develop` → app.kernelcad.com.
3. Part B behind a capability flag gated on `TRIPO_API_KEY` presence so it can
   ship dark, then be enabled once the provider key is set in prod env.
4. Stripe checkout stays placeholder until hooks arrive.

## Open questions for implementation phase

- Exact `PreviewAsset` storage (reuse render/asset storage vs new bucket).
- Whether the public funnel teaser should also require login eventually (out of
  scope here; keep anon for now).
- Free "taste" of previews (currently: none — paid-only). A 1–2 lifetime-trial
  toggle is trivial to add later via the same weight/counter.
