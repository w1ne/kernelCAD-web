# Web Studio Sign-In Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate the authoring Web Studio (`/`, `/studio`) behind a sign-in window, hide the in-app agent from anonymous users everywhere, and extend the existing sign-in window with GitHub + email — without touching the separate MCP OAuth path.

**Architecture:** A `StudioAuthGate` wraps the authoring routes and reuses the existing `SignInModal` (forced non-dismissable) when there is no Supabase session. Agent visibility gains a session requirement via a single derived `agentEnabled` flag in `StudioShell`. The `SignInModal`/`SignInButton` grow GitHub + email-magic-link beside Google. MCP auth (Bearer token / in-tool OAuth, server-side) is untouched and verified unchanged.

**Tech Stack:** React + TanStack Router, Supabase JS auth, Vite, Vitest + React Testing Library, Playwright.

## Global Constraints

- Auth state comes only from the existing `useSession()` hook (`src/funnel/hooks/useSession.ts`) — `{ session: Session | null; loading: boolean }`. No new auth context.
- Reuse the existing `SignInModal` window; do not create a new sign-in form.
- Agent gate is **sign-in only** — no plan/entitlement check in this change.
- Anonymous users may still view `/p/$slug` and `/g/$genId` (read-only, agent hidden).
- MCP path (`kernelCAD-server` mcpAuth, `KERNELCAD_API_TOKEN`, `/connect`) must not change behavior.
- Commit identity: `w1ne <14119286+w1ne@users.noreply.github.com>`. No AI/Claude references in commit messages.
- Existing `SignInModal` callers (`/generate`) must keep working unchanged — new props default to current behavior.

---

### Task 1: `SignInModal` gains `dismissable` + `footer` props

**Files:**
- Modify: `src/funnel/components/SignInModal.tsx`
- Test: `src/funnel/components/__tests__/SignInModal.test.tsx` (create)

**Interfaces:**
- Produces: `SignInModalProps` extended with `dismissable?: boolean` (default `true`) and `footer?: React.ReactNode` (default the existing "5 free generations" line). When `dismissable={false}`: no × button rendered, Esc handler not attached, backdrop click does not call `onClose`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/funnel/components/__tests__/SignInModal.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SignInModal } from '../SignInModal';

describe('SignInModal dismissable', () => {
  it('non-dismissable: no close button, Esc and backdrop do not close', () => {
    const onClose = vi.fn();
    render(<SignInModal open onClose={onClose} dismissable={false} />);
    expect(screen.queryByLabelText('Close')).toBeNull();
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('dismissable (default): close button present and Esc closes', () => {
    const onClose = vi.fn();
    render(<SignInModal open onClose={onClose} />);
    expect(screen.getByLabelText('Close')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/funnel/components/__tests__/SignInModal.test.tsx`
Expected: FAIL — `dismissable` not honored (close button still present / Esc still closes).

- [ ] **Step 3: Implement the props**

In `src/funnel/components/SignInModal.tsx`:
- Add to `SignInModalProps`:
```tsx
  /** When false, the modal cannot be dismissed (no ×, no Esc, no backdrop close). Default true. */
  dismissable?: boolean;
  /** Footer line under the buttons. Default: the 5-free-generations note. */
  footer?: React.ReactNode;
```
- Destructure with defaults: `dismissable = true,` and `footer,` in the component signature.
- Guard the Esc effect: `if (!open || !dismissable) return;` at the top of the keydown `useEffect`.
- Backdrop `onClick`: `onClick={dismissable ? onClose : undefined}`.
- Close button: wrap the existing `<button aria-label="Close">…</button>` in `{dismissable && ( … )}`.
- Replace the hard-coded footer `<p>` with `{footer ?? (<p className="mt-5 text-xs text-ink-faint font-mono tracking-wide">5 free generations · upgrade after to keep generating</p>)}`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/funnel/components/__tests__/SignInModal.test.tsx`
Expected: PASS (both cases).

- [ ] **Step 5: Commit**

```bash
git add src/funnel/components/SignInModal.tsx src/funnel/components/__tests__/SignInModal.test.tsx
git commit -m "feat(auth): SignInModal supports non-dismissable + custom footer"
```

---

### Task 2: `StudioAuthGate` component

**Files:**
- Create: `src/studio/StudioAuthGate.tsx`
- Test: `src/studio/__tests__/StudioAuthGate.test.tsx` (create)

**Interfaces:**
- Consumes: `useSession()` from `../funnel/hooks/useSession`; `SignInModal` from `../funnel/components/SignInModal` (with `dismissable={false}` from Task 1).
- Produces: `export function StudioAuthGate({ children }: { children: React.ReactNode }): JSX.Element` — renders a neutral splash while `loading`, the forced sign-in window while `!session`, and `children` once a session exists.

- [ ] **Step 1: Write the failing test**

```tsx
// src/studio/__tests__/StudioAuthGate.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StudioAuthGate } from '../StudioAuthGate';

const mockSession = vi.fn();
vi.mock('../../funnel/hooks/useSession', () => ({
  useSession: () => mockSession(),
}));

describe('StudioAuthGate', () => {
  it('shows splash while loading', () => {
    mockSession.mockReturnValue({ session: null, loading: true });
    render(<StudioAuthGate><div>EDITOR</div></StudioAuthGate>);
    expect(screen.queryByText('EDITOR')).toBeNull();
    expect(screen.getByTestId('studio-auth-splash')).toBeInTheDocument();
  });

  it('shows non-dismissable sign-in window when anonymous', () => {
    mockSession.mockReturnValue({ session: null, loading: false });
    render(<StudioAuthGate><div>EDITOR</div></StudioAuthGate>);
    expect(screen.queryByText('EDITOR')).toBeNull();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByLabelText('Close')).toBeNull();
  });

  it('renders children when signed in', () => {
    mockSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false });
    render(<StudioAuthGate><div>EDITOR</div></StudioAuthGate>);
    expect(screen.getByText('EDITOR')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/studio/__tests__/StudioAuthGate.test.tsx`
Expected: FAIL — `Cannot find module '../StudioAuthGate'`.

- [ ] **Step 3: Implement the component**

```tsx
// src/studio/StudioAuthGate.tsx
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import React from 'react';
import { useSession } from '../funnel/hooks/useSession';
import { SignInModal } from '../funnel/components/SignInModal';

/**
 * Gates the authoring Studio (`/`, `/studio`). Anonymous users get the existing
 * sign-in window, forced open, over an inert background — they cannot reach the
 * editor until a Supabase session exists. Read-only viewer routes (`/p`, `/g`)
 * are NOT wrapped in this gate.
 */
export function StudioAuthGate({ children }: { children: React.ReactNode }): JSX.Element {
  const { session, loading } = useSession();

  if (loading) {
    return (
      <div
        data-testid="studio-auth-splash"
        className="min-h-screen bg-vellum"
        aria-busy="true"
      />
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-vellum">
        <SignInModal
          open
          onClose={() => {}}
          dismissable={false}
          title="Sign in to open kernelCAD Studio"
          description="kernelCAD Studio is where you build and edit models. Sign in to continue."
          footer={null}
        />
      </div>
    );
  }

  return <>{children}</>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/studio/__tests__/StudioAuthGate.test.tsx`
Expected: PASS (all three).

- [ ] **Step 5: Commit**

```bash
git add src/studio/StudioAuthGate.tsx src/studio/__tests__/StudioAuthGate.test.tsx
git commit -m "feat(auth): add StudioAuthGate that gates the authoring Studio"
```

---

### Task 3: Wire the gate into `/` and `/studio` routes

**Files:**
- Modify: `src/studio/routes/index.tsx`
- Modify: `src/studio/routes/studio.tsx`
- Test: `src/studio/routes/__tests__/studioRouteGate.test.tsx` (create)

**Interfaces:**
- Consumes: `StudioAuthGate` (Task 2).

- [ ] **Step 1: Write the failing test**

```tsx
// src/studio/routes/__tests__/studioRouteGate.test.tsx
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// The route components are thin wrappers; assert they compose StudioAuthGate
// around <App/> rather than rendering <App/> bare.
const read = (p: string) =>
  readFileSync(fileURLToPath(new URL(p, import.meta.url)), 'utf8');

describe('authoring routes are gated', () => {
  it('index route wraps App in StudioAuthGate', () => {
    const src = read('../index.tsx');
    expect(src).toMatch(/StudioAuthGate/);
    expect(src).toMatch(/<StudioAuthGate>\s*<App\s*\/>\s*<\/StudioAuthGate>/);
  });
  it('studio route wraps App in StudioAuthGate', () => {
    const src = read('../studio.tsx');
    expect(src).toMatch(/StudioAuthGate/);
    expect(src).toMatch(/<StudioAuthGate>\s*<App\s*\/>\s*<\/StudioAuthGate>/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/studio/routes/__tests__/studioRouteGate.test.tsx`
Expected: FAIL — routes still render `<App />` bare.

- [ ] **Step 3: Wire the gate**

`src/studio/routes/index.tsx` — add import and wrap:
```tsx
import { StudioAuthGate } from '../StudioAuthGate';
// ...
function StudioHome() {
  return (
    <StudioAuthGate>
      <App />
    </StudioAuthGate>
  );
}
```

`src/studio/routes/studio.tsx` — same:
```tsx
import { StudioAuthGate } from '../StudioAuthGate';
// ...
function StudioRoute() {
  return (
    <StudioAuthGate>
      <App />
    </StudioAuthGate>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/studio/routes/__tests__/studioRouteGate.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/studio/routes/index.tsx src/studio/routes/studio.tsx src/studio/routes/__tests__/studioRouteGate.test.tsx
git commit -m "feat(auth): gate / and /studio behind StudioAuthGate"
```

---

### Task 4: Hide the agent for anonymous users (all routes)

**Files:**
- Modify: `src/studio/StudioShell.tsx` (around lines 41-44 derive flag; line 200 Toolbar prop; line 219 AgentRail render)
- Test: `src/studio/__tests__/agentSessionGate.test.tsx` (create)

**Interfaces:**
- Consumes: `useSession()`.
- Produces: a derived `const agentEnabled = enableAgentRail && !!session;` used for BOTH the `Toolbar` `enableAgentRail` prop and the `AgentRail` render condition. This is the single anon-agent gate; the authoring gate (Task 3) guarantees a session there, so the visible effect is on `/g` and `/p`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/studio/__tests__/agentSessionGate.test.tsx
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const src = readFileSync(
  fileURLToPath(new URL('../StudioShell.tsx', import.meta.url)),
  'utf8',
);

describe('agent rail requires a session', () => {
  it('imports useSession', () => {
    expect(src).toMatch(/useSession/);
  });
  it('derives agentEnabled from session and gates the rail with it', () => {
    expect(src).toMatch(/const\s+agentEnabled\s*=\s*enableAgentRail\s*&&\s*!!session/);
    expect(src).toMatch(/agentEnabled\s*&&\s*agentRailOpen\s*&&\s*!viewerMode\s*&&\s*<AgentRail/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/studio/__tests__/agentSessionGate.test.tsx`
Expected: FAIL — no `useSession`/`agentEnabled` in `StudioShell.tsx`.

- [ ] **Step 3: Implement the session gate**

In `src/studio/StudioShell.tsx`:
- Add import: `import { useSession } from '../funnel/hooks/useSession';`
- Near the existing `const enableAgentRail = embed.enableAgentRail ?? true;` (line ~44), add:
```tsx
    const { session } = useSession();
    const agentEnabled = enableAgentRail && !!session;
```
- Change the Toolbar prop (line ~200) from `enableAgentRail={enableAgentRail}` to `enableAgentRail={agentEnabled}`.
- Change the AgentRail render (line ~219) from
  `{enableAgentRail && agentRailOpen && !viewerMode && <AgentRail />}`
  to
  `{agentEnabled && agentRailOpen && !viewerMode && <AgentRail />}`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/studio/__tests__/agentSessionGate.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/studio/StudioShell.tsx src/studio/__tests__/agentSessionGate.test.tsx
git commit -m "feat(auth): hide in-app agent for anonymous users"
```

---

### Task 5: Add GitHub + email magic-link to the sign-in window

**Files:**
- Modify: `src/funnel/components/SignInButton.tsx` (generalize provider)
- Create: `src/funnel/components/EmailSignInForm.tsx`
- Modify: `src/funnel/components/SignInModal.tsx` (compose Google + GitHub + email)
- Test: `src/funnel/components/__tests__/EmailSignInForm.test.tsx` (create)
- Test: extend `src/funnel/components/__tests__/SignInModal.test.tsx`

**Interfaces:**
- Consumes: `getSupabase()` from `../lib/supabaseClient`.
- Produces:
  - `SignInButton` accepts `provider?: 'google' | 'github'` (default `'google'`), rendering the matching label/mark and calling `signInWithOAuth({ provider })`.
  - `EmailSignInForm`: `export function EmailSignInForm({ redirectTo }: { redirectTo?: string }): JSX.Element` — email input + "Send magic link" calling `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } })`, then a "Check your inbox" confirmation state.

- [ ] **Step 1: Write the failing test (email form)**

```tsx
// src/funnel/components/__tests__/EmailSignInForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

const signInWithOtp = vi.fn().mockResolvedValue({ error: null });
vi.mock('../../lib/supabaseClient', () => ({
  getSupabase: () => ({ auth: { signInWithOtp } }),
}));
import { EmailSignInForm } from '../EmailSignInForm';

describe('EmailSignInForm', () => {
  it('sends a magic link and shows confirmation', async () => {
    render(<EmailSignInForm redirectTo="https://app.example/studio" />);
    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: 'a@b.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /magic link/i }));
    await waitFor(() =>
      expect(signInWithOtp).toHaveBeenCalledWith({
        email: 'a@b.com',
        options: { emailRedirectTo: 'https://app.example/studio' },
      }),
    );
    expect(await screen.findByText(/check your inbox/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/funnel/components/__tests__/EmailSignInForm.test.tsx`
Expected: FAIL — `Cannot find module '../EmailSignInForm'`.

- [ ] **Step 3: Implement `EmailSignInForm`**

```tsx
// src/funnel/components/EmailSignInForm.tsx
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useState } from 'react';
import { getSupabase } from '../lib/supabaseClient';

export function EmailSignInForm({ redirectTo }: { redirectTo?: string }): JSX.Element {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = getSupabase();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo ?? window.location.href },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  if (sent) {
    return (
      <p className="text-sm text-ink-soft mt-2">Check your inbox for a sign-in link.</p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 flex flex-col gap-2">
      <input
        type="email"
        required
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="you@email.com"
        className="rounded-lg border border-rule bg-white px-3 py-2 text-sm text-ink"
      />
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-ink hover:bg-ink/90 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {busy ? 'Sending…' : 'Send magic link'}
      </button>
      {error && <p className="text-xs text-copper">{error}</p>}
    </form>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/funnel/components/__tests__/EmailSignInForm.test.tsx`
Expected: PASS.

- [ ] **Step 5: Generalize `SignInButton` to support GitHub**

In `src/funnel/components/SignInButton.tsx`:
- Add `provider?: 'google' | 'github';` to `SignInButtonProps` (default `'google'`).
- Use it in the click handler: `await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: target } });`
- Render the GitHub mark + "Continue with GitHub" label when `provider === 'github'` (keep the Google mark/label as the default branch). Minimal GitHub mark:
```tsx
// GitHub mark
<svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/>
</svg>
```

- [ ] **Step 6: Compose the providers into `SignInModal`**

In `src/funnel/components/SignInModal.tsx`, replace the single Google button block with Google + GitHub + an "or" divider + the email form:
```tsx
import { EmailSignInForm } from './EmailSignInForm';
// ...
<div className="mt-6 flex flex-col gap-2">
  <SignInButton provider="google" redirectTo={redirectTo ?? window.location.href}>
    Continue with Google
  </SignInButton>
  <SignInButton provider="github" redirectTo={redirectTo ?? window.location.href}>
    Continue with GitHub
  </SignInButton>
  <div className="my-1 flex items-center gap-2 text-xs text-ink-faint">
    <span className="h-px flex-1 bg-rule" /> or <span className="h-px flex-1 bg-rule" />
  </div>
  <EmailSignInForm redirectTo={redirectTo ?? window.location.href} />
</div>
```

- [ ] **Step 7: Extend the SignInModal test**

Add to `src/funnel/components/__tests__/SignInModal.test.tsx`:
```tsx
it('offers Google, GitHub, and email magic link', () => {
  render(<SignInModal open onClose={() => {}} />);
  expect(screen.getByText(/Continue with Google/i)).toBeInTheDocument();
  expect(screen.getByText(/Continue with GitHub/i)).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
});
```
(The existing SignInModal test mocks Supabase via the EmailSignInForm/SignInButton import chain; add a `vi.mock('../../lib/supabaseClient', () => ({ getSupabase: () => ({ auth: { signInWithOtp: vi.fn(), signInWithOAuth: vi.fn() } }) }));` at the top of the file if not already present.)

- [ ] **Step 8: Run the full auth component suite**

Run: `npx vitest run src/funnel/components/__tests__`
Expected: PASS (SignInModal + EmailSignInForm).

- [ ] **Step 9: Commit**

```bash
git add src/funnel/components/SignInButton.tsx src/funnel/components/EmailSignInForm.tsx src/funnel/components/SignInModal.tsx src/funnel/components/__tests__/EmailSignInForm.test.tsx src/funnel/components/__tests__/SignInModal.test.tsx
git commit -m "feat(auth): add GitHub and email magic-link to sign-in window"
```

> **Ops prerequisite (not code):** enable the GitHub provider (OAuth app client id/secret) and the email provider in the Supabase dashboard for the kernelCAD project, with redirect URLs for the app origin. Until enabled, Google keeps working; GitHub/email buttons return a provider error. Track this as a deploy checklist item.

---

### Task 6: MCP OAuth unaffected — verification

**Files:**
- Test: `tests/integration/mcpAuthUnaffected.test.ts` (create) — guard test asserting the gate does not import into / wrap the MCP path.
- Verify (manual/CLI): `kernelCAD-server` MCP OAuth endpoints.

**Interfaces:** none produced; this task is a regression guard.

- [ ] **Step 1: Write the guard test**

```ts
// tests/integration/mcpAuthUnaffected.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// The Studio sign-in gate must never wrap or import the MCP connect route or
// the agent MCP client — MCP authenticates via its own OAuth / Bearer token.
describe('MCP path is independent of the web sign-in gate', () => {
  it('connect route does not import StudioAuthGate', () => {
    const src = readFileSync('src/studio/routes/connect.tsx', 'utf8');
    expect(src).not.toMatch(/StudioAuthGate/);
  });
  it('agent MCP client does not depend on useSession', () => {
    const src = readFileSync('src/agent/mcp/cloudClient.ts', 'utf8');
    expect(src).not.toMatch(/useSession/);
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx vitest run tests/integration/mcpAuthUnaffected.test.ts`
Expected: PASS (the gate touches only `/` and `/studio`).

- [ ] **Step 3: Verify the live MCP OAuth flow (manual)**

Confirm the server-side OAuth metadata + token endpoints still respond on the deployed MCP origin (these are unchanged by this branch; this is a sanity check the user explicitly asked for):
```bash
# Discovery documents an MCP OAuth client expects:
curl -s https://<mcp-origin>/.well-known/oauth-authorization-server | head
curl -s https://<mcp-origin>/.well-known/oauth-protected-resource | head
```
Expected: valid JSON metadata (issuer, authorization/token endpoints). If absent, the MCP OAuth flow is broken independently of this change — file separately (see kernelCAD-server `src/routes/mcpAuth.ts`).

- [ ] **Step 4: Commit**

```bash
git add tests/integration/mcpAuthUnaffected.test.ts
git commit -m "test(auth): guard that MCP OAuth path stays independent of the Studio gate"
```

---

### Task 7: Full verification + Playwright smoke

**Files:**
- Create: `tests/e2e/studio-gate.spec.ts` (Playwright)

- [ ] **Step 1: Write the smoke test**

```ts
// tests/e2e/studio-gate.spec.ts
import { test, expect } from '@playwright/test';

test('anonymous user hitting /studio sees the sign-in window, not the editor', async ({ page }) => {
  await page.goto('/studio');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText(/Sign in to open kernelCAD Studio/i)).toBeVisible();
  // Non-dismissable: no close control.
  await expect(page.getByLabelText('Close')).toHaveCount(0);
});
```

- [ ] **Step 2: Run the unit suite + typecheck + lint**

Run:
```bash
npx vitest run
npx tsc -b
npm run lint
```
Expected: all green. (`tsc -b` matters — the playground deploy build fails on cross-package type errors even when vitest passes; per project history.)

- [ ] **Step 3: Run the Playwright smoke (if a dev/preview server is available)**

Run: `npx playwright test tests/e2e/studio-gate.spec.ts`
Expected: PASS. If the e2e harness needs `VITE_DISABLE_AUTH` or a backend, skip with a noted reason rather than asserting green.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/studio-gate.spec.ts
git commit -m "test(auth): e2e smoke for anonymous Studio sign-in gate"
```

---

## Self-Review

- **Spec coverage:** gate authoring Studio (Tasks 2,3) ✓; agent hidden for anon (Task 4) ✓; anonymous viewing of `/p`,`/g` preserved (not wrapped — Tasks 3,6) ✓; reuse existing window + add GitHub/email (Tasks 1,5) ✓; MCP untouched + OAuth verified (Task 6) ✓; sign-in-only, paywall deferred (no entitlement code) ✓.
- **Placeholders:** none — every code step shows full code; the only non-code item is the Supabase dashboard ops note, explicitly flagged as out-of-code.
- **Type consistency:** `dismissable`/`footer` (Task 1) used identically in Tasks 2 and 5; `agentEnabled = enableAgentRail && !!session` named consistently (Task 4); `EmailSignInForm({ redirectTo })` and `SignInButton` `provider` prop consistent between Tasks 5 definition and SignInModal usage.
