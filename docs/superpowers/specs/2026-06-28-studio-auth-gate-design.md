# Web Studio sign-in gate — design

Date: 2026-06-28
Branch: `feat/studio-auth-gate` (off `develop`)

## Problem

The authoring Web Studio is wide open. Anyone can load `/` or `/studio`, edit
models, and drive the in-app agent without an account — the current funnel only
asks for sign-in at *save* time, and the agent rail is gated by an env var, not
by auth. We want creation to sit behind a sign-wall (and, later, a paywall),
while keeping read-only model *viewing* anonymous.

Two concrete gaps:

1. **No gate on the authoring Studio.** `/` and `/studio` render `<App/>` with no
   auth check. The user should hit the sign-in window immediately on entering.
2. **Sign-in is Google-only.** The only auth UI in the repo is the Google
   `SignInButton` (and the `SignInModal` that wraps it). No GitHub or email.

MCP-driven creation is explicitly out of scope: it authenticates in-tool via
OAuth / `KERNELCAD_API_TOKEN`, separate from the web Supabase session.

## Goals

- Entering the authoring Studio (`/`, `/studio`) requires a signed-in session;
  show the **existing auth window** immediately when there is none.
- The in-app agent (AgentRail + Generate) is hidden/disabled whenever there is
  no session, on every route.
- Anonymous visitors can still *view* shared/published models
  (`/p/$slug`, `/g/$genId`) — read-only, agent hidden.
- Reuse the existing `SignInModal` window; extend that same window with GitHub
  and email (magic-link) so it is no longer Google-only.
- MCP path is untouched.

## Non-goals (deferred)

- Paywall / plan-entitlement check on the agent. This change is **sign-in only**;
  once signed in the agent works (still IP/usage rate-limited server-side). The
  price-wall is a later change.
- Converting `/g/$genId`'s local edit affordances to strict read-only. Viewing
  stays anonymous and the agent is hidden there; locking down hand-editing of a
  generated artifact is out of scope for this pass.

## Approach

### 1. `StudioAuthGate` wrapper (the gate)

A new component `src/studio/StudioAuthGate.tsx` wrapping the authoring route
content. It reads the existing `useSession()` hook and branches:

- **`loading`** → neutral full-screen splash (Studio chrome background, no editor
  flash, no modal flicker).
- **no `session`** → render the existing `SignInModal` **forced open and
  non-dismissable** over a blurred, inert Studio backdrop. Non-dismissable means:
  no × button, Esc does nothing, backdrop click does nothing. The editor behind
  it is not interactive.
- **`session`** present → render children (`<App/>`) unchanged.

Wired into the two authoring routes only:

- `src/studio/routes/index.tsx` (`/`)
- `src/studio/routes/studio.tsx` (`/studio`)

Both currently render `<App/>` directly; they will render
`<StudioAuthGate><App/></StudioAuthGate>`.

This deliberately reuses the floating window rather than the `/me`-style
full-page redirect to `/signin`, matching the "reuse our auth window on entering
Web Studio" requirement. The full-page `/signin` route is kept as the OAuth
return-landing and for deep links.

#### `SignInModal` changes

`SignInModal` gains a `dismissable?: boolean` prop (default `true`, preserving
its current `/generate` usage). When `false`: hide the × button, drop the Esc
and backdrop-click handlers. The gate passes `dismissable={false}` with
Studio-specific copy:

- title: "Sign in to open kernelCAD Studio"
- description: "kernelCAD Studio is where you build and edit models. Sign in to
  continue." (drop the "5 free generations" sub-copy in the gate context — that
  line is generation-funnel specific and is passed via prop, not hard-coded.)

The "5 free generations" footer line becomes a prop (`footer?: ReactNode`) so the
gate can omit it while `/generate` keeps it.

### 2. Agent hidden when anonymous

Today agent visibility is `inAppAgentEnabled()` (env/host based; a parallel
branch is extracting this into `src/studio/agentAvailability.ts`). We add a
session requirement so the agent surface only appears for signed-in users:

- Introduce `useAgentAvailable()` (or extend the existing availability check)
  that returns `inAppAgentEnabled() && !!session`.
- Apply it where the agent surface mounts: `AgentRail` visibility and the
  `StudioGenerate` panel. On the authoring routes the gate already guarantees a
  session, so the visible effect is on `/g/$genId` and `/p/$slug`, where anon
  viewers now see the model without the agent rail / Generate box.

Because this composes `inAppAgentEnabled()` with the session, it is robust to the
parallel refactor moving that function into `agentAvailability.ts` — we depend on
the function's result, not its location.

### 3. Providers: extend the same window

Enable **GitHub** and **email magic-link** in Supabase Auth, then surface both in
the *existing* `SignInModal` alongside Google:

- Generalize `SignInButton` to take a `provider: 'google' | 'github'` prop
  (keeping Google as default and its brand mark), or add a sibling
  `OAuthButton`. GitHub uses `supabase.auth.signInWithOAuth({ provider:
  'github' })`.
- Add an email field + "Send magic link" action using
  `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } })`, with a
  "check your inbox" confirmation state inside the modal.
- Lay them out in the existing modal: Google + GitHub buttons, an "or" divider,
  then the email field. The full-page `/signin` route reuses the same buttons so
  the two surfaces stay in sync.

Supabase dashboard config (GitHub OAuth app credentials, email provider) is an
ops prerequisite tracked in the plan, not code.

## Components & data flow

```
/ , /studio  ──▶ StudioAuthGate ──useSession()──┐
                    │  loading → splash          │
                    │  no session → <SignInModal dismissable=false>
                    │  session → <App/>          │
                                                 ▼
/p/$slug, /g/$genId ──▶ (anonymous OK) ── agent surface gated by
                         useAgentAvailable() = inAppAgentEnabled() && session
```

Auth state everywhere comes from the single `useSession()` hook over the Supabase
client; no new global context is introduced.

## Testing

- **`StudioAuthGate`** (component test): loading → splash; no session → modal
  present and non-dismissable (× absent, Esc no-op); session → children render.
- **Agent availability** (unit): `useAgentAvailable`/helper returns false when
  `session` is null even if `inAppAgentEnabled()` is true; true when both hold.
- **Route smoke** (Playwright): anon visit to `/studio` shows the sign-in window
  and cannot reach the editor; anon visit to a `/p/$slug` renders the viewer with
  no agent rail.
- **Provider buttons**: render Google + GitHub + email field; magic-link submit
  calls `signInWithOtp` and shows the confirmation state (mock Supabase).

## Risks / notes

- This reverses the current "generate anonymously, sign in to save" funnel into
  "sign in to create." Intended product change, but it removes an anonymous
  top-of-funnel try — acceptable per the decision to sign-wall creation.
- A parallel session is editing agent-availability code in the main checkout;
  this work lands on its own worktree/branch and composes with that function by
  result. Reconcile at merge.
- Supabase provider enablement (GitHub app, email) must be live before the new
  buttons are useful; ship the code behind the existing window so Google keeps
  working regardless.
