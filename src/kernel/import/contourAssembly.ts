// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/import/contourAssembly.ts
//
// Shared back half of the DXF and SVG importers: turn a bag of 2D segments
// into closed regions expressed as `SketchCommand[]`.
//
// WHY ONE SHARED STAGE
// --------------------
// DXF and SVG disagree about almost everything at the front (group codes vs
// XML, Y-up vs Y-down, `$INSUNITS` vs `viewBox`) and about nothing at the
// back. Both end up with a pile of line and circular-arc segments in
// millimetres that have to be chained into loops, oriented, and emitted as
// the SAME intermediate representation the rest of the repo already uses —
// `SketchCommand[]`, the thing `PathBuilder` captures and
// `drawingFromCommands` lowers. Neither importer invents a representation of
// its own, so an imported profile is indistinguishable downstream from a
// hand-authored `path().moveTo(...).close()`.
//
// ARCS ARE KEPT EXACT
// -------------------
// Circular arcs travel as a DXF bulge factor (`tan(includedAngle / 4)`,
// positive counter-clockwise) because that is exactly what
// `SketchCommand.bulgeArc` already carries — DXF's native encoding maps to it
// with no conversion and no loss. Only geometry with NO exact representation
// in the command union (Béziers, true ellipses) is flattened, and that
// happens in the parsers, under an explicit `curveTolerance`, never here.
//
// WHAT THIS STAGE REFUSES TO DO
// -----------------------------
// It never invents a loop. A chain that does not come back to its start
// within `tolerance` is an error naming both dangling endpoints, not a
// silently closed polygon; a junction where three or more segments meet is an
// error naming the point, not an arbitrary pick. Returning a plausible-looking
// profile from an ambiguous drawing is the failure mode that shows up two
// steps later as a wrong extrusion.

import type { SketchCommand } from '../../shared/capture/sketchCommand';
import { toParam } from '../../shared/runtime/editableHelpers';

/**
 * One line or circular-arc segment in millimetres, kernelCAD frame (Y up).
 *
 * `bulge` is the DXF convention: `tan(includedAngle / 4)`, signed, positive
 * counter-clockwise, `|bulge| > 1` for a major arc. Absent or 0 means a
 * straight line.
 *
 * `source` names where the segment came from precisely enough to act on —
 * e.g. `LINE (line 42)` or `<path> #2 command 'C' (offset 118)`. It is the
 * text a diagnostic quotes back at the user.
 */
export interface ImportSegment {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  bulge?: number;
  source: string;
}

/** A closed profile ready to become a `Sketch`. */
export interface ImportedRegion {
  /** `moveTo` … segments … `close`, in the repo's canonical sketch IR. */
  commands: SketchCommand[];
  /** Enclosed area in mm², always positive (loops are normalised to CCW). */
  areaMm2: number;
  /** Number of segments in the loop. */
  segmentCount: number;
  /** Where the loop's segments came from, for diagnostics and metadata. */
  source: string;
}

export type ContourFailure =
  | 'no-geometry'
  | 'open-contour'
  | 'ambiguous-junction'
  | 'degenerate-region';

/** A drawing that cannot be resolved into unambiguous closed profiles. */
export class ContourError extends Error {
  readonly reason: ContourFailure;
  constructor(reason: ContourFailure, message: string) {
    super(message);
    this.reason = reason;
    this.name = 'ContourError';
  }
}

export interface AssembleOptions {
  /**
   * Endpoint-matching distance in mm. Two segment ends closer than this are
   * the same vertex, and a chain whose ends are this close is closed (the
   * final point is snapped onto the first).
   *
   * Default 1e-3 mm (one micron). Exact-arithmetic exporters produce
   * bit-identical shared endpoints and would be happy with 0, but real files
   * from Illustrator/Inkscape/Fusion round coordinates to 4–6 decimals, so a
   * zero tolerance rejects drawings that are visually and practically closed.
   * One micron is far below any manufacturable feature, so it cannot merge
   * two vertices a designer meant to keep apart.
   */
  tolerance: number;
}

/** Segments already known to form a closed loop (a CIRCLE, a `<rect>`, a `Z`-closed subpath). */
export interface AssembleInput {
  closed: ImportSegment[][];
  /** Segments whose loop membership is unknown; chained by endpoint matching. */
  open: ImportSegment[];
}

/** Summary of what assembly had to do, surfaced as import metadata. */
export interface AssembleResult {
  regions: ImportedRegion[];
  /** Segments dropped because an identical (or exactly reversed) one was already present. */
  duplicatesDropped: number;
  /** Zero-length segments dropped (shorter than `tolerance`). */
  degeneratesDropped: number;
  /** Chains that were closed by snapping a gap smaller than `tolerance`. */
  gapsClosed: number;
}

// ---------------------------------------------------------------------------
// Arc geometry
// ---------------------------------------------------------------------------

/**
 * Signed area (mm²) of the loop; positive when the loop runs counter-clockwise.
 *
 * EXACT, not sampled: the shoelace sum over the chord polygon plus, for each
 * arc, the closed-form circular-segment area `r²/2·(θ − sin θ)`. That term is
 * signed the same way the bulge is (θ > 0 bulges left of travel and adds
 * area), so it composes with the shoelace without a case analysis, and it
 * stays exact for major arcs where a chord polygon is badly wrong — a full
 * circle written as two semicircles has NO chord area at all, so a sampled
 * area would have to be dense to even approach the right answer.
 */
function signedArea(loop: readonly ImportSegment[]): number {
  let sum = 0;
  for (const seg of loop) {
    sum += seg.x0 * seg.y1 - seg.x1 * seg.y0;
    const b = seg.bulge ?? 0;
    if (b === 0) continue;
    const theta = 4 * Math.atan(b);
    const halfChord = Math.hypot(seg.x1 - seg.x0, seg.y1 - seg.y0) / 2;
    const r = halfChord / Math.sin(theta / 2);
    sum += r * r * (theta - Math.sin(theta));
  }
  return sum / 2;
}

function reverseSegment(seg: ImportSegment): ImportSegment {
  return {
    x0: seg.x1, y0: seg.y1, x1: seg.x0, y1: seg.y0,
    // Walking an arc backwards swaps which side of the chord it bulges to.
    bulge: seg.bulge === undefined ? undefined : -seg.bulge,
    source: seg.source,
  };
}

// ---------------------------------------------------------------------------
// Chaining
// ---------------------------------------------------------------------------

/**
 * Spatial hash over segment endpoints.
 *
 * Cell size is the tolerance, and lookups probe the 3×3 neighbourhood, because
 * two points 1e-9 apart can still land in adjacent cells — bucketing alone
 * would then declare a perfectly closed contour open.
 */
class EndpointIndex {
  private readonly cells = new Map<string, number[]>();
  private readonly tol: number;

  // Written out rather than declared as a constructor parameter property: the
  // CLI bundle builds with `erasableSyntaxOnly`, which forbids that syntax.
  constructor(tol: number) {
    this.tol = tol;
  }

  private key(x: number, y: number): string {
    return `${Math.round(x / this.tol)},${Math.round(y / this.tol)}`;
  }

  add(x: number, y: number, ref: number): void {
    const k = this.key(x, y);
    const bucket = this.cells.get(k);
    if (bucket) bucket.push(ref);
    else this.cells.set(k, [ref]);
  }

  near(x: number, y: number): number[] {
    const gx = Math.round(x / this.tol);
    const gy = Math.round(y / this.tol);
    const out: number[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const bucket = this.cells.get(`${gx + dx},${gy + dy}`);
        if (bucket) out.push(...bucket);
      }
    }
    return out;
  }
}

function near(ax: number, ay: number, bx: number, by: number, tol: number): boolean {
  return Math.hypot(ax - bx, ay - by) <= tol;
}

/** Drop zero-length segments and exact duplicates (same or reversed endpoints + arc). */
function dedupe(
  segs: readonly ImportSegment[],
  tol: number,
): { kept: ImportSegment[]; duplicates: number; degenerates: number } {
  const kept: ImportSegment[] = [];
  const seen = new Set<string>();
  let duplicates = 0;
  let degenerates = 0;
  const q = (v: number): number => Math.round(v / tol);
  for (const seg of segs) {
    const b = seg.bulge ?? 0;
    // A zero-length line is noise; a zero-length ARC is not representable and
    // is equally noise, so both go. Neither can contribute area.
    if (near(seg.x0, seg.y0, seg.x1, seg.y1, tol)) {
      degenerates++;
      continue;
    }
    const fwd = `${q(seg.x0)},${q(seg.y0)},${q(seg.x1)},${q(seg.y1)},${b.toFixed(9)}`;
    const rev = `${q(seg.x1)},${q(seg.y1)},${q(seg.x0)},${q(seg.y0)},${(-b).toFixed(9)}`;
    if (seen.has(fwd) || seen.has(rev)) {
      duplicates++;
      continue;
    }
    seen.add(fwd);
    kept.push(seg);
  }
  return { kept, duplicates, degenerates };
}

/**
 * Chain loose segments into closed loops by endpoint matching.
 *
 * @throws {ContourError} `ambiguous-junction` when a vertex has more than two
 *   incident segment ends (the walk would have to guess), `open-contour` when
 *   a chain dead-ends without returning to its start.
 */
function chainLoops(
  segs: readonly ImportSegment[],
  tol: number,
): { loops: ImportSegment[][]; gapsClosed: number } {
  // Index every segment END as `segIndex * 2 + (0 = start, 1 = end)`.
  const index = new EndpointIndex(tol);
  for (let i = 0; i < segs.length; i++) {
    index.add(segs[i].x0, segs[i].y0, i * 2);
    index.add(segs[i].x1, segs[i].y1, i * 2 + 1);
  }

  const used = new Array(segs.length).fill(false);
  const loops: ImportSegment[][] = [];
  let gapsClosed = 0;

  for (let start = 0; start < segs.length; start++) {
    if (used[start]) continue;
    used[start] = true;
    const loop: ImportSegment[] = [segs[start]];
    let cx = segs[start].x1;
    let cy = segs[start].y1;
    const originX = segs[start].x0;
    const originY = segs[start].y0;

    for (;;) {
      if (near(cx, cy, originX, originY, tol)) break; // closed

      const candidates: Array<{ seg: ImportSegment; idx: number }> = [];
      for (const ref of index.near(cx, cy)) {
        const idx = ref >> 1;
        if (used[idx]) continue;
        const atStart = (ref & 1) === 0;
        const px = atStart ? segs[idx].x0 : segs[idx].x1;
        const py = atStart ? segs[idx].y0 : segs[idx].y1;
        if (!near(cx, cy, px, py, tol)) continue;
        candidates.push({ seg: atStart ? segs[idx] : reverseSegment(segs[idx]), idx });
      }

      if (candidates.length === 0) {
        throw new ContourError(
          'open-contour',
          `open contour: the chain starting at ${fmtPt(originX, originY)} (${segs[start].source}) ` +
            `dead-ends at ${fmtPt(cx, cy)} (${loop[loop.length - 1].source}); ` +
            `nothing continues from there and it is ${fmtLen(Math.hypot(cx - originX, cy - originY))} ` +
            `from its own start, past the ${fmtLen(tol)} tolerance.`,
        );
      }
      if (candidates.length > 1) {
        throw new ContourError(
          'ambiguous-junction',
          `ambiguous junction at ${fmtPt(cx, cy)}: ${candidates.length + 1} segments meet there ` +
            `(${candidates.map(c => c.seg.source).join(', ')}), so the contour to follow is not determined. ` +
            'Split the drawing into one region per file, or delete the stray segments.',
        );
      }

      const next = candidates[0];
      used[next.idx] = true;
      loop.push(next.seg);
      cx = next.seg.x1;
      cy = next.seg.y1;
    }

    // Snap the closing gap. It is at most `tolerance`, but leaving it would
    // hand replicad a wire whose last vertex is not its first.
    const last = loop[loop.length - 1];
    if (last.x1 !== originX || last.y1 !== originY) {
      gapsClosed++;
      loop[loop.length - 1] = { ...last, x1: originX, y1: originY };
    }
    loops.push(loop);
  }

  return { loops, gapsClosed };
}

function fmtPt(x: number, y: number): string {
  return `(${x.toFixed(4)}, ${y.toFixed(4)}) mm`;
}

function fmtLen(v: number): string {
  return `${v.toPrecision(3)} mm`;
}

// ---------------------------------------------------------------------------
// Emission
// ---------------------------------------------------------------------------

function loopToCommands(loop: readonly ImportSegment[]): SketchCommand[] {
  const cmds: SketchCommand[] = [
    { kind: 'moveTo', x: toParam(loop[0].x0, 'mm'), y: toParam(loop[0].y0, 'mm') },
  ];
  for (const seg of loop) {
    const b = seg.bulge ?? 0;
    if (b === 0) {
      cmds.push({ kind: 'lineTo', x: toParam(seg.x1, 'mm'), y: toParam(seg.y1, 'mm') });
    } else {
      cmds.push({
        kind: 'bulgeArc',
        x: toParam(seg.x1, 'mm'),
        y: toParam(seg.y1, 'mm'),
        bulge: toParam(b, 'unitless'),
      });
    }
  }
  // Every segment including the return leg is emitted explicitly, so the pen
  // is already on the start point and replicad's `close()` adds nothing. That
  // matters for arc-terminated loops (a circle): letting `close()` bridge the
  // gap would replace the final arc with a straight line.
  cmds.push({ kind: 'close' });
  return cmds;
}

function describeLoop(loop: readonly ImportSegment[]): string {
  const kinds = new Set(loop.map(s => s.source.replace(/\s*\(.*$/, '')));
  return [...kinds].sort().join(' + ');
}

/**
 * Chain, orient and emit closed regions.
 *
 * Regions come back ordered by DESCENDING area, so index 0 is the outermost
 * profile of a drawing — a stable order callers can index into, independent of
 * the order entities happened to appear in the file.
 *
 * NESTING IS NOT INTERPRETED. A shape with a hole yields two regions, not one
 * region with an inner boundary. Deciding which loop is a hole requires intent
 * this stage does not have (a "hole" and a separate part look identical), so
 * the caller unions or cuts them explicitly.
 *
 * @throws {ContourError} on empty input, an unclosed chain, an ambiguous
 *   junction, or a loop that encloses no area.
 */
export function assembleRegions(input: AssembleInput, opts: AssembleOptions): AssembleResult {
  const tol = opts.tolerance;

  let duplicatesDropped = 0;
  let degeneratesDropped = 0;

  const cleanedClosed: ImportSegment[][] = [];
  for (const loop of input.closed) {
    const { kept, duplicates, degenerates } = dedupe(loop, tol);
    duplicatesDropped += duplicates;
    degeneratesDropped += degenerates;
    if (kept.length > 0) cleanedClosed.push(kept);
  }

  const openClean = dedupe(input.open, tol);
  duplicatesDropped += openClean.duplicates;
  degeneratesDropped += openClean.degenerates;

  if (cleanedClosed.length === 0 && openClean.kept.length === 0) {
    throw new ContourError(
      'no-geometry',
      'no usable 2D geometry: the file parsed cleanly but produced zero non-degenerate segments.',
    );
  }

  const chained = chainLoops(openClean.kept, tol);
  const allLoops = [...cleanedClosed, ...chained.loops];

  const regions: ImportedRegion[] = [];
  for (const loop of allLoops) {
    const area = signedArea(loop);
    if (Math.abs(area) < tol * tol) {
      throw new ContourError(
        'degenerate-region',
        `region from ${describeLoop(loop)} encloses no area (${area.toExponential(2)} mm²) — ` +
          'its segments are collinear or double back on themselves.',
      );
    }
    // Normalise to CCW so extrude/revolve see a consistent winding regardless
    // of how the authoring tool happened to order its points.
    const oriented = area < 0 ? loop.map(reverseSegment).reverse() : loop;
    regions.push({
      commands: loopToCommands(oriented),
      areaMm2: Math.abs(area),
      segmentCount: oriented.length,
      source: describeLoop(oriented),
    });
  }

  regions.sort((a, b) => b.areaMm2 - a.areaMm2);
  return {
    regions,
    duplicatesDropped,
    degeneratesDropped,
    gapsClosed: chained.gapsClosed,
  };
}
