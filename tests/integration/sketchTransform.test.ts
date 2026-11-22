// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Sketch.translate / Sketch.rotate / Sketch.scale: move, turn and resize a
// closed 2D profile before it becomes a solid.
//
// The expectations are closed-form. RECT is 40 × 20 mm (800 mm²) with its
// lower-left corner on the origin. SLOT is a 30 × 10 mm stadium (two R5 end
// arcs, one per arc command kind where the test needs it): area
// 20·10 + π·5² mm².

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';
import { getOC } from 'replicad';
import { initOcct, type OcctBackend } from '../../src/kernel/backends/occt/occtBackend';
import { isValidShape } from '../../src/kernel/backends/occt/booleanRecovery';
import { runScript } from '../../src/modeling/runtime/runScript';
import { RecomputeEngine } from '../../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../src/modeling/backends/occt/occtLowerer';
import type { CompilerDiagnostic } from '../../src/shared/diagnostics/diagnostic';
import type { SketchCommand } from '../../src/shared/capture/sketchCommand';

type Run = Awaited<ReturnType<typeof runScript>>;

async function lowerRun(run: Run) {
  const engine = new RecomputeEngine(createOcctLowerer(run.session));
  const r = await engine.run(run.records, { paramTable: run.paramTable });
  expect((r.diagnostics as CompilerDiagnostic[]).filter((d) => d.severity === 'error')).toEqual([]);
  const solid = r.shapes.get(run.records[run.records.length - 1].id) as OcctBackend;
  expect(isValidShape(getOC(), solid.getReplicadShape().wrapped)).toBe(true);
  return solid;
}

async function lowerScript(code: string) {
  const run = await runScript({ code, fileName: 'test.kcad.ts' });
  return { run, records: run.records, solid: await lowerRun(run) };
}

async function relower(run: Run, param: string, value: number) {
  run.paramTable.set(param, value);
  return lowerRun(run);
}

function faceCount(solid: OcctBackend): number {
  return (solid.getReplicadShape() as unknown as { faces: unknown[] }).faces.length;
}

function expectBox(solid: OcctBackend, min: [number, number], max: [number, number], digits = 6) {
  const bb = solid.boundingBox();
  expect(bb.min[0]).toBeCloseTo(min[0], digits);
  expect(bb.min[1]).toBeCloseTo(min[1], digits);
  expect(bb.max[0]).toBeCloseTo(max[0], digits);
  expect(bb.max[1]).toBeCloseTo(max[1], digits);
}

async function captureError(code: string): Promise<{ code?: string; message: string }> {
  try {
    await runScript({ code, fileName: 'test.kcad.ts' });
  } catch (e) {
    return e as { code?: string; message: string };
  }
  throw new Error('expected the script to throw');
}

function sketchCommands(records: Run['records']): SketchCommand[][] {
  return records
    .filter((r) => r.kind === 'sketch')
    .map((r) => (r.metadata as { commands: SketchCommand[] }).commands);
}

const RECT = `path().moveTo(0, 0).lineTo(40, 0).lineTo(40, 20).lineTo(0, 20).close()`;
const RECT_AREA = 800;
// Counter-clockwise stadium from (5, 0): bottom, right end, top, left end.
const slot = (rightArc: string, leftArc: string) =>
  `path().moveTo(5, 0).lineTo(25, 0).${rightArc}.lineTo(5, 10).${leftArc}.close()`;
const SLOT = slot('threePointsArc(25, 10, 30, 5)', 'threePointsArc(5, 0, 0, 5)');
const SLOT_AREA = 200 + 25 * Math.PI;

describe('Sketch.translate', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('moves the profile by (dx, dy) and keeps its area', async () => {
    const { solid } = await lowerScript(`return ${RECT}.translate(10, -5).extrude(5);`);
    expect(solid.volume()).toBeCloseTo(RECT_AREA * 5, 6);
    expectBox(solid, [10, -5], [50, 15]);
  });

  it('leaves the source sketch unchanged and records plain numbers', async () => {
    const { records, solid } = await lowerScript(`
      const base = ${RECT};
      const moved = base.translate(100, 0);
      return base.extrude(2);
    `);
    expectBox(solid, [0, 0], [40, 20]);
    const [source, moved] = sketchCommands(records);
    expect(source[1]).toMatchObject({ kind: 'lineTo', x: { evaluated: 40 }, y: { evaluated: 0 } });
    expect((moved[1] as { x: unknown }).x).toEqual({ expression: '140', unit: 'mm', evaluated: 140 });
  });

  it('follows a ParamRef delta when the parameter changes', async () => {
    const run = await runScript({
      code: `
        const dx = param('dx', 10);
        return ${RECT}.translate(dx, 0).extrude(1);
      `,
      fileName: 'translateParam.kcad.ts',
    });
    expectBox(await relower(run, 'dx', 10), [10, 0], [50, 20]);
    expectBox(await relower(run, 'dx', 35), [35, 0], [75, 20]);
  });

  it('moves every loop of a profile with holes', async () => {
    const { solid } = await lowerScript(`
      const plate = await ${RECT}.subtract(path().circle(10, 10, 4));
      return plate.translate(-40, 30).extrude(3);
    `);
    expect(solid.volume()).toBeCloseTo((RECT_AREA - 16 * Math.PI) * 3, 6);
    expectBox(solid, [-40, 30], [0, 50]);
    // 6 box faces + the hole wall, which a sketch boolean returns as 2 arcs.
    expect(faceCount(solid)).toBe(8);
  });

  it('places copies of one profile for a sketch boolean', async () => {
    const { solid } = await lowerScript(`
      const hole = path().circle(0, 0, 3);
      const plate = await ${RECT}.subtract([hole.translate(10, 10), hole.translate(30, 10)]);
      return plate.extrude(4);
    `);
    expect(solid.volume()).toBeCloseTo((RECT_AREA - 2 * 9 * Math.PI) * 4, 6);
    // 6 box faces + 2 hole walls of 2 arcs each.
    expect(faceCount(solid)).toBe(10);
  });
});

describe('Sketch.rotate', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('turns counter-clockwise about the origin; a quarter turn is exact', async () => {
    const { records, solid } = await lowerScript(`return ${RECT}.rotate(90).extrude(5);`);
    expect(solid.volume()).toBeCloseTo(RECT_AREA * 5, 6);
    expectBox(solid, [-20, 0], [0, 40], 9);
    const rotated = sketchCommands(records)[1];
    // (40, 0) → (0, 40) with no 1e-15 residue from cos 90°.
    expect(rotated[1]).toMatchObject({ kind: 'lineTo', x: { evaluated: 0 }, y: { evaluated: 40 } });
  });

  it('turns about a given centre', async () => {
    const { solid } = await lowerScript(`return ${RECT}.rotate(30, [20, 10]).extrude(5);`);
    expect(solid.volume()).toBeCloseTo(RECT_AREA * 5, 6);
    const c = Math.cos(Math.PI / 6);
    const s = Math.sin(Math.PI / 6);
    const hx = 20 * c + 10 * s;
    const hy = 20 * s + 10 * c;
    expectBox(solid, [20 - hx, 10 - hy], [20 + hx, 10 + hy]);
  });

  it.each([
    ['threePointsArc', SLOT],
    ['radiusArc', slot('radiusArc(25, 10, -5)', 'radiusArc(5, 0, -5)')],
    ['sagittaArc', slot('sagittaArc(25, 10, -5)', 'sagittaArc(5, 0, -5)')],
    ['bulgeArc', slot('bulgeArc(25, 10, 1)', 'bulgeArc(5, 0, 1)')],
    ['tangentArc', slot('tangentArc(25, 10)', 'tangentArc(5, 0)')],
  ])('keeps %s segments exact arcs with the same bulge side', async (_kind, source) => {
    const plain = await lowerScript(`return ${source}.extrude(2);`);
    expect(plain.solid.volume()).toBeCloseTo(SLOT_AREA * 2, 6);
    const { solid } = await lowerScript(`return ${source}.rotate(90).extrude(2);`);
    expect(solid.volume()).toBeCloseTo(SLOT_AREA * 2, 6);
    // The 30 × 10 slot along +X now stands along +Y, left of the Y axis.
    expectBox(solid, [-10, 0], [0, 30]);
    expect(faceCount(solid)).toBe(faceCount(plain.solid));
  });

  it('keeps ParamRef coordinates symbolic', async () => {
    const run = await runScript({
      code: `
        const w = param('w', 40);
        return path().moveTo(0, 0).lineTo(w, 0).lineTo(w, 20).lineTo(0, 20).close().rotate(90).extrude(1);
      `,
      fileName: 'rotateParam.kcad.ts',
    });
    expectBox(await relower(run, 'w', 40), [-20, 0], [0, 40]);
    expectBox(await relower(run, 'w', 60), [-20, 0], [0, 60]);
  });

  it('refuses a ParamRef angle and a non-finite angle', async () => {
    const paramAngle = await captureError(`return ${RECT}.rotate(param('a', 30)).extrude(1);`);
    expect(paramAngle.code).toBe('feature.invalid-args');
    expect(paramAngle.message).toMatch(/plain number/);
    const nan = await captureError(`return ${RECT}.rotate(NaN).extrude(1);`);
    expect(nan.code).toBe('feature.invalid-args');
  });
});

describe('Sketch.scale', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('scales lengths by the factor and area by its square', async () => {
    const { solid } = await lowerScript(`return ${RECT}.scale(1.5).extrude(2);`);
    expect(solid.volume()).toBeCloseTo(RECT_AREA * 2.25 * 2, 6);
    expectBox(solid, [0, 0], [60, 30]);
  });

  it('scales about a given centre', async () => {
    const { solid } = await lowerScript(`return ${RECT}.scale(0.5, [20, 10]).extrude(2);`);
    expectBox(solid, [10, 5], [30, 15]);
  });

  it.each([
    ['threePointsArc', SLOT],
    ['radiusArc', slot('radiusArc(25, 10, -5)', 'radiusArc(5, 0, -5)')],
    ['sagittaArc', slot('sagittaArc(25, 10, -5)', 'sagittaArc(5, 0, -5)')],
    ['bulgeArc', slot('bulgeArc(25, 10, 1)', 'bulgeArc(5, 0, 1)')],
  ])('scales the %s radius with the chord', async (_kind, source) => {
    const plain = await lowerScript(`return ${source}.extrude(2);`);
    const { solid } = await lowerScript(`return ${source}.scale(2).extrude(2);`);
    expect(solid.volume()).toBeCloseTo(SLOT_AREA * 4 * 2, 6);
    expectBox(solid, [0, 0], [60, 20]);
    expect(faceCount(solid)).toBe(faceCount(plain.solid));
  });

  it('follows a ParamRef factor when the parameter changes', async () => {
    const run = await runScript({
      code: `
        const k = param('k', 2);
        return ${SLOT.replace('threePointsArc(25, 10, 30, 5)', 'radiusArc(25, 10, -5)')}.scale(k).extrude(1);
      `,
      fileName: 'scaleParam.kcad.ts',
    });
    expect((await relower(run, 'k', 2)).volume()).toBeCloseTo(SLOT_AREA * 4, 6);
    const at3 = await relower(run, 'k', 3);
    expect(at3.volume()).toBeCloseTo(SLOT_AREA * 9, 6);
    expectBox(at3, [0, 0], [90, 30]);
  });

  it('refuses a zero, negative or non-finite factor', async () => {
    for (const factor of ['0', '-1', 'Infinity']) {
      const err = await captureError(`return ${RECT}.scale(${factor}).extrude(1);`);
      expect(err.code).toBe('feature.invalid-args');
    }
  });
});

describe('Sketch transforms — composition and refusals', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('chains in call order', async () => {
    // Rotate first, then move: the turned rectangle [-20, 0] × [0, 40] shifts by (20, 0).
    const a = await lowerScript(`return ${RECT}.rotate(90).translate(20, 0).extrude(1);`);
    expectBox(a.solid, [0, 0], [20, 40]);
    // Move first, then rotate about the origin: [20, 60] × [0, 20] turns to [-20, 0] × [20, 60].
    const b = await lowerScript(`return ${RECT}.translate(20, 0).rotate(90).extrude(1);`);
    expectBox(b.solid, [-20, 20], [0, 60]);
  });

  // One profile per command kind that carries more than a point: tangent and
  // curvature vectors, control nets and tangency specs.
  it.each([
    ['spline with end tangents',
      `path().moveTo(0, 0).lineTo(20, 0).spline([[20, 0], [26, 6], [20, 12]], { startTangent: [1, 1], endTangent: [-1, 1] }).lineTo(0, 12).close()`],
    ['nurbsSegment', `path().moveTo(0, 0).nurbsSegment([[0, 0], [5, 10], [15, 10], [20, 0]]).close()`],
    ['hermiteG2 with curvature',
      `path().moveTo(-10, 0).hermiteG2({ point: [-10, 0], tangent: [0, 15], curvature: [8, 0] }, { point: [10, 0], tangent: [0, -15], curvature: [-8, 0] }).close()`],
    ['tangentCircle',
      `path().tangentCircle([{ kind: 'line', from: [0, 0], to: [1, 0], side: 'enclosed' }, { kind: 'line', from: [0, 0], to: [0, 1], side: 'outside' }], { radius: 3 })`],
    ['tangentLine between unequal circles',
      `path().tangentLine({ kind: 'circle', center: [0, 0], radius: 5 }, { kind: 'circle', center: [40, 0], radius: 8 }, { near: [20, 50] })
        .lineTo(40, 0).lineTo(0, 0).close()`],
  ])('keeps the shape of a %s profile under a turn, a resize and a move', async (_kind, source) => {
    const plain = await lowerScript(`return ${source}.extrude(2);`);
    const { solid } = await lowerScript(`
      return ${source}.rotate(37, [3, 4]).scale(1.5, [-2, 1]).translate(7, -3).extrude(2);
    `);
    const expected = plain.solid.volume() * 2.25;
    // An interpolated spline is refitted to a tolerance after the transform.
    const tolerance = source.includes('.spline(') ? 1e-4 : 1e-9;
    expect(Math.abs(solid.volume() - expected) / expected).toBeLessThan(tolerance);
    expect(faceCount(solid)).toBe(faceCount(plain.solid));
    // The transformed centroid is the image of the source centroid.
    const [gx, gy] = plain.solid.massProperties().com;
    const c = Math.cos((37 * Math.PI) / 180);
    const sn = Math.sin((37 * Math.PI) / 180);
    const rx = 3 + c * (gx - 3) - sn * (gy - 4);
    const ry = 4 + sn * (gx - 3) + c * (gy - 4);
    const [tx, ty] = solid.massProperties().com;
    const digits = source.includes('.spline(') ? 3 : 6;
    expect(tx).toBeCloseTo(-2 + 1.5 * (rx + 2) + 7, digits);
    expect(ty).toBeCloseTo(1 + 1.5 * (ry - 1) - 3, digits);
  });

  // The free end tangent of a smoothSpline is the sketch +X direction. Every
  // transform writes the mapped direction into the command, so the curve
  // keeps its shape (tests/integration/smoothSplineTangent.test.ts).
  it('moves, resizes and turns a smoothSpline profile', async () => {
    const source = `path().moveTo(0, 0).lineTo(20, 0).smoothSpline(24, 8).smoothSpline(20, 14).lineTo(0, 14).close()`;
    const plain = await lowerScript(`return ${source}.extrude(2);`);
    const { solid } = await lowerScript(`return ${source}.scale(1.5, [-2, 1]).translate(7, -3).rotate(30).extrude(2);`);
    const expected = plain.solid.volume() * 2.25;
    expect(Math.abs(solid.volume() - expected) / expected).toBeLessThan(1e-9);
  });

  it('keeps segment labels', async () => {
    const { records } = await lowerScript(`
      return path().moveTo(0, 0).lineTo(10, 0).label('rim').lineTo(10, 5).lineTo(0, 5).close()
        .translate(1, 1).rotate(90).scale(2).extrude(1);
    `);
    for (const commands of sketchCommands(records)) {
      expect((commands[1] as { label?: string }).label).toBe('rim');
    }
  });

  it('transforms a derived sketch (offset result)', async () => {
    const { solid } = await lowerScript(`
      const land = await ${RECT}.offset(-2, { corners: 'sharp' });
      return land.translate(50, 0).scale(2, [52, 2]).extrude(1);
    `);
    expect(solid.volume()).toBeCloseTo(36 * 16 * 4, 6);
    expectBox(solid, [52, 2], [124, 34]);
  });

  it('cookbook sketch-transform-place-profile: three placed slots, closed-form volume', async () => {
    const md = readFileSync(resolve(__dirname, '../../cookbook/snippets/sketch-transform-place-profile.md'), 'utf8');
    const code = /```typescript\n([\s\S]*?)```/.exec(md)![1];
    const { solid } = await lowerScript(code);
    // 80 × 50 × 4 flange minus three 16 × 6 slots (10 × 6 + π·3² each).
    expect(solid.volume()).toBeCloseTo((4000 - 3 * (60 + 9 * Math.PI)) * 4, 6);
    expectBox(solid, [-40, -25], [40, 25]);
    // 6 flange faces + 4 walls per slot.
    expect(faceCount(solid)).toBe(18);
  });

  it('refuses a sketch that has no path commands', async () => {
    const err = await captureError(`
      return sketch.text('AB', { size: 10 }).translate(5, 5).extrude(1);
    `);
    expect(err.code).toBe('feature.invalid-args');
    expect(err.message).toMatch(/translate/);
  });

  it('refuses wrong argument shapes', async () => {
    for (const call of [`translate(1)`, `translate('1', 2)`, `rotate(10, [1])`, `scale(2, 5)`, `rotate()`]) {
      const err = await captureError(`return ${RECT}.${call}.extrude(1);`);
      expect(err.code, call).toBe('feature.invalid-args');
    }
  });
});
