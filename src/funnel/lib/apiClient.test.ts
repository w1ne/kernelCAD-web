// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getSessionMock = vi.fn();
const getSupabaseMock = vi.fn(() => ({ auth: { getSession: getSessionMock } }));

vi.mock('./supabaseClient', () => ({ getSupabase: () => getSupabaseMock() }));

import {
  setProjectPrivacy,
  postProjectRender,
  PRIVATE_REQUIRES_PAID,
  listProjectRevisions,
  restoreProjectRevision,
} from './apiClient';

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

describe('postProjectRender', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    getSessionMock.mockReset();
    getSupabaseMock.mockReturnValue({ auth: { getSession: getSessionMock } });
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.kernelcad.com');
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('POSTs the render endpoint with the png body and a bearer token, returning the url', async () => {
    getSessionMock.mockResolvedValue({ data: { session: { access_token: 'tok-1' } } });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, url: 'https://cdn.kernelcad.com/r/slug-1.png' }),
    });

    await expect(postProjectRender('slug-1', 'aGVsbG8=')).resolves.toEqual({
      ok: true,
      url: 'https://cdn.kernelcad.com/r/slug-1.png',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.kernelcad.com/api/v1/projects/slug-1/render');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer tok-1');
    expect(JSON.parse(init.body)).toEqual({ png: 'aGVsbG8=' });
  });

  it('works anonymously (no session → no Authorization header)', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, url: 'u' }) });

    await postProjectRender('slug-2', 'eHl6');

    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.headers.Authorization).toBeUndefined();
    expect(JSON.parse(init.body)).toEqual({ png: 'eHl6' });
  });

  it('url-encodes the slug', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, url: 'u' }) });
    await postProjectRender('a/b', 'cG5n');
    expect(fetchMock.mock.calls[0]![0]).toBe('https://api.kernelcad.com/api/v1/projects/a%2Fb/render');
  });
});

describe('listProjectRevisions', () => {
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

  it('GETs the revisions endpoint and unwraps the {revisions} envelope', async () => {
    const revisions = [
      { version: 3, created_at: '2026-06-15T12:00:00Z' },
      { version: 2, created_at: '2026-06-14T12:00:00Z' },
    ];
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ revisions }) });

    await expect(listProjectRevisions('slug-1')).resolves.toEqual(revisions);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.kernelcad.com/api/v1/projects/slug-1/revisions');
    expect(init.method).toBe('GET');
    expect(init.headers.Authorization).toBe('Bearer tok-1');
  });

  it('returns [] when the envelope omits revisions', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    await expect(listProjectRevisions('slug-1')).resolves.toEqual([]);
  });

  it('url-encodes the slug', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ revisions: [] }) });
    await listProjectRevisions('a/b');
    expect(fetchMock.mock.calls[0]![0]).toBe('https://api.kernelcad.com/api/v1/projects/a%2Fb/revisions');
  });
});

describe('restoreProjectRevision', () => {
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

  it('POSTs the restore endpoint with the version and returns the restored version', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ version: 5 }) });

    await expect(restoreProjectRevision('slug-1', 5)).resolves.toEqual({ version: 5 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.kernelcad.com/api/v1/projects/slug-1/revisions/5/restore');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer tok-1');
    expect(JSON.parse(init.body)).toEqual({});
  });

  it('url-encodes the slug', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ version: 1 }) });
    await restoreProjectRevision('a/b', 1);
    expect(fetchMock.mock.calls[0]![0]).toBe('https://api.kernelcad.com/api/v1/projects/a%2Fb/revisions/1/restore');
  });
});
