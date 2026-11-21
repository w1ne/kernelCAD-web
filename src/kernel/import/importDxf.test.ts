// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/import/importDxf.test.ts
//
// Parser-level tests for `importDxfText`. Fixtures are built inline from
// group-code pairs — a DXF is two lines per pair, so a helper is enough and
// no binary fixture files are needed.

import { describe, it, expect } from 'vitest';
import { importDxfText, DxfParseError } from './importDxf';
import type { SketchCommand } from '../../shared/capture/sketchCommand';

/** Build DXF text from (group code, value) pairs. */
function dxf(...pairs: Array<[number, string | number]>): string {
  return pairs.map(([c, v]) => `${c}\n${v}`).join('\n') + '\n';
}

function entities(...pairs: Array<[number, string | number]>): string {
  return dxf([0, 'SECTION'], [2, 'ENTITIES'], ...pairs, [0, 'ENDSEC'], [0, 'EOF']);
}

function hatch(...pairs: Array<[number, string | number]>): string {
  return entities(
    [0, 'HATCH'], [100, 'AcDbEntity'], [8, '0'], [100, 'AcDbHatch'],
    [10, 0], [20, 0], [30, 0], [210, 0], [220, 0], [230, 1], [2, 'SOLID'], [70, 1], [71, 0],
    ...pairs,
  );
}

function header(...pairs: Array<[number, string | number]>): Array<[number, string | number]> {
  return [[0, 'SECTION'], [2, 'HEADER'], ...pairs, [0, 'ENDSEC']];
}

/** `[x, y]` of every positional command, for coordinate assertions. */
function points(commands: readonly SketchCommand[]): Array<[number, number]> {
  return commands
    .filter((c): c is Extract<SketchCommand, { x: unknown; y: unknown }> => 'x' in c && 'y' in c)
    .map(c => [c.x.evaluated, c.y.evaluated]);
}

function failure(fn: () => unknown): DxfParseError {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(DxfParseError);
    return e as DxfParseError;
  }
  throw new Error('expected importDxfText to throw');
}

const SQUARE_10x5: Array<[number, string | number]> = [
  [0, 'LWPOLYLINE'], [90, 4], [70, 1],
  [10, 0], [20, 0],
  [10, 10], [20, 0],
  [10, 10], [20, 5],
  [10, 0], [20, 5],
];

const RATIONAL_QUARTER_CIRCLE: Array<[number, string | number]> = [
  [0, 'SPLINE'], [100, 'AcDbEntity'], [8, '0'], [100, 'AcDbSpline'],
  [210, 0], [220, 0], [230, 1], [70, 12], [71, 2], [72, 6], [73, 3], [74, 0],
  [40, 0], [40, 0], [40, 0], [40, 1], [40, 1], [40, 1],
  [10, 0], [20, 10], [30, 0], [41, 1],
  [10, 10], [20, 10], [30, 0], [41, Math.SQRT1_2],
  [10, 10], [20, 0], [30, 0], [41, 1],
];

/** Rational de Boor evaluation of a B-spline at `u`, independent of the importer. */
function deBoor(
  degree: number,
  knots: readonly number[],
  controls: ReadonlyArray<readonly [number, number]>,
  weights: readonly number[] | undefined,
  u: number,
): [number, number] {
  const n = controls.length;
  let k = degree;
  while (k < n - 1 && u >= knots[k + 1]) k++;
  const d = Array.from({ length: degree + 1 }, (_, j) => {
    const w = weights?.[k - degree + j] ?? 1;
    const [x, y] = controls[k - degree + j];
    return [x * w, y * w, w];
  });
  for (let r = 1; r <= degree; r++) {
    for (let j = degree; j >= r; j--) {
      const i = k - degree + j;
      const alpha = (u - knots[i]) / (knots[i + degree + 1 - r] - knots[i]);
      d[j] = d[j].map((v, c) => (1 - alpha) * d[j - 1][c] + alpha * v);
    }
  }
  return [d[degree][0] / d[degree][2], d[degree][1] / d[degree][2]];
}

/**
 * Knots and control points of a non-rational NURBS command in the direction
 * that starts at `start`; region assembly may reverse a segment for winding.
 */
function orientedNet(
  nurbs: Extract<SketchCommand, { kind: 'nurbsSegment' }>,
  start: readonly [number, number],
): { knots: number[]; controls: Array<readonly [number, number]> } {
  const knots = nurbs.knots!.map(k => k.evaluated);
  const controls = nurbs.controlPoints.map(p => [p.x.evaluated, p.y.evaluated] as const);
  if (Math.hypot(controls[0][0] - start[0], controls[0][1] - start[1]) < 1e-9) return { knots, controls };
  const [lo, hi] = [knots[0], knots[knots.length - 1]];
  return { knots: knots.map(k => lo + hi - k).reverse(), controls: [...controls].reverse() };
}

function nurbsCommands(commands: readonly SketchCommand[]): Array<Extract<SketchCommand, { kind: 'nurbsSegment' }>> {
  return commands.filter(
    (command): command is Extract<SketchCommand, { kind: 'nurbsSegment' }> => command.kind === 'nurbsSegment',
  );
}

const SQUARE_NET: Array<readonly [number, number]> = [[-10, -10], [10, -10], [10, 10], [-10, 10]];

/**
 * A closed periodic uniform cubic SPLINE as AutoCAD and ezdxf write it: flags
 * 11 (closed | periodic | planar), the first `degree` control points repeated
 * at the end, and an unclamped uniform knot vector 0..10. Weights are optional.
 */
function periodicSquareSpline(weights?: readonly number[]): Array<[number, string | number]> {
  const net = [...SQUARE_NET, ...SQUARE_NET.slice(0, 3)];
  const w = weights ? [...weights, ...weights.slice(0, 3)] : undefined;
  return [
    [0, 'SPLINE'], [100, 'AcDbEntity'], [8, '0'], [100, 'AcDbSpline'],
    [210, 0], [220, 0], [230, 1], [70, 11], [71, 3], [72, 11], [73, 7], [74, 0],
    ...Array.from({ length: 11 }, (_, i): [number, number] => [40, i]),
    ...net.flatMap(([x, y], i): Array<[number, number]> => [
      [10, x], [20, y], [30, 0], ...(w ? [[41, w[i]] as [number, number]] : []),
    ]),
  ];
}

describe('importDxfText — entities', () => {
  it('keeps rational clamped DXF SPLINE geometry in the exact NURBS sketch command', () => {
    const r = importDxfText(entities(
      ...RATIONAL_QUARTER_CIRCLE,
      [0, 'LINE'], [10, 10], [20, 0], [11, 0], [21, 0],
      [0, 'LINE'], [10, 0], [20, 0], [11, 0], [21, 10],
    ));
    const nurbs = r.regions[0].commands.find(
      (command): command is Extract<SketchCommand, { kind: 'nurbsSegment' }> => command.kind === 'nurbsSegment',
    );
    expect(nurbs).toBeDefined();
    expect(nurbs?.degree.evaluated).toBe(2);
    expect(nurbs?.controlPoints.map(point => [point.x.evaluated, point.y.evaluated])).toEqual([
      [10, 0], [10, 10], [0, 10],
    ]);
    expect(nurbs?.weights?.map(weight => weight.evaluated)).toEqual([1, Math.SQRT1_2, 1]);
    expect(nurbs?.knots?.map(knot => knot.evaluated)).toEqual([0, 0, 0, 1, 1, 1]);
    // NURBS area is sampled for region ordering; the sketch retains the exact curve.
    expect(r.regions[0].areaMm2).toBeCloseTo((Math.PI * 100) / 4, 2);
  });

  it('clamps a periodic closed DXF SPLINE by exact knot insertion into one closed NURBS profile', () => {
    const r = importDxfText(entities(...periodicSquareSpline()));
    expect(r.regions).toHaveLength(1);
    const [nurbs] = nurbsCommands(r.regions[0].commands);
    expect(nurbs).toBeDefined();
    const knots = nurbs.knots!.map(k => k.evaluated);
    const controls = nurbs.controlPoints.map(p => [p.x.evaluated, p.y.evaluated] as const);
    // The DXF domain [u3, u7] = [3, 7] becomes a clamped vector over the same parameters.
    expect(knots).toEqual([3, 3, 3, 3, 4, 5, 6, 7, 7, 7, 7]);
    expect(controls).toHaveLength(7);
    // A uniform cubic passes through (P0 + 4 P1 + P2) / 6 at a knot.
    expect(controls[0][0]).toBeCloseTo(20 / 3, 12);
    expect(controls[0][1]).toBeCloseTo(-20 / 3, 12);
    expect(controls[6][0]).toBeCloseTo(controls[0][0], 12);
    expect(controls[6][1]).toBeCloseTo(controls[0][1], 12);
    const original = [...SQUARE_NET, ...SQUARE_NET.slice(0, 3)];
    for (let u = 3; u <= 7; u += 0.125) {
      const [ex, ey] = deBoor(3, Array.from({ length: 11 }, (_, i) => i), original, undefined, u);
      const [ax, ay] = deBoor(3, knots, controls, undefined, u);
      expect(ax).toBeCloseTo(ex, 10);
      expect(ay).toBeCloseTo(ey, 10);
    }
  });

  it('keeps a rational periodic SPLINE on the same curve after clamping', () => {
    const weights = [1, 2, 0.5, 1.5];
    const r = importDxfText(entities(...periodicSquareSpline(weights)));
    const [nurbs] = nurbsCommands(r.regions[0].commands);
    const knots = nurbs.knots!.map(k => k.evaluated);
    const controls = nurbs.controlPoints.map(p => [p.x.evaluated, p.y.evaluated] as const);
    const clampedWeights = nurbs.weights!.map(w => w.evaluated);
    const original = [...SQUARE_NET, ...SQUARE_NET.slice(0, 3)];
    const originalWeights = [...weights, ...weights.slice(0, 3)];
    for (let u = 3; u <= 7; u += 0.125) {
      const [ex, ey] = deBoor(3, Array.from({ length: 11 }, (_, i) => i), original, originalWeights, u);
      const [ax, ay] = deBoor(3, knots, controls, clampedWeights, u);
      expect(ax).toBeCloseTo(ex, 10);
      expect(ay).toBeCloseTo(ey, 10);
    }
  });

  it('clamps an open unclamped uniform SPLINE so its true endpoints join the next segment', () => {
    // Domain [3, 4]: start (P0 + 4 P1 + P2) / 6 = (20/3, -20/3), end (P1 + 4 P2 + P3) / 6 = (20/3, 20/3).
    const r = importDxfText(entities(
      [0, 'SPLINE'], [70, 8], [71, 3], [72, 8], [73, 4],
      ...Array.from({ length: 8 }, (_, i): [number, number] => [40, i]),
      ...SQUARE_NET.flatMap(([x, y]): Array<[number, number]> => [[10, x], [20, y]]),
      [0, 'LINE'], [10, 20 / 3], [20, 20 / 3], [11, 20 / 3], [21, -20 / 3],
    ));
    expect(r.regions).toHaveLength(1);
    const [nurbs] = nurbsCommands(r.regions[0].commands);
    expect(nurbs.knots!.map(k => k.evaluated)).toEqual([3, 3, 3, 3, 4, 4, 4, 4]);
  });

  it('interpolates a fit-point-only SPLINE as a cubic that passes through every fit point', () => {
    // ezdxf `add_spline(fit_points)` writes this form: fit points (11/21/31), no control net.
    const fit: Array<readonly [number, number]> = [[0, 0], [10, 8], [20, 10], [30, 8], [40, 0]];
    const r = importDxfText(entities(
      [0, 'SPLINE'], [70, 8], [71, 3], [72, 0], [73, 0], [74, fit.length],
      ...fit.flatMap(([x, y]): Array<[number, number]> => [[11, x], [21, y], [31, 0]]),
      [0, 'LINE'], [10, 40], [20, 0], [11, 0], [21, 0],
    ));
    expect(r.regions).toHaveLength(1);
    const [nurbs] = nurbsCommands(r.regions[0].commands);
    expect(nurbs.degree.evaluated).toBe(3);
    expect(nurbs.weights).toBeUndefined();
    const { knots, controls } = orientedNet(nurbs, fit[0]);
    // Chord-length parameters; the interior knots are the interior parameters.
    const chords = fit.slice(1).map(([x, y], i) => Math.hypot(x - fit[i][0], y - fit[i][1]));
    const total = chords.reduce((a, b) => a + b, 0);
    const params = [0];
    for (const c of chords) params.push(params[params.length - 1] + c / total);
    params[params.length - 1] = 1;
    expect(knots).toHaveLength(controls.length + 4);
    expect(knots.slice(0, 4)).toEqual([0, 0, 0, 0]);
    expect(knots.slice(-4)).toEqual([1, 1, 1, 1]);
    knots.slice(4, -4).forEach((k, i) => expect(k).toBeCloseTo(params[i + 1], 12));
    expect(controls).toHaveLength(fit.length + 2);
    fit.forEach(([fx, fy], i) => {
      const [x, y] = deBoor(3, knots, controls, undefined, params[i]);
      expect(x).toBeCloseTo(fx, 9);
      expect(y).toBeCloseTo(fy, 9);
    });
    // The smooth arch bulges outside the fit-point polygon (area 260 mm²) but stays near it.
    expect(r.regions[0].areaMm2).toBeGreaterThan(260);
    expect(r.regions[0].areaMm2).toBeLessThan(290);
  });

  it('honours the start and end tangents of a fit-point SPLINE', () => {
    const r = importDxfText(entities(
      [0, 'SPLINE'], [70, 8], [71, 3], [72, 0], [73, 0], [74, 3],
      [12, 0], [22, 1], [32, 0], [13, 0], [23, -1], [33, 0],
      [11, 0], [21, 0], [11, 10], [21, 10], [11, 20], [21, 0],
      [0, 'LINE'], [10, 20], [20, 0], [11, 0], [21, 0],
    ));
    const [nurbs] = nurbsCommands(r.regions[0].commands);
    const { knots, controls } = orientedNet(nurbs, [0, 0]);
    // C'(0) is parallel to P1 - P0 and C'(1) to Pn - Pn-1 on a clamped cubic.
    expect(controls[1][0]).toBeCloseTo(0, 12);
    expect(controls[1][1]).toBeGreaterThan(0);
    expect(controls[controls.length - 2][0]).toBeCloseTo(20, 12);
    expect(controls[controls.length - 2][1]).toBeGreaterThan(0);
    const [mx, my] = deBoor(3, knots, controls, undefined, 0.5);
    expect(mx).toBeCloseTo(10, 9);
    expect(my).toBeCloseTo(10, 9);
  });

  it('keeps a full planar ELLIPSE as four exact rational NURBS segments', () => {
    const r = importDxfText(entities(
      [0, 'ELLIPSE'], [10, 40], [20, 30], [11, 20], [21, 0], [40, 0.5], [41, 0], [42, 2 * Math.PI],
    ));
    expect(r.regions).toHaveLength(1);
    expect(r.regions[0].areaMm2).toBeCloseTo(200 * Math.PI, 1);
    const nurbs = r.regions[0].commands.filter(
      (command): command is Extract<SketchCommand, { kind: 'nurbsSegment' }> => command.kind === 'nurbsSegment',
    );
    expect(nurbs).toHaveLength(4);
    expect(nurbs.map(command => command.weights?.map(weight => weight.evaluated))).toEqual(
      Array.from({ length: 4 }, () => [1, Math.SQRT1_2, 1]),
    );
  });

  it('keeps a wrapped partial ELLIPSE exact and follows the DXF counter-clockwise span', () => {
    const r = importDxfText(entities(
      [0, 'ELLIPSE'], [10, 0], [20, 0], [11, 10], [21, 0], [40, 0.5],
      [41, 1.5 * Math.PI], [42, 0.5 * Math.PI],
      [0, 'LINE'], [10, 0], [20, 5], [11, 0], [21, -5],
    ));
    expect(r.regions).toHaveLength(1);
    expect(r.regions[0].areaMm2).toBeCloseTo(25 * Math.PI, 2);
    const nurbs = r.regions[0].commands.filter(
      (command): command is Extract<SketchCommand, { kind: 'nurbsSegment' }> => command.kind === 'nurbsSegment',
    );
    expect(nurbs).toHaveLength(2);
    expect(nurbs.map(command => command.weights?.map(weight => weight.evaluated))).toEqual(
      Array.from({ length: 2 }, () => [1, Math.SQRT1_2, 1]),
    );
  });

  it('refuses HATCH entities with multiple paths instead of flattening holes into separate profiles', () => {
    expect(() => importDxfText(hatch([91, 2]))).toThrow(/2 boundary paths are not supported/);
  });

  it('refuses edge-based HATCH paths until their exact curve geometry is supported', () => {
    expect(() => importDxfText(hatch([91, 1], [92, 1]))).toThrow(/edge-based boundary paths are not supported/);
  });

  it('refuses HATCH paths outside the XY plane', () => {
    const text = entities(
      [0, 'HATCH'], [100, 'AcDbEntity'], [8, '0'], [100, 'AcDbHatch'],
      [10, 0], [20, 0], [30, 5], [210, 0], [220, 0], [230, 1], [2, 'SOLID'], [70, 1], [71, 0],
      [91, 1], [92, 3],
    );
    expect(() => importDxfText(text)).toThrow(/only a zero-elevation XY boundary/);
  });

  it('reads a closed LWPOLYLINE as one region with exact area', () => {
    const r = importDxfText(entities(...SQUARE_10x5));
    expect(r.regions).toHaveLength(1);
    expect(r.regions[0].areaMm2).toBeCloseTo(50, 9);
    expect(r.regions[0].segmentCount).toBe(4);
    expect(r.regions[0].commands.map(c => c.kind)).toEqual([
      'moveTo', 'lineTo', 'lineTo', 'lineTo', 'lineTo', 'close',
    ]);
  });

  it('reads a CIRCLE as two exact semicircular bulge arcs', () => {
    const r = importDxfText(entities([0, 'CIRCLE'], [10, 0], [20, 0], [40, 10]));
    expect(r.regions).toHaveLength(1);
    expect(r.regions[0].commands.map(c => c.kind)).toEqual([
      'moveTo', 'bulgeArc', 'bulgeArc', 'close',
    ]);
    // tan(180° / 4) = 1 is the exact semicircle; anything else is not a circle.
    for (const c of r.regions[0].commands) {
      if (c.kind === 'bulgeArc') expect(c.bulge.evaluated).toBeCloseTo(1, 12);
    }
    expect(r.regions[0].areaMm2).toBeCloseTo(Math.PI * 100, 9);
  });

  it('maps the LWPOLYLINE BULGE field straight through, sign included', () => {
    // Bulge 0.5 on the bottom edge of a CCW unit-ish square. A DXF bulge is
    // tan(includedAngle / 4) and positive means counter-clockwise, i.e. the
    // arc bows AWAY from the interior here and ADDS area. A sign error would
    // subtract the same 17.47 mm² instead.
    const r = importDxfText(entities(
      [0, 'LWPOLYLINE'], [90, 4], [70, 1],
      [10, 0], [20, 0], [42, 0.5],
      [10, 10], [20, 0],
      [10, 10], [20, 10],
      [10, 0], [20, 10],
    ));
    const theta = 4 * Math.atan(0.5);
    const radius = 5 / Math.sin(theta / 2);
    const segmentArea = (radius * radius / 2) * (theta - Math.sin(theta));
    expect(segmentArea).toBeCloseTo(17.472, 3);
    expect(r.regions[0].areaMm2).toBeCloseTo(100 + segmentArea, 9);

    const arcs = r.regions[0].commands.filter(c => c.kind === 'bulgeArc');
    expect(arcs).toHaveLength(1);
  });

  it('reads an ARC and keeps its sweep exact', () => {
    // Quarter arc from (10,0) to (0,10) plus two lines back through origin.
    const r = importDxfText(entities(
      [0, 'ARC'], [10, 0], [20, 0], [40, 10], [50, 0], [51, 90],
      [0, 'LINE'], [10, 0], [20, 10], [11, 0], [21, 0],
      [0, 'LINE'], [10, 0], [20, 0], [11, 10], [21, 0],
    ));
    expect(r.regions).toHaveLength(1);
    expect(r.regions[0].areaMm2).toBeCloseTo((Math.PI * 100) / 4, 9);
  });

  it('reads the pre-R13 POLYLINE/VERTEX/SEQEND form', () => {
    const r = importDxfText(entities(
      [0, 'POLYLINE'], [70, 1],
      [0, 'VERTEX'], [10, 0], [20, 0],
      [0, 'VERTEX'], [10, 4], [20, 0],
      [0, 'VERTEX'], [10, 4], [20, 3],
      [0, 'VERTEX'], [10, 0], [20, 3],
      [0, 'SEQEND'],
    ));
    expect(r.regions).toHaveLength(1);
    expect(r.regions[0].areaMm2).toBeCloseTo(12, 9);
  });
});

describe('importDxfText — INSERT block references', () => {
  type P = Array<[number, string | number]>;
  function drawing(blocks: P, ents: P): string {
    return dxf(
      [0, 'SECTION'], [2, 'BLOCKS'], ...blocks, [0, 'ENDSEC'],
      [0, 'SECTION'], [2, 'ENTITIES'], ...ents, [0, 'ENDSEC'], [0, 'EOF'],
    );
  }
  function block(name: string, base: [number, number], ...body: P): P {
    return [
      [0, 'BLOCK'], [8, '0'], [2, name], [70, 0], [10, base[0]], [20, base[1]], [30, 0], [3, name],
      ...body, [0, 'ENDBLK'], [8, '0'],
    ];
  }
  function bounds(r: ReturnType<typeof importDxfText>): { xs: number[]; ys: number[] } {
    const all = r.regions.flatMap(region => points(region.commands));
    const xs = all.map(([x]) => x);
    const ys = all.map(([, y]) => y);
    return { xs: [Math.min(...xs), Math.max(...xs)], ys: [Math.min(...ys), Math.max(...ys)] };
  }
  const BULGED_SQUARE: P = [
    [0, 'LWPOLYLINE'], [90, 4], [70, 1],
    [10, 0], [20, 0], [42, 0.5],
    [10, 10], [20, 0],
    [10, 10], [20, 10],
    [10, 0], [20, 10],
  ];
  const theta = 4 * Math.atan(0.5);
  const radius = 5 / Math.sin(theta / 2);
  const BULGE_SEGMENT_AREA = (radius * radius / 2) * (theta - Math.sin(theta));

  it('places block geometry at the insertion point with rotation and uniform scale', () => {
    // (x, y) -> 2 * rot90(x, y) + (100, 50): the 10 x 5 square becomes 10 x 20.
    const r = importDxfText(drawing(
      block('SQ', [0, 0], ...SQUARE_10x5),
      [[0, 'INSERT'], [2, 'SQ'], [10, 100], [20, 50], [30, 0], [41, 2], [42, 2], [43, 2], [50, 90]],
    ));
    expect(r.regions).toHaveLength(1);
    expect(r.regions[0].areaMm2).toBeCloseTo(200, 9);
    const b = bounds(r);
    expect(b.xs[0]).toBeCloseTo(90, 9);
    expect(b.xs[1]).toBeCloseTo(100, 9);
    expect(b.ys[0]).toBeCloseTo(50, 9);
    expect(b.ys[1]).toBeCloseTo(70, 9);
  });

  it('measures block geometry from the block base point', () => {
    const r = importDxfText(drawing(
      block('SQ', [5, 0], ...SQUARE_10x5),
      [[0, 'INSERT'], [2, 'SQ'], [10, 0], [20, 0]],
    ));
    const b = bounds(r);
    expect(b.xs[0]).toBeCloseTo(-5, 9);
    expect(b.xs[1]).toBeCloseTo(5, 9);
  });

  it('flips the bulge direction when a negative X scale mirrors the block', () => {
    // Without the flip the mirrored arc bows inward and the area becomes
    // 100 - segment instead of 100 + segment.
    const r = importDxfText(drawing(
      block('B', [0, 0], ...BULGED_SQUARE),
      [[0, 'INSERT'], [2, 'B'], [10, 0], [20, 0], [41, -1]],
    ));
    expect(r.regions[0].areaMm2).toBeCloseTo(100 + BULGE_SEGMENT_AREA, 9);
    const b = bounds(r);
    expect(b.xs[0]).toBeCloseTo(-10, 9);
    expect(b.xs[1]).toBeCloseTo(0, 9);
  });

  it('stretches straight edges under a non-uniform scale', () => {
    const r = importDxfText(drawing(
      block('SQ', [0, 0], ...SQUARE_10x5),
      [[0, 'INSERT'], [2, 'SQ'], [10, 0], [20, 0], [41, 3], [42, 1]],
    ));
    expect(r.regions[0].areaMm2).toBeCloseTo(150, 9);
  });

  it('refuses a non-uniform scale on a block arc instead of keeping a circular arc', () => {
    const e = failure(() => importDxfText(drawing(
      block('C', [0, 0], [0, 'CIRCLE'], [10, 0], [20, 0], [40, 2]),
      [[0, 'INSERT'], [2, 'C'], [10, 0], [20, 0], [41, 2], [42, 1]],
    )));
    expect(e.reason).toBe('unsupported-entity');
    expect(e.message).toMatch(/^INSERT at line \d+: non-uniform scale \(2, 1\) turns the arcs of block "C" into ellipses/);
  });

  it('keeps exact NURBS geometry when a block is rotated', () => {
    const r = importDxfText(drawing(
      block('Q', [0, 0],
        ...RATIONAL_QUARTER_CIRCLE,
        [0, 'LINE'], [10, 10], [20, 0], [11, 0], [21, 0],
        [0, 'LINE'], [10, 0], [20, 0], [11, 0], [21, 10],
      ),
      [[0, 'INSERT'], [2, 'Q'], [10, 0], [20, 0], [50, 90]],
    ));
    const nurbs = r.regions[0].commands.find(
      (command): command is Extract<SketchCommand, { kind: 'nurbsSegment' }> => command.kind === 'nurbsSegment',
    );
    const poles = nurbs?.controlPoints.map(point => [point.x.evaluated, point.y.evaluated]) ?? [];
    for (const [x, y] of poles) {
      expect(x).toBeLessThanOrEqual(1e-9);
      expect(y).toBeGreaterThanOrEqual(-1e-9);
    }
    expect(nurbs?.weights?.map(weight => weight.evaluated)).toEqual([1, Math.SQRT1_2, 1]);
    expect(r.regions[0].areaMm2).toBeCloseTo((Math.PI * 100) / 4, 2);
  });

  it('composes nested block references', () => {
    // INNER at (10, 0) inside OUTER; OUTER at (0, 100) rotated 180 degrees.
    const r = importDxfText(drawing(
      [
        ...block('INNER', [0, 0], ...SQUARE_10x5),
        ...block('OUTER', [0, 0], [0, 'INSERT'], [2, 'INNER'], [10, 10], [20, 0]),
      ],
      [[0, 'INSERT'], [2, 'OUTER'], [10, 0], [20, 100], [50, 180]],
    ));
    const b = bounds(r);
    expect(b.xs[0]).toBeCloseTo(-20, 9);
    expect(b.xs[1]).toBeCloseTo(-10, 9);
    expect(b.ys[0]).toBeCloseTo(95, 9);
    expect(b.ys[1]).toBeCloseTo(100, 9);
  });

  it('refuses a block that references itself', () => {
    const e = failure(() => importDxfText(drawing(
      block('LOOP', [0, 0], [0, 'INSERT'], [2, 'LOOP'], [10, 1], [20, 0]),
      [[0, 'INSERT'], [2, 'LOOP'], [10, 0], [20, 0]],
    )));
    expect(e.reason).toBe('malformed-entity');
    expect(e.message).toMatch(/block "LOOP" references itself \(LOOP -> LOOP\)/);
  });

  it('expands an MINSERT column and row grid', () => {
    const r = importDxfText(drawing(
      block('SQ', [0, 0], ...SQUARE_10x5),
      [[0, 'INSERT'], [2, 'SQ'], [10, 0], [20, 0], [70, 3], [71, 2], [44, 20], [45, 10]],
    ));
    expect(r.regions).toHaveLength(6);
    for (const region of r.regions) expect(region.areaMm2).toBeCloseTo(50, 9);
    const b = bounds(r);
    expect(b.xs[1]).toBeCloseTo(50, 9);
    expect(b.ys[1]).toBeCloseTo(15, 9);
  });

  it('mirrors an INSERT with extrusion (0, 0, -1) into world X', () => {
    const r = importDxfText(drawing(
      block('SQ', [0, 0], ...SQUARE_10x5),
      [[0, 'INSERT'], [2, 'SQ'], [10, 10], [20, 0], [210, 0], [220, 0], [230, -1]],
    ));
    const b = bounds(r);
    expect(b.xs[0]).toBeCloseTo(-20, 9);
    expect(b.xs[1]).toBeCloseTo(-10, 9);
  });

  it('skips attribute values that follow an INSERT and reports block annotation', () => {
    const r = importDxfText(drawing(
      block('SQ', [0, 0], ...SQUARE_10x5, [0, 'TEXT'], [10, 0], [20, 0], [1, 'label']),
      [
        [0, 'INSERT'], [66, 1], [2, 'SQ'], [10, 0], [20, 0],
        [0, 'ATTRIB'], [10, 0], [20, 0], [1, 'A1'], [2, 'TAG'],
        [0, 'SEQEND'],
      ],
    ));
    expect(r.regions).toHaveLength(1);
    expect(r.ignoredEntities).toHaveLength(2);
    expect(r.ignoredEntities[0]).toMatch(/^TEXT \(line \d+\) in block "SQ"$/);
    expect(r.ignoredEntities[1]).toMatch(/^ATTRIB \(line \d+\)$/);
  });

  it('refuses an external-reference block because its geometry is in another file', () => {
    const xref: P = [[0, 'BLOCK'], [2, 'X'], [70, 4], [10, 0], [20, 0], [1, 'other.dxf'], [0, 'ENDBLK']];
    const e = failure(() => importDxfText(drawing(xref, [[0, 'INSERT'], [2, 'X'], [10, 0], [20, 0]])));
    expect(e.reason).toBe('unsupported-entity');
    expect(e.message).toMatch(/^INSERT at line \d+: block "X" is an external reference/);
  });
});

describe('importDxfText — extrusion direction (OCS)', () => {
  // ARC, CIRCLE, LWPOLYLINE and POLYLINE coordinates are in the entity's
  // Object Coordinate System. With extrusion direction (0, 0, -1) the
  // arbitrary-axis algorithm gives OCS X = -WCS X, so the drawing is the
  // mirror image of the raw numbers. CAD tools write such entities for
  // mirrored and flipped-view geometry.
  const NEG_Z: Array<[number, string | number]> = [[210, 0], [220, 0], [230, -1]];

  it('mirrors an ARC with extrusion (0, 0, -1) into world X', () => {
    // OCS centre (10, 0), radius 10, 0..90 deg -> WCS centre (-10, 0) from
    // (-20, 0) to (-10, 10). The LINEs are WCS, so they close only on the
    // mirrored arc.
    const r = importDxfText(entities(
      [0, 'ARC'], [10, 10], [20, 0], [40, 10], ...NEG_Z, [50, 0], [51, 90],
      [0, 'LINE'], [10, -10], [20, 10], [11, -10], [21, 0],
      [0, 'LINE'], [10, -10], [20, 0], [11, -20], [21, 0],
    ));
    expect(r.regions).toHaveLength(1);
    expect(r.regions[0].areaMm2).toBeCloseTo((Math.PI * 100) / 4, 9);
    const xs = points(r.regions[0].commands).map(([x]) => x);
    expect(Math.min(...xs)).toBeCloseTo(-20, 9);
    expect(Math.max(...xs)).toBeCloseTo(-10, 9);
  });

  it('mirrors a CIRCLE centre with extrusion (0, 0, -1)', () => {
    const r = importDxfText(entities([0, 'CIRCLE'], [10, 10], [20, 5], [40, 2], ...NEG_Z));
    const xs = points(r.regions[0].commands).map(([x]) => x);
    const ys = points(r.regions[0].commands).map(([, y]) => y);
    expect(Math.min(...xs)).toBeCloseTo(-12, 9);
    expect(Math.max(...xs)).toBeCloseTo(-8, 9);
    expect(Math.min(...ys)).toBeCloseTo(5, 9);
    expect(r.regions[0].areaMm2).toBeCloseTo(Math.PI * 4, 9);
  });

  it('mirrors LWPOLYLINE vertices and bulges with extrusion (0, 0, -1)', () => {
    // The bulged edge bows outward in OCS. The mirror keeps it outward:
    // a mirrored x without a negated bulge would cut the segment area out.
    const r = importDxfText(entities(
      [0, 'LWPOLYLINE'], [90, 4], [70, 1], ...NEG_Z,
      [10, 0], [20, 0], [42, 0.5],
      [10, 10], [20, 0],
      [10, 10], [20, 10],
      [10, 0], [20, 10],
    ));
    const theta = 4 * Math.atan(0.5);
    const radius = 5 / Math.sin(theta / 2);
    const segmentArea = (radius * radius / 2) * (theta - Math.sin(theta));
    expect(r.regions[0].areaMm2).toBeCloseTo(100 + segmentArea, 9);
    const xs = points(r.regions[0].commands).map(([x]) => x);
    expect(Math.min(...xs)).toBeCloseTo(-10, 9);
    expect(Math.max(...xs)).toBeCloseTo(0, 9);
    const arc = r.regions[0].commands.find(c => c.kind === 'bulgeArc');
    expect(arc).toBeDefined();
  });

  it('mirrors pre-R13 POLYLINE vertices with the header extrusion (0, 0, -1)', () => {
    const r = importDxfText(entities(
      [0, 'POLYLINE'], [70, 1], ...NEG_Z,
      [0, 'VERTEX'], [10, 1], [20, 0],
      [0, 'VERTEX'], [10, 5], [20, 0],
      [0, 'VERTEX'], [10, 5], [20, 3],
      [0, 'VERTEX'], [10, 1], [20, 3],
      [0, 'SEQEND'],
    ));
    expect(r.regions[0].areaMm2).toBeCloseTo(12, 9);
    const xs = points(r.regions[0].commands).map(([x]) => x);
    expect(Math.min(...xs)).toBeCloseTo(-5, 9);
    expect(Math.max(...xs)).toBeCloseTo(-1, 9);
  });

  it('keeps an explicit (0, 0, 1) extrusion unchanged', () => {
    const r = importDxfText(entities([0, 'CIRCLE'], [10, 10], [20, 5], [40, 2], [210, 0], [220, 0], [230, 1]));
    const xs = points(r.regions[0].commands).map(([x]) => x);
    expect(Math.min(...xs)).toBeCloseTo(8, 9);
  });

  it('refuses an entity whose extrusion direction leaves the Z axis', () => {
    let error: unknown;
    try {
      importDxfText(entities([0, 'CIRCLE'], [10, 0], [20, 0], [40, 2], [210, 1], [220, 0], [230, 0]));
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(DxfParseError);
    expect((error as DxfParseError).reason).toBe('unsupported-entity');
    expect((error as DxfParseError).message).toMatch(/^CIRCLE at line \d+: extrusion direction/);
  });
});

describe('importDxfText — messy real-world input', () => {
  it('chains loose LINE entities in arbitrary order and direction', () => {
    // Deliberately shuffled, and two of the four are written backwards.
    const r = importDxfText(entities(
      [0, 'LINE'], [10, 10], [20, 0], [11, 10], [21, 10],
      [0, 'LINE'], [10, 0], [20, 0], [11, 10], [21, 0],
      [0, 'LINE'], [10, 0], [20, 10], [11, 0], [21, 0],
      [0, 'LINE'], [10, 10], [20, 10], [11, 0], [21, 10],
    ));
    expect(r.regions).toHaveLength(1);
    expect(r.regions[0].areaMm2).toBeCloseTo(100, 9);
  });

  it('drops a duplicated segment and its reversed twin, and reports the count', () => {
    const r = importDxfText(entities(
      [0, 'LINE'], [10, 0], [20, 0], [11, 10], [21, 0],
      [0, 'LINE'], [10, 0], [20, 0], [11, 10], [21, 0],   // exact duplicate
      [0, 'LINE'], [10, 10], [20, 0], [11, 0], [21, 0],   // reversed duplicate
      [0, 'LINE'], [10, 10], [20, 0], [11, 10], [21, 10],
      [0, 'LINE'], [10, 10], [20, 10], [11, 0], [21, 10],
      [0, 'LINE'], [10, 0], [20, 10], [11, 0], [21, 0],
    ));
    expect(r.duplicatesDropped).toBe(2);
    expect(r.regions).toHaveLength(1);
    expect(r.regions[0].areaMm2).toBeCloseTo(100, 9);
  });

  it('closes a sub-tolerance gap and reports it rather than pretending it was closed', () => {
    // The last line stops 0.0002 mm short of the start.
    const r = importDxfText(entities(
      [0, 'LINE'], [10, 0], [20, 0], [11, 10], [21, 0],
      [0, 'LINE'], [10, 10], [20, 0], [11, 10], [21, 10],
      [0, 'LINE'], [10, 10], [20, 10], [11, 0], [21, 10],
      [0, 'LINE'], [10, 0], [20, 10], [11, 0.0002], [21, 0],
    ));
    expect(r.gapsClosed).toBe(1);
    const pts = points(r.regions[0].commands);
    // The snapped endpoint lands exactly on the first point, not 0.0002 away.
    expect(pts[pts.length - 1]).toEqual(pts[0]);
  });

  it('returns disjoint regions ordered largest-area first', () => {
    const r = importDxfText(entities(
      [0, 'CIRCLE'], [10, 0], [20, 0], [40, 2],
      ...SQUARE_10x5,
      [0, 'CIRCLE'], [10, 40], [20, 40], [40, 6],
    ));
    expect(r.regions.map(x => Math.round(x.areaMm2))).toEqual([113, 50, 13]);
  });

  it('reports annotation entities as ignored instead of dropping them silently', () => {
    const r = importDxfText(entities(
      [0, 'TEXT'], [1, 'PART A'], [10, 0], [20, 0],
      [0, 'DIMENSION'], [10, 0], [20, 0],
      ...SQUARE_10x5,
    ));
    expect(r.ignoredEntities).toHaveLength(2);
    expect(r.ignoredEntities[0]).toMatch(/^TEXT \(line \d+\)$/);
    expect(r.regions).toHaveLength(1);
  });
});

describe('importDxfText — units', () => {
  it('scales by $INSUNITS and says so', () => {
    const text = dxf(...header([9, '$INSUNITS'], [70, 1])) +
      entities(...SQUARE_10x5);
    const r = importDxfText(text);
    expect(r.unitScale).toBeCloseTo(25.4, 12);
    expect(r.unitSource).toBe('$INSUNITS=1 (in)');
    expect(r.regions[0].areaMm2).toBeCloseTo(50 * 25.4 * 25.4, 6);
  });

  it('assumes mm when $INSUNITS is absent, and reports the assumption', () => {
    const r = importDxfText(entities(...SQUARE_10x5));
    expect(r.unitScale).toBe(1);
    expect(r.unitSource).toBe('assumed mm ($INSUNITS absent or 0/Unitless)');
  });

  it('assumes mm when $INSUNITS is 0 (Unitless)', () => {
    const r = importDxfText(dxf(...header([9, '$INSUNITS'], [70, 0])) + entities(...SQUARE_10x5));
    expect(r.unitSource).toMatch(/assumed mm/);
  });

  it('lets opts.units override a header that lies', () => {
    const text = dxf(...header([9, '$INSUNITS'], [70, 4])) + entities(...SQUARE_10x5);
    const r = importDxfText(text, { units: 'in' });
    expect(r.unitSource).toBe('opts.units=in');
    expect(r.regions[0].areaMm2).toBeCloseTo(50 * 25.4 * 25.4, 6);
  });

  it('refuses a $INSUNITS code it does not map, naming the line', () => {
    const text = dxf(...header([9, '$INSUNITS'], [70, 19])) + entities(...SQUARE_10x5);
    expect(() => importDxfText(text)).toThrowError(
      /\$INSUNITS=19 is not a length unit kernelCAD maps/,
    );
    expect(() => importDxfText(text)).toThrowError(/opts\.units/);
  });
});

describe('importDxfText — failure paths name what went wrong', () => {

  it('empty file', () => {
    const e = failure(() => importDxfText('   \n  '));
    expect(e.reason).toBe('empty');
    expect(e.message).toBe('DXF payload is empty.');
  });

  it('not a DXF at all', () => {
    const e = failure(() => importDxfText('hello\nworld\n'));
    expect(e.reason).toBe('not-dxf');
    expect(e.message).toMatch(/line 1: expected a DXF group code \(an integer\) but found 'hello'/);
  });

  it('no ENTITIES section', () => {
    const e = failure(() => importDxfText(dxf(...header([9, '$INSUNITS'], [70, 4]), [0, 'EOF'])));
    expect(e.reason).toBe('no-entities');
    expect(e.message).toMatch(/no ENTITIES section/);
  });

  it('refuses a periodic SPLINE whose control net does not wrap instead of guessing the closure', () => {
    const e = failure(() => importDxfText(entities(
      [0, 'SPLINE'], [70, 11], [71, 3], [72, 8], [73, 4],
      ...Array.from({ length: 8 }, (_, i): [number, number] => [40, i]),
      ...SQUARE_NET.flatMap(([x, y]): Array<[number, number]> => [[10, x], [20, y]]),
    )));
    expect(e.reason).toBe('unsupported-entity');
    expect(e.message).toMatch(/^SPLINE at line \d+:/);
    expect(e.message).toMatch(/closed flag is set but the curve endpoints do not meet/);
  });

  it('refuses a closed fit-point-only SPLINE instead of guessing its periodic interpolation', () => {
    const e = failure(() => importDxfText(entities(
      [0, 'SPLINE'], [70, 11], [71, 3], [72, 0], [73, 0], [74, 4],
      ...SQUARE_NET.flatMap(([x, y]): Array<[number, number]> => [[11, x], [21, y]]),
    )));
    expect(e.reason).toBe('unsupported-entity');
    expect(e.message).toMatch(/^SPLINE at line \d+: closed fit-point-only splines are not supported/);
  });

  it('refuses a fit-point SPLINE with repeated consecutive fit points as malformed', () => {
    const e = failure(() => importDxfText(entities(
      [0, 'SPLINE'], [70, 8], [71, 3], [72, 0], [73, 0], [74, 3],
      [11, 0], [21, 0], [11, 0], [21, 0], [11, 10], [21, 0],
    )));
    expect(e.reason).toBe('malformed-entity');
    expect(e.message).toMatch(/consecutive fit points coincide/);
  });

  it('an INSERT of an undefined block is refused rather than dropped', () => {
    const e = failure(() => importDxfText(entities([0, 'INSERT'], [2, 'BLK'])));
    expect(e.reason).toBe('malformed-entity');
    expect(e.message).toMatch(/^INSERT at line \d+: block "BLK" is not defined in the BLOCKS section/);
  });

  it('rejects a zero-span ELLIPSE as malformed instead of making a degenerate profile', () => {
    const e = failure(() => importDxfText(entities(
      [0, 'ELLIPSE'], [10, 0], [20, 0], [11, 5], [21, 0], [40, 0.5], [41, 1], [42, 1],
    )));
    expect(e.reason).toBe('malformed-entity');
    expect(e.message).toMatch(/^ELLIPSE at line \d+: start\/end parameters must define a non-zero span/);
  });

  it('an unknown entity is refused, not skipped', () => {
    const e = failure(() => importDxfText(entities([0, 'HELIX'], [10, 0], [20, 0])));
    expect(e.reason).toBe('unsupported-entity');
    expect(e.message).toMatch(/^HELIX at line \d+: unsupported DXF entity/);
    expect(e.message).toMatch(/leaves a hole in the profile/);
  });

  it('malformed entity — missing required group code, named with its line', () => {
    const e = failure(() => importDxfText(entities([0, 'LINE'], [10, 0], [20, 0], [11, 10])));
    expect(e.reason).toBe('malformed-entity');
    expect(e.message).toMatch(/^LINE at line \d+: required group code 21 is missing\.$/);
  });

  it('malformed entity — non-numeric coordinate, named with its line', () => {
    const e = failure(() =>
      importDxfText(entities([0, 'CIRCLE'], [10, 0], [20, 0], [40, 'ten'])));
    expect(e.reason).toBe('malformed-entity');
    expect(e.message).toMatch(/CIRCLE at line \d+: group code 40 must be a finite number, got 'ten'/);
  });

  it('an open contour is reported with both dangling ends, never auto-closed', () => {
    // Three sides of a square: the chain dead-ends 10 mm from its own start.
    const e = failure(() => importDxfText(entities(
      [0, 'LINE'], [10, 0], [20, 0], [11, 10], [21, 0],
      [0, 'LINE'], [10, 10], [20, 0], [11, 10], [21, 10],
      [0, 'LINE'], [10, 10], [20, 10], [11, 0], [21, 10],
    )));
    expect(e.reason).toBe('contour');
    expect(e.message).toMatch(/open contour/);
    expect(e.message).toMatch(/dead-ends at \(0\.0000, 10\.0000\) mm/);
    expect(e.message).toMatch(/10\.0 mm from its own start/);
    expect(e.message).toMatch(/past the 0\.00100 mm tolerance/);
  });

  it('a loose tolerance closes the gap the strict default rejects', () => {
    const gappy = entities(
      [0, 'LINE'], [10, 0], [20, 0], [11, 10], [21, 0],
      [0, 'LINE'], [10, 10], [20, 0], [11, 10], [21, 10],
      [0, 'LINE'], [10, 10], [20, 10], [11, 0], [21, 10],
      [0, 'LINE'], [10, 0], [20, 10], [11, 0.05], [21, 0],
    );
    expect(() => importDxfText(gappy)).toThrowError(/open contour/);
    const r = importDxfText(gappy, { tolerance: 0.1 });
    expect(r.gapsClosed).toBe(1);
    expect(r.regions).toHaveLength(1);
  });

  it('an ambiguous junction is reported instead of guessed', () => {
    // A closed square plus a stray spur leaving one of its corners.
    const e = failure(() => importDxfText(entities(
      [0, 'LINE'], [10, 0], [20, 0], [11, 10], [21, 0],
      [0, 'LINE'], [10, 10], [20, 0], [11, 10], [21, 10],
      [0, 'LINE'], [10, 10], [20, 10], [11, 0], [21, 10],
      [0, 'LINE'], [10, 0], [20, 10], [11, 0], [21, 0],
      [0, 'LINE'], [10, 10], [20, 0], [11, 20], [21, -5],
    )));
    expect(e.reason).toBe('contour');
    expect(e.message).toMatch(/ambiguous junction at \(10\.0000, 0\.0000\) mm/);
    expect(e.message).toMatch(/3 segments meet there/);
  });

  it('a file with only annotation entities fails rather than returning nothing', () => {
    const e = failure(() => importDxfText(entities([0, 'TEXT'], [1, 'hi'], [10, 0], [20, 0])));
    expect(e.reason).toBe('contour');
    expect(e.message).toMatch(/no usable 2D geometry/);
  });
});
