// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/import/importDxf.ts
//
// DXF (`.dxf`) reader — 2D profiles only, pure TypeScript, no OCCT.
//
// WHAT A DXF ACTUALLY IS
// ----------------------
// A flat stream of (group code, value) pairs, two physical lines each: the
// code on one line, its value on the next. Structure comes from sentinel
// pairs — `0/SECTION`, `2/ENTITIES`, `0/ENDSEC` — not from nesting. That is
// why every diagnostic here can quote a line number: the line number IS the
// address of the data.
//
// WHAT WE READ
// ------------
//   LINE        straight segment
//   ARC         centre/radius/start+end angle -> exact bulge arc
//   CIRCLE      -> two exact 180° bulge arcs
//   LWPOLYLINE  vertices with optional per-vertex BULGE (group code 42)
//   POLYLINE    the pre-R13 form: a header entity plus VERTEX children
//   SPLINE      planar, clamped, continuous, non-periodic control-point B-splines, kept
//               as exact rational/non-rational NURBS sketch commands
//   ELLIPSE     full planar ellipses, kept as four exact rational NURBS arcs
//
// The bulge on a polyline vertex is `tan(includedAngle / 4)` — the same
// number, same sign convention, that `SketchCommand.bulgeArc` carries. It is
// copied across verbatim rather than converted into sagitta or a chord
// approximation, so a DXF arc round-trips exactly.
//
// WHAT WE REFUSE, AND WHY IT IS A REFUSAL
// ---------------------------------------
// Partial/non-XY ELLIPSE, INSERT (block reference), 3DFACE, SOLID and anything
// unrecognised are refused: each carries profile geometry, so skipping it
// would hand back a profile missing a piece with no indication. SPLINE is
// accepted only when its planar control points and knots define a clamped,
// continuous, non-periodic curve. Fit-point-only, nonplanar, discontinuous
// and periodic SPLINE entities still fail closed rather than being approximated.
//
// Only entities that are provably annotation — TEXT, DIMENSION, POINT and
// friends — are skipped, with the count returned to the caller.

import {
  assembleRegions,
  ContourError,
  type ImportSegment,
  type ImportedRegion,
} from './contourAssembly';
import { fullEllipseSegments } from './dxfEllipse';
import { MM_PER_UNIT, isLengthUnit, LENGTH_UNIT_NAMES, type LengthUnit } from './lengthUnits';

export type DxfParseFailure =
  | 'empty'
  | 'not-dxf'
  | 'no-entities'
  | 'unsupported-entity'
  | 'malformed-entity'
  | 'bad-units'
  | 'contour';

export class DxfParseError extends Error {
  readonly reason: DxfParseFailure;
  constructor(reason: DxfParseFailure, message: string) {
    super(message);
    this.reason = reason;
    this.name = 'DxfParseError';
  }
}

export interface ImportDxfOptions {
  /**
   * Interpret every DXF coordinate as this unit, overriding `$INSUNITS`.
   *
   * Use it when the file's header lies (common — many exporters leave
   * `$INSUNITS` at 0/Unitless while writing inches) or is absent.
   */
  units?: LengthUnit;
  /** Endpoint-matching / gap-closing distance in mm. Default 1e-3. See `AssembleOptions`. */
  tolerance?: number;
}

export interface DxfImportResult {
  /** Closed profiles, largest area first. */
  regions: ImportedRegion[];
  /** Millimetres per source coordinate that was applied. */
  unitScale: number;
  /** How that scale was decided — `$INSUNITS=4 (mm)`, `opts.units=in`, or the assumption. */
  unitSource: string;
  /** Annotation entities that carried no profile geometry and were skipped. */
  ignoredEntities: string[];
  duplicatesDropped: number;
  degeneratesDropped: number;
  gapsClosed: number;
}

/** Default endpoint tolerance in mm. See `AssembleOptions.tolerance` for the rationale. */
export const DEFAULT_DXF_TOLERANCE = 1e-3;

/**
 * `$INSUNITS` (group code 70 in HEADER) to unit.
 *
 * Only the values that name a length are listed. Codes 3 (miles), 8
 * (microinches), 9 (mils), 11 (Angstroms) and the astronomical ones exist in
 * the spec but never in a mechanical drawing; an unlisted code is an error
 * rather than a guess.
 */
const INSUNITS: Readonly<Record<number, LengthUnit>> = {
  1: 'in',
  2: 'ft',
  4: 'mm',
  5: 'cm',
  6: 'm',
  10: 'yd',
  13: 'um',
  14: 'dm',
};

/**
 * Entities that are annotation or construction aids: they never contribute to
 * a closed profile, so skipping them loses nothing. Everything NOT on this
 * list and not handled is an error.
 */
const ANNOTATION_ENTITIES = new Set([
  'TEXT', 'MTEXT', 'DIMENSION', 'LEADER', 'MLEADER', 'TOLERANCE',
  'POINT', 'ATTDEF', 'ATTRIB', 'VIEWPORT', 'IMAGE', 'WIPEOUT', 'RAY', 'XLINE',
]);

interface Pair {
  code: number;
  value: string;
  /** 1-based physical line number of the CODE line, for diagnostics. */
  line: number;
}

function tokenize(text: string): Pair[] {
  const lines = text.split(/\r\n|\r|\n/);
  const pairs: Pair[] = [];
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const raw = lines[i].trim();
    if (raw === '') continue;
    const code = Number(raw);
    if (!Number.isInteger(code)) {
      throw new DxfParseError(
        'not-dxf',
        `line ${i + 1}: expected a DXF group code (an integer) but found '${lines[i].slice(0, 40)}'.`,
      );
    }
    pairs.push({ code, value: lines[i + 1] ?? '', line: i + 1 });
  }
  return pairs;
}

function num(p: Pair, entity: string, code: number): number {
  const v = Number(p.value.trim());
  if (!Number.isFinite(v)) {
    throw new DxfParseError(
      'malformed-entity',
      `${entity} at line ${p.line}: group code ${code} must be a finite number, got '${p.value.trim()}'.`,
    );
  }
  return v;
}

/** Resolve the millimetres-per-coordinate scale from `opts` or `$INSUNITS`. */
function resolveScale(
  pairs: readonly Pair[],
  opts: ImportDxfOptions,
): { scale: number; source: string } {
  if (opts.units !== undefined) {
    if (!isLengthUnit(opts.units)) {
      throw new DxfParseError(
        'bad-units',
        `opts.units '${String(opts.units)}' is not a known length unit (${LENGTH_UNIT_NAMES.join(', ')}).`,
      );
    }
    return { scale: MM_PER_UNIT[opts.units], source: `opts.units=${opts.units}` };
  }

  for (let i = 0; i + 1 < pairs.length; i++) {
    if (pairs[i].code !== 9 || pairs[i].value.trim() !== '$INSUNITS') continue;
    const v = pairs[i + 1];
    const code = Number(v.value.trim());
    if (code === 0) break; // 0 = "Unitless"; fall through to the assumption.
    const unit = INSUNITS[code];
    if (!unit) {
      throw new DxfParseError(
        'bad-units',
        `line ${v.line}: $INSUNITS=${v.value.trim()} is not a length unit kernelCAD maps ` +
          `(supported: ${Object.entries(INSUNITS).map(([k, u]) => `${k}=${u}`).join(', ')}). ` +
          'Pass opts.units to state the intended unit explicitly.',
      );
    }
    return { scale: MM_PER_UNIT[unit], source: `$INSUNITS=${code} (${unit})` };
  }

  // A DXF with no usable $INSUNITS carries bare numbers. Millimetres is the
  // kernelCAD world unit and by far the most common intent in a 2D profile
  // exchange, so that is the assumption — reported, never silent, and
  // overridable with opts.units.
  return { scale: 1, source: 'assumed mm ($INSUNITS absent or 0/Unitless)' };
}

interface EntityBlock {
  type: string;
  /** Pairs AFTER the `0/<TYPE>` pair, up to the next `0`. */
  body: Pair[];
  line: number;
}

/** Slice the ENTITIES section into `0`-delimited entity blocks. */
function entityBlocks(pairs: readonly Pair[]): EntityBlock[] {
  let start = -1;
  for (let i = 0; i + 1 < pairs.length; i++) {
    if (pairs[i].code === 0 && pairs[i].value.trim() === 'SECTION' &&
        pairs[i + 1].code === 2 && pairs[i + 1].value.trim() === 'ENTITIES') {
      start = i + 2;
      break;
    }
  }
  if (start === -1) {
    throw new DxfParseError(
      'no-entities',
      'no ENTITIES section: the file has no `0/SECTION` + `2/ENTITIES` pair, so it carries no drawable geometry.',
    );
  }

  const blocks: EntityBlock[] = [];
  let current: EntityBlock | null = null;
  for (let i = start; i < pairs.length; i++) {
    const p = pairs[i];
    if (p.code === 0) {
      const type = p.value.trim();
      if (type === 'ENDSEC') break;
      current = { type, body: [], line: p.line };
      blocks.push(current);
    } else if (current) {
      current.body.push(p);
    }
  }
  return blocks;
}

function get(body: readonly Pair[], code: number): Pair | undefined {
  return body.find(p => p.code === code);
}

function require(body: readonly Pair[], code: number, entity: string, line: number): Pair {
  const p = get(body, code);
  if (!p) {
    throw new DxfParseError(
      'malformed-entity',
      `${entity} at line ${line}: required group code ${code} is missing.`,
    );
  }
  return p;
}

function values(body: readonly Pair[], code: number, entity: string): number[] {
  return body.filter(p => p.code === code).map(p => num(p, entity, code));
}

interface SplineDefinition {
  flags: number;
  degree: number;
  declaredKnotCount: number;
  declaredControlCount: number;
}

function splineDefinition(b: EntityBlock): SplineDefinition {
  const flags = Number(require(b.body, 70, 'SPLINE', b.line).value.trim());
  if (!Number.isInteger(flags)) {
    throw new DxfParseError('malformed-entity', `SPLINE at line ${b.line}: group code 70 must be an integer flag value.`);
  }
  if ((flags & 2) !== 0) {
    throw new DxfParseError(
      'unsupported-entity',
      `SPLINE at line ${b.line}: periodic splines are not supported by the 2D path representation; ` +
        'convert it to a clamped spline in the source tool and re-export.',
    );
  }
  const degree = num(require(b.body, 71, 'SPLINE', b.line), 'SPLINE', 71);
  const declaredKnotCount = num(require(b.body, 72, 'SPLINE', b.line), 'SPLINE', 72);
  const declaredControlCount = num(require(b.body, 73, 'SPLINE', b.line), 'SPLINE', 73);
  if (!Number.isInteger(degree) || degree < 1 ||
      !Number.isInteger(declaredKnotCount) || declaredKnotCount < 0 ||
      !Number.isInteger(declaredControlCount) || declaredControlCount < 0) {
    throw new DxfParseError(
      'malformed-entity',
      `SPLINE at line ${b.line}: degree and knot/control-point counts must be non-negative integers (degree ≥ 1).`,
    );
  }
  return { flags, degree, declaredKnotCount, declaredControlCount };
}

function validateSplinePlanarity(b: EntityBlock, zs: number[]): void {
  const zScale = Math.max(1, ...zs.map(Math.abs));
  if (zs.some(z => Math.abs(z) > 1e-9 * zScale)) {
    throw new DxfParseError(
      'unsupported-entity',
      `SPLINE at line ${b.line}: non-zero Z control points are outside this 2D profile importer; flatten the spline to the XY plane.`,
    );
  }
  const nx = get(b.body, 210);
  const ny = get(b.body, 220);
  const nz = get(b.body, 230);
  const normalIsXY = Math.abs(nx ? num(nx, 'SPLINE', 210) : 0) <= 1e-9 &&
    Math.abs(ny ? num(ny, 'SPLINE', 220) : 0) <= 1e-9 &&
    Math.abs(Math.abs(nz ? num(nz, 'SPLINE', 230) : 0) - 1) <= 1e-9;
  if ((nx !== undefined || ny !== undefined || nz !== undefined) && !normalIsXY) {
    throw new DxfParseError(
      'unsupported-entity',
      `SPLINE at line ${b.line}: its normal is not aligned with the XY plane; only planar XY profiles can be imported.`,
    );
  }
}

function splineControlPoints(
  b: EntityBlock,
  scale: number,
  degree: number,
  declaredControlCount: number,
): Array<readonly [number, number]> {
  const xs = values(b.body, 10, 'SPLINE');
  const ys = values(b.body, 20, 'SPLINE');
  const zs = values(b.body, 30, 'SPLINE');
  if (xs.length !== declaredControlCount || ys.length !== declaredControlCount ||
      (zs.length !== 0 && zs.length !== declaredControlCount)) {
    throw new DxfParseError(
      'malformed-entity',
      `SPLINE at line ${b.line}: declared ${declaredControlCount} control points but found ` +
        `${xs.length} X, ${ys.length} Y and ${zs.length} Z coordinates.`,
    );
  }
  if (xs.length === 0) {
    throw new DxfParseError(
      'unsupported-entity',
      `SPLINE at line ${b.line}: fit-point-only splines are not supported; export control points and knots from the source tool.`,
    );
  }
  if (degree + 1 > xs.length) {
    throw new DxfParseError(
      'malformed-entity',
      `SPLINE at line ${b.line}: degree ${degree} requires at least ${degree + 1} control points, found ${xs.length}.`,
    );
  }
  validateSplinePlanarity(b, zs);
  return xs.map((x, i) => [x * scale, ys[i] * scale] as const);
}

function validateKnotOrder(knots: number[], line: number): void {
  for (let i = 1; i < knots.length; i++) {
    if (knots[i] < knots[i - 1]) {
      throw new DxfParseError('malformed-entity', `SPLINE at line ${line}: knot values must be non-decreasing.`);
    }
  }
}

function validateKnotDomain(knots: number[], degree: number, controlCount: number, line: number): void {
  if (knots[degree] >= knots[controlCount]) {
    throw new DxfParseError('malformed-entity', `SPLINE at line ${line}: knot vector has an empty parameter domain.`);
  }
  if (knots[degree] !== knots[0] || knots[controlCount] !== knots[knots.length - 1]) {
    throw new DxfParseError(
      'unsupported-entity',
      `SPLINE at line ${line}: only clamped knot vectors are supported so the exact curve endpoints can join neighboring profile segments.`,
    );
  }
}

function validateSplineContinuity(knots: number[], degree: number, controlCount: number, line: number): void {
  for (let i = degree + 1; i < controlCount; i++) {
    let multiplicity = 1;
    while (i + multiplicity < controlCount && knots[i + multiplicity] === knots[i]) multiplicity++;
    if (multiplicity > degree) {
      throw new DxfParseError(
        'unsupported-entity',
        `SPLINE at line ${line}: knot multiplicity ${multiplicity} makes the curve discontinuous; use a continuous clamped spline.`,
      );
    }
    i += multiplicity - 1;
  }
}

function splineKnots(b: EntityBlock, degree: number, controlCount: number, declaredKnotCount: number): number[] {
  const knots = values(b.body, 40, 'SPLINE');
  if (knots.length !== declaredKnotCount || knots.length !== controlCount + degree + 1) {
    throw new DxfParseError(
      'malformed-entity',
      `SPLINE at line ${b.line}: expected ${declaredKnotCount} declared knots and ` +
        `${controlCount + degree + 1} for ${controlCount} control points of degree ${degree}, found ${knots.length}.`,
    );
  }
  validateKnotOrder(knots, b.line);
  validateKnotDomain(knots, degree, controlCount, b.line);
  validateSplineContinuity(knots, degree, controlCount, b.line);
  return knots;
}

function splineWeights(b: EntityBlock, controlCount: number): number[] {
  const weights = values(b.body, 41, 'SPLINE');
  if (weights.length !== 0 && weights.length !== controlCount) {
    throw new DxfParseError(
      'malformed-entity',
      `SPLINE at line ${b.line}: expected either no weights or one weight per control point, found ${weights.length}.`,
    );
  }
  if (weights.some(weight => weight <= 0)) {
    throw new DxfParseError('malformed-entity', `SPLINE at line ${b.line}: control-point weights must be positive.`);
  }
  return weights;
}

function validateSplineClosure(
  flags: number,
  points: Array<readonly [number, number]>,
  tolerance: number,
  line: number,
): boolean {
  const first = points[0];
  const last = points[points.length - 1];
  const isClosed = Math.hypot(last[0] - first[0], last[1] - first[1]) <= tolerance;
  if ((flags & 1) !== 0 && !isClosed) {
    throw new DxfParseError(
      'unsupported-entity',
      `SPLINE at line ${line}: the closed flag is set but the clamped curve endpoints do not meet; periodic/closed control nets are not supported.`,
    );
  }
  return isClosed;
}

/** Parse the exact 2D control-net subset of a DXF SPLINE. */
function splineSegments(b: EntityBlock, scale: number, tolerance: number): {
  closed: ImportSegment[][];
  open: ImportSegment[];
} {
  const definition = splineDefinition(b);
  const controlPoints = splineControlPoints(b, scale, definition.degree, definition.declaredControlCount);
  const knots = splineKnots(b, definition.degree, controlPoints.length, definition.declaredKnotCount);
  const weights = splineWeights(b, controlPoints.length);
  const isClosed = validateSplineClosure(definition.flags, controlPoints, tolerance, b.line);
  const first = controlPoints[0];
  const last = controlPoints[controlPoints.length - 1];
  const segment: ImportSegment = {
    x0: first[0], y0: first[1], x1: last[0], y1: last[1],
    source: `SPLINE (line ${b.line})`,
    nurbs: {
      degree: definition.degree,
      controlPoints,
      knots,
      ...(weights.length === 0 ? {} : { weights }),
    },
  };
  return isClosed ? { closed: [[segment]], open: [] } : { closed: [], open: [segment] };
}

/** DXF ARC -> one exact bulge arc. Angles are degrees, CCW, from +X. */
function arcSegments(body: readonly Pair[], line: number, s: number): ImportSegment[] {
  const cx = num(require(body, 10, 'ARC', line), 'ARC', 10) * s;
  const cy = num(require(body, 20, 'ARC', line), 'ARC', 20) * s;
  const r = num(require(body, 40, 'ARC', line), 'ARC', 40) * s;
  if (r <= 0) {
    throw new DxfParseError('malformed-entity', `ARC at line ${line}: radius must be > 0, got ${r}.`);
  }
  const a0 = (num(require(body, 50, 'ARC', line), 'ARC', 50) * Math.PI) / 180;
  const a1raw = (num(require(body, 51, 'ARC', line), 'ARC', 51) * Math.PI) / 180;
  // DXF arcs always run counter-clockwise from start to end angle, so a
  // wrapped end angle means "the long way round", not a negative sweep.
  let sweep = a1raw - a0;
  while (sweep <= 0) sweep += 2 * Math.PI;
  const src = `ARC (line ${line})`;

  // A sweep at or above 2π is a full circle written as an arc; a single
  // bulge cannot express it (tan(π/2) is infinite at exactly 180° per half),
  // so split at the halfway point exactly as CIRCLE does.
  const halves = sweep > Math.PI ? 2 : 1;
  const out: ImportSegment[] = [];
  for (let i = 0; i < halves; i++) {
    const t0 = a0 + (sweep * i) / halves;
    const t1 = a0 + (sweep * (i + 1)) / halves;
    out.push({
      x0: cx + r * Math.cos(t0), y0: cy + r * Math.sin(t0),
      x1: cx + r * Math.cos(t1), y1: cy + r * Math.sin(t1),
      bulge: Math.tan((sweep / halves) / 4),
      source: src,
    });
  }
  return out;
}

function circleSegments(body: readonly Pair[], line: number, s: number): ImportSegment[] {
  const cx = num(require(body, 10, 'CIRCLE', line), 'CIRCLE', 10) * s;
  const cy = num(require(body, 20, 'CIRCLE', line), 'CIRCLE', 20) * s;
  const r = num(require(body, 40, 'CIRCLE', line), 'CIRCLE', 40) * s;
  if (r <= 0) {
    throw new DxfParseError('malformed-entity', `CIRCLE at line ${line}: radius must be > 0, got ${r}.`);
  }
  const src = `CIRCLE (line ${line})`;
  // Two CCW half-turns; bulge = tan(π/4) = 1 is the exact semicircle.
  return [
    { x0: cx + r, y0: cy, x1: cx - r, y1: cy, bulge: 1, source: src },
    { x0: cx - r, y0: cy, x1: cx + r, y1: cy, bulge: 1, source: src },
  ];
}

interface DxfEllipseParameters {
  centerX: number;
  centerY: number;
  majorX: number;
  majorY: number;
  centerZ: number;
  majorZ: number;
  ratio: number;
  start: number;
  end: number;
  normalX: number;
  normalY: number;
  normalZ: number;
}

function optionalEllipseNumber(body: readonly Pair[], code: number, fallback: number): number {
  const pair = get(body, code);
  return pair ? num(pair, 'ELLIPSE', code) : fallback;
}

function ellipseParameters(b: EntityBlock): DxfEllipseParameters {
  return {
    centerX: num(require(b.body, 10, 'ELLIPSE', b.line), 'ELLIPSE', 10),
    centerY: num(require(b.body, 20, 'ELLIPSE', b.line), 'ELLIPSE', 20),
    majorX: num(require(b.body, 11, 'ELLIPSE', b.line), 'ELLIPSE', 11),
    majorY: num(require(b.body, 21, 'ELLIPSE', b.line), 'ELLIPSE', 21),
    centerZ: optionalEllipseNumber(b.body, 30, 0),
    majorZ: optionalEllipseNumber(b.body, 31, 0),
    ratio: num(require(b.body, 40, 'ELLIPSE', b.line), 'ELLIPSE', 40),
    start: num(require(b.body, 41, 'ELLIPSE', b.line), 'ELLIPSE', 41),
    end: num(require(b.body, 42, 'ELLIPSE', b.line), 'ELLIPSE', 42),
    normalX: optionalEllipseNumber(b.body, 210, 0),
    normalY: optionalEllipseNumber(b.body, 220, 0),
    normalZ: optionalEllipseNumber(b.body, 230, 1),
  };
}

function validateEllipseAxes(b: EntityBlock, p: DxfEllipseParameters): void {
  if (Math.hypot(p.majorX, p.majorY) <= 1e-12 || p.ratio <= 0 || p.ratio > 1) {
    throw new DxfParseError(
      'malformed-entity',
      `ELLIPSE at line ${b.line}: major-axis length must be > 0 and group code 40 (minor/major ratio) must be in (0, 1].`,
    );
  }
}

function validateEllipsePlane(b: EntityBlock, p: DxfEllipseParameters): void {
  const inXYPlane = Math.abs(p.centerZ) <= 1e-9 && Math.abs(p.majorZ) <= 1e-9 &&
    Math.abs(p.normalX) <= 1e-9 && Math.abs(p.normalY) <= 1e-9 && Math.abs(Math.abs(p.normalZ) - 1) <= 1e-9;
  if (!inXYPlane) {
    throw new DxfParseError(
      'unsupported-entity',
      `ELLIPSE at line ${b.line}: only ellipses in the XY plane are supported; flatten this entity in the source tool.`,
    );
  }
}

function validateFullEllipse(b: EntityBlock, p: DxfEllipseParameters): void {
  if (Math.abs(Math.abs(p.end - p.start) - 2 * Math.PI) > 1e-9) {
    throw new DxfParseError(
      'unsupported-entity',
      `ELLIPSE at line ${b.line}: only full ellipses are supported; elliptical arcs must be converted to a full profile in the source tool.`,
    );
  }
}

function ellipseSegments(b: EntityBlock, scale: number): ImportSegment[][] {
  const p = ellipseParameters(b);
  validateEllipseAxes(b, p);
  validateEllipsePlane(b, p);
  validateFullEllipse(b, p);
  return [fullEllipseSegments({
    center: [p.centerX, p.centerY],
    majorAxis: [p.majorX, p.majorY],
    axisRatio: p.ratio,
    startParameter: p.start,
    endParameter: p.end,
    normalZ: p.normalZ < 0 ? -1 : 1,
    scale,
    source: `ELLIPSE (line ${b.line})`,
  })];
}

interface PolyVertex { x: number; y: number; bulge: number }

function polylineSegments(
  vertices: readonly PolyVertex[],
  closed: boolean,
  src: string,
  line: number,
): ImportSegment[] {
  if (vertices.length < 2) {
    throw new DxfParseError(
      'malformed-entity',
      `${src}: needs at least 2 vertices, found ${vertices.length}.`,
    );
  }
  const out: ImportSegment[] = [];
  const n = vertices.length;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % n];
    // The bulge lives on the vertex that STARTS the segment.
    out.push({ x0: a.x, y0: a.y, x1: b.x, y1: b.y, bulge: a.bulge, source: `${src} (line ${line})` });
  }
  return out;
}

function lwpolylineVertices(body: readonly Pair[], line: number, s: number): PolyVertex[] {
  const verts: PolyVertex[] = [];
  for (const p of body) {
    if (p.code === 10) {
      verts.push({ x: num(p, 'LWPOLYLINE', 10) * s, y: 0, bulge: 0 });
    } else if (p.code === 20) {
      if (verts.length === 0) {
        throw new DxfParseError(
          'malformed-entity',
          `LWPOLYLINE at line ${line}: group code 20 (vertex Y) at line ${p.line} has no preceding 10 (vertex X).`,
        );
      }
      verts[verts.length - 1].y = num(p, 'LWPOLYLINE', 20) * s;
    } else if (p.code === 42) {
      if (verts.length === 0) {
        throw new DxfParseError(
          'malformed-entity',
          `LWPOLYLINE at line ${line}: bulge (code 42) at line ${p.line} has no preceding vertex.`,
        );
      }
      verts[verts.length - 1].bulge = num(p, 'LWPOLYLINE', 42);
    }
  }
  return verts;
}

/**
 * Parse DXF text into closed regions.
 *
 * @throws {DxfParseError} on empty/garbled input, a missing ENTITIES section,
 *   a profile-bearing entity we cannot represent exactly, a malformed entity,
 *   or a drawing whose segments do not resolve into unambiguous closed loops.
 *   Never returns an empty or placeholder region list.
 */
function segmentsForSimpleEntity(
  b: EntityBlock,
  scale: number,
  tolerance: number,
): { closed: ImportSegment[][]; open: ImportSegment[] } | null {
  switch (b.type) {
    case 'SPLINE':
      return splineSegments(b, scale, tolerance);
    case 'LINE': {
      const x0 = num(require(b.body, 10, 'LINE', b.line), 'LINE', 10) * scale;
      const y0 = num(require(b.body, 20, 'LINE', b.line), 'LINE', 20) * scale;
      const x1 = num(require(b.body, 11, 'LINE', b.line), 'LINE', 11) * scale;
      const y1 = num(require(b.body, 21, 'LINE', b.line), 'LINE', 21) * scale;
      return { closed: [], open: [{ x0, y0, x1, y1, source: `LINE (line ${b.line})` }] };
    }
    case 'ARC':
      return { closed: [], open: arcSegments(b.body, b.line, scale) };
    case 'CIRCLE':
      return { closed: [circleSegments(b.body, b.line, scale)], open: [] };
    case 'ELLIPSE':
      return { closed: ellipseSegments(b, scale), open: [] };
    case 'LWPOLYLINE': {
      const verts = lwpolylineVertices(b.body, b.line, scale);
      const flags = get(b.body, 70);
      const isClosed = flags !== undefined && (Number(flags.value.trim()) & 1) === 1;
      const segs = polylineSegments(verts, isClosed, 'LWPOLYLINE', b.line);
      return isClosed ? { closed: [segs], open: [] } : { closed: [], open: segs };
    }
    default:
      return null;
  }
}

function consumePolyline(blocks: readonly EntityBlock[], i: number, scale: number): { closed: ImportSegment[][]; open: ImportSegment[]; nextIndex: number } {
  const b = blocks[i];
  // Pre-R13 form: the vertices are sibling VERTEX entities that follow,
  // terminated by SEQEND. Consume them here and skip past.
  const flags = get(b.body, 70);
  const flagVal = flags === undefined ? 0 : Number(flags.value.trim());
  if ((flagVal & 8) !== 0 || (flagVal & 64) !== 0) {
    throw new DxfParseError(
      'unsupported-entity',
      `POLYLINE at line ${b.line}: flags=${flagVal} marks it as a 3D polyline or polygon mesh. ` +
        'Only planar 2D polylines can become a Sketch; flatten it in the source tool.',
    );
  }
  const verts: PolyVertex[] = [];
  let j = i + 1;
  for (; j < blocks.length && blocks[j].type === 'VERTEX'; j++) {
    const vb = blocks[j].body;
    verts.push({
      x: num(require(vb, 10, 'VERTEX', blocks[j].line), 'VERTEX', 10) * scale,
      y: num(require(vb, 20, 'VERTEX', blocks[j].line), 'VERTEX', 20) * scale,
      bulge: get(vb, 42) ? num(get(vb, 42) as Pair, 'VERTEX', 42) : 0,
    });
  }
  if (j < blocks.length && blocks[j].type === 'SEQEND') j++;
  const isClosed = (flagVal & 1) === 1;
  const segs = polylineSegments(verts, isClosed, 'POLYLINE', b.line);
  return { closed: isClosed ? [segs] : [], open: isClosed ? [] : segs, nextIndex: j - 1 };
}

function throwUnsupportedEntity(b: EntityBlock): never {
  switch (b.type) {
    case 'SPLINE':
      throw new DxfParseError(
        'unsupported-entity',
      `SPLINE at line ${b.line}: its representation is outside the supported clamped, continuous, planar control-point subset. ` +
          'Re-export a continuous clamped XY spline with control points and knots.',
      );
    case 'INSERT':
      throw new DxfParseError(
        'unsupported-entity',
        `INSERT (block reference) at line ${b.line}: block definitions are not expanded, and the ` +
          'geometry it references would be missing from the imported profile without warning. ' +
          'Explode blocks in the source tool before exporting.',
      );
    default:
      throw new DxfParseError(
        'unsupported-entity',
    `${b.type} at line ${b.line}: unsupported DXF entity. kernelCAD reads LINE, ARC, CIRCLE, full planar ELLIPSE, ` +
          'LWPOLYLINE, POLYLINE and clamped continuous planar SPLINE for 2D profiles; anything else is refused rather than dropped, ' +
          'because a dropped entity leaves a hole in the profile with no indication.',
      );
  }
}

export function importDxfText(text: string, opts: ImportDxfOptions = {}): DxfImportResult {
  if (text.trim().length === 0) {
    throw new DxfParseError('empty', 'DXF payload is empty.');
  }

  const pairs = tokenize(text);
  if (pairs.length === 0) {
    throw new DxfParseError('not-dxf', 'DXF payload contains no group-code/value pairs.');
  }

  const { scale, source: unitSource } = resolveScale(pairs, opts);
  const blocks = entityBlocks(pairs);

  const closed: ImportSegment[][] = [];
  const open: ImportSegment[] = [];
  const ignoredEntities: string[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const simple = segmentsForSimpleEntity(b, scale, opts.tolerance ?? DEFAULT_DXF_TOLERANCE);
    if (simple) {
      closed.push(...simple.closed);
      open.push(...simple.open);
      continue;
    }
    if (b.type === 'POLYLINE') {
      const consumed = consumePolyline(blocks, i, scale);
      closed.push(...consumed.closed);
      open.push(...consumed.open);
      i = consumed.nextIndex;
      continue;
    }
    if (b.type === 'VERTEX' || b.type === 'SEQEND') {
      // Only reachable if a VERTEX appears without its POLYLINE header.
      throw new DxfParseError(
        'malformed-entity',
        `${b.type} at line ${b.line}: appears outside a POLYLINE, so the drawing structure is broken.`,
      );
    }
    if (ANNOTATION_ENTITIES.has(b.type)) {
      ignoredEntities.push(`${b.type} (line ${b.line})`);
      continue;
    }
    throwUnsupportedEntity(b);
  }

  let assembled;
  try {
    assembled = assembleRegions(
      { closed, open },
      { tolerance: opts.tolerance ?? DEFAULT_DXF_TOLERANCE },
    );
  } catch (e) {
    if (e instanceof ContourError) throw new DxfParseError('contour', e.message);
    throw e;
  }

  return {
    regions: assembled.regions,
    unitScale: scale,
    unitSource,
    ignoredEntities,
    duplicatesDropped: assembled.duplicatesDropped,
    degeneratesDropped: assembled.degeneratesDropped,
    gapsClosed: assembled.gapsClosed,
  };
}
