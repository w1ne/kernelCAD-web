// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/integration/export/stlFuseBudget.test.ts
//
// STL of a multi-part Scene fuses the parts before meshing. Meshing is cheap;
// the fuse of two parts whose free-form faces overlap is not — the 24-turn M8
// bolt-and-nut cookbook took more than 300 s to STL while STEP / 3MF (no fuse)
// finished in under a minute. Past the free-form face-pair budget the STL now
// ships one closed shell per part and says so; ordinary scenes still fuse.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import {
  FREEFORM_FUSE_PAIR_BUDGET,
  freeformFuseOverBudget,
} from '../../../src/agent/script-runtime/sceneStlFuse';
import { runScript } from '../../../src/composition/runScript';
import { RecomputeEngine } from '../../../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../../src/modeling/backends/occt/occtLowerer';
import { sceneToWorldFrameParts } from '../../../src/kernel/backends/occt/sceneToWorldFrame';
import type { SceneBackend } from '../../../src/kernel/backends/sceneBackend';

// Two interpenetrating twisted square sweeps, 10 stations each: every side
// face between stations is a B-spline face, and the two bodies share the
// same column of space, like a threaded bolt inside its nut.
const TWISTED_PAIR = `
function sq(s, rot) {
  let p = path();
  for (let i = 0; i < 4; i++) {
    const a = (rot + 45 + 90 * i) * Math.PI / 180;
    const r = s * Math.SQRT2;
    p = i ? p.lineTo(r * Math.cos(a), r * Math.sin(a)) : p.moveTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
}
const twisted = (s, dir) => variableSweep([[0, 0, 0], [0, 0, 90]],
  Array.from({ length: 10 }, (_, i) => ({ t: i / 9, profile: sq(s, dir * 9 * i) })));
const arm = assembly('pair');
arm.part('a', twisted(10, 1));
arm.part('b', twisted(9, -1).translate(1, 0, 0));
return arm.model();`;

const BOX_PAIR = `
const arm = assembly('boxes');
arm.part('a', box(20, 20, 20));
arm.part('b', box(20, 20, 20).translate(10, 0, 0));
return arm.model();`;

function stlTriangles(bytes: Uint8Array): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(80, true);
}

async function worldParts(code: string) {
  const run = await runScript({ code, fileName: 'pair.kcad.ts' });
  const r = await new RecomputeEngine(createOcctLowerer(run.session)).run(run.records, { paramTable: run.paramTable });
  const scene = [...r.shapes.values()].at(-1) as SceneBackend;
  return sceneToWorldFrameParts(scene);
}

describe('STL fuse cost gate for multi-part scenes', () => {
  beforeAll(async () => {
    await initOcct();
  }, 60_000);

  it('prices overlapping free-form face pairs, and ignores plain solids', async () => {
    const cost = freeformFuseOverBudget(await worldParts(TWISTED_PAIR));
    expect(cost).toBeDefined();
    expect(cost!.pairs).toBeGreaterThan(FREEFORM_FUSE_PAIR_BUDGET);
    expect([cost!.partA, cost!.partB].sort()).toEqual(['a', 'b']);
    expect(freeformFuseOverBudget(await worldParts(BOX_PAIR))).toBeUndefined();
  }, 120_000);

  it('writes per-part closed shells with a warning instead of fusing', async () => {
    const r = await runAndExport({ code: TWISTED_PAIR, fileName: 'pair.kcad.ts', format: 'stl' });
    const skipped = r.diagnostics.find((d) => d.code === 'export.stl.fuse-skipped');
    expect(skipped, JSON.stringify(r.diagnostics)).toBeDefined();
    expect(skipped!.severity).toBe('warn');
    expect(skipped!.message).toMatch(/parts 'a' and 'b'/);
    expect(r.diagnostics.some((d) => d.severity === 'error')).toBe(false);
    expect(stlTriangles(r.bytes)).toBeGreaterThan(0);
  }, 180_000);

  it('still fuses an ordinary multi-part scene into one solid', async () => {
    const r = await runAndExport({ code: BOX_PAIR, fileName: 'boxes.kcad.ts', format: 'stl' });
    expect(r.diagnostics.map((d) => d.code)).not.toContain('export.stl.fuse-skipped');
    // A fused 30×20×20 block meshes to 12 triangles (6 quads); two
    // overlapping separate cubes would give 24.
    expect(stlTriangles(r.bytes)).toBe(12);
  }, 120_000);
});
