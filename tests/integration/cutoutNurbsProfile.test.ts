// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// `Shape.cutout(profile, opts)` with a profile that holds a spline, an exact
// ellipse or another NURBS segment. The prism tool used to go only through
// `drawingFromCommands`, which has no such segment kinds, so every such
// cutout failed with `feature.kernel-failed`.
//
// Oracles: a through cut of an ellipse removes π·rx·ry·H; a blind cut removes
// the profile area times the same depth as a rectangle cut, so the ratio of
// the two removed volumes is the ratio of the areas; the removed material of
// a centred profile has its centroid where the same-centred rectangle has.

import { describe, it, expect, beforeAll } from 'vitest';
import { getOC } from 'replicad';
import { initOcct, type OcctBackend } from '../../src/kernel/backends/occt/occtBackend';
import { isValidShape } from '../../src/kernel/backends/occt/booleanRecovery';
import { runScript } from '../../src/modeling/runtime/runScript';
import { RecomputeEngine } from '../../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../src/modeling/backends/occt/occtLowerer';
import type { CompilerDiagnostic } from '../../src/shared/diagnostics/diagnostic';
import type { Vec3 } from '../../src/shared/intent/types';

async function lowerScript(code: string): Promise<OcctBackend> {
  const run = await runScript({ code, fileName: 'test.kcad.ts' });
  const engine = new RecomputeEngine(createOcctLowerer(run.session));
  const r = await engine.run(run.records, { paramTable: run.paramTable });
  expect((r.diagnostics as CompilerDiagnostic[]).filter((d) => d.severity === 'error')).toEqual([]);
  const solid = r.shapes.get(run.records[run.records.length - 1].id) as OcctBackend;
  expect(isValidShape(getOC(), solid.getReplicadShape().wrapped)).toBe(true);
  return solid;
}

// Box 60 × 40 × 20, corner at the origin.
const W = 60;
const D = 40;
const H = 20;
const BOX_VOLUME = W * D * H;
const BOX_CENTROID: Vec3 = [W / 2, D / 2, H / 2];
const cut = (profile: string, opts: string): string => `return box(${W}, ${D}, ${H}).cutout(${profile}, ${opts});`;

/** Volume and centroid of the material that the cutout removed. */
function removed(solid: OcctBackend): { volume: number; centroid: Vec3 } {
  const v = solid.volume();
  const c = solid.massProperties().com;
  const volume = BOX_VOLUME - v;
  const centroid = [0, 1, 2].map((i) => (BOX_VOLUME * BOX_CENTROID[i] - v * c[i]) / volume) as Vec3;
  return { volume, centroid };
}

const relClose = (actual: number, expected: number, rel = 1e-6): void => {
  expect(Math.abs(actual - expected) / Math.abs(expected)).toBeLessThan(rel);
};

describe('cutout with a spline or NURBS profile', () => {
  beforeAll(async () => {
    await initOcct();
  }, 60_000);

  it('cuts an exact elliptical through-hole: removed volume is π·rx·ry·H', async () => {
    const solid = await lowerScript(cut(`path().ellipse(0, 0, 12, 6)`, `{ face: 'top', depth: 'through' }`));
    relClose(removed(solid).volume, Math.PI * 12 * 6 * H);
    const bb = solid.boundingBox();
    expect(bb.min).toEqual([0, 0, 0].map((x) => expect.closeTo(x, 6)));
    expect(bb.max).toEqual([W, D, H].map((x) => expect.closeTo(x, 6)));
  });

  it('a blind elliptical pocket removes π·rx·ry / (w·h) of a same-depth rectangular pocket', async () => {
    const rect = await lowerScript(cut(`path().moveTo(-5, -4).lineTo(5, -4).lineTo(5, 4).lineTo(-5, 4).close()`, `{ face: 'top', depth: 8 }`));
    const ell = await lowerScript(cut(`path().ellipse(0, 0, 12, 6, { rotationDeg: 30 })`, `{ face: 'top', depth: 8 }`));
    relClose(removed(ell).volume / removed(rect).volume, (Math.PI * 12 * 6) / (10 * 8));
    // Both pockets have the same floor and are centred on the top face.
    for (let i = 0; i < 3; i++) expect(removed(ell).centroid[i]).toBeCloseTo(removed(rect).centroid[i], 5);
  });

  it('places an off-centre profile on a side face in the same frame as a polyline profile', async () => {
    const square = `path().moveTo(4, 1).lineTo(8, 1).lineTo(8, 5).lineTo(4, 5).close()`;
    const ref = removed(await lowerScript(cut(square, `{ face: 'right', depth: 'through' }`)));
    const ell = removed(await lowerScript(cut(`path().ellipse(6, 3, 5, 3, { rotationDeg: 20 })`, `{ face: 'right', depth: 'through' }`)));
    relClose(ell.volume, Math.PI * 5 * 3 * W);
    // The profile centre (6, 3) maps to one world point; the cut runs along X.
    for (let i = 0; i < 3; i++) expect(ell.centroid[i]).toBeCloseTo(ref.centroid[i], 5);
    expect(Math.hypot(ell.centroid[1] - D / 2, ell.centroid[2] - H / 2)).toBeCloseTo(Math.hypot(6, 3), 5);
  });

  // The top-face frame has its origin at the face centroid (30, 20, 20) and
  // its x axis along +X, so the same profile extruded on XY and moved there is
  // an explicit boolean that the cutout must reproduce.
  const explicitCut = (profile: string): string =>
    `return box(${W}, ${D}, ${H}).subtract(${profile}.extrude(${2 * H}).translate(${W / 2}, ${D / 2}, ${-H / 2}));`;

  it.each([
    ['a spline', `path().moveTo(-10, -5).lineTo(10, -5).spline([[10, -5], [0, 8], [-10, -5]]).close()`],
    ['a G2 Hermite segment', `path().moveTo(-10, 0).hermiteG2({ point: [-10, 0], tangent: [0, 15], curvature: [8, 0] }, { point: [10, 0], tangent: [0, -15], curvature: [-8, 0] }).close()`],
    ['a line run, an elliptical arc and a smooth spline', `path().moveTo(-12, -6).lineTo(12, -6).ellipseArc(12, 6, 8, 6).smoothSpline(-12, -6).close()`],
  ])('cuts a profile with %s exactly as the explicit boolean does', async (_label, profile) => {
    const solid = await lowerScript(cut(profile, `{ face: 'top', depth: 'through' }`));
    const reference = await lowerScript(explicitCut(profile));
    relClose(solid.volume(), reference.volume(), 1e-9);
    expect(solid.getReplicadShape().faces.length).toBe(reference.getReplicadShape().faces.length);
    const c = solid.massProperties().com;
    const r = reference.massProperties().com;
    for (let i = 0; i < 3; i++) expect(c[i]).toBeCloseTo(r[i], 6);
    const bb = solid.boundingBox();
    expect(bb.max).toEqual([W, D, H].map((x) => expect.closeTo(x, 6)));
  });

  // The floor is not checked here: a blind cutout overshoots its depth by
  // 0.01 mm, so no cutout floor, polyline or not, gets the 'floor' label.
  it.each([
    ['an ellipse', `path().ellipse(0, 0, 12, 6)`, 4],
    ['a spline', `path().moveTo(-10, -5).lineTo(10, -5).spline([[10, -5], [0, 8], [-10, -5]]).close()`, 2],
  ])('labels every side face of %s pocket as a wall', async (_label, profile, sides) => {
    const solid = await lowerScript(cut(profile, `{ face: 'top', depth: 8 }`));
    const walls = [...(solid.historyMap?.values() ?? [])].filter(
      (l) => l.featureKind === 'cutout' && l.labelName === 'wall',
    );
    expect(walls).toHaveLength(sides);
  });
});
