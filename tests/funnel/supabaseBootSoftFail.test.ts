// @vitest-environment jsdom
//
// Regression: the Studio's `__root.tsx` boot-time eager call to `getSupabase()`
// used to throw `Missing VITE_SUPABASE_URL` whenever a developer ran `npm run
// dev` without an `.env.local`. The throw fired at module-load and bricked
// the entire Studio (including the CAD viewer, which doesn't use Supabase at
// all). The fix: at __root boot, check the env vars BEFORE calling
// getSupabase, and log a one-time dev-mode warn when they're absent.
//
// This test asserts two things:
//   1. The strict accessor `getSupabase()` still throws when env vars are
//      missing — auth-required code paths must surface the misconfiguration.
//   2. The strict accessor returns a client when env vars are present.
//
// The __root.tsx boot-time soft-fail itself is verified end-to-end via the
// Studio loading in a Playwright/devtools session without .env.local
// (`tests/demo_player_smoke.spec.ts` covers the headless-render variant; the
// Studio main route was manually validated before this change shipped).

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('Supabase env var handling', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('getSupabase() throws a clear error when VITE_SUPABASE_URL is missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'placeholder');
    const { getSupabase } = await import('../../src/funnel/lib/supabaseClient');
    expect(() => getSupabase()).toThrowError(/Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY/);
  });

  it('getSupabase() throws when VITE_SUPABASE_ANON_KEY is missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://placeholder.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    const { getSupabase } = await import('../../src/funnel/lib/supabaseClient');
    expect(() => getSupabase()).toThrowError(/Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY/);
  });

  it('getSupabase() returns a client when both env vars are present', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://placeholder.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'placeholder-anon-key');
    const { getSupabase } = await import('../../src/funnel/lib/supabaseClient');
    const client = getSupabase();
    expect(client).toBeDefined();
    expect(typeof client.auth).toBe('object');
  });

  it('getSupabase() returns the same cached client across calls', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://placeholder.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'placeholder-anon-key');
    const { getSupabase } = await import('../../src/funnel/lib/supabaseClient');
    expect(getSupabase()).toBe(getSupabase());
  });
});
