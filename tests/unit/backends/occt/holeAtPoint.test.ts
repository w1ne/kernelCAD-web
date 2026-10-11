// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Point-placed holes: `hole(face, { at, axis? })` drills from any face — a
// radial set screw or cross pin straight into a cylinder side — with the same
// created refs and thread metadata as a planar `{ u, v }` hole.
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, type OcctBackend } from '../../../../src/kernel/backends/occt/occtBackend';
import { detectCylindricalHoles } from '../../../../src/kernel/backends/occt/holeDetection';
import { exitFromIntervals } from '../../../../src/kernel/backends/occt/holeAtPoint';
import { isoMinorRadius } from '../../../../src/kernel/backends/occt/isoThread';
import { runScript } from '../../../../src/modeling/runtime/runScript';
import { RecomputeEngine } from '../../../../src/modeling/compute/recomputeEngine';
import { OcctLowerer } from '../../../../src/modeling/backends/occt/occtLowerer';
import type { CompilerDiagnostic } from '../../../../src/shared/diagnostics/diagnostic';

async function lower(code: string) {
  const { records } = await runScript({ code, fileName: 'test.kcad.ts' });
  const r = await new RecomputeEngine(new OcctLowerer()).run(records);
  const last = records[records.length - 1];
  const errors = (r.diagnostics as CompilerDiagnostic[]).filter(d => d.severity === 'error');
  return { shape: r.shapes.get(last.id) as OcctBackend | undefined, errors, records, last };
}

/** Ø22 × 10 collar about Z with a Ø8 through bore. */
const COLLAR = "cylinder(10, 11).hole('top', { u: 0, v: 0, diameter: 8, depth: 'through', name: 'bore' })";
const COLLAR_VOLUME = Math.PI * (11 * 11 - 4 * 4) * 10;
const SIDE = "{ ofSurfaceType: 'CYLINDER' }";

function radialHoles(shape: OcctBackend) {
  return detectCylindricalHoles(shape).filter(h => Math.abs(h.axisDirection[2]) < 1e-6);
}

describe('hole on a cylindrical face', () => {
  beforeAll(async () => { await initOcct(); });

  it('reproduction: { u, v } on the cylinder side is not on the face; a CYLINDER query now matches', async () => {
    const uv = await lower(`return cylinder(25, 10).hole(${SIDE}, { u: 0, v: 0, diameter: 3, depth: 5 });`);
    // Before: the CYLINDER query matched nothing (feature.selection.no-match).
    expect(uv.errors.map(e => e.code)).toEqual(['feature.hole.cut-missing']);
    expect(uv.errors[0].message).toContain('outside-face');
  });

  it('radial M4 set screw: at { angleDeg, z }, through to the bore, thread recorded', async () => {
    const { shape, errors, last } = await lower(`
      return ${COLLAR}.hole(${SIDE}, { at: { angleDeg: 0, z: 5 }, diameter: 4, depth: 'through', thread: { pitch: 0.7 }, name: 'setScrew' });`);
    expect(errors).toEqual([]);
    expect(last.params.threadPitch.evaluated).toBe(0.7);
    const minor = 2 * isoMinorRadius(4, 0.7);
    const holes = radialHoles(shape!);
    expect(holes).toHaveLength(1);
    const h = holes[0];
    expect(h.diameterMm).toBeCloseTo(minor, 3);
    expect(Math.abs(h.axisDirection[0])).toBeCloseTo(1, 6);
    expect(h.axisOrigin[1]).toBeCloseTo(0, 4);
    expect(h.axisOrigin[2]).toBeCloseTo(5, 4);
    // Depth along the axis: outer wall (r = 11) to the bore (r = 4); the bore
    // wall's ends follow both curved surfaces, so allow their sag.
    expect(h.depthMm).toBeGreaterThan(6.5);
    expect(h.depthMm).toBeLessThan(7.35);
    const removed = COLLAR_VOLUME - shape!.volume();
    expect(removed).toBeGreaterThan(Math.PI * (minor / 2) ** 2 * 6.5);
    expect(removed).toBeLessThan(Math.PI * (minor / 2) ** 2 * 7.05);
  });

  it('creates the same refs as a planar hole: wall + floor (blind), named', async () => {
    const { shape, errors, last } = await lower(`
      return ${COLLAR}.hole(${SIDE}, { at: [0, 11, 5], diameter: 3, depth: 4, name: 'pin' });`);
    expect(errors).toEqual([]);
    const refs = [...shape!.historyMap!.values()].filter(l => l.featureId === last.id);
    const names = refs.map(l => l.labelName).sort();
    expect(names).toContain('wall');
    expect(names).toContain('floor');
    expect(refs.every(l => l.featureName === 'pin')).toBe(true);
    const holes = radialHoles(shape!);
    expect(holes).toHaveLength(1);
    expect(Math.abs(holes[0].axisDirection[1])).toBeCloseTo(1, 6);
    expect(holes[0].kind).toBe('blind');
    expect(holes[0].depthMm).toBeCloseTo(4, 1); // floor 4 mm below the tangent entry point
  });

  it('the hole axis defaults to the inward normal; `axis` drills at an angle', async () => {
    const { shape, errors } = await lower(`
      return cylinder(25, 10).hole(${SIDE}, { at: [10, 0, 12.5], axis: [-1, 0, -0.5], diameter: 3, depth: 6 });`);
    expect(errors).toEqual([]);
    const h = detectCylindricalHoles(shape!)[0];
    const n = Math.hypot(1, 0.5);
    expect(Math.abs(h.axisDirection[0])).toBeCloseTo(1 / n, 4);
    expect(Math.abs(h.axisDirection[2])).toBeCloseTo(0.5 / n, 4);
  });

  it('a cross pin straight through a solid shaft with a numeric depth', async () => {
    const { shape, errors } = await lower(`
      return cylinder(30, 5).hole(${SIDE}, { at: { angleDeg: 90, z: 15 }, diameter: 2, depth: 10 });`);
    expect(errors).toEqual([]);
    const h = detectCylindricalHoles(shape!)[0];
    expect(h.kind).toBe('through');
    expect(Math.abs(h.axisDirection[1])).toBeCloseTo(1, 6);
  });

  it('an `at` point off the face fails with feature.hole.cut-missing naming the distance', async () => {
    const { errors } = await lower(`return cylinder(25, 10).hole(${SIDE}, { at: [13, 0, 12.5], diameter: 3, depth: 4 });`);
    expect(errors.map(e => e.code)).toEqual(['feature.hole.cut-missing']);
    expect(errors[0].message).toContain('3.000 mm away');
  });

  it('an axis pointing out of the body is rejected', async () => {
    const { errors } = await lower(`return cylinder(25, 10).hole(${SIDE}, { at: [10, 0, 12.5], axis: [1, 0, 0], diameter: 3, depth: 4 });`);
    expect(errors.map(e => e.code)).toEqual(['feature.invalid-args']);
  });

  it('works on planar faces too: at a world point on the top of a plate', async () => {
    const { shape, errors } = await lower(`return box(40, 30, 6).hole('top', { at: [10, 5, 6], diameter: 4, depth: 'through' });`);
    expect(errors).toEqual([]);
    const h = detectCylindricalHoles(shape!)[0];
    expect(h.axisOrigin[0]).toBeCloseTo(10, 4);
    expect(h.axisOrigin[1]).toBeCloseTo(5, 4);
    expect(h.kind).toBe('through');
  });
});

describe('hole({ at }) capture-time validation', () => {
  it('rejects `at` together with u / v', async () => {
    await expect(runScript({ code: `return cylinder(25, 10).hole(${SIDE}, { u: 0, v: 0, at: [10, 0, 5], diameter: 3, depth: 4 });`, fileName: 't.kcad.ts' }))
      .rejects.toThrow(/either \{ u, v \}/);
  });
  it('rejects a malformed `at`', async () => {
    await expect(runScript({ code: `return cylinder(25, 10).hole(${SIDE}, { at: [10, 0], diameter: 3, depth: 4 } as any);`, fileName: 't.kcad.ts' }))
      .rejects.toThrow(/world point/);
  });
});

describe('exitFromIntervals', () => {
  it('returns where the material run that starts at the entry ends', () => {
    expect(exitFromIntervals([[0, 7], [15, 22]])).toBe(7);
    expect(exitFromIntervals([[-0.05, 3], [3, 5]])).toBe(5);
    expect(exitFromIntervals([[2, 5]])).toBeUndefined();
    expect(exitFromIntervals([])).toBeUndefined();
  });
});
