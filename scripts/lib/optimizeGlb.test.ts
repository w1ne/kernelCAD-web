// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/lib/optimizeGlb.test.ts
//
// Guards the colour gate against the false positive that broke the marketing
// deploy: `dedup` legitimately collapses duplicate material OBJECTS (93 -> 10 on
// royal-pop-pocket-watch) while every distinct COLOUR survives. Gating on object
// count rejected a perfectly good build; gating on the colour set does not.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Document, NodeIO } from '@gltf-transform/core';
import { countDistinctColors, countMaterials } from './optimizeGlb';

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'kc-glb-mat-')); });
afterEach(() => rmSync(dir, { recursive: true, force: true }));

/** Write a GLB carrying `colors`, each repeated `dupes` times as separate
 *  material objects — the shape OCCT exports produce. */
async function writeGlb(name: string, colors: number[][], dupes: number): Promise<string> {
  const doc = new Document();
  const buf = doc.createBuffer();
  for (const c of colors) {
    for (let i = 0; i < dupes; i++) {
      doc.createMaterial().setBaseColorFactor(c as [number, number, number, number]);
    }
  }
  // a GLB needs at least one scene to round-trip
  doc.createScene();
  void buf;
  const path = join(dir, name);
  await new NodeIO().write(path, doc);
  return path;
}

const RED: number[] = [1, 0, 0, 1];
const GREEN: number[] = [0, 1, 0, 1];
const BLUE: number[] = [0, 0, 1, 1];

describe('countDistinctColors', () => {
  it('counts COLOURS, not material objects — 9 objects sharing 3 colours reads as 3', async () => {
    const p = await writeGlb('dupes.glb', [RED, GREEN, BLUE], 3);
    expect(await countMaterials(p)).toBe(9);
    expect(await countDistinctColors(p)).toBe(3);
  });

  it('treats every material as one colour when they are all identical', async () => {
    const p = await writeGlb('same.glb', [RED], 12);
    expect(await countMaterials(p)).toBe(12);
    expect(await countDistinctColors(p)).toBe(1);
  });

  it('is unchanged by dedup: the real-world 93 -> 10 case preserves the colour count', async () => {
    // before: 10 colours x 9 duplicate objects; after dedup: 10 objects, 10 colours
    const before = await writeGlb('before.glb',
      Array.from({ length: 10 }, (_, i) => [i / 10, 0, 0, 1]), 9);
    const after = await writeGlb('after.glb',
      Array.from({ length: 10 }, (_, i) => [i / 10, 0, 0, 1]), 1);
    expect(await countMaterials(before)).toBe(90);
    expect(await countMaterials(after)).toBe(10);
    // the object count collapses, the colour set does not — so preserveMaterials holds
    expect(await countDistinctColors(after)).toBe(await countDistinctColors(before));
  });

  it('DOES detect real palette flattening — distinct colours actually lost', async () => {
    const before = await writeGlb('rich.glb', [RED, GREEN, BLUE], 1);
    const flattened = await writeGlb('flat.glb', [RED], 3);
    expect(await countDistinctColors(flattened)).toBeLessThan(
      await countDistinctColors(before),
    );
  });
});
