# Earn From the Paid Tier: Turn On the Agent Paywall + Ship Text-to-3D Preview — Design

Date: 2026-06-30
Branches: server work off `kernelCAD-server` trunk `main`; web work off
`kernelCAD-web` trunk `develop`. Spec lives on `feat/paid-text-to-3d-preview`.

## Reality check (verified against `origin/main`, not memory)

**The agent paywall is already built and correct.** `POST /api/v1/generate`
(`kernelCAD-server/src/routes/generate.ts` on `origin/main`):

- `requireUser` → **401** for anonymous callers — no anonymous LLM spend
  (`generate.ts:57`).
- Signed-in callers metered via `checkAgentQuota(userId)`: free =
  `FREE_PLAN_MONTHLY_QUOTA` builds/mo, any paid tier = unlimited; over cap →
  **402 `quota_exceeded`** with `{ used, quota, resetAt }`, which the web client
  maps to the upgrade panel (`generate.ts:70`).
- The `$20` solo / `$100` team tiers shipped with it (commits `689944f`,
  `ad8bd9b`, branch `feat/paywall-agent-mode`).

**But the hosted agent is switched OFF.** PR #83 (`0ee90d2`, Jun 29) put the whole
route behind a kill-switch that defaults off:

```js
export function hostedAgentEnabled(): boolean {
  return process.env.ENABLE_IN_APP_AGENT === 'true';
}
// off → 503 { error: 'agent_disabled', message: 'Hosted generation is disabled. Use kernelCAD through MCP.' }
```

**And nobody can pay — but the Stripe *code* already exists.** `src/routes/billing.ts`
already has create-checkout + customer portal + a signature-verified idempotent
webhook, with a click-through guide at `docs/stripe-setup.md`. What's missing is
the prod **config**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and the two
price IDs (`STRIPE_PRICE_ID_STANDARD`=$20, `STRIPE_PRICE_ID_PRO`=$100). Until those
are set, a free user who hits the `402` upgrade panel can't actually convert. This
config gap — not a missing paywall and not missing checkout code — is the real
revenue blocker.

Earlier confusion came from a stale local branch (`chore/deploy-artifact-discipline`)
that forked before the paywall merged. Source of truth = `origin/main`.

## What this spec delivers

Three things, smallest-to-largest, all paid-only (**no free trials** — every
cost-bearing run lands against a plan):

- **Part A — Monetize what's already built.** Wire the Stripe checkout + webhook
  so the existing `402` upgrade panel actually converts `free → pro_active`, then
  flip `ENABLE_IN_APP_AGENT=true`. Deployable in stages; the agent goes live the
  moment paying is possible.
- **Part B — Text-to-3D preview (new paid feature).** Prompt → Tripo preview mesh
  → shown in Studio viewer, saved as a `PreviewAsset`. Authenticated + paid-gated,
  metered through the **same** `checkAgentQuota` meter, weighted (a preview costs
  more to serve than an agent run).
- **Stripe-later seam.** Everything gates on `users.sub_status` today; the Stripe
  pieces sit behind one flag so the user can supply hooks and flip it on without
  touching gating logic.

## Non-Goals (v1)

- ❌ Free trials of any kind. Paid-only.
- ❌ A true token-credit ledger — reuse the existing per-call meter, weighted.
- ❌ Spec extraction (stage 3) and KernelCAD parametric rebuild (stage 4). The
  "Rebuild as parametric CAD" button ships as a visible **stub**; stages 3–4 are
  a separate fast-follow spec.
- ❌ Self-hosted 3D inference; Meshy/Rodin in v1 (abstraction leaves room; ship
  Tripo first).

## Background: the meter (verified)

| Concern | Location (`origin/main`) | Behavior |
|---|---|---|
| Auth gate | `src/lib/auth.ts:15` `requireUser`, `:51` `optionalUser` | Bearer → Supabase `auth.getUser()` |
| Plan read | `src/lib/usersRepo.ts:16` `getUserBilling()` | `users.sub_status`: `free \| pro_active \| pro_canceled` |
| Quota decision | `checkAgentQuota(userId)` (called `generate.ts:60`) | free over cap → `{ allowed:false, used, quota, resetAt }`; paid → unlimited |
| Monthly count | `src/lib/usageRepo.ts:11` `countDoneGenerationsThisMonth()` | counts `generations` rows since UTC month start |
| Free quota value | `src/lib/usageRepo.ts:72` `getFreePlanMonthlyQuota()` | default 5, env-overridable |
| Hosted-agent kill-switch | `generate.ts:262` `hostedAgentEnabled()` | `ENABLE_IN_APP_AGENT === 'true'`, default off → 503 |
| Outbound inference | `src/lib/llmClient.ts:6` `getLLM()` | OpenAI-compatible, `LLM_API_KEY`/`LLM_BASE_URL` (DeepInfra) |

## Part A — Monetize what exists

### A1. Configure Stripe (code already exists — do NOT rebuild billing.ts)
- `billing.ts` already implements create-checkout, customer portal, and the
  signature-verified idempotent webhook that sets `users.sub_status = pro_active`
  on `checkout.session.completed` (and clears it on cancel/expire). The read path
  (`getUserBilling`) already consumes `sub_status`. So gating needs **zero** new
  code.
- The work is **prod config** per `docs/stripe-setup.md`: create the two Products
  ($20/$100), set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `STRIPE_PRICE_ID_STANDARD`, `STRIPE_PRICE_ID_PRO`, point the webhook at
  `https://api.kernelcad.com/api/v1/billing/webhook`, enable the Customer Portal.
  The user supplies these keys.
- Implementation task here = **verify** the existing flow end-to-end with Stripe
  test mode (card 4242…) and confirm the upgrade panel reaches the real checkout;
  fix any drift. No greenfield build.

### A2. Turn the agent on
- Set `ENABLE_IN_APP_AGENT=true` in prod **once A1 converts** (so a `402` leads
  somewhere real). Until then the agent stays behind the kill-switch — by design.
  Order matters: agent-on before checkout-works = free users hit a dead upgrade
  button.

### A3. Web upgrade panel
- `RateLimitedPanel` already distinguishes anon vs authed and handles the `402`
  upgrade case. Confirm it targets the A1 checkout endpoint and renders the
  waitlist state when `BILLING_CHECKOUT_ENABLED=false`.

## Part B — Text-to-3D preview

### Shared weighted meter
- `generations` gets a `weight int NOT NULL DEFAULT 1` column (+ `cost_usd` if
  absent). `countDoneGenerationsThisMonth` changes from `COUNT(*)` to `SUM(weight)`.
  Existing rows backfill to weight 1, so agent accounting is unchanged.
- A preview row carries `weight = TEXT_TO_3D_PREVIEW_WEIGHT` (default 2). The same
  `checkAgentQuota` path is reused with an optional `weight` arg so previews and
  agent runs draw from one monthly allowance (the "shared pool").

### Server
- `src/lib/text3dProvider.ts` — thin `Text3dProvider` interface; `tripoClient.ts`
  implements it (env `TRIPO_API_KEY`, `TRIPO_BASE_URL`). Submit text-to-model job,
  poll to completion, return GLB URL + provider `cost_usd`. `TEXT_3D_PROVIDER` env
  selects the impl so Meshy/Rodin slot in later.
- `POST /api/v1/preview/text-to-3d` (`src/routes/preview.ts`):
  1. `requireUser` — **authenticated only** (paid feature, no anon).
  2. `checkAgentQuota(userId, { weight: TEXT_TO_3D_PREVIEW_WEIGHT })`; over cap →
     `402 quota_exceeded`.
  3. Provider key absent → `503 feature_unavailable` (route hidden in UI via a
     capability flag).
  4. Submit + SSE-stream progress (reuse `generate.ts` SSE pattern; preview
     latency < 45s; if it risks the request timeout, fall back to `jobId` +
     `GET /api/v1/preview/:id` poll).
  5. On success: persist `PreviewAsset` (reuse render/asset storage), write a
     `generations` row (`model='tripo-preview'`, `weight`, `cost_usd`, prompt),
     return the asset ref. **No row on failure** — failed previews are not charged.

### Web
- `useTextTo3dPreview()` hook (mirrors `useGeneration`) — POST + SSE.
- Studio surface: "Generate concept (preview)" alongside the agent. Paid-gated —
  free users see it with the upgrade CTA (no trial); pro users use it.
- Viewer renders the returned GLB. A **"Rebuild as parametric CAD"** button is
  visible but **stubbed** (records intent / "coming soon"), seating the UX seam
  for stages 3–4.

## Config / data changes

- Migration: `ALTER TABLE generations ADD COLUMN weight int NOT NULL DEFAULT 1;`
  (+ `cost_usd` if absent); `countDoneGenerationsThisMonth` → `SUM(weight)`.
- Server env: `ENABLE_IN_APP_AGENT`, `BILLING_CHECKOUT_ENABLED`, `TRIPO_API_KEY`,
  `TRIPO_BASE_URL`, `TEXT_3D_PROVIDER=tripo`, `TEXT_TO_3D_PREVIEW_WEIGHT=2`,
  Stripe price IDs + webhook secret (supplied later).

## Error handling

- Over quota → `402 quota_exceeded` + `resetAt` → upgrade CTA.
- Provider failure/timeout → SSE `error`, **no** `generations` row, retryable.
- Missing provider key in prod → `503 feature_unavailable`, feature hidden.
- Checkout disabled → waitlist state, never a dead button or 500.

## Testing

- `checkAgentQuota` weighting: free under/at/over cap with weight 1 and 2; pro
  unlimited; month-boundary reset.
- `generate.ts`: anon → 401; authed under cap → runs; over cap → 402; agent
  disabled → 503.
- `preview.ts`: anon → 401; metered with weight; no row on provider failure; happy
  path persists asset + row; missing key → 503.
- `tripoClient`: submit/poll/parse against a mocked provider; cost extraction.
- Stripe: webhook sets `sub_status=pro_active`; `BILLING_CHECKOUT_ENABLED=false`
  → waitlist response.
- Web: `useTextTo3dPreview` SSE parsing; gate states (free CTA / pro enabled /
  over-quota); stubbed rebuild button renders.

## Rollout

1. Migration (`weight`, backward-compatible) + `SUM(weight)`.
2. Part B server+web behind a capability flag gated on `TRIPO_API_KEY` presence —
   ships dark.
3. Part A1 Stripe wiring lands behind `BILLING_CHECKOUT_ENABLED=false` (waitlist).
4. When Stripe hooks arrive: set price IDs + webhook secret, flip
   `BILLING_CHECKOUT_ENABLED=true`, then `ENABLE_IN_APP_AGENT=true`, then enable
   the text-to-3D capability flag. Revenue path live.

## Open questions for implementation phase

- `PreviewAsset` storage: reuse render/asset bucket vs new bucket.
- Whether to keep the agent off until Stripe converts (recommended) or run a brief
  paid-only-but-uncheckoutable window (not recommended — dead upgrade button).
- Confirm `checkAgentQuota`'s current signature to add the optional `weight` arg
  without breaking the agent call site.
