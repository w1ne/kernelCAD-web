// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/cache/userCache.test.ts

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createHash } from 'node:crypto';
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  existsSync,
  writeFileSync,
  readFileSync,
  statSync,
  utimesSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  userCacheRoot,
  cachePathFor,
  getOrFetchAsync,
  __resetUserCacheForTests,
} from './userCache';

describe('userCache — per-consumer primitives', () => {
  let tmp: string;
  let prevEnv: string | undefined;
  let prevLegacy: string | undefined;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'kernelcad-cache-test-'));
    prevEnv = process.env.KERNELCAD_CACHE_DIR;
    prevLegacy = process.env.KERNELCAD_TEXTURE_CACHE_DIR;
    process.env.KERNELCAD_CACHE_DIR = tmp;
    delete process.env.KERNELCAD_TEXTURE_CACHE_DIR;
    __resetUserCacheForTests();
  });

  afterEach(() => {
    if (prevEnv === undefined) delete process.env.KERNELCAD_CACHE_DIR;
    else process.env.KERNELCAD_CACHE_DIR = prevEnv;
    if (prevLegacy === undefined) delete process.env.KERNELCAD_TEXTURE_CACHE_DIR;
    else process.env.KERNELCAD_TEXTURE_CACHE_DIR = prevLegacy;
    rmSync(tmp, { recursive: true, force: true });
  });

  it('resolves the cache root under the env override when set', () => {
    expect(userCacheRoot()).toBe(tmp);
  });

  it('cachePathFor isolates consumers under separate subdirectories', () => {
    const a = cachePathFor('textures', 'aaaa', '.png');
    const b = cachePathFor('parts', 'aaaa', '.step');
    expect(a).toContain('/textures/');
    expect(b).toContain('/parts/');
    expect(a).not.toBe(b);
  });

  it('per-consumer TTL is honoured (parts: no-TTL, textures: 7d)', async () => {
    const textureUrl = 'https://example.invalid/feed.png';
    const texturePath = cachePathFor(
      'textures',
      createHash('sha256').update(textureUrl).digest('hex'),
      '.png',
    );
    mkdirSync(dirname(texturePath), { recursive: true });
    writeFileSync(texturePath, Buffer.from([1, 2, 3]));
    const old = Date.now() / 1000 - 60 * 60 * 24 * 30; // 30 days ago
    utimesSync(texturePath, old, old);

    const fetchedTextures = await getOrFetchAsync({
      consumer: 'textures',
      url: textureUrl,
      ext: '.png',
      ttlMs: 7 * 24 * 60 * 60 * 1000,
      fetcher: async () => Buffer.from([9, 9, 9]),
    });
    // 30-day-old file > 7-day TTL -> must re-fetch.
    expect(readFileSync(fetchedTextures).equals(Buffer.from([9, 9, 9]))).toBe(
      true,
    );

    // Parts consumer with ttlMs: null (no expiry) keeps the same bytes.
    const partsUrl = 'https://example.invalid/beef.step';
    const partsPath = cachePathFor(
      'parts',
      createHash('sha256').update(partsUrl).digest('hex'),
      '.step',
    );
    mkdirSync(dirname(partsPath), { recursive: true });
    writeFileSync(partsPath, Buffer.from([1, 2, 3]));
    utimesSync(partsPath, old, old);
    const fetchedParts = await getOrFetchAsync({
      consumer: 'parts',
      url: partsUrl,
      ext: '.step',
      ttlMs: null,
      fetcher: async () => {
        throw new Error('should not fetch');
      },
    });
    expect(readFileSync(fetchedParts).equals(Buffer.from([1, 2, 3]))).toBe(true);
  });

  it('verifies the sha256 when expectedSha256 is provided', async () => {
    await expect(
      getOrFetchAsync({
        consumer: 'parts',
        url: 'https://example.invalid/x.step',
        ext: '.step',
        ttlMs: null,
        expectedSha256: 'deadbeef'.repeat(8),
        fetcher: async () => Buffer.from('hello'),
      }),
    ).rejects.toThrow(/checksum/i);
  });

  it('creates the cache subdirectory on first write', async () => {
    const sub = join(tmp, 'parts');
    expect(existsSync(sub)).toBe(false);
    await getOrFetchAsync({
      consumer: 'parts',
      url: 'https://example.invalid/create.step',
      ext: '.step',
      ttlMs: null,
      fetcher: async () => Buffer.from([0xaa]),
    });
    expect(existsSync(sub)).toBe(true);
    const written = cachePathFor(
      'parts',
      createHash('sha256')
        .update('https://example.invalid/create.step')
        .digest('hex'),
      '.step',
    );
    expect(statSync(written).size).toBe(1);
  });

  // ---- Republish / stale-content regression -------------------------------
  // Entries are keyed by sha256(URL). A catalog rebuild republishes the SAME url
  // with NEW bytes, so without a content check the stale copy is served forever.
  // This actually happened: after a rebuild the ESP32-C3 board kept reporting
  // 11.54mm instead of the republished 5.56mm bare board.

  it('re-fetches when the cached CONTENT no longer matches expectedSha256', async () => {
    const url = 'https://example.invalid/republished.step';
    const oldBytes = Buffer.from('OLD-GEOMETRY');
    const newBytes = Buffer.from('NEW-GEOMETRY');
    const shaOf = (b: Buffer) => createHash('sha256').update(b).digest('hex');

    const first = await getOrFetchAsync({
      consumer: 'parts', url, ext: '.step', ttlMs: null,
      expectedSha256: shaOf(oldBytes),
      fetcher: async () => oldBytes,
    });
    expect(readFileSync(first).toString()).toBe('OLD-GEOMETRY');

    // Same URL, same cache key, but the catalog now advertises new content.
    __resetUserCacheForTests(); // new process would have an empty memo
    let fetched = 0;
    const second = await getOrFetchAsync({
      consumer: 'parts', url, ext: '.step', ttlMs: null,
      expectedSha256: shaOf(newBytes),
      fetcher: async () => { fetched++; return newBytes; },
    });
    expect(fetched).toBe(1);
    expect(readFileSync(second).toString()).toBe('NEW-GEOMETRY');
  });

  it('still serves the cache when content DOES match (no needless re-fetch)', async () => {
    const url = 'https://example.invalid/unchanged.step';
    const bytes = Buffer.from('SAME');
    const sha = createHash('sha256').update(bytes).digest('hex');
    await getOrFetchAsync({
      consumer: 'parts', url, ext: '.step', ttlMs: null,
      expectedSha256: sha, fetcher: async () => bytes,
    });
    __resetUserCacheForTests();
    let fetched = 0;
    await getOrFetchAsync({
      consumer: 'parts', url, ext: '.step', ttlMs: null,
      expectedSha256: sha,
      fetcher: async () => { fetched++; return bytes; },
    });
    expect(fetched).toBe(0);
  });

  it('leaves callers without expectedSha256 on the old behaviour (cache hit)', async () => {
    const url = 'https://example.invalid/no-sha.step';
    await getOrFetchAsync({
      consumer: 'parts', url, ext: '.step', ttlMs: null,
      fetcher: async () => Buffer.from('FIRST'),
    });
    __resetUserCacheForTests();
    let fetched = 0;
    const p = await getOrFetchAsync({
      consumer: 'parts', url, ext: '.step', ttlMs: null,
      fetcher: async () => { fetched++; return Buffer.from('SECOND'); },
    });
    expect(fetched).toBe(0);
    expect(readFileSync(p).toString()).toBe('FIRST');
  });

  it('the in-process memo does not smuggle stale content past the check', async () => {
    const url = 'https://example.invalid/memoized.step';
    const oldBytes = Buffer.from('MEMO-OLD');
    const newBytes = Buffer.from('MEMO-NEW');
    const shaOf = (b: Buffer) => createHash('sha256').update(b).digest('hex');
    await getOrFetchAsync({
      consumer: 'parts', url, ext: '.step', ttlMs: null,
      expectedSha256: shaOf(oldBytes), fetcher: async () => oldBytes,
    });
    // memo deliberately NOT reset — the memo path must validate too.
    const p = await getOrFetchAsync({
      consumer: 'parts', url, ext: '.step', ttlMs: null,
      expectedSha256: shaOf(newBytes), fetcher: async () => newBytes,
    });
    expect(readFileSync(p).toString()).toBe('MEMO-NEW');
  });
});
