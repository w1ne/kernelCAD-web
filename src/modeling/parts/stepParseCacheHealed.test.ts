// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/parts/stepParseCacheHealed.test.ts
//
// A reconstructed (repaired) import must be stamped `healed`, not only a
// same-domain unification. The distinction matters downstream: the metadata is
// what tells a caller that the STEP bytes were normalized before lowering.

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

vi.mock('./healStep', () => ({
  healImportedStep: (shape: unknown) => ({ shape, unified: false, repaired: true }),
}));

import { OcctBackend, initOcct } from '../../kernel/backends/occt/occtBackend';
import {
  importStepCached,
  isStepBackendHealed,
  __resetStepParseCache,
  __stepParseCacheStats,
} from './stepParseCache';

let boxBytes: Buffer;

beforeAll(async () => {
  await initOcct();
  boxBytes = Buffer.from(await OcctBackend.box(12, 14, 16, false).exportSTEPAsync());
});

beforeEach(() => __resetStepParseCache());

describe('importStepCached healed metadata', () => {
  it('marks a reconstructed import and its cache clones as healed', async () => {
    const first = await importStepCached(boxBytes);
    expect(isStepBackendHealed(first)).toBe(true);

    const second = await importStepCached(boxBytes);
    expect(isStepBackendHealed(second)).toBe(true);
    expect(__stepParseCacheStats()).toMatchObject({ misses: 1, hits: 1 });
  });
});
