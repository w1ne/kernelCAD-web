// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/parts/stepParseCache.test.ts
//
// The Studio "Computing" stall on models with imported parts is dominated by
// re-running replicad.importSTEP every rebuild. This guards the content-hash
// parse cache that removes the re-parse: identical bytes parse once, and each
// call still hands back an independent clone the caller can safely consume.

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { OcctBackend, initOcct } from '../../kernel/backends/occt/occtBackend';
import {
  importStepCached,
  StepParseError,
  __stepParseCacheStats,
  __resetStepParseCache,
} from './stepParseCache';

let boxBytes: Buffer;
let smallBoxBytes: Buffer;

beforeAll(async () => {
  await initOcct();
  boxBytes = Buffer.from(await OcctBackend.box(20, 30, 40, false).exportSTEPAsync());
  smallBoxBytes = Buffer.from(await OcctBackend.box(5, 5, 5, false).exportSTEPAsync());
});

beforeEach(() => __resetStepParseCache());

describe('importStepCached', () => {
  it('parses STEP bytes into a positive-volume solid', async () => {
    const backend = await importStepCached(boxBytes);
    // 20 * 30 * 40 = 24000 mm³ — leave headroom for STEP rounding.
    expect(backend.volume()).toBeGreaterThan(23000);
    expect(backend.volume()).toBeLessThan(25000);
  });

  it('parses only once for identical bytes (second call is a cache hit)', async () => {
    await importStepCached(boxBytes);
    await importStepCached(boxBytes);
    const stats = __stepParseCacheStats();
    expect(stats.misses).toBe(1);
    expect(stats.hits).toBe(1);
    expect(stats.size).toBe(1);
  });

  it('hands back an independent clone — disposing one does not break the next', async () => {
    const first = await importStepCached(boxBytes);
    // Destroy this handle the way a downstream translate/rotate would.
    first.dispose();
    // The cached master must survive and still yield a usable solid.
    const second = await importStepCached(boxBytes);
    expect(second.volume()).toBeGreaterThan(23000);
  });

  it('keys on content, not identity — different bytes miss separately', async () => {
    await importStepCached(boxBytes);
    await importStepCached(smallBoxBytes);
    const stats = __stepParseCacheStats();
    expect(stats.misses).toBe(2);
    expect(stats.size).toBe(2);
  });

  it('throws StepParseError(parse) on bytes that are not STEP', async () => {
    const garbage = Buffer.from('this is not a STEP file');
    await expect(importStepCached(garbage)).rejects.toBeInstanceOf(StepParseError);
    await expect(importStepCached(garbage)).rejects.toMatchObject({ reason: 'parse' });
  });
});
