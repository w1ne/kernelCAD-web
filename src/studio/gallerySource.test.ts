// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { galleryPrecomputedMeshBinUrl, galleryPrecomputedMeshBinBrUrl, galleryPrecomputedMeshUrl } from './gallerySource';

describe('gallery precomputed mesh urls', () => {
  it('json, bin and br variants sit next to each other', () => {
    expect(galleryPrecomputedMeshUrl('abc123')).toBe('/gallery/_mesh/abc123.json');
    expect(galleryPrecomputedMeshBinUrl('abc123')).toBe('/gallery/_mesh/abc123.bin');
    expect(galleryPrecomputedMeshBinBrUrl('abc123')).toBe('/gallery/_mesh/abc123.bin.br');
  });
});
