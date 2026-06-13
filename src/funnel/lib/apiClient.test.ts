// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getSessionMock = vi.fn();
const getSupabaseMock = vi.fn(() => ({ auth: { getSession: getSessionMock } }));

vi.mock('./supabaseClient', () => ({ getSupabase: () => getSupabaseMock() }));

import { setProjectPrivacy, cloneProject, PRIVATE_REQUIRES_PAID } from './apiClient';

describe('cloneProject', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    getSessionMock.mockReset();
    getSupabaseMock.mockReturnValue({ auth: { getSession: getSessionMock } });
    getSessionMock.mockResolvedValue({ data: { session: { access_token: 'tok-1' } } });
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.kernelcad.com');
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('POSTs the clone endpoint with a bearer token and returns the parsed body', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ slug: 'cloned-slug', projectId: 'proj-9' }),
    });

    await expect(cloneProject('slug-1')).resolves.toEqual({
      slug: 'cloned-slug',
      projectId: 'proj-9',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.kernelcad.com/api/v1/projects/slug-1/clone');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer tok-1');
  });

  it('url-encodes the slug', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ slug: 'x', projectId: 'y' }) });
    await cloneProject('a/b');
    expect(fetchMock.mock.calls[0]![0]).toBe('https://api.kernelcad.com/api/v1/projects/a%2Fb/clone');
  });

  it('throws the response body on a non-2xx', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'boom' });
    await expect(cloneProject('slug-1')).rejects.toThrow('boom');
  });
});

describe('setProjectPrivacy', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    getSessionMock.mockReset();
    getSupabaseMock.mockReturnValue({ auth: { getSession: getSessionMock } });
    getSessionMock.mockResolvedValue({ data: { session: { access_token: 'tok-1' } } });
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.kernelcad.com');
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('PATCHes the privacy endpoint with a bearer token and returns the new privacy', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ privacy: 'private' }),
    });

    await expect(setProjectPrivacy('slug-1', 'private')).resolves.toEqual({ privacy: 'private' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.kernelcad.com/api/v1/projects/slug-1/privacy');
    expect(init.method).toBe('PATCH');
    expect(init.headers.Authorization).toBe('Bearer tok-1');
    expect(JSON.parse(init.body)).toEqual({ privacy: 'private' });
  });

  it('url-encodes the slug', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ privacy: 'public_unlisted' }) });
    await setProjectPrivacy('a/b', 'public_unlisted');
    expect(fetchMock.mock.calls[0]![0]).toBe('https://api.kernelcad.com/api/v1/projects/a%2Fb/privacy');
  });

  it('surfaces the PRIVATE_REQUIRES_PAID code in the thrown error on 403', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => JSON.stringify({ error: PRIVATE_REQUIRES_PAID }),
    });

    await expect(setProjectPrivacy('slug-1', 'private')).rejects.toThrow(PRIVATE_REQUIRES_PAID);
  });
});
