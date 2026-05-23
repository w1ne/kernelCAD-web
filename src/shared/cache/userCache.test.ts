// src/shared/cache/userCache.test.ts

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  mkdtempSync,
  rmSync,
  existsSync,
  writeFileSync,
  readFileSync,
  statSync,
  utimesSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
    const { createHash } = require('node:crypto');
    const { mkdirSync } = require('node:fs');
    const { dirname } = require('node:path');

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
      require('node:crypto')
        .createHash('sha256')
        .update('https://example.invalid/create.step')
        .digest('hex'),
      '.step',
    );
    expect(statSync(written).size).toBe(1);
  });
});
