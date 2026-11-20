// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// smoothSpline end tangents: a mirrored or turned smoothSpline profile keeps
// its shape, and `smoothSpline(x, y, { endTangent, startTangent })` states the
// tangents directly.
//
// The expectations are closed-form. A smoothSpline is one cubic Bézier whose
// two inner poles sit a quarter of the chord length from each end, along the
// start and the end tangent. `bezierArea` integrates x·dy over those poles, so
// the expected areas do not come from the kernel.

import { describe, it, expect, beforeAll } from 'vitest';
import { getOC } from 'replicad';
import { initOcct, type OcctBackend } from '../../src/kernel/backends/occt/occtBackend';
import { isValidShape } from '../../src/kernel/backends/occt/booleanRecovery';
import { runScript } from '../../src/modeling/runtime/runScript';
import { RecomputeEngine } from '../../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../src/modeling/backends/occt/occtLowerer';
import { rotateSketchCommands } from '../../src/shared/capture/rotateSketchCommands';
import { toParam } from '../../src/shared/runtime/editableHelpers';
import type { CompilerDiagnostic } from '../../src/shared/diagnostics/diagnostic';
import type { SketchCommand } from '../../src/shared/capture/sketchCommand';

type Run = Awaited<ReturnType<typeof runScript>>;
type Vec2 = [number, number];

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
  return { run, solid: await lowerRun(run) };
}

async function captureError(code: string): Promise<{ code?: string; message: string }> {
  try {
    await runScript({ code, fileName: 'test.kcad.ts' });
  } catch (e) {
    return e as { code?: string; message: string };
  }
  throw new Error('expected the script to throw');
}

function expectBox(solid: OcctBackend, min: Vec2, max: Vec2, digits = 6) {
  const bb = solid.boundingBox();
  expect(bb.min[0]).toBeCloseTo(min[0], digits);
  expect(bb.min[1]).toBeCloseTo(min[1], digits);
  expect(bb.max[0]).toBeCloseTo(max[0], digits);
  expect(bb.max[1]).toBeCloseTo(max[1], digits);
}

/** Integral of x·dy along the smoothSpline from `a` to `b` (Simpson, 400 steps
 *  on a degree-5 polynomial). `start` and `end` are the travel directions. */
function bezierArea(a: Vec2, b: Vec2, start: Vec2, end: Vec2): number {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]) / 4;
  const unit = (v: Vec2): Vec2 => [v[0] / Math.hypot(...v), v[1] / Math.hypot(...v)];
  const s = unit(start);
  const e = unit(end);
  const p = [a, [a[0] + s[0] * d, a[1] + s[1] * d], [b[0] - e[0] * d, b[1] - e[1] * d], b];
  const f = (t: number): number => {
    const u = 1 - t;
    const x = u ** 3 * p[0][0] + 3 * u * u * t * p[1][0] + 3 * u * t * t * p[2][0] + t ** 3 * p[3][0];
    const dy = 3 * u * u * (p[1][1] - p[0][1]) + 6 * u * t * (p[2][1] - p[1][1]) + 3 * t * t * (p[3][1] - p[2][1]);
    return x * dy;
  };
  const n = 400;
  let sum = f(0) + f(1);
  for (let i = 1; i < n; i++) sum += f(i / n) * (i % 2 === 1 ? 4 : 2);
  return sum / (3 * n);
}

// A 20 × 14 mm plate with a bulged right edge: two chained smoothSplines.
// The straight edges add nothing to the x·dy integral (dy = 0 or x = 0).
const BULGE = `path().moveTo(0, 0).lineTo(20, 0).smoothSpline(24, 8).smoothSpline(20, 14).lineTo(0, 14).close()`;
const BULGE_AREA = bezierArea([20, 0], [24, 8], [1, 0], [1, 0]) + bezierArea([24, 8], [20, 14], [1, 0], [1, 0]);
// A smoothSpline directly after moveTo: both of its tangents are free.
const RAMP = `path().moveTo(0, 0).smoothSpline(10, 6).lineTo(10, 12).lineTo(0, 12).close()`;
const RAMP_AREA = bezierArea([0, 0], [10, 6], [1, 0], [1, 0]) + 10 * 6;

describe('smoothSpline end tangents', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('builds the documented quarter-chord Bézier (oracle check)', async () => {
    const bulge = await lowerScript(`return ${BULGE}.extrude(1);`);
    expect(bulge.solid.volume()).toBeCloseTo(BULGE_AREA, 6);
    const ramp = await lowerScript(`return ${RAMP}.extrude(1);`);
    expect(ramp.solid.volume()).toBeCloseTo(RAMP_AREA, 6);
    expectBox(ramp.solid, [0, 0], [10, 12]);
  });

  it.each(['x', 'y'] as const)("reflect('%s') keeps the area and mirrors the bounding box", async (axis) => {
    const plain = await lowerScript(`return ${BULGE}.extrude(1);`);
    const { solid } = await lowerScript(`return ${BULGE}.reflect('${axis}').extrude(1);`);
    expect(solid.volume()).toBeCloseTo(BULGE_AREA, 6);
    const bb = plain.solid.boundingBox();
    if (axis === 'x') expectBox(solid, [bb.min[0], -bb.max[1]], [bb.max[0], -bb.min[1]]);
    else expectBox(solid, [-bb.max[0], bb.min[1]], [-bb.min[0], bb.max[1]]);
  });

  it('reflects across an offset axis and back to the source profile', async () => {
    const plain = await lowerScript(`return ${BULGE}.extrude(1);`);
    const bb = plain.solid.boundingBox();
    const once = await lowerScript(`return ${BULGE}.reflect({ axis: 'y', offset: 30 }).extrude(1);`);
    expect(once.solid.volume()).toBeCloseTo(BULGE_AREA, 6);
    expectBox(once.solid, [60 - bb.max[0], 0], [60, 14]);
    const twice = await lowerScript(`return ${BULGE}.reflect('y').reflect('y').extrude(1);`);
    expect(twice.solid.volume()).toBeCloseTo(BULGE_AREA, 6);
    expectBox(twice.solid, [bb.min[0], bb.min[1]], [bb.max[0], bb.max[1]]);
  });

  it('mirrors the free start tangent of a smoothSpline that follows moveTo', async () => {
    const { solid } = await lowerScript(`return ${RAMP}.reflect('y').extrude(1);`);
    expect(solid.volume()).toBeCloseTo(RAMP_AREA, 6);
    expectBox(solid, [-10, 0], [0, 12]);
  });

  it('Sketch.rotate turns a smoothSpline profile without changing it', async () => {
    const plain = await lowerScript(`return ${BULGE}.extrude(1);`);
    const bb = plain.solid.boundingBox();
    const quarter = await lowerScript(`return ${BULGE}.rotate(90).extrude(1);`);
    expect(quarter.solid.volume()).toBeCloseTo(BULGE_AREA, 6);
    expectBox(quarter.solid, [-14, 0], [0, bb.max[0]]);
    const skew = await lowerScript(`return ${BULGE}.rotate(37, [5, -3]).extrude(1);`);
    expect(skew.solid.volume()).toBeCloseTo(BULGE_AREA, 6);
    const half = await lowerScript(`return ${RAMP}.rotate(180).extrude(1);`);
    expect(half.solid.volume()).toBeCloseTo(RAMP_AREA, 6);
    expectBox(half.solid, [-10, -12], [0, 0]);
  });

  it('translate and scale keep the curve', async () => {
    const { solid } = await lowerScript(`return ${BULGE}.scale(1.5, [-2, 1]).translate(7, -3).extrude(1);`);
    expect(solid.volume()).toBeCloseTo(BULGE_AREA * 2.25, 6);
  });

  it('loft section rotation writes the turned tangents into the command', () => {
    const p = (v: number) => toParam(v, 'mm');
    const commands: SketchCommand[] = [
      { kind: 'moveTo', x: p(0), y: p(0) },
      { kind: 'smoothSpline', x: p(10), y: p(6) },
      { kind: 'smoothSpline', x: p(4), y: p(12), endTangent: { x: p(0), y: p(2) } },
      { kind: 'close' },
    ];
    const out = rotateSketchCommands(commands, 90) as Array<Extract<SketchCommand, { kind: 'smoothSpline' }>>;
    const vec = (t?: { x: { evaluated: number }; y: { evaluated: number } }) => t && [t.x.evaluated, t.y.evaluated];
    // First segment: free start and end, both +X, turned to +Y.
    expect(vec(out[1].startTangent)![0]).toBeCloseTo(0, 12);
    expect(vec(out[1].startTangent)![1]).toBeCloseTo(1, 12);
    expect(vec(out[1].endTangent)![0]).toBeCloseTo(0, 12);
    expect(vec(out[1].endTangent)![1]).toBeCloseTo(1, 12);
    // Second segment: the start is inherited, the stated end [0, 2] turns to [-2, 0].
    expect(out[2].startTangent).toBeUndefined();
    expect(vec(out[2].endTangent)![0]).toBeCloseTo(-2, 12);
    expect(vec(out[2].endTangent)![1]).toBeCloseTo(0, 12);
    // The source list is unchanged.
    expect((commands[1] as { endTangent?: unknown }).endTangent).toBeUndefined();
  });

  it('opts.endTangent sets the arrival direction', async () => {
    // Arrive at (24, 8) travelling +Y, then continue straight up.
    const { solid } = await lowerScript(`
      return path().moveTo(0, 0).lineTo(20, 0).smoothSpline(24, 8, { endTangent: [0, 5] })
        .lineTo(24, 14).lineTo(0, 14).close().extrude(1);
    `);
    const area = bezierArea([20, 0], [24, 8], [1, 0], [0, 1]) + 24 * 6;
    // The default +X arrival gives a measurably different profile.
    expect(Math.abs(area - (bezierArea([20, 0], [24, 8], [1, 0], [1, 0]) + 24 * 6))).toBeGreaterThan(1);
    expect(solid.volume()).toBeCloseTo(area, 6);
    expectBox(solid, [0, 0], [24, 14]);
  });

  it('opts.startTangent replaces the inherited direction and survives a reflect', async () => {
    const source = `path().moveTo(0, 0).lineTo(20, 0)
      .smoothSpline(24, 8, { startTangent: [0, 1], endTangent: [-1, 1] }).lineTo(0, 8).close()`;
    const area = bezierArea([20, 0], [24, 8], [0, 1], [-1, 1]);
    const plain = await lowerScript(`return ${source}.extrude(1);`);
    expect(plain.solid.volume()).toBeCloseTo(area, 6);
    const mirrored = await lowerScript(`return ${source}.reflect('y').rotate(90).extrude(1);`);
    expect(mirrored.solid.volume()).toBeCloseTo(area, 6);
  });

  it('a param() tangent follows a parameter change', async () => {
    const { run, solid } = await lowerScript(`
      const lean = param('lean', 0, { min: -2, max: 2 });
      return path().moveTo(0, 0).lineTo(20, 0).smoothSpline(24, 8, { endTangent: [lean, 1] })
        .lineTo(24, 14).lineTo(0, 14).close().reflect('y').extrude(1);
    `);
    expect(solid.volume()).toBeCloseTo(bezierArea([20, 0], [24, 8], [1, 0], [0, 1]) + 24 * 6, 6);
    run.paramTable.set('lean', 1);
    const leaned = await lowerRun(run);
    expect(leaned.volume()).toBeCloseTo(bezierArea([20, 0], [24, 8], [1, 0], [1, 1]) + 24 * 6, 6);
  });

  // The same rule for the waypoint spline: its tangent constraints are
  // directions, so a reflection mirrors them with the waypoints. The reference
  // is the mirror image written by hand. (The tangent-constrained interpolator
  // is not exactly isometry-invariant, about 0.03 % in area on this profile,
  // so the unmirrored source is not the reference.)
  it.each([
    ['x', '[[20, 0], [24, -8], [20, -14]]', '[1, 0]', '[-1, -1]', '0, -14'],
    ['y', '[[-20, 0], [-24, 8], [-20, 14]]', '[-1, 0]', '[1, 1]', '0, 14'],
  ] as const)("reflect('%s') mirrors the tangent constraints of spline([...])", async (axis, points, start, end, corner) => {
    const source = `path().moveTo(0, 0).lineTo(20, 0)
      .spline([[20, 0], [24, 8], [20, 14]], { startTangent: [1, 0], endTangent: [-1, 1] }).lineTo(0, 14).close()`;
    const sign = axis === 'y' ? -1 : 1;
    const byHand = await lowerScript(`return path().moveTo(0, 0).lineTo(${sign * 20}, 0)
      .spline(${points}, { startTangent: ${start}, endTangent: ${end} }).lineTo(${corner}).close().extrude(1);`);
    const { solid } = await lowerScript(`return ${source}.reflect('${axis}').extrude(1);`);
    expect(Math.abs(solid.volume() - byHand.solid.volume())).toBeLessThan(1e-6);
    const bb = byHand.solid.boundingBox();
    expectBox(solid, [bb.min[0], bb.min[1]], [bb.max[0], bb.max[1]]);
  });

  it('refuses a malformed tangent option at capture', async () => {
    const at = (opts: string) => captureError(
      `return path().moveTo(0, 0).lineTo(20, 0).smoothSpline(24, 8, ${opts}).lineTo(0, 8).close().extrude(1);`,
    );
    const zero = await at('{ endTangent: [0, 0] }');
    expect(zero.code).toBe('feature.invalid-args');
    expect(zero.message).toMatch(/opts\.endTangent/);
    const shape = await at('{ startTangent: [1] }');
    expect(shape.code).toBe('feature.invalid-args');
    expect(shape.message).toMatch(/opts\.startTangent/);
    const typo = await at('{ endTangant: [1, 0] }');
    expect(typo.code).toBe('feature.invalid-args');
    expect(typo.message).toMatch(/endTangant/);
    const notObject = await at('[0, 1]');
    expect(notObject.code).toBe('feature.invalid-args');
  });
});
