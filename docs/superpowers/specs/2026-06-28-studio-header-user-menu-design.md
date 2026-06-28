# Studio header user menu — design

Date: 2026-06-28
Status: approved (design), pending implementation plan

## Problem

The Studio editor (`/` route) shows no authentication state of any kind: no
sign-in control, no indication of who is signed in, no sign-out. Login does
exist (Google OAuth via Supabase) and it matters in the Studio for two reasons:

1. The **built-in agent rail** routes its backend calls to the hosted API with
   the user's Supabase JWT (`src/studio/api/apiBase.ts`). Without a session,
   the agent has no signed-in capability.
2. **Saving and sharing private projects** requires an account.

Today a user cannot tell from the editor whether they are signed in, cannot sign
in from the editor, and cannot sign out. Auth is only surfaced on the funnel
routes (`/generate`, `/g/$genId`, `/p/$slug`, `/me`). This was reported as the
confusing experience "there is no login anywhere; I don't even know if I'm
logged in."

## Goal

Add a single auth control to the Studio header that:

- shows whether the user is signed in,
- lets a signed-out user sign in with one click (Google OAuth), and
- lets a signed-in user see which account they are on and sign out.

## Non-goals

- No "My projects" / account-page link in the menu (deferred; `/me` already
  exists for that).
- No changes to the funnel routes or to how the agent authenticates.
- No changes to embed/viewer modes — the Studio `Header` only renders in the
  full shell, so those modes are unaffected.
- No new auth provider; reuse the existing Google OAuth flow.

## Components

### 1. `isAuthConfigured()` — `src/funnel/lib/supabaseClient.ts`

A new exported predicate that reports whether `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` are both present, **without throwing**.

Rationale: `getSupabase()` throws when the env vars are missing (plain local
dev). `useSession()` calls `getSupabase()` inside its effect, so a component that
unconditionally mounts `useSession` would crash on localhost. `isAuthConfigured()`
lets the menu opt out cleanly before any Supabase call.

```ts
export function isAuthConfigured(): boolean {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}
```

`getSupabase()` keeps its current throwing contract — unchanged.

### 2. `UserMenu` — `src/studio/components/Layout/UserMenu.tsx`

Two-layer component so React hook rules stay clean (no conditional hook calls):

- **`UserMenu` (outer):** if `!isAuthConfigured()` → return `null`. Otherwise
  render `<UserMenuInner />`. This guarantees `useSession()` is only ever called
  when Supabase is configured.
- **`UserMenuInner`:** calls `useSession()` and branches:
  - **loading** (`loading === true`): render `null` (avoids a sign-in →
    avatar flash on first paint).
  - **signed out** (`session === null`): render the existing `SignInButton`
    (`src/funnel/components/SignInButton.tsx`) in a compact header style, label
    "Sign in", `title="Sign in to use the agent and save projects"`. It already
    performs one-click Google OAuth with `redirectTo: window.location.href`, so
    the user returns to the same editor URL.
  - **signed in:** a round avatar button showing the first letter of
    `session.user.email` (uppercased). Clicking it toggles a dropdown anchored
    under the button containing:
    - the full email address, read-only, and
    - a **Sign out** item that calls `getSupabase().auth.signOut()`.
    The dropdown closes on outside click and on `Escape`.

Styling follows the existing dark header toolbar (`bg-[#222]`, `hover:bg-[#333]`,
`text-gray-300/400`, rounded). The avatar is a ~24px circle to fit the 40px-tall
header.

### 3. Wiring — `src/studio/components/Layout/Header.tsx`

Render `<UserMenu />` as the last item in the header's right-hand cluster, after
the STEP/STL export buttons and the computing spinner, preceded by a
`<div className="h-6 w-px bg-[#333] mx-2" />` divider to match the existing
section separators.

## Data flow

```
Header
  └─ UserMenu
       ├─ isAuthConfigured() ── false ─▶ null
       └─ UserMenuInner
            └─ useSession() ─▶ { session, loading }
                 ├─ loading       ─▶ null
                 ├─ no session    ─▶ SignInButton ─▶ supabase.auth.signInWithOAuth(google)
                 └─ session       ─▶ avatar ▸ dropdown(email, Sign out ─▶ supabase.auth.signOut())
```

`useSession` already subscribes to `onAuthStateChange`, so the menu updates
reactively after sign-in/sign-out without manual refresh.

## Error handling

- **Auth not configured (local dev):** menu renders nothing; no crash. This is
  the same "unsigned-in / local" posture the rest of Studio already assumes.
- **OAuth start failure:** handled inside the reused `SignInButton` (it alerts
  and re-enables the button).
- **Sign-out failure:** wrap `signOut()` in try/catch; on error, surface a
  lightweight alert and leave the menu in its signed-in state (the
  `onAuthStateChange` listener is the source of truth for the displayed state).

## Testing

`src/studio/components/Layout/UserMenu.test.tsx` (happy-dom), mocking
`../../../funnel/hooks/useSession` and `../../../funnel/lib/supabaseClient`:

1. **not configured** → `isAuthConfigured` returns false → component renders
   nothing.
2. **loading** → renders nothing.
3. **signed out** → renders a "Sign in" control.
4. **signed in** → renders the account email; clicking the avatar then
   "Sign out" calls `supabase.auth.signOut`.
5. **dropdown dismissal** → opening then pressing Escape (or clicking outside)
   closes the dropdown.

Existing `Header` rendering tests (if any) must continue to pass; the menu is
additive.

## Out-of-scope follow-ups (noted, not built)

- "My projects" link to `/me` in the dropdown.
- Signed-out affordance inside the agent rail itself ("Sign in to use the
  agent") — this spec only covers the header control.
