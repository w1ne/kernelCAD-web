// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/mirrorStore.test.ts

import { describe, it, expect, vi } from 'vitest';
import { mkdtempSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalFsMirrorStore, R2MirrorStore, stepKey } from './mirrorStore';

const SHA = 'a'.repeat(64);
const BYTES = new TextEncoder().encode('ISO-10303-21; fake step');

describe('LocalFsMirrorStore', () => {
  it('round-trips: has() false before put, true after, returns the step key', async () => {
    const root = mkdtempSync(join(tmpdir(), 'kc-mirror-'));
    const store = new LocalFsMirrorStore(root);

    expect(await store.has(SHA)).toBe(false);
    const url = await store.put(SHA, BYTES);
    expect(url).toBe(stepKey(SHA));
    expect(url).toBe(`step/${SHA}.step`);
    expect(await store.has(SHA)).toBe(true);
    expect(existsSync(join(root, 'step', `${SHA}.step`))).toBe(true);
    expect(readFileSync(join(root, 'step', `${SHA}.step`))).toEqual(Buffer.from(BYTES));
  });

  it('is idempotent: re-put of identical content does not error and keeps content', async () => {
    const root = mkdtempSync(join(tmpdir(), 'kc-mirror-'));
    const store = new LocalFsMirrorStore(root);
    await store.put(SHA, BYTES);
    const url2 = await store.put(SHA, BYTES);
    expect(url2).toBe(stepKey(SHA));
    expect(readFileSync(join(root, 'step', `${SHA}.step`))).toEqual(Buffer.from(BYTES));
  });
});

describe('R2MirrorStore', () => {
  const cfg = {
    bucket: 'kc-parts',
    accountId: 'acct123',
    accessKeyId: 'AKIAEXAMPLE',
    secretAccessKey: 'secretEXAMPLE',
    publicBaseUrl: 'https://parts.example.com/',
    now: () => new Date('2026-06-13T12:00:00.000Z'),
  };

  it('put() PUTs to the content-addressed key and returns the public URL', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    const store = new R2MirrorStore({ ...cfg, fetchImpl: fetchMock as unknown as typeof fetch });

    const url = await store.put(SHA, BYTES);
    expect(url).toBe(`https://parts.example.com/step/${SHA}.step`);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [calledUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(calledUrl).toBe(
      `https://acct123.r2.cloudflarestorage.com/kc-parts/step/${SHA}.step`,
    );
    expect(init.method).toBe('PUT');
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toMatch(/^AWS4-HMAC-SHA256 Credential=AKIAEXAMPLE\//);
    expect(headers['x-amz-date']).toBe('20260613T120000Z');
    expect(headers['x-amz-content-sha256']).toMatch(/^[0-9a-f]{64}$/);
    expect(init.body).toBe(BYTES);
  });

  it('has() issues a HEAD: 200 → true, 404 → false', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 404 }));
    const store = new R2MirrorStore({ ...cfg, fetchImpl: fetchMock as unknown as typeof fetch });

    expect(await store.has(SHA)).toBe(true);
    expect(await store.has(SHA)).toBe(false);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('HEAD');
  });

  it('put() throws on a non-2xx response', async () => {
    const fetchMock = vi.fn(async () => new Response('denied', { status: 403 }));
    const store = new R2MirrorStore({ ...cfg, fetchImpl: fetchMock as unknown as typeof fetch });
    await expect(store.put(SHA, BYTES)).rejects.toThrow(/HTTP 403/);
  });
});
