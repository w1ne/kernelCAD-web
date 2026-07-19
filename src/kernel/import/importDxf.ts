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
//
// The bulge on a polyline vertex is `tan(includedAngle / 4)` — the same
// number, same sign convention, that `SketchCommand.bulgeArc` carries. It is
// copied across verbatim rather than converted into sagitta or a chord
// approximation, so a DXF arc round-trips exactly.
//
// WHAT WE REFUSE, AND WHY IT IS A REFUSAL
// ---------------------------------------
// SPLINE is rejected. It is not laziness: the sketch IR has `spline` and
// `nurbsSegment` kinds, but `drawingFromCommands` — the one lowering path a
// Sketch takes — has no replicad 2D pen constructor for either and throws on
// them. Accepting SPLINE would mean flattening a NURBS into chords and
// calling the result the user's curve. That is precisely the silent
// substitution this codebase has been burned by, so the importer says so and
// names the entity instead.
//
// ELLIPSE, INSERT (block reference), 3DFACE, SOLID and anything unrecognised
// are likewise refused: each of them CARRIES PROFILE GEOMETRY, so skipping
// one would hand back a profile missing a piece with no indication. Only
// entities that are provably annotation — TEXT, DIMENSION, POINT and friends
// — are skipped, and the count comes back in the result so a caller can see
// it happened.

import {
  assembleRegions,
  ContourError,
  type ImportSegment,
  type ImportedRegion,
} from './contourAssembly';
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
    switch (b.type) {
      case 'LINE': {
        const x0 = num(require(b.body, 10, 'LINE', b.line), 'LINE', 10) * scale;
        const y0 = num(require(b.body, 20, 'LINE', b.line), 'LINE', 20) * scale;
        const x1 = num(require(b.body, 11, 'LINE', b.line), 'LINE', 11) * scale;
        const y1 = num(require(b.body, 21, 'LINE', b.line), 'LINE', 21) * scale;
        open.push({ x0, y0, x1, y1, source: `LINE (line ${b.line})` });
        break;
      }
      case 'ARC':
        open.push(...arcSegments(b.body, b.line, scale));
        break;
      case 'CIRCLE':
        closed.push(circleSegments(b.body, b.line, scale));
        break;
      case 'LWPOLYLINE': {
        const verts = lwpolylineVertices(b.body, b.line, scale);
        const flags = get(b.body, 70);
        const isClosed = flags !== undefined && (Number(flags.value.trim()) & 1) === 1;
        const segs = polylineSegments(verts, isClosed, 'LWPOLYLINE', b.line);
        if (isClosed) closed.push(segs);
        else open.push(...segs);
        break;
      }
      case 'POLYLINE': {
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
        if (isClosed) closed.push(segs);
        else open.push(...segs);
        i = j - 1;
        break;
      }
      case 'SPLINE':
        throw new DxfParseError(
          'unsupported-entity',
          `SPLINE at line ${b.line}: kernelCAD's sketch lowering has no 2D NURBS segment, so this ` +
            'curve cannot be represented exactly and will not be silently approximated. ' +
            'Convert splines to polylines (arc/line segments) in the source tool and re-export.',
        );
      case 'ELLIPSE':
        throw new DxfParseError(
          'unsupported-entity',
          `ELLIPSE at line ${b.line}: an elliptical arc has no exact form in the sketch command ` +
            'set (which carries lines and circular arcs). Convert it to a polyline in the source tool.',
        );
      case 'INSERT':
        throw new DxfParseError(
          'unsupported-entity',
          `INSERT (block reference) at line ${b.line}: block definitions are not expanded, and the ` +
            'geometry it references would be missing from the imported profile without warning. ' +
            'Explode blocks in the source tool before exporting.',
        );
      case 'VERTEX':
      case 'SEQEND':
        // Only reachable if a VERTEX appears without its POLYLINE header.
        throw new DxfParseError(
          'malformed-entity',
          `${b.type} at line ${b.line}: appears outside a POLYLINE, so the drawing structure is broken.`,
        );
      default:
        if (ANNOTATION_ENTITIES.has(b.type)) {
          ignoredEntities.push(`${b.type} (line ${b.line})`);
          break;
        }
        throw new DxfParseError(
          'unsupported-entity',
          `${b.type} at line ${b.line}: unsupported DXF entity. kernelCAD reads LINE, ARC, CIRCLE, ` +
            'LWPOLYLINE and POLYLINE for 2D profiles; anything else is refused rather than dropped, ' +
            'because a dropped entity leaves a hole in the profile with no indication.',
        );
    }
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
