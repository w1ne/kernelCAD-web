// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// DXF block references. A BLOCK in the BLOCKS section holds entities in its
// own coordinates, measured from the block base point (group codes 10/20).
// An INSERT places one copy:
//
//   world = OCS( R(rotation) * S(41, 42) * (p - base) + insertion + grid )
//
// where `grid` is the MINSERT column/row offset (70/71 counts, 44/45
// spacing) in the rotated frame, and OCS mirrors X for extrusion -Z. The
// map is affine, so lines, polyline vertices and NURBS control points stay
// exact. A bulge arc stays a circular arc only under a uniform scale; a
// mirror (negative determinant) reverses its turning direction. Under a
// non-uniform scale an arc becomes an elliptical arc: it is first rewritten
// as exact rational quadratic pieces, whose control points the affine map
// then moves without changing the weights, so the ellipse is exact too.

import type { ImportSegment } from './contourAssembly';
import { ellipseArcSegments } from './dxfEllipse';
import { ocsSign } from './dxfOcs';
import { DxfParseError, get, num, require, type EntityBlock } from './dxfPairs';

export interface BlockDefinition {
  name: string;
  /** Base point in source units (not yet scaled to mm). */
  base: [number, number];
  flags: number;
  entities: EntityBlock[];
}

export interface PlacedSegments {
  closed: ImportSegment[][];
  open: ImportSegment[];
}

/** Nesting deeper than this is treated as a broken file, not a design. */
const MAX_BLOCK_DEPTH = 64;
/** Upper bound on MINSERT copies, so a corrupt count cannot exhaust memory. */
const MAX_INSERT_COPIES = 10_000;

/** Group the BLOCKS section into named definitions. Names are case-insensitive. */
export function blockDefinitions(section: readonly EntityBlock[] | null): Map<string, BlockDefinition> {
  const defs = new Map<string, BlockDefinition>();
  let current: BlockDefinition | null = null;
  for (const b of section ?? []) {
    if (b.type === 'BLOCK') {
      const name = require(b.body, 2, 'BLOCK', b.line).value.trim();
      const flags = get(b.body, 70);
      current = {
        name,
        base: [optionalNumber(b, 10, 0), optionalNumber(b, 20, 0)],
        flags: flags ? num(flags, 'BLOCK', 70) : 0,
        entities: [],
      };
      defs.set(name.toUpperCase(), current);
    } else if (b.type === 'ENDBLK') {
      current = null;
    } else if (current) {
      current.entities.push(b);
    }
  }
  return defs;
}

/** Find the definition an INSERT names; refuse missing, external and recursive blocks. */
export function resolveInsertBlock(
  b: EntityBlock,
  defs: ReadonlyMap<string, BlockDefinition>,
  stack: readonly string[],
): BlockDefinition {
  const name = require(b.body, 2, 'INSERT', b.line).value.trim();
  const def = defs.get(name.toUpperCase());
  if (!def) {
    throw new DxfParseError(
      'malformed-entity',
      `INSERT at line ${b.line}: block "${name}" is not defined in the BLOCKS section, so its geometry cannot be placed.`,
    );
  }
  if ((def.flags & 4) !== 0) {
    throw new DxfParseError(
      'unsupported-entity',
      `INSERT at line ${b.line}: block "${def.name}" is an external reference, so its geometry is in another file. ` +
        'Bind the reference in the source tool before exporting.',
    );
  }
  const seen = stack.findIndex(s => s.toUpperCase() === def.name.toUpperCase());
  if (seen !== -1) {
    throw new DxfParseError(
      'malformed-entity',
      `INSERT at line ${b.line}: block "${def.name}" references itself (${[...stack.slice(seen), def.name].join(' -> ')}).`,
    );
  }
  if (stack.length >= MAX_BLOCK_DEPTH) {
    throw new DxfParseError('malformed-entity', `INSERT at line ${b.line}: blocks are nested more than ${MAX_BLOCK_DEPTH} levels deep.`);
  }
  return def;
}

/** Place the already-read block geometry once per INSERT (or MINSERT) copy. */
export function placeInsert(b: EntityBlock, def: BlockDefinition, inner: PlacedSegments, scale: number): PlacedSegments {
  const p = insertParameters(b);
  const uniform = Math.abs(Math.abs(p.sx) - Math.abs(p.sy)) <= 1e-12 * Math.max(Math.abs(p.sx), Math.abs(p.sy));
  if (!uniform) inner = { closed: inner.closed.map(loop => loop.flatMap(arcAsNurbs)), open: inner.open.flatMap(arcAsNurbs) };
  const sign = ocsSign(b.body, 'INSERT', b.line);
  const label = `INSERT "${def.name}" (line ${b.line})`;
  const out: PlacedSegments = { closed: [], open: [] };
  for (let row = 0; row < p.rows; row++) {
    for (let col = 0; col < p.cols; col++) {
      const m = insertMatrix(p, def, scale, col, row, sign);
      out.closed.push(...inner.closed.map(loop => loop.map(seg => transformSegment(seg, m, label))));
      out.open.push(...inner.open.map(seg => transformSegment(seg, m, label)));
    }
  }
  return out;
}

/** After an INSERT with attributes (66 = 1), skip its ATTRIB entities and SEQEND. */
export function skipAttributes(blocks: readonly EntityBlock[], i: number, ignored: string[], note: string): number {
  const follows = get(blocks[i].body, 66);
  if (!follows || Number(follows.value.trim()) !== 1) return i;
  let j = i + 1;
  for (; j < blocks.length && blocks[j].type === 'ATTRIB'; j++) ignored.push(`ATTRIB (line ${blocks[j].line})${note}`);
  if (j < blocks.length && blocks[j].type === 'SEQEND') j++;
  return j - 1;
}

interface InsertParameters {
  insertion: [number, number];
  sx: number;
  sy: number;
  cos: number;
  sin: number;
  cols: number;
  rows: number;
  colSpacing: number;
  rowSpacing: number;
}

function optionalNumber(b: EntityBlock, code: number, fallback: number): number {
  const pair = get(b.body, code);
  return pair ? num(pair, b.type, code) : fallback;
}

function count(b: EntityBlock, code: number): number {
  const n = optionalNumber(b, code, 1);
  if (!Number.isInteger(n) || n < 1) {
    throw new DxfParseError('malformed-entity', `INSERT at line ${b.line}: group code ${code} must be a positive integer, got ${n}.`);
  }
  return n;
}

/** cos/sin of a DXF angle in degrees; quarter turns are exact. */
function rotation(deg: number): [number, number] {
  const quarter = deg / 90;
  if (Number.isInteger(quarter)) {
    return ([[1, 0], [0, 1], [-1, 0], [0, -1]] as const)[((quarter % 4) + 4) % 4] as [number, number];
  }
  const rad = (deg * Math.PI) / 180;
  return [Math.cos(rad), Math.sin(rad)];
}

function insertParameters(b: EntityBlock): InsertParameters {
  const sx = optionalNumber(b, 41, 1);
  const sy = optionalNumber(b, 42, 1);
  if (sx === 0 || sy === 0) {
    throw new DxfParseError('malformed-entity', `INSERT at line ${b.line}: scale factors must be non-zero, got (${sx}, ${sy}).`);
  }
  const cols = count(b, 70);
  const rows = count(b, 71);
  if (cols * rows > MAX_INSERT_COPIES) {
    throw new DxfParseError('malformed-entity', `INSERT at line ${b.line}: ${cols} x ${rows} copies exceed the limit of ${MAX_INSERT_COPIES}.`);
  }
  const [cos, sin] = rotation(optionalNumber(b, 50, 0));
  return {
    insertion: [optionalNumber(b, 10, 0), optionalNumber(b, 20, 0)],
    sx, sy, cos, sin, cols, rows,
    colSpacing: optionalNumber(b, 44, 0),
    rowSpacing: optionalNumber(b, 45, 0),
  };
}

/** Row-major 2x3 affine matrix [a, b, tx, c, d, ty] for one copy, in mm. */
type Affine = [number, number, number, number, number, number];

function insertMatrix(p: InsertParameters, def: BlockDefinition, scale: number, col: number, row: number, sign: 1 | -1): Affine {
  const a = p.cos * p.sx, bb = -p.sin * p.sy, c = p.sin * p.sx, d = p.cos * p.sy;
  const gx = col * p.colSpacing, gy = row * p.rowSpacing;
  const ox = (p.insertion[0] + p.cos * gx - p.sin * gy) * scale;
  const oy = (p.insertion[1] + p.sin * gx + p.cos * gy) * scale;
  const bx = def.base[0] * scale, by = def.base[1] * scale;
  const tx = ox - (a * bx + bb * by);
  const ty = oy - (c * bx + d * by);
  return [sign * a, sign * bb, sign * tx, c, d, ty];
}

function apply(m: Affine, x: number, y: number): [number, number] {
  return [m[0] * x + m[1] * y + m[2], m[3] * x + m[4] * y + m[5]];
}

function transformSegment(seg: ImportSegment, m: Affine, label: string): ImportSegment {
  const [x0, y0] = apply(m, seg.x0, seg.y0);
  const [x1, y1] = apply(m, seg.x1, seg.y1);
  const mirrored = m[0] * m[4] - m[1] * m[3] < 0;
  const out: ImportSegment = { x0, y0, x1, y1, source: `${seg.source} via ${label}` };
  if (seg.bulge !== undefined) out.bulge = mirrored ? -seg.bulge : seg.bulge;
  if (seg.nurbs) {
    out.nurbs = { ...seg.nurbs, controlPoints: seg.nurbs.controlPoints.map(([x, y]) => apply(m, x, y)) };
  }
  return out;
}

/**
 * A bulge arc as exact rational quadratic pieces of at most 90°, so a
 * non-uniform affine map can carry it. The chord endpoints are kept bit for
 * bit; straight and NURBS segments pass through unchanged.
 */
function arcAsNurbs(seg: ImportSegment): ImportSegment[] {
  if (seg.bulge === undefined || seg.bulge === 0) return [seg];
  const sweep = 4 * Math.atan(seg.bulge);
  const half = Math.hypot(seg.x1 - seg.x0, seg.y1 - seg.y0) / 2;
  const ux = (seg.x1 - seg.x0) / (2 * half), uy = (seg.y1 - seg.y0) / (2 * half);
  // The centre sits on the chord's left normal for a counter-clockwise arc
  // under 180°; tan(sweep / 2) changes sign to put it on the right otherwise.
  const offset = half / Math.tan(sweep / 2);
  const cx = (seg.x0 + seg.x1) / 2 - uy * offset;
  const cy = (seg.y0 + seg.y1) / 2 + ux * offset;
  const radius = half / Math.abs(Math.sin(sweep / 2));
  const start = Math.atan2(seg.y0 - cy, seg.x0 - cx);
  const pieces = ellipseArcSegments({
    center: [cx, cy], majorAxis: [radius, 0], axisRatio: 1,
    startParameter: start, endParameter: start + sweep,
    normalZ: 1, scale: 1, source: seg.source,
  });
  const first = pieces[0], last = pieces[pieces.length - 1];
  first.x0 = seg.x0; first.y0 = seg.y0;
  last.x1 = seg.x1; last.y1 = seg.y1;
  first.nurbs = { ...first.nurbs!, controlPoints: [[seg.x0, seg.y0], ...first.nurbs!.controlPoints.slice(1)] };
  last.nurbs = { ...last.nurbs!, controlPoints: [...last.nurbs!.controlPoints.slice(0, 2), [seg.x1, seg.y1]] };
  return pieces;
}
