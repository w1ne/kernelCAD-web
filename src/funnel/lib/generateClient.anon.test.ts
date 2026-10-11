// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getSession = vi.fn();
vi.mock('./supabaseClient', () => ({
  isAuthConfigured: () => true,
  getSupabase: () => ({ auth: { getSession } }),
}));

import { startGeneration } from './generateClient';

describe('startGeneration signed out', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset().mockResolvedValue({ ok: true } as Response);
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('sends no Authorization header and carries the Turnstile token', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    await startGeneration({ prompt: 'a cube', turnstileToken: 'tok' });
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(Object.keys(init.headers as Record<string, string>)).not.toContain('Authorization');
    expect(JSON.parse(init.body as string)).toEqual({ prompt: 'a cube', turnstileToken: 'tok' });
  });

  it('still sends the bearer token when signed in', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'jwt' } } });
    await startGeneration({ prompt: 'a cube' });
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jwt');
    expect(JSON.parse(init.body as string)).not.toHaveProperty('turnstileToken');
  });
});
