// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Regression for a tapered (drafted) sketch extrude: a positive taper narrows
// the profile toward the far end, a negative taper widens it.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFile } from 'node:fs/promises';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { isTopologicallyValid } from '../../../src/kernel/backends/occt/edgeFeatureValidity';
import { buildModel } from '../../../src/modeling/buildModel';

const SQUARE = 'path().moveTo(-10, -10).lineTo(10, -10).lineTo(10, 10).lineTo(-10, 10).close()';
const tan = (deg: number) => Math.tan((deg * Math.PI) / 180);
/** Volume of a square frustum with bottom side `a`, top side `b`, height `h`. */
const squareFrustum = (a: number, b: number, h: number) => (h / 3) * (a * a + b * b + a * b);

async function build(code: string) {
  return buildModel({ fileName: 'extrude-taper.kcad.ts', code });
}

function errors(model: Awaited<ReturnType<typeof build>>) {
  return model.diagnostics.filter((d) => d.severity === 'error');
}

/** Error codes from a build, whether capture threw or lowering reported them. */
async function errorCodes(code: string): Promise<string[]> {
  try {
    return errors(await build(code)).map((d) => d.code);
  } catch (e) {
    return [(e as { code?: string }).code ?? String(e)];
  }
}

function wrappedOf(shape: unknown): unknown {
  return (shape as { getReplicadShape(): { wrapped: unknown } }).getReplicadShape().wrapped;
}

describe('Sketch.extrude taperDeg', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('narrows a 20 mm square toward the top by depth·tan(taper) per side', async () => {
    const model = await build(`return ${SQUARE}.extrude(10, { taperDeg: 5 });`);
    expect(errors(model), JSON.stringify(model.diagnostics)).toEqual([]);
    const shape = model.tailShape!;
    expect(isTopologicallyValid(wrappedOf(shape))).toBe(true);

    const top = 20 - 2 * 10 * tan(5);
    const bb = shape.boundingBox();
    expect(bb.min[0]).toBeCloseTo(-10, 6);
    expect(bb.max[0]).toBeCloseTo(10, 6);
    expect(bb.min[2]).toBeCloseTo(0, 6);
    expect(bb.max[2]).toBeCloseTo(10, 6);
    expect(shape.volume()).toBeCloseTo(squareFrustum(20, top, 10), 3);

    // The slice just under the top keeps the narrowed square, centred.
    const cap = await build(
      `return ${SQUARE}.extrude(10, { taperDeg: 5 }).intersect(box(40, 40, 0.01).translate(-20, -20, 9.99));`,
    );
    expect(errors(cap), JSON.stringify(cap.diagnostics)).toEqual([]);
    const capBox = cap.tailShape!.boundingBox();
    expect(capBox.max[0] - capBox.min[0]).toBeCloseTo(top + 2 * 0.01 * tan(5), 3);
    expect(capBox.max[0] + capBox.min[0]).toBeCloseTo(0, 6);
  }, 120_000);

  it('widens the profile toward the top for a negative taper', async () => {
    const model = await build(`return ${SQUARE}.extrude(10, { taperDeg: -5 });`);
    expect(errors(model), JSON.stringify(model.diagnostics)).toEqual([]);
    const shape = model.tailShape!;
    expect(isTopologicallyValid(wrappedOf(shape))).toBe(true);
    const top = 20 + 2 * 10 * tan(5);
    expect(shape.boundingBox().max[0]).toBeCloseTo(top / 2, 3);
    expect(shape.boundingBox().max[2]).toBeCloseTo(10, 6);
    expect(shape.volume()).toBeCloseTo(squareFrustum(20, top, 10), 3);
  }, 120_000);

  it('turns a circular profile into a cone frustum', async () => {
    const model = await build(`
      return path().moveTo(10, 0).threePointsArc(-10, 0, 0, 10).threePointsArc(10, 0, 0, -10).close()
        .extrude(12, { taperDeg: 10 });
    `);
    expect(errors(model), JSON.stringify(model.diagnostics)).toEqual([]);
    const shape = model.tailShape!;
    expect(isTopologicallyValid(wrappedOf(shape))).toBe(true);
    const r = 10 - 12 * tan(10);
    expect(shape.volume()).toBeCloseTo((Math.PI * 12 / 3) * (100 + 10 * r + r * r), 2);
  }, 120_000);

  it('records no taper param and keeps the straight volume when taperDeg is 0', async () => {
    const model = await build(`return ${SQUARE}.extrude(10, { taperDeg: 0 });`);
    expect(errors(model), JSON.stringify(model.diagnostics)).toEqual([]);
    expect(model.tailShape!.volume()).toBeCloseTo(4000, 6);
  }, 120_000);

  it('rejects a taper that collapses the profile before the far end', async () => {
    // 10 mm half-width, 20 mm depth: the side faces meet at 26.6°.
    expect(await errorCodes(`return ${SQUARE}.extrude(20, { taperDeg: 30 });`))
      .toContain('feature.extrude.taper-failed');
  }, 120_000);

  it('names the spline side faces OCCT cannot draft instead of a raw wasm pointer', async () => {
    // A spline or Bézier segment extrudes to an EXTRUSION_SURFACE side face;
    // BRepOffsetAPI_DraftAngle throws a bare pointer on it at any angle.
    for (const profile of [
      'path().moveTo(-10, 0).smoothSpline(0, 8).smoothSpline(10, 0).lineTo(-10, 0).close()',
      'path().moveTo(-10, 0).quadraticTo([0, 10], [10, 0]).lineTo(-10, 0).close()',
    ]) {
      for (const taperDeg of [0.5, 3, -3]) {
        const model = await build(`return ${profile}.extrude(5, { taperDeg: ${taperDeg} });`);
        const [err] = errors(model);
        expect(err?.code, `${profile} ${taperDeg}`).toBe('feature.extrude.taper-failed');
        expect(err.message).toContain('side face(s) of type EXTRUSION_SURFACE');
        expect(err.message).not.toMatch(/taper failed: \d+$/);
        expect(err.hint).toContain('lines and arcs');
        expect(err.hint).not.toContain('Reduce taperDeg');
      }
    }
    // An arc side is a cylinder and still tapers.
    const arc = await build('return path().moveTo(-10, 0).sagittaArc(10, 0, 4).lineTo(-10, 0).close().extrude(5, { taperDeg: 3 });');
    expect(errors(arc), JSON.stringify(arc.diagnostics)).toEqual([]);
  }, 120_000);

  it('rejects an out-of-range taper and taper combined with twist', async () => {
    for (const code of [
      `return ${SQUARE}.extrude(10, { taperDeg: 90 });`,
      `return ${SQUARE}.extrude(10, { taperDeg: Number.NaN });`,
      `return ${SQUARE}.extrude(10, { taperDeg: 5, twistAngle: 30 });`,
    ]) {
      expect(await errorCodes(code), code).toContain('feature.invalid-args');
    }
  }, 120_000);
});

describe('drafted-boss-plate cookbook example', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('builds two 3° drafted bosses with pilot holes to the closed-form volume', async () => {
    const code = await readFile('examples/cookbook-parity/drafted-boss-plate.kcad.ts', 'utf8');
    const model = await buildModel({ fileName: 'drafted-boss-plate.kcad.ts', code });
    expect(errors(model), JSON.stringify(model.diagnostics)).toEqual([]);
    const shape = model.tailShape!;
    expect(isTopologicallyValid(wrappedOf(shape))).toBe(true);
    const top = 4 - 10 * tan(3);
    const boss = (Math.PI * 10 / 3) * (16 + 4 * top + top * top);
    const pilot = Math.PI * 1.25 * 1.25 * 9;
    expect(shape.volume()).toBeCloseTo(60 * 40 * 4 + 2 * boss - 2 * pilot, 2);
    expect(shape.boundingBox().min).toEqual([0, 0, 0]);
    expect(shape.boundingBox().max[2]).toBeCloseTo(14, 6);
  }, 120_000);
});
