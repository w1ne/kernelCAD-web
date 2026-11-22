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
//   HATCH       closed planar polyline boundary paths; nested paths become holes
//               and islands per the hatch style (dxfHatch.ts); pattern styling
//               is ignored
//   SPLINE      planar, continuous control-point B-splines, kept as exact
//               rational/non-rational NURBS sketch commands; unclamped and
//               periodic knot vectors are clamped exactly (dxfSplineClamp.ts);
//               fit-point-only cubics, open or closed, are interpolated through
//               their fit points and end tangents (dxfSplineFit.ts)
//   ELLIPSE     planar ellipse arcs, kept as exact rational NURBS arcs
//   INSERT      block references, including nested blocks and MINSERT grids,
//               placed by an exact affine map (dxfInsert.ts); arcs under a
//               non-uniform scale become exact rational elliptical arcs
//
// ARC, CIRCLE, LWPOLYLINE and POLYLINE coordinates are in the Object
// Coordinate System of their extrusion direction: -Z is mirrored into world
// X, and a direction off the Z axis is refused (dxfOcs.ts).
//
// The bulge on a polyline vertex is `tan(includedAngle / 4)` — the same
// number, same sign convention, that `SketchCommand.bulgeArc` carries. It is
// copied across verbatim rather than converted into sagitta or a chord
// approximation, so a DXF arc round-trips exactly.
//
// WHAT WE REFUSE, AND WHY IT IS A REFUSAL
// ---------------------------------------
// Non-XY ELLIPSE, external-reference blocks, 3DFACE, SOLID and anything
// unrecognised are refused: each carries profile geometry, so skipping it
// would hand back a profile missing a piece with no indication. HATCH is
// accepted with planar closed polyline paths and edge paths of line,
// circular-arc, elliptic-arc and spline edges (dxfHatch.ts); elliptic-arc
// edges that end off the ellipse axes, fit-point-only spline edges and
// crossing paths are refused.
// SPLINE is accepted only when its planar control points and knots define a
// continuous curve, or when it is a cubic with fit points only.
// Non-cubic fit-point-only, nonplanar and discontinuous SPLINE entities, and
// closed SPLINEs whose control net does not wrap, still fail closed rather
// than being approximated.
//
// Only entities that are provably annotation — TEXT, DIMENSION, POINT and
// friends — are skipped, with the count returned to the caller.

import {
  assembleRegions,
  ContourError,
  type ImportFace,
  type ImportSegment,
  type ImportedRegion,
} from './contourAssembly';
import { ellipseArcSegments } from './dxfEllipse';
import { clampSpline, validateKnotDomain, validateKnotOrder, validateSplineContinuity, type PlanarSpline } from './dxfSplineClamp';
import { fitPointSpline, validateSplinePlanarity } from './dxfSplineFit';
import { mirrorSegments, ocsSign } from './dxfOcs';
import { blockDefinitions, placeInsert, resolveInsertBlock, skipAttributes, type BlockDefinition } from './dxfInsert';
import { hatchSegments } from './dxfHatch';
import { DxfParseError, get, num, polylineSegments, require, values, type EntityBlock, type Pair, type PolyVertex } from './dxfPairs';

export { DxfParseError, type DxfParseFailure } from './dxfPairs';
import { MM_PER_UNIT, isLengthUnit, LENGTH_UNIT_NAMES, type LengthUnit } from './lengthUnits';

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

/** Slice a named section into `0`-delimited entity blocks; null when absent. */
function sectionBlocks(pairs: readonly Pair[], section: string): EntityBlock[] | null {
  let start = -1;
  for (let i = 0; i + 1 < pairs.length; i++) {
    if (pairs[i].code === 0 && pairs[i].value.trim() === 'SECTION' &&
        pairs[i + 1].code === 2 && pairs[i + 1].value.trim() === section) {
      start = i + 2;
      break;
    }
  }
  if (start === -1) return null;

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

/** Slice the ENTITIES section into `0`-delimited entity blocks. */
function entityBlocks(pairs: readonly Pair[]): EntityBlock[] {
  const blocks = sectionBlocks(pairs, 'ENTITIES');
  if (!blocks) {
    throw new DxfParseError(
      'no-entities',
      'no ENTITIES section: the file has no `0/SECTION` + `2/ENTITIES` pair, so it carries no drawable geometry.',
    );
  }
  return blocks;
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
  if (degree + 1 > xs.length) {
    throw new DxfParseError(
      'malformed-entity',
      `SPLINE at line ${b.line}: degree ${degree} requires at least ${degree + 1} control points, found ${xs.length}.`,
    );
  }
  validateSplinePlanarity(b, zs);
  return xs.map((x, i) => [x * scale, ys[i] * scale] as const);
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
  validateKnotOrder(knots, `SPLINE at line ${b.line}`);
  validateKnotDomain(knots, degree, controlCount, `SPLINE at line ${b.line}`);
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
      `SPLINE at line ${line}: the closed flag is set but the curve endpoints do not meet; ` +
        'a periodic spline must repeat its first degree control points at the end of the control net.',
    );
  }
  return isClosed;
}

/** Clamped control net, knots and weights of a DXF SPLINE that stores its control points. */
function controlNetSpline(b: EntityBlock, scale: number, definition: SplineDefinition): PlanarSpline {
  const net = splineControlPoints(b, scale, definition.degree, definition.declaredControlCount);
  const spline = clampSpline({
    degree: definition.degree,
    controlPoints: net,
    knots: splineKnots(b, definition.degree, net.length, definition.declaredKnotCount),
    weights: splineWeights(b, net.length),
  });
  validateSplineContinuity(spline.knots, definition.degree, spline.controlPoints.length, `SPLINE at line ${b.line}`);
  return spline;
}

/** Parse the 2D subset of a DXF SPLINE: an exact control net, or a cubic through fit points. */
function splineSegments(b: EntityBlock, scale: number, tolerance: number): {
  closed: ImportSegment[][];
  open: ImportSegment[];
} {
  const definition = splineDefinition(b);
  const fitOnly = definition.declaredControlCount === 0 && values(b.body, 10, 'SPLINE').length === 0;
  const { controlPoints, knots, weights } = fitOnly
    ? fitPointSpline(b, scale, definition)
    : controlNetSpline(b, scale, definition);
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

function ellipseParameterSpan(b: EntityBlock, p: DxfEllipseParameters): { sweep: number; full: boolean } {
  const rawSweep = p.end - p.start;
  const full = Math.abs(Math.abs(rawSweep) - 2 * Math.PI) <= 1e-9;
  if (full) return { sweep: rawSweep, full: true };

  if (Math.abs(rawSweep) <= 1e-12 || Math.abs(rawSweep) > 2 * Math.PI + 1e-9) {
    throw new DxfParseError(
      'malformed-entity',
      `ELLIPSE at line ${b.line}: start/end parameters must define a non-zero span no greater than 2π.`,
    );
  }

  // DXF ellipse arcs travel counter-clockwise from start to end. A smaller
  // end parameter wraps through 2π, unlike a negative-direction sweep.
  const sweep = rawSweep < 0 ? rawSweep + 2 * Math.PI : rawSweep;
  return { sweep, full: false };
}

function ellipseSegments(b: EntityBlock, scale: number): { closed: ImportSegment[][]; open: ImportSegment[] } {
  const p = ellipseParameters(b);
  validateEllipseAxes(b, p);
  validateEllipsePlane(b, p);
  const span = ellipseParameterSpan(b, p);
  const segments = ellipseArcSegments({
    center: [p.centerX, p.centerY],
    majorAxis: [p.majorX, p.majorY],
    axisRatio: p.ratio,
    startParameter: p.start,
    endParameter: p.start + span.sweep,
    normalZ: p.normalZ < 0 ? -1 : 1,
    scale,
    source: `ELLIPSE (line ${b.line})`,
  });
  return span.full ? { closed: [segments], open: [] } : { closed: [], open: segments };
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
): { closed: ImportSegment[][]; open: ImportSegment[]; faces?: ImportFace[] } | null {
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
      return { closed: [], open: mirrorSegments(arcSegments(b.body, b.line, scale), ocsSign(b.body, b.type, b.line)) };
    case 'CIRCLE':
      return { closed: [mirrorSegments(circleSegments(b.body, b.line, scale), ocsSign(b.body, b.type, b.line))], open: [] };
    case 'ELLIPSE':
      return ellipseSegments(b, scale);
    case 'HATCH':
      return hatchSegments(b, scale);
    case 'LWPOLYLINE': {
      const verts = lwpolylineVertices(b.body, b.line, scale);
      const flags = get(b.body, 70);
      const isClosed = flags !== undefined && (Number(flags.value.trim()) & 1) === 1;
      const segs = mirrorSegments(polylineSegments(verts, isClosed, 'LWPOLYLINE', b.line), ocsSign(b.body, b.type, b.line));
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
  const segs = mirrorSegments(polylineSegments(verts, isClosed, 'POLYLINE', b.line), ocsSign(b.body, b.type, b.line));
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
    default:
      throw new DxfParseError(
        'unsupported-entity',
    `${b.type} at line ${b.line}: unsupported DXF entity. kernelCAD reads LINE, ARC, CIRCLE, planar ELLIPSE, ` +
          'LWPOLYLINE, POLYLINE, INSERT, closed polyline HATCH boundaries, and clamped continuous planar SPLINE for 2D profiles; anything else is refused rather than dropped, ' +
          'because a dropped entity leaves a hole in the profile with no indication.',
      );
  }
}

interface ReadContext {
  scale: number;
  tolerance: number;
  definitions: ReadonlyMap<string, BlockDefinition>;
  /** Names of the blocks being expanded, outermost first, for cycle detection. */
  stack: readonly string[];
}

interface Collected {
  closed: ImportSegment[][];
  open: ImportSegment[];
  faces: ImportFace[];
  ignoredEntities: string[];
}

/** Read a list of entities into segments. `note` labels skipped annotation inside a block. */
function collectEntities(blocks: readonly EntityBlock[], ctx: ReadContext, note: string): Collected {
  const out: Collected = { closed: [], open: [], faces: [], ignoredEntities: [] };
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const simple = segmentsForSimpleEntity(b, ctx.scale, ctx.tolerance);
    if (simple) {
      out.closed.push(...simple.closed);
      out.open.push(...simple.open);
      out.faces.push(...(simple.faces ?? []));
      continue;
    }
    if (b.type === 'POLYLINE') {
      const consumed = consumePolyline(blocks, i, ctx.scale);
      out.closed.push(...consumed.closed);
      out.open.push(...consumed.open);
      i = consumed.nextIndex;
      continue;
    }
    if (b.type === 'INSERT') {
      i = consumeInsert(blocks, i, ctx, out, note);
      continue;
    }
    if (b.type === 'VERTEX' || b.type === 'SEQEND') {
      // Only reachable if a VERTEX appears without its POLYLINE header.
      throw new DxfParseError(
        'malformed-entity',
        `${b.type} at line ${b.line}: appears outside a POLYLINE, so the drawing structure is broken.`,
      );
    }
    if (!ANNOTATION_ENTITIES.has(b.type)) throwUnsupportedEntity(b);
    out.ignoredEntities.push(`${b.type} (line ${b.line})${note}`);
  }
  return out;
}

/** Expand one INSERT: read its block, place every copy, skip trailing attributes. */
function consumeInsert(blocks: readonly EntityBlock[], i: number, ctx: ReadContext, out: Collected, note: string): number {
  const b = blocks[i];
  const def = resolveInsertBlock(b, ctx.definitions, ctx.stack);
  const inner = collectEntities(def.entities, { ...ctx, stack: [...ctx.stack, def.name] }, ` in block "${def.name}"`);
  const placed = placeInsert(b, def, inner, ctx.scale);
  out.closed.push(...placed.closed);
  out.open.push(...placed.open);
  out.faces.push(...placed.faces);
  out.ignoredEntities.push(...inner.ignoredEntities);
  return skipAttributes(blocks, i, out.ignoredEntities, note);
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
  const ctx: ReadContext = {
    scale,
    tolerance: opts.tolerance ?? DEFAULT_DXF_TOLERANCE,
    definitions: blockDefinitions(sectionBlocks(pairs, 'BLOCKS')),
    stack: [],
  };
  const { closed, open, faces, ignoredEntities } = collectEntities(entityBlocks(pairs), ctx, '');

  let assembled;
  try {
    assembled = assembleRegions(
      { closed, open, faces },
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
