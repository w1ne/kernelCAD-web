// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchStoredMeshStatus, revisionOfMeshUrl, storedMeshStatusUrl } from './storedMeshStatus';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('storedMeshStatusUrl', () => {
  it('builds the status route, with retry when asked', () => {
    expect(storedMeshStatusUrl('https://api.example.com/', 'a b', 3)).toBe(
      'https://api.example.com/api/v1/projects/a%20b/revisions/3/mesh-status',
    );
    expect(storedMeshStatusUrl('https://api.example.com', 'x', 1, true)).toMatch(/mesh-status\?retry=1$/);
  });
});

describe('revisionOfMeshUrl', () => {
  it('reads slug and version from a revision-pinned CDN URL', () => {
    expect(revisionOfMeshUrl('https://mesh.kernelcad.com/mesh-artifacts/zWM8PWy3/v1.json')).toEqual({
      slug: 'zWM8PWy3',
      version: 1,
    });
  });

  it('rejects latest.json and other URLs', () => {
    expect(revisionOfMeshUrl('https://mesh.kernelcad.com/mesh-artifacts/zWM8PWy3/latest.json')).toBeNull();
    expect(revisionOfMeshUrl('https://example.com/x.json')).toBeNull();
    expect(revisionOfMeshUrl('https://mesh.kernelcad.com/mesh-artifacts/a/v0.json')).toBeNull();
  });
});

describe('fetchStoredMeshStatus', () => {
  it('parses a status answer', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'failed', error: 'boom', meshUrl: 'https://m/x.json' }),
    } as Response);
    await expect(fetchStoredMeshStatus('https://api.example.com', 's', 2)).resolves.toEqual({
      status: 'failed',
      error: 'boom',
      meshUrl: 'https://m/x.json',
    });
  });

  it('is null without an API base, on HTTP errors, odd bodies and network errors', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    await expect(fetchStoredMeshStatus(undefined, 's', 1)).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404, json: async () => null } as Response);
    await expect(fetchStoredMeshStatus('https://api', 's', 1)).resolves.toBeNull();
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'weird' }) } as Response);
    await expect(fetchStoredMeshStatus('https://api', 's', 1)).resolves.toBeNull();
    fetchMock.mockRejectedValueOnce(new TypeError('offline'));
    await expect(fetchStoredMeshStatus('https://api', 's', 1)).resolves.toBeNull();
  });
});
