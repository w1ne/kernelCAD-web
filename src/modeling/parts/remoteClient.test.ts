import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { remoteFindParts, RemoteDisabledError } from './remoteClient';

describe('remoteClient', () => {
  let prevEnv: string | undefined;
  beforeEach(() => {
    prevEnv = process.env.KERNELCAD_PARTS_BASE_URL;
  });
  afterEach(() => {
    if (prevEnv === undefined) delete process.env.KERNELCAD_PARTS_BASE_URL;
    else process.env.KERNELCAD_PARTS_BASE_URL = prevEnv;
    vi.restoreAllMocks();
  });

  it('throws RemoteDisabledError when partsBaseUrl is unset and env is unset', async () => {
    delete process.env.KERNELCAD_PARTS_BASE_URL;
    await expect(remoteFindParts({ query: 'M3' })).rejects.toBeInstanceOf(
      RemoteDisabledError,
    );
  });

  it('uses partsBaseUrl arg when provided', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ results: [], totalMatches: 0 }), {
        status: 200,
      }),
    );
    await remoteFindParts({ query: 'M3', partsBaseUrl: 'https://parts.example/' });
    expect(fetchSpy).toHaveBeenCalled();
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toMatch(/^https:\/\/parts\.example\/v1\/parts\?/);
  });

  it('falls back to KERNELCAD_PARTS_BASE_URL env when arg is unset', async () => {
    process.env.KERNELCAD_PARTS_BASE_URL = 'https://env-parts.example';
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ results: [], totalMatches: 0 }), {
        status: 200,
      }),
    );
    await remoteFindParts({ query: 'M3' });
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toMatch(/^https:\/\/env-parts\.example/);
  });

  it('surfaces 5xx as parts.fetch.api-error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('boom', { status: 503 }),
    );
    await expect(
      remoteFindParts({ query: 'x', partsBaseUrl: 'https://x.test/' }),
    ).rejects.toThrow(/parts\.fetch\.api-error|503/);
  });
});
