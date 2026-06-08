import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getSessionMock = vi.fn();

const getSupabaseMock = vi.fn(() => ({
  auth: {
    getSession: getSessionMock,
  },
}));

vi.mock('../../funnel/lib/supabaseClient', () => ({
  getSupabase: () => getSupabaseMock(),
}));

import { apiCall, rewritePath, bearerToken, buildEventsUrl } from './apiBase';

describe('apiCall', () => {
  beforeEach(() => {
    getSessionMock.mockReset();
    getSupabaseMock.mockReset();
    getSupabaseMock.mockReturnValue({ auth: { getSession: getSessionMock } });
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

  it('falls back to unsigned-in when Supabase is unconfigured (plain local dev)', async () => {
    // getSupabase() throws when VITE_SUPABASE_URL / ANON_KEY are absent. That is
    // the localhost case and must resolve to the local-vite-middleware path, not
    // crash every Studio backend fetch.
    getSupabaseMock.mockImplementation(() => {
      throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.');
    });

    await expect(apiCall()).resolves.toEqual({ base: '', headers: {} });
    expect(getSessionMock).not.toHaveBeenCalled();
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

describe('bearerToken', () => {
  it('extracts the JWT from an Authorization header', () => {
    expect(bearerToken({ Authorization: 'Bearer tok-xyz' })).toBe('tok-xyz');
  });

  it('returns undefined when no Authorization header is present (unsigned-in)', () => {
    expect(bearerToken({})).toBeUndefined();
  });

  it('returns undefined when the header is not a Bearer scheme', () => {
    expect(bearerToken({ Authorization: 'Basic abc' })).toBeUndefined();
  });
});

describe('buildEventsUrl', () => {
  it('omits access_token when no JWT is supplied (unsigned-in / local vite)', () => {
    expect(buildEventsUrl('', 'sess-1')).toBe(
      '/__kernelcad/events?session=sess-1',
    );
  });

  it('appends access_token when a JWT is supplied (signed-in)', () => {
    expect(buildEventsUrl('', 'sess-1', 'jwt-abc')).toBe(
      '/__kernelcad/events?session=sess-1&access_token=jwt-abc',
    );
  });

  it('routes the base through rewritePath for the hosted endpoint', () => {
    expect(
      buildEventsUrl('https://app.kernelcad.com/api/v1', 'sess-1', 'jwt-abc'),
    ).toBe(
      'https://app.kernelcad.com/api/v1/events?session=sess-1&access_token=jwt-abc',
    );
  });

  it('url-encodes the session token and the JWT', () => {
    expect(buildEventsUrl('', 'a/b c', 'x+y/z')).toBe(
      '/__kernelcad/events?session=a%2Fb%20c&access_token=x%2By%2Fz',
    );
  });
});
