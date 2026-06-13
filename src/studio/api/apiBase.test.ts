// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
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

  it('returns the prod hosted backend base + bearer token when signed in', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.kernelcad.com');
    getSessionMock.mockResolvedValueOnce({
      data: { session: { access_token: 'tok-xyz' } },
    });

    await expect(apiCall()).resolves.toEqual({
      base: 'https://api.kernelcad.com',
      headers: { Authorization: 'Bearer tok-xyz' },
    });
  });

  it('returns empty base when signed in but no backend is configured (local dev)', async () => {
    // No VITE_API_BASE_URL / VITE_KERNELCAD_API_BASE → relative paths hit the
    // same-origin vite middleware, even when a Supabase session exists.
    vi.stubEnv('VITE_API_BASE_URL', '');
    getSessionMock.mockResolvedValueOnce({
      data: { session: { access_token: 'tok-xyz' } },
    });

    await expect(apiCall()).resolves.toEqual({
      base: '',
      headers: { Authorization: 'Bearer tok-xyz' },
    });
  });

  it('lets the VITE_KERNELCAD_API_BASE dev override win when signed in', async () => {
    vi.stubEnv('VITE_KERNELCAD_API_BASE', 'http://localhost:8787');
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.kernelcad.com');
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

  it('prepends the hosted origin and KEEPS the /__kernelcad prefix when signed-in', () => {
    expect(
      rewritePath('/__kernelcad/review-paint', 'https://api.kernelcad.com'),
    ).toBe('https://api.kernelcad.com/__kernelcad/review-paint');
  });

  it('preserves query strings on the rewritten path', () => {
    expect(
      rewritePath(
        '/__kernelcad/mesh?script=foo.kcad.ts',
        'https://api.kernelcad.com',
      ),
    ).toBe('https://api.kernelcad.com/__kernelcad/mesh?script=foo.kcad.ts');
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
      buildEventsUrl('https://api.kernelcad.com', 'sess-1', 'jwt-abc'),
    ).toBe(
      'https://api.kernelcad.com/__kernelcad/events?session=sess-1&access_token=jwt-abc',
    );
  });

  it('url-encodes the session token and the JWT', () => {
    expect(buildEventsUrl('', 'a/b c', 'x+y/z')).toBe(
      '/__kernelcad/events?session=a%2Fb%20c&access_token=x%2By%2Fz',
    );
  });
});
