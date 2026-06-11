// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
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

  it('defaults to the step.parts catalog when no url is configured', async () => {
    delete process.env.KERNELCAD_PARTS_BASE_URL;
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 }),
    );
    await remoteFindParts({ query: 'M3' });
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toMatch(/^https:\/\/api\.step\.parts\/v1\/parts\?/);
  });

  it('disables the remote tier when KERNELCAD_PARTS_BASE_URL is "off"', async () => {
    process.env.KERNELCAD_PARTS_BASE_URL = 'off';
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

  it('maps a step.parts search payload (items/total) to PartRecord results', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          total: 1,
          items: [
            {
              id: 'bearing_608',
              name: '608 deep-groove ball bearing',
              category: 'bearing',
              family: 'deep-groove-ball-bearing',
              tags: ['bearing'],
              aliases: ['skate bearing'],
              standard: { designation: 'ISO 15' },
              attributes: { boreMm: 8 },
              stepUrl: 'https://media.example/608.step',
              sha256: 'deadbeef',
              pageUrl: 'https://www.step.parts/parts/bearing_608',
            },
          ],
        }),
        { status: 200 },
      ),
    );
    const out = await remoteFindParts({ query: 'bearing', partsBaseUrl: 'https://x.test/' });
    expect(out.totalMatches).toBe(1);
    expect(out.results).toHaveLength(1);
    expect(out.results[0]).toMatchObject({
      id: 'bearing_608',
      family: 'deep-groove-ball-bearing',
      standard: 'ISO 15',
      sha256: 'deadbeef',
      stepUrl: 'https://media.example/608.step',
      source: 'remote',
    });
    expect(out.results[0].tags).toEqual(expect.arrayContaining(['bearing', 'skate bearing']));
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
