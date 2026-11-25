// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/flatBlankOutline.ts
//
// Outer outline of a flat sheet-metal blank, recovered from the root
// `sheetMetal(...)` profile sketch. `Region` wires are polylines, so curved
// sketch segments are sampled here. The sampler supports every arc family the
// PathBuilder exposes (radius / sagitta / bulge / tangent / three-point) plus
// lines; exact-rational segments (ellipse, NURBS, splines) are refused by name
// instead of being silently straightened.
//
// Sampling is adaptive: the chord sagitta stays at or below
// ARC_CHORD_TOL_MM, which is finer than the 48-samples-per-turn sampling used
// for blank inner loops, so the recovered outline matches the authored arc to
// manufacturing tolerance.

import type { SketchCommand } from '../../../shared/capture/sketchCommand';
import { argChecker, type InvalidArgsSpec } from '../../../shared/intent/invalidArgs';
import type { Vec2 } from '../../../shared/intent/region';

/** Maximum distance (mm) between a sampled chord and its true arc. */
export const ARC_CHORD_TOL_MM = 0.005;
const MIN_ARC_SEGMENTS = 4;
const MAX_ARC_SEGMENTS = 720;
const GEOM_EPS = 1e-9;

interface Pt { x: number; y: number }

interface ArcSpec {
  centre: Pt;
  radius: number;
  startAngle: number;
  /** Signed sweep in radians: positive = counter-clockwise. */
  sweep: number;
}

type ArcCommand = Extract<
  SketchCommand,
  { kind: 'tangentArc' | 'threePointsArc' | 'sagittaArc' | 'bulgeArc' | 'radiusArc' }
>;

const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y });
const len = (a: Pt): number => Math.hypot(a.x, a.y);
const mod2pi = (a: number): number => {
  const twoPi = Math.PI * 2;
  const r = a % twoPi;
  return r < 0 ? r + twoPi : r;
};

/** Chord sagitta → arc. `sagitta > 0` bulges left of the start→end chord. */
function arcFromSagitta(start: Pt, end: Pt, sagitta: number): ArcSpec | undefined {
  const chord = sub(end, start);
  const c = len(chord);
  if (c < GEOM_EPS) return undefined;
  if (Math.abs(sagitta) < GEOM_EPS) return undefined;
  const theta = 4 * Math.atan((2 * Math.abs(sagitta)) / c);
  const radius = (c / 2) / Math.sin(theta / 2);
  if (!(radius > 0) || !Number.isFinite(radius)) return undefined;
  const left: Pt = { x: -chord.y / c, y: chord.x / c };
  const mid: Pt = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  const offset = radius * Math.cos(theta / 2);
  const bulgeSign = sagitta > 0 ? 1 : -1;
  const centre: Pt = { x: mid.x - bulgeSign * left.x * offset, y: mid.y - bulgeSign * left.y * offset };
  const startAngle = Math.atan2(start.y - centre.y, start.x - centre.x);
  // A left bulge travels clockwise about its centre (and the reverse for right).
  return { centre, radius, startAngle, sweep: -bulgeSign * theta };
}

/** Circle through start, an interior point, and end. */
function arcFromThreePoints(start: Pt, mid: Pt, end: Pt): ArcSpec | undefined {
  const cross = (mid.x - start.x) * (end.y - start.y) - (mid.y - start.y) * (end.x - start.x);
  if (Math.abs(cross) < GEOM_EPS) return undefined;
  const s2 = start.x * start.x + start.y * start.y;
  const m2 = mid.x * mid.x + mid.y * mid.y;
  const e2 = end.x * end.x + end.y * end.y;
  const d = 2 * (start.x * (mid.y - end.y) + mid.x * (end.y - start.y) + end.x * (start.y - mid.y));
  if (Math.abs(d) < GEOM_EPS) return undefined;
  const centre: Pt = {
    x: (s2 * (mid.y - end.y) + m2 * (end.y - start.y) + e2 * (start.y - mid.y)) / d,
    y: (s2 * (end.x - mid.x) + m2 * (start.x - end.x) + e2 * (mid.x - start.x)) / d,
  };
  const radius = len(sub(start, centre));
  if (!(radius > 0) || !Number.isFinite(radius)) return undefined;
  const startAngle = Math.atan2(start.y - centre.y, start.x - centre.x);
  const endAngle = Math.atan2(end.y - centre.y, end.x - centre.x);
  // The arc passes through `mid`: a left-of-chord interior point means the
  // centre sits on the other side and the travel about it is clockwise.
  const direction = cross > 0 ? 1 : -1;
  const sweep = direction > 0 ? mod2pi(endAngle - startAngle) : -mod2pi(startAngle - endAngle);
  return { centre, radius, startAngle, sweep };
}

/** Arc that leaves `start` along the unit `tangent` and reaches `end`. */
function arcFromTangent(start: Pt, end: Pt, tangent: Pt): ArcSpec | undefined {
  const chord = sub(end, start);
  const c = len(chord);
  if (c < GEOM_EPS) return undefined;
  const left: Pt = { x: -tangent.y, y: tangent.x };
  const k = left.x * chord.x + left.y * chord.y;
  if (Math.abs(k) < GEOM_EPS * c) return undefined;
  const radiusSigned = (c * c) / (2 * k);
  if (!Number.isFinite(radiusSigned) || Math.abs(radiusSigned) < GEOM_EPS) return undefined;
  const centre: Pt = { x: start.x + radiusSigned * left.x, y: start.y + radiusSigned * left.y };
  const radius = Math.abs(radiusSigned);
  const startAngle = Math.atan2(start.y - centre.y, start.x - centre.x);
  const endAngle = Math.atan2(end.y - centre.y, end.x - centre.x);
  const direction = radiusSigned > 0 ? 1 : -1;
  const sweep = direction > 0 ? mod2pi(endAngle - startAngle) : -mod2pi(startAngle - endAngle);
  return { centre, radius, startAngle, sweep };
}

/** The arc a sketch command describes, or undefined when it is really a line. */
function arcForCommand(cmd: ArcCommand, start: Pt, end: Pt, tangent?: Pt): ArcSpec | undefined {
  switch (cmd.kind) {
    case 'sagittaArc':
      return arcFromSagitta(start, end, cmd.sagitta.evaluated);
    case 'bulgeArc': {
      const chord = len(sub(end, start));
      return arcFromSagitta(start, end, (cmd.bulge.evaluated * chord) / 2);
    }
    case 'radiusArc': {
      const chord = len(sub(end, start));
      const r = Math.abs(cmd.radius.evaluated);
      if (chord < GEOM_EPS) return undefined;
      if (r < chord / 2) return undefined;
      const sagitta = r - Math.sqrt(Math.max(0, r * r - (chord * chord) / 4));
      return arcFromSagitta(start, end, cmd.radius.evaluated >= 0 ? sagitta : -sagitta);
    }
    case 'threePointsArc':
      return arcFromThreePoints(start, { x: cmd.midX.evaluated, y: cmd.midY.evaluated }, end);
    case 'tangentArc':
      return tangent === undefined ? undefined : arcFromTangent(start, end, tangent);
  }
}

function arcSegments(radius: number, sweep: number): number {
  const halfAngle = radius > ARC_CHORD_TOL_MM
    ? Math.acos(Math.max(-1, Math.min(1, 1 - ARC_CHORD_TOL_MM / radius)))
    : Math.PI / 2;
  const count = Math.ceil(Math.abs(sweep) / (2 * halfAngle));
  return Math.max(MIN_ARC_SEGMENTS, Math.min(MAX_ARC_SEGMENTS, count));
}

/** Append every sampled point after the arc's start, ending exactly at `end`. */
function appendArc(out: Vec2[], arc: ArcSpec, end: Pt): void {
  const n = arcSegments(arc.radius, arc.sweep);
  for (let i = 1; i <= n; i++) {
    const angle = arc.startAngle + (arc.sweep * i) / n;
    out.push([
      arc.centre.x + arc.radius * Math.cos(angle),
      arc.centre.y + arc.radius * Math.sin(angle),
    ]);
  }
  out[out.length - 1] = [end.x, end.y];
}

/** Unit tangent at the end of an arc, in its travel direction. */
function arcEndTangent(arc: ArcSpec): Pt {
  const angle = arc.startAngle + arc.sweep;
  const sign = Math.sign(arc.sweep) || 1;
  return { x: -Math.sin(angle) * sign, y: Math.cos(angle) * sign };
}

type Bad = (spec: Omit<InvalidArgsSpec, 'api' | 'featureId' | 'code'>) => never;

const ARC_EXAMPLE =
  'sheetMetal(path().moveTo(10, 0).lineTo(90, 0).tangentArc(100, 10).lineTo(100, 50).close(), { thickness: 2, kFactor: 0.38 })';

function arcFailure(bad: Bad, kind: string, from: Pt, to: Pt): never {
  bad({
    path: `profile.${kind}`,
    gotText: `an arc from (${from.x}, ${from.y}) to (${to.x}, ${to.y}) that cannot be reconstructed`,
    requires:
      'two distinct endpoints and a geometrically valid arc; radiusArc needs a finite |radius| >= half the chord, and tangentArc needs a previous straight or arc tangent',
    example: ARC_EXAMPLE,
    hint: 'invalid-args.flattenPattern.curved-sketch — give the arc a finite radius and two distinct endpoints, or replace it with lineTo segments.',
  });
}

interface WalkState {
  out: Vec2[];
  pen?: Pt;
  tangent?: Pt;
}

function applyArc(state: WalkState, cmd: ArcCommand, bad: Bad): void {
  const start = state.pen;
  if (start === undefined) {
    bad({
      path: `profile.${cmd.kind}`,
      gotText: 'an arc before any point',
      requires: 'a path that begins with moveTo before the first arc',
      example: ARC_EXAMPLE,
      hint: 'invalid-args.flattenPattern.curved-sketch — start the blank outline with path().moveTo(x, y).',
    });
  }
  const end: Pt = { x: cmd.x.evaluated, y: cmd.y.evaluated };
  if (Math.hypot(end.x - start.x, end.y - start.y) < GEOM_EPS) {
    // A zero-length segment contributes no point; the lowerer accepts it too.
    state.pen = end;
    return;
  }
  if (isStraightArc(cmd, start, end)) {
    // A sub-tolerance sagitta / bulge is a straight segment, matching the
    // lowerer while keeping the sampled wire below the chord tolerance.
    state.out.push([end.x, end.y]);
    state.pen = end;
    state.tangent = unitOrUndefined(sub(end, start));
    return;
  }
  const arc = arcForCommand(cmd, start, end, state.tangent);
  if (arc === undefined || !Number.isFinite(arc.radius) || !Number.isFinite(arc.sweep)) {
    arcFailure(bad, cmd.kind, start, end);
  }
  appendArc(state.out, arc, end);
  state.pen = end;
  state.tangent = arcEndTangent(arc);
}

/** True when the arc's bulge is below the flat-pattern chord tolerance. */
function isStraightArc(cmd: ArcCommand, start: Pt, end: Pt): boolean {
  const chord = Math.hypot(end.x - start.x, end.y - start.y);
  if (cmd.kind === 'sagittaArc') return Math.abs(cmd.sagitta.evaluated) <= ARC_CHORD_TOL_MM;
  if (cmd.kind === 'bulgeArc') {
    return (Math.abs(cmd.bulge.evaluated) * chord) / 2 <= ARC_CHORD_TOL_MM;
  }
  if (cmd.kind === 'radiusArc') {
    const r = Math.abs(cmd.radius.evaluated);
    if (r < chord / 2) return false;
    return r - Math.sqrt(Math.max(0, r * r - (chord * chord) / 4)) <= ARC_CHORD_TOL_MM;
  }
  return false;
}

const ARC_KINDS = new Set(['tangentArc', 'threePointsArc', 'sagittaArc', 'bulgeArc', 'radiusArc']);

/** Sample a closed sketch command list into the flat-pattern outer polyline. */
export function outlineFromSketchCommands(
  commands: readonly SketchCommand[],
  featureId: string,
): Vec2[] {
  const bad = argChecker('flattenPattern(shape)', featureId);
  const state: WalkState = { out: [] };
  for (const cmd of commands) {
    if (cmd.kind === 'close') break;
    if (cmd.kind === 'moveTo' || cmd.kind === 'lineTo') {
      const point: Pt = { x: cmd.x.evaluated, y: cmd.y.evaluated };
      const previous = state.pen;
      state.out.push([point.x, point.y]);
      state.pen = point;
      state.tangent = previous === undefined ? undefined : unitOrUndefined(sub(point, previous));
      continue;
    }
    if (ARC_KINDS.has(cmd.kind)) {
      applyArc(state, cmd as ArcCommand, bad);
      continue;
    }
    bad({
      path: 'profile',
      gotText: `a "${cmd.kind}" segment`,
      requires:
        'lines and the arc family (radiusArc, sagittaArc, bulgeArc, tangentArc, threePointsArc); a Region outer wire is a polyline, so an exact ellipse / NURBS / spline segment has no sampled form',
      example: ARC_EXAMPLE,
      hint: 'invalid-args.flattenPattern.curved-sketch — rebuild the blank outline from lineTo and the arc family, or replace ellipse / spline segments with arcs.',
    });
  }
  if (state.out.length < 3) {
    bad({
      path: 'profile',
      gotText: `${state.out.length} outline points`,
      requires: 'a closed outline with at least 3 vertices',
      example: 'sheetMetal(path().moveTo(0, 0).lineTo(100, 0).lineTo(100, 60).lineTo(0, 60).close(), { thickness: 2, kFactor: 0.38 })',
      hint: 'invalid-args.flattenPattern.degenerate — provide a closed sketch with 3+ vertices.',
    });
  }
  return state.out;
}

function unitOrUndefined(v: Pt): Pt | undefined {
  const l = len(v);
  return l < GEOM_EPS ? undefined : { x: v.x / l, y: v.y / l };
}
