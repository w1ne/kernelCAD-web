// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The commands behind `path().ellipse(cx, cy, rx, ry, opts?)` and
// `path().ellipseArc(x, y, rx, ry, opts?)`.
//
// An ellipse is an affine image of a circle, and a circular arc of up to 90°
// is exactly one rational quadratic Bézier (weights 1, cos(half angle), 1).
// Both calls therefore emit `nurbsSegment` commands: the geometry is an exact
// ellipse, not a polyline or a fitted spline, and every consumer that already
// handles `nurbsSegment` (extrude, revolve, loft, translate, rotate, scale,
// reflect) handles an ellipse with no new command kind.
import type { Param } from '../../shared/intent/types';
import { isValidEditableNumber } from '../../shared/intent/types';
import { invalidArgsError } from '../../shared/intent/invalidArgs';
import { isParamRef, type Editable, type ParamRefExpr } from '../../shared/runtime/paramRef';
import { currentValue, paramExpr, paramFromExpr, toParam } from '../../shared/runtime/editableHelpers';
import type { SketchCommand } from '../../shared/capture/sketchCommand';

type ParamTable = Parameters<typeof currentValue>[1];
type NurbsSegment = Extract<SketchCommand, { kind: 'nurbsSegment' }>;

/** Options of `path().ellipse(cx, cy, rx, ry, opts)`. */
export interface EllipseOptions {
  /** Counterclockwise turn of the `rx` axis from sketch +X, in degrees. */
  rotationDeg?: number;
}

/** Options of `path().ellipseArc(x, y, rx, ry, opts)`. */
export interface EllipseArcOptions {
  /** Counterclockwise turn of the `rx` axis from sketch +X, in degrees. */
  rotationDeg?: number;
  /** Take the arc that spans more than 180°. Default false. */
  largeArc?: boolean;
  /** Travel clockwise from the pen to `(x, y)`. Default false (counterclockwise). */
  clockwise?: boolean;
}

const ELLIPSE_API = 'path().ellipse(cx, cy, rx, ry, opts?)';
const ELLIPSE_EXAMPLE = 'path().ellipse(0, 0, 20, 10, { rotationDeg: 30 })';
const ARC_API = 'path().ellipseArc(x, y, rx, ry, opts?)';
const ARC_EXAMPLE = 'path().moveTo(20, 0).ellipseArc(0, 10, 20, 10).lineTo(0, 0).close()';

/** cos and sin of `deg`, exact at the multiples of 90° so an axis-aligned
 *  ellipse has no 1e-17 terms in its control points. */
function cosSinDeg(deg: number): [number, number] {
  const snap = (v: number): number => (Math.abs(v) < 1e-15 ? 0 : Math.abs(Math.abs(v) - 1) < 1e-15 ? Math.sign(v) : v);
  const rad = (deg * Math.PI) / 180;
  return [snap(Math.cos(rad)), snap(Math.sin(rad))];
}

function checkOptions(api: string, example: string, opts: unknown, keys: readonly string[]): Record<string, unknown> {
  if (opts === undefined || opts === null) return {};
  if (typeof opts !== 'object' || Array.isArray(opts)) {
    throw invalidArgsError({
      api, path: 'opts', got: opts, showType: true,
      requires: `an option object with only ${keys.join(', ')}`, example,
    });
  }
  const unknownKey = Object.keys(opts).find((key) => !keys.includes(key));
  if (unknownKey !== undefined) {
    throw invalidArgsError({
      api, path: `opts.${unknownKey}`, gotText: `an unknown option '${unknownKey}'`,
      requires: `one of ${keys.join(', ')}`, example,
    });
  }
  return opts as Record<string, unknown>;
}

function rotationOf(api: string, example: string, value: unknown): number {
  if (value === undefined) return 0;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw invalidArgsError({
      api, path: 'opts.rotationDeg', got: value, showType: typeof value !== 'number',
      requires: 'a finite plain number (a param() value cannot drive it)', unit: 'deg', example,
    });
  }
  return value;
}

function flagOf(api: string, example: string, key: string, value: unknown): boolean {
  if (value === undefined) return false;
  if (typeof value !== 'boolean') {
    throw invalidArgsError({ api, path: `opts.${key}`, got: value, showType: true, requires: 'true or false', example });
  }
  return value;
}

const UNIT_WEIGHT = (): Param => toParam(1, 'unitless');

function quadratic(points: Array<{ x: Param; y: Param }>, weight: number): NurbsSegment {
  return {
    kind: 'nurbsSegment',
    controlPoints: points,
    degree: toParam(2, 'unitless'),
    weights: [UNIT_WEIGHT(), toParam(weight, 'unitless'), UNIT_WEIGHT()],
    knots: undefined,
  };
}

/**
 * The open loop of an ellipse centred on `(cx, cy)` with semi-axes `rx` and
 * `ry`, starting at the +rx end and running counterclockwise (the caller
 * closes it). Four exact quarter arcs.
 *
 * Each control point is captured as `c + rx·k1 + ry·k2` (k1, k2 fixed
 * constants set by `rotationDeg`), so a ParamRef centre or semi-axis stays
 * symbolic. Literal inputs fold to plain numbers.
 */
export function ellipseCommands(
  cx: Editable<number>,
  cy: Editable<number>,
  rx: Editable<number>,
  ry: Editable<number>,
  opts: unknown,
  table: ParamTable,
): SketchCommand[] {
  const given = checkOptions(ELLIPSE_API, ELLIPSE_EXAMPLE, opts, ['rotationDeg']);
  const args = [['cx', cx], ['cy', cy], ['rx', rx], ['ry', ry]] as const;
  for (const [name, v] of args) {
    if (!isValidEditableNumber(v) || !Number.isFinite(currentValue(v, table))) {
      throw invalidArgsError({
        api: ELLIPSE_API, path: name, got: v, showType: typeof v !== 'number',
        requires: 'a finite number or numeric param() value', unit: 'mm', example: ELLIPSE_EXAMPLE,
      });
    }
  }
  for (const [name, v] of [['rx', rx], ['ry', ry]] as const) {
    const now = currentValue(v, table);
    if (now <= 0) {
      throw invalidArgsError({
        api: ELLIPSE_API, path: name, got: now, requires: `${name} > 0 (a positive semi-axis)`, unit: 'mm',
        example: ELLIPSE_EXAMPLE,
      });
    }
  }
  const [cos, sin] = cosSinDeg(rotationOf(ELLIPSE_API, ELLIPSE_EXAMPLE, given.rotationDeg));
  const cxE = paramExpr(toParam(cx, 'mm'));
  const cyE = paramExpr(toParam(cy, 'mm'));
  const rxE = paramExpr(toParam(rx, 'mm'));
  const ryE = paramExpr(toParam(ry, 'mm'));
  const plus = (base: ParamRefExpr, r: ParamRefExpr, k: number): ParamRefExpr =>
    k === 0 ? base : { kind: 'binop', op: '+', left: base, right: { kind: 'binop', op: '*', left: r, right: { kind: 'lit', value: k } } };
  // The point `c + a·rx·u + b·ry·v`, u and v being the turned axis directions.
  const at = (a: number, b: number): { x: Param; y: Param } => ({
    x: paramFromExpr(plus(plus(cxE, rxE, a * cos), ryE, -b * sin), 'mm'),
    y: paramFromExpr(plus(plus(cyE, rxE, a * sin), ryE, b * cos), 'mm'),
  });
  const ring: Array<[number, number]> = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0]];
  const start = at(1, 0);
  const out: SketchCommand[] = [{ kind: 'moveTo', x: start.x, y: start.y }];
  for (let i = 0; i < 8; i += 2) {
    out.push(quadratic([at(...ring[i]), at(...ring[i + 1]), at(...ring[i + 2])], Math.SQRT1_2));
  }
  return out;
}

interface ArcGeometry {
  center: [number, number];
  /** Start angle on the unit circle, and the signed sweep (positive = counterclockwise). */
  theta: number;
  sweep: number;
}

/** Centre form of the arc from `p0` to `p1` (SVG 1.1 appendix F.6.5, with the
 *  Y axis pointing up, so a positive sweep is counterclockwise). */
function arcGeometry(
  p0: [number, number], p1: [number, number], rx: number, ry: number,
  cos: number, sin: number, largeArc: boolean, clockwise: boolean,
): ArcGeometry {
  const hx = (p0[0] - p1[0]) / 2;
  const hy = (p0[1] - p1[1]) / 2;
  const x1 = cos * hx + sin * hy;
  const y1 = -sin * hx + cos * hy;
  const lambda = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
  if (lambda > 1 + 1e-9) {
    const k = Math.sqrt(lambda);
    throw invalidArgsError({
      api: ARC_API, path: 'rx, ry',
      gotText: `rx = ${rx}, ry = ${ry}, too small to join (${p0[0]}, ${p0[1]}) to (${p1[0]}, ${p1[1]})`,
      requires: `an ellipse that reaches both points; the smallest with this axis ratio is rx = ${+(rx * k).toFixed(6)}, ry = ${+(ry * k).toFixed(6)}`,
      unit: 'mm', example: ARC_EXAMPLE,
    });
  }
  const num = Math.max(0, rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1);
  const den = rx * rx * y1 * y1 + ry * ry * x1 * x1;
  // In SVG terms the sweep flag is `!clockwise`; the centre takes the minus
  // sign when the two flags are equal.
  const sign = largeArc === !clockwise ? -1 : 1;
  const coef = sign * Math.sqrt(num / den);
  const cxp = (coef * rx * y1) / ry;
  const cyp = (-coef * ry * x1) / rx;
  const center: [number, number] = [
    cos * cxp - sin * cyp + (p0[0] + p1[0]) / 2,
    sin * cxp + cos * cyp + (p0[1] + p1[1]) / 2,
  ];
  const theta = Math.atan2((y1 - cyp) / ry, (x1 - cxp) / rx);
  const end = Math.atan2((-y1 - cyp) / ry, (-x1 - cxp) / rx);
  let sweep = end - theta;
  if (!clockwise && sweep <= 0) sweep += 2 * Math.PI;
  if (clockwise && sweep >= 0) sweep -= 2 * Math.PI;
  return { center, theta, sweep };
}

/**
 * The segments of an elliptical arc from the pen to `(x, y)`: one exact
 * rational quadratic per 90° of sweep or part of it. The first control point
 * is the pen itself and the last is `(x, y)` as given, so the joins are exact.
 *
 * The centre is solved from the two points when the script runs, so every
 * argument is a plain number: a `param()` value is refused.
 */
export function ellipseArcCommands(
  pen: { x: Param; y: Param } | null,
  args: { x: unknown; y: unknown; rx: unknown; ry: unknown },
  opts: unknown,
  now: (p: Param) => number,
): NurbsSegment[] {
  const given = checkOptions(ARC_API, ARC_EXAMPLE, opts, ['rotationDeg', 'largeArc', 'clockwise']);
  for (const name of ['x', 'y', 'rx', 'ry'] as const) {
    const v = args[name];
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      throw invalidArgsError({
        api: ARC_API, path: name, got: isParamRef(v) ? undefined : v, showType: typeof v !== 'number',
        ...(isParamRef(v) ? { gotText: 'a param() value' } : {}),
        requires: 'a finite plain number (the arc centre is solved when the script runs, so a param() value cannot drive it)',
        unit: 'mm', example: ARC_EXAMPLE,
      });
    }
  }
  const { x, y, rx, ry } = args as { x: number; y: number; rx: number; ry: number };
  for (const [name, v] of [['rx', rx], ['ry', ry]] as const) {
    if (v <= 0) {
      throw invalidArgsError({
        api: ARC_API, path: name, got: v, requires: `${name} > 0 (a positive semi-axis)`, unit: 'mm', example: ARC_EXAMPLE,
      });
    }
  }
  if (pen === null) {
    throw invalidArgsError({
      api: ARC_API, path: 'pen', gotText: 'no current point',
      requires: 'a current point — call moveTo(x, y) before ellipseArc', example: ARC_EXAMPLE,
    });
  }
  const p0: [number, number] = [now(pen.x), now(pen.y)];
  if (Math.hypot(x - p0[0], y - p0[1]) < 1e-9) {
    throw invalidArgsError({
      api: ARC_API, path: 'x, y', gotText: `(${x}, ${y}), the current point`,
      requires: 'an end point away from the current point; use path().ellipse(cx, cy, rx, ry) for a full ellipse',
      unit: 'mm', example: ARC_EXAMPLE,
    });
  }
  const [cos, sin] = cosSinDeg(rotationOf(ARC_API, ARC_EXAMPLE, given.rotationDeg));
  const largeArc = flagOf(ARC_API, ARC_EXAMPLE, 'largeArc', given.largeArc);
  const clockwise = flagOf(ARC_API, ARC_EXAMPLE, 'clockwise', given.clockwise);
  const { center, theta, sweep } = arcGeometry(p0, [x, y], rx, ry, cos, sin, largeArc, clockwise);
  const count = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 2) - 1e-9));
  const step = sweep / count;
  // The ellipse point for unit-circle coordinates (c, s), scaled by `k`.
  const at = (c: number, s: number, k: number): { x: Param; y: Param } => ({
    x: toParam(center[0] + k * (rx * c * cos - ry * s * sin), 'mm'),
    y: toParam(center[1] + k * (rx * c * sin + ry * s * cos), 'mm'),
  });
  const weight = Math.cos(step / 2);
  const out: NurbsSegment[] = [];
  let from = pen;
  for (let i = 0; i < count; i++) {
    const mid = theta + step * (i + 0.5);
    const endAngle = theta + step * (i + 1);
    const to = i === count - 1
      ? { x: toParam(x, 'mm'), y: toParam(y, 'mm') }
      : at(Math.cos(endAngle), Math.sin(endAngle), 1);
    out.push(quadratic([from, at(Math.cos(mid), Math.sin(mid), 1 / weight), to], weight));
    from = to;
  }
  return out;
}
