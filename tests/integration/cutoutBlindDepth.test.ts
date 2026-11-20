// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// A blind `Shape.cutout()` must stop at exactly `depth`. The prism tool used
// to run 0.01 mm past the requested depth (0.02 mm for `symmetric`), so every
// pocket was too deep and its floor never got the `floor` created ref that
// `listApi` documents (the classifier's tolerance is 1e-3 mm).
//
// Oracles: a w × h pocket of depth d removes w·h·d; its floor plane sits at
// exactly `top − d`; a `through` cut and an `upToFace` cut keep their old
// geometry.

import { describe, it, expect, beforeAll } from 'vitest';
import { getOC } from 'replicad';
import { initOcct, type OcctBackend } from '../../src/kernel/backends/occt/occtBackend';
import { isValidShape } from '../../src/kernel/backends/occt/booleanRecovery';
import { runScript } from '../../src/modeling/runtime/runScript';
import { RecomputeEngine } from '../../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../src/modeling/backends/occt/occtLowerer';
import type { CompilerDiagnostic } from '../../src/shared/diagnostics/diagnostic';

async function lowerScript(code: string): Promise<OcctBackend> {
  const run = await runScript({ code, fileName: 'test.kcad.ts' });
  const engine = new RecomputeEngine(createOcctLowerer(run.session));
  const r = await engine.run(run.records, { paramTable: run.paramTable });
  expect((r.diagnostics as CompilerDiagnostic[]).filter((d) => d.severity === 'error')).toEqual([]);
  const solid = r.shapes.get(run.records[run.records.length - 1].id) as OcctBackend;
  expect(isValidShape(getOC(), solid.getReplicadShape().wrapped)).toBe(true);
  return solid;
}

// Box 40 × 30 × 20, corner at the origin; 12 × 8 profile centred on the face.
const W = 40;
const D = 30;
const H = 20;
const BOX_VOLUME = W * D * H;
const RECT = `path().moveTo(-6, -4).lineTo(6, -4).lineTo(6, 4).lineTo(-6, 4).close()`;
const cut = (opts: string, profile = RECT): string => `return box(${W}, ${D}, ${H}).cutout(${profile}, ${opts});`;

function labelsOf(solid: OcctBackend, featureName: string): string[] {
  return [...solid.historyMap!.values()]
    .filter((l) => l.featureName === featureName)
    .map((l) => l.labelName!)
    .sort();
}

/** Positions along `axis` of the planar faces whose normal is parallel to it. */
function planesAlong(solid: OcctBackend, axis: 0 | 1 | 2): number[] {
  const out: number[] = [];
  for (const f of solid.getReplicadShape().faces) {
    if (f.geomType !== 'PLANE') continue;
    const n = f.normalAt();
    if (Math.abs(Math.abs([n.x, n.y, n.z][axis]) - 1) > 1e-9) continue;
    out.push([f.center.x, f.center.y, f.center.z][axis]);
  }
  return out.sort((a, b) => a - b);
}

describe('blind cutout depth', () => {
  beforeAll(async () => {
    await initOcct();
  }, 60_000);

  it('a blind pocket removes exactly w·h·d and its floor is labelled', async () => {
    const solid = await lowerScript(cut(`{ face: 'top', depth: 5, name: 'pocket' }`));
    expect(BOX_VOLUME - solid.volume()).toBeCloseTo(12 * 8 * 5, 6);
    // Bottom, pocket floor and top faces.
    expect(planesAlong(solid, 2)).toEqual([0, H - 5, H].map((z) => expect.closeTo(z, 9)));
    expect(labelsOf(solid, 'pocket')).toEqual(['floor', 'wall', 'wall', 'wall', 'wall']);
  });

  it('a symmetric pocket goes exactly depth into the body', async () => {
    const solid = await lowerScript(cut(`{ face: 'top', depth: 5, depthMode: 'symmetric', name: 'pocket' }`));
    expect(BOX_VOLUME - solid.volume()).toBeCloseTo(12 * 8 * 5, 6);
    expect(planesAlong(solid, 2)).toEqual([0, H - 5, H].map((z) => expect.closeTo(z, 9)));
    expect(labelsOf(solid, 'pocket')).toContain('floor');
  });

  it('a blind elliptical pocket on a side face stops at depth and gets a floor', async () => {
    const solid = await lowerScript(cut(`{ face: 'right', depth: 7, name: 'pocket' }`, `path().ellipse(0, 0, 6, 4)`));
    // OCCT volume of a boolean with B-spline faces is good to about 1e-6 relative.
    expect(Math.abs(BOX_VOLUME - solid.volume() - Math.PI * 6 * 4 * 7) / (Math.PI * 6 * 4 * 7)).toBeLessThan(1e-5);
    expect(planesAlong(solid, 0)).toEqual([0, W - 7, W].map((x) => expect.closeTo(x, 9)));
    expect(labelsOf(solid, 'pocket')).toContain('floor');
  });

  it('a downstream fillet can select the pocket floor by name', async () => {
    const solid = await lowerScript(
      `return box(${W}, ${D}, ${H}).cutout(${RECT}, { face: 'top', depth: 5, name: 'pocket' }).fillet(1, { face: 'pocket.floor' });`,
    );
    // Rounding the four floor edges (40 mm long) puts back about
    // 40·(1 − π/4) ≈ 8.6 mm³, a little less where the fillets meet the
    // sharp vertical corners. Before the fix 'pocket.floor' silently picked
    // another face and only about 2 mm³ came back.
    const filled = 12 * 8 * 5 - (BOX_VOLUME - solid.volume());
    expect(filled).toBeGreaterThan(7.5);
    expect(filled).toBeLessThan(40 * (1 - Math.PI / 4));
  });

  it('a pocket as deep as the plate still cuts clean through', async () => {
    const solid = await lowerScript(cut(`{ face: 'top', depth: ${H} }`));
    expect(BOX_VOLUME - solid.volume()).toBeCloseTo(12 * 8 * H, 6);
    expect(planesAlong(solid, 2)).toEqual([0, H]);
  });

  it('through and upToFace cuts are unchanged', async () => {
    const through = await lowerScript(cut(`{ face: 'top', depth: 'through', name: 'slot' }`));
    expect(BOX_VOLUME - through.volume()).toBeCloseTo(12 * 8 * H, 6);
    expect(labelsOf(through, 'slot')).toEqual(['wall', 'wall', 'wall', 'wall']);
    const upTo = await lowerScript(cut(`{ face: 'top', upToFace: { kind: 'canonical', face: 'bottom' } }`));
    expect(BOX_VOLUME - upTo.volume()).toBeCloseTo(12 * 8 * H, 6);
  });
});
