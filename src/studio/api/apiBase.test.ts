import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getSessionMock = vi.fn();

vi.mock('../../funnel/lib/supabaseClient', () => ({
  getSupabase: () => ({
    auth: {
      getSession: getSessionMock,
    },
  }),
}));

import { apiCall, rewritePath } from './apiBase';

describe('apiCall', () => {
  beforeEach(() => {
    getSessionMock.mockReset();
    // Default: any prior stub on VITE_KERNELCAD_API_BASE should be cleared so
    // the prod-URL fallback path is exercised by default.
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns empty base + headers when the user is signed out', async () => {
    getSessionMock.mockResolvedValueOnce({ data: { session: null } });

    await expect(apiCall()).resolves.toEqual({ base: '', headers: {} });
  });

  it('returns the prod hosted base + bearer token when signed in', async () => {
    getSessionMock.mockResolvedValueOnce({
      data: { session: { access_token: 'tok-xyz' } },
    });

    await expect(apiCall()).resolves.toEqual({
      base: 'https://app.kernelcad.com/api/v1',
      headers: { Authorization: 'Bearer tok-xyz' },
    });
  });

  it('lets the VITE_KERNELCAD_API_BASE dev override win when signed in', async () => {
    vi.stubEnv('VITE_KERNELCAD_API_BASE', 'http://localhost:8787');
    getSessionMock.mockResolvedValueOnce({
      data: { session: { access_token: 'tok-xyz' } },
    });

    await expect(apiCall()).resolves.toEqual({
      base: 'http://localhost:8787',
      headers: { Authorization: 'Bearer tok-xyz' },
    });
  });
});

describe('rewritePath', () => {
  it('returns the input unchanged when base is empty (unsigned-in)', () => {
    expect(rewritePath('/__kernelcad/review-paint', '')).toBe(
      '/__kernelcad/review-paint',
    );
    expect(rewritePath('/__kernelcad/mesh?script=foo.kcad.ts', '')).toBe(
      '/__kernelcad/mesh?script=foo.kcad.ts',
    );
  });

  it('substitutes the hosted prefix and keeps the path tail when signed-in', () => {
    expect(
      rewritePath('/__kernelcad/review-paint', 'https://app.kernelcad.com/api/v1'),
    ).toBe('https://app.kernelcad.com/api/v1/review-paint');
  });

  it('preserves query strings on the rewritten path', () => {
    expect(
      rewritePath(
        '/__kernelcad/mesh?script=foo.kcad.ts',
        'https://app.kernelcad.com/api/v1',
      ),
    ).toBe('https://app.kernelcad.com/api/v1/mesh?script=foo.kcad.ts');
  });
});
