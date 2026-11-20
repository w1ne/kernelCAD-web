// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// `path().ellipse(cx, cy, rx, ry, opts?)` and
// `path().ellipseArc(x, y, rx, ry, opts?)`: exact ellipse geometry in a sketch.
//
// The expectations are closed-form. A full ellipse has area π·rx·ry. An
// elliptical segment (arc plus chord) is the affine image of a circular
// segment of angle θ, so its area is rx·ry·(θ − sin θ)/2 and its centroid is
// the image of the point 4·sin³(θ/2) / (3·(θ − sin θ)) from the centre along
// the bisector. None of the reference values come from the kernel.

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

function sketchCommands(run: Run): SketchCommand[] {
  const sketch = run.records.find((r) => r.kind === 'sketch');
  return (sketch?.metadata as { commands: SketchCommand[] }).commands;
}

// The test ellipse of the arc cases: centre C, semi-axes RX and RY, turned PHI.
const C: Vec2 = [5, 3];
const RX = 20;
const RY = 10;
const PHI_DEG = 30;
const PHI = (PHI_DEG * Math.PI) / 180;
/** The image of unit-circle coordinates (c, s) scaled by `k` on an ellipse centred on `centre`. */
function image(centre: Vec2, c: number, s: number, k = 1): Vec2 {
  return [
    centre[0] + k * (RX * c * Math.cos(PHI) - RY * s * Math.sin(PHI)),
    centre[1] + k * (RX * c * Math.sin(PHI) + RY * s * Math.cos(PHI)),
  ];
}
const T0 = 0.3;
const T1 = 2.0;
const P0 = image(C, Math.cos(T0), Math.sin(T0));
const P1 = image(C, Math.cos(T1), Math.sin(T1));
const segmentArea = (theta: number): number => (RX * RY * (theta - Math.sin(theta))) / 2;
const segmentCentroid = (centre: Vec2, theta: number, bisector: number): Vec2 =>
  image(centre, Math.cos(bisector), Math.sin(bisector), (4 * Math.sin(theta / 2) ** 3) / (3 * (theta - Math.sin(theta))));
const SMALL = T1 - T0;
const LARGE = 2 * Math.PI - SMALL;
// The second ellipse through P0 and P1 is the point reflection of the first
// through the chord midpoint.
const C2: Vec2 = [P0[0] + P1[0] - C[0], P0[1] + P1[1] - C[1]];
const BISECTOR = (T0 + T1) / 2;
const arcScript = (opts: string): string =>
  `return path().moveTo(${P0[0]}, ${P0[1]}).ellipseArc(${P1[0]}, ${P1[1]}, ${RX}, ${RY}, ${opts}).close().extrude(1);`;

describe('path().ellipse and path().ellipseArc', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('extrudes an ellipse to π·rx·ry·h inside the rx × ry bounding box', async () => {
    const { solid } = await lowerScript(`return path().ellipse(4, -3, 20, 10).extrude(5);`);
    expect(solid.volume()).toBeCloseTo(Math.PI * 20 * 10 * 5, 6);
    const bb = solid.boundingBox();
    expect(bb.min[0]).toBeCloseTo(-16, 6);
    expect(bb.max[0]).toBeCloseTo(24, 6);
    expect(bb.min[1]).toBeCloseTo(-13, 6);
    expect(bb.max[1]).toBeCloseTo(7, 6);
    // Two caps and four quarter walls; a polyline ellipse would have one wall per chord.
    expect(solid.getReplicadShape().faces.length).toBe(6);
    const com = solid.massProperties().com;
    expect(com[0]).toBeCloseTo(4, 6);
    expect(com[1]).toBeCloseTo(-3, 6);
  });

  it('turns the rx axis by rotationDeg', async () => {
    const { solid } = await lowerScript(`return path().ellipse(0, 0, 20, 10, { rotationDeg: 30 }).extrude(2);`);
    expect(solid.volume()).toBeCloseTo(Math.PI * 20 * 10 * 2, 6);
    // Half extents of a turned ellipse: sqrt(rx²cos²φ + ry²sin²φ) and sqrt(rx²sin²φ + ry²cos²φ).
    const halfX = Math.hypot(20 * Math.cos(Math.PI / 6), 10 * Math.sin(Math.PI / 6));
    const halfY = Math.hypot(20 * Math.sin(Math.PI / 6), 10 * Math.cos(Math.PI / 6));
    // The exact box comes from the mesh, so it is good to the mesh chord error (0.011 mm here).
    // (The default box of a NURBS edge is its control-polygon box, which is
    // the 20.24 mm box of the turned bounding rectangle here.)
    const bb = solid.boundingBox({ exact: true });
    expect(bb.max[0]).toBeCloseTo(halfX, 1);
    expect(bb.min[0]).toBeCloseTo(-halfX, 1);
    expect(bb.max[1]).toBeCloseTo(halfY, 1);
    expect(bb.min[1]).toBeCloseTo(-halfY, 1);
  });

  it('a 90° turn swaps the axes with exact control points', async () => {
    const run = await runScript({ code: `return path().ellipse(0, 0, 20, 10, { rotationDeg: 90 }).extrude(1);`, fileName: 'test.kcad.ts' });
    const first = sketchCommands(run)[0] as Extract<SketchCommand, { kind: 'moveTo' }>;
    expect(first.x.evaluated).toBe(0);
    expect(first.y.evaluated).toBe(20);
    const solid = await lowerRun(run);
    const bb = solid.boundingBox();
    expect(bb.max[0]).toBeCloseTo(10, 6);
    expect(bb.max[1]).toBeCloseTo(20, 6);
  });

  it('param() semi-axes and centre follow a parameter change', async () => {
    const { run, solid } = await lowerScript(`
      const rx = param('rx', 20, { min: 5, max: 40 });
      const cx = param('cx', 0, { min: -50, max: 50 });
      return path().ellipse(cx, 0, rx, 10, { rotationDeg: 30 }).extrude(1);
    `);
    expect(solid.volume()).toBeCloseTo(Math.PI * 200, 6);
    run.paramTable.set('rx', 30);
    run.paramTable.set('cx', 12);
    const wider = await lowerRun(run);
    expect(wider.volume()).toBeCloseTo(Math.PI * 300, 6);
    expect(wider.massProperties().com[0]).toBeCloseTo(12, 6);
  });

  it('survives reflect, rotate, scale and translate', async () => {
    const { solid } = await lowerScript(
      `return path().ellipse(8, 2, 20, 10, { rotationDeg: 20 }).reflect('y').rotate(40).scale(0.5).translate(3, 4).extrude(1);`,
    );
    expect(solid.volume()).toBeCloseTo(Math.PI * 200 * 0.25, 6);
  });

  it('revolves a quarter ellipseArc into half a spheroid (a 2:1 elliptical head)', async () => {
    const { solid } = await lowerScript(
      `return path().moveTo(0, 0).lineTo(40, 0).ellipseArc(0, 20, 40, 20).close().revolve();`,
    );
    expect(solid.volume()).toBeCloseTo((2 / 3) * Math.PI * 40 * 40 * 20, 4);
  });

  it.each([
    ['the short counterclockwise arc', '{ rotationDeg: 30 }', segmentArea(SMALL), segmentCentroid(C, SMALL, BISECTOR)],
    ['the long clockwise arc', '{ rotationDeg: 30, largeArc: true, clockwise: true }', segmentArea(LARGE), segmentCentroid(C, LARGE, BISECTOR + Math.PI)],
    ['the short clockwise arc', '{ rotationDeg: 30, clockwise: true }', segmentArea(SMALL), segmentCentroid(C2, SMALL, BISECTOR + Math.PI)],
    ['the long counterclockwise arc', '{ rotationDeg: 30, largeArc: true }', segmentArea(LARGE), segmentCentroid(C2, LARGE, BISECTOR)],
  ] as Array<[string, string, number, Vec2]>)('ellipseArc takes %s', async (_name, opts, area, centroid) => {
    const { solid } = await lowerScript(arcScript(opts));
    expect(solid.volume()).toBeCloseTo(area, 6);
    const com = solid.massProperties().com;
    expect(com[0]).toBeCloseTo(centroid[0], 6);
    expect(com[1]).toBeCloseTo(centroid[1], 6);
  });

  it('ellipseArc emits one rational quadratic per 90° and ends on the given point', async () => {
    const run = await runScript({ code: arcScript('{ rotationDeg: 30, largeArc: true, clockwise: true }'), fileName: 'test.kcad.ts' });
    const arcs = sketchCommands(run).filter((c) => c.kind === 'nurbsSegment') as Array<Extract<SketchCommand, { kind: 'nurbsSegment' }>>;
    // 2π − 1.7 rad = 262.6°, so three segments.
    expect(arcs.length).toBe(3);
    for (const arc of arcs) {
      expect(arc.degree.evaluated).toBe(2);
      expect(arc.controlPoints.length).toBe(3);
      expect(arc.weights?.[1].evaluated).toBeCloseTo(Math.cos(LARGE / 6), 12);
    }
    const last = arcs[2].controlPoints[2];
    expect(last.x.evaluated).toBe(P1[0]);
    expect(last.y.evaluated).toBe(P1[1]);
  });

  it('refuses radii that cannot join the two points and names the smallest that fit', async () => {
    const err = await captureError(`return path().moveTo(0, 0).ellipseArc(50, 0, 20, 10).close().extrude(1);`);
    expect(err.code).toBe('feature.invalid-args');
    expect(err.message).toMatch(/rx = 25, ry = 12\.5/);
  });

  it('rejects bad arguments with feature.invalid-args', async () => {
    const cases: Array<[string, RegExp]> = [
      [`return path().ellipse(0, 0, 0, 10).extrude(1);`, /rx/],
      [`return path().ellipse(0, 0, 20, -1).extrude(1);`, /ry/],
      [`return path().ellipse(0, 0, 20, 10, { rotation: 30 }).extrude(1);`, /rotation/],
      [`return path().ellipse(0, 0, 20, 10, { rotationDeg: param('a', 30) }).extrude(1);`, /rotationDeg/],
      [`return path().moveTo(0, 0).ellipse(0, 0, 20, 10).extrude(1);`, /fresh path/],
      [`return path().ellipseArc(0, 10, 20, 10).close().extrude(1);`, /moveTo/],
      [`return path().moveTo(20, 0).ellipseArc(0, 10, param('rx', 20), 10).close().extrude(1);`, /param\(\)/],
      [`return path().moveTo(20, 0).ellipseArc(0, 10, 20, 10, { sweep: true }).close().extrude(1);`, /sweep/],
      [`return path().moveTo(20, 0).ellipseArc(0, 10, 20, 10, { largeArc: 1 }).close().extrude(1);`, /largeArc/],
      [`return path().moveTo(20, 0).ellipseArc(20, 0, 20, 10).close().extrude(1);`, /current point/],
    ];
    for (const [code, pattern] of cases) {
      const err = await captureError(code);
      expect(err.code, code).toBe('feature.invalid-args');
      expect(err.message, code).toMatch(pattern);
    }
  });
});
