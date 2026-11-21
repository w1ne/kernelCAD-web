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
// back. They share line and circular-arc segments in millimetres; DXF also
// contributes exact clamped NURBS segments. The contour stage chains and
// orients them, then emits the same `SketchCommand[]` captured by PathBuilder
// and lowered by the OCCT sketch path. An imported profile is therefore an
// ordinary sketch downstream, not a special mesh representation.
//
// ARCS ARE KEPT EXACT
// -------------------
// Circular arcs travel as a DXF bulge factor (`tan(includedAngle / 4)`,
// positive counter-clockwise) because that is exactly what
// `SketchCommand.bulgeArc` already carries — DXF's native encoding maps to it
// with no conversion and no loss. DXF SPLINE data, clamped on import, maps to
// `nurbsSegment` with its knots and weights intact; full planar DXF ELLIPSE
// entities use four exact rational NURBS segments. Geometry with no exact
// command form (such as SVG Béziers and SVG ellipses) is flattened in the
// parsers under an explicit `curveTolerance`.
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
  /** Exact planar B-spline geometry. DXF splines are clamped on import
   * (dxfSplineClamp.ts) so the first and last poles are curve endpoints. */
  nurbs?: ImportNurbsSegment;
}

export interface ImportNurbsSegment {
  degree: number;
  controlPoints: readonly (readonly [number, number])[];
  knots: readonly number[];
  weights?: readonly number[];
}

/** A closed profile ready to become a `Sketch`. */
export interface ImportedRegion {
  /** `moveTo` … segments … `close`, in the repo's canonical sketch IR. */
  commands: SketchCommand[];
  /** Enclosed area in mm², positive after winding normalization. NURBS area is
   * sampled only for region ranking; emitted geometry remains exact. */
  areaMm2: number;
  /** Number of segments in the loop, including the segments of its holes. */
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

/** A closed outer loop with the closed loops the source file declares as its holes. */
export interface ImportFace {
  outer: ImportSegment[];
  holes: ImportSegment[][];
}

/** Segments already known to form a closed loop (a CIRCLE, a `<rect>`, a `Z`-closed subpath). */
export interface AssembleInput {
  closed: ImportSegment[][];
  /** Segments whose loop membership is unknown; chained by endpoint matching. */
  open: ImportSegment[];
  /** Profiles whose holes the file states explicitly (a multi-path DXF HATCH). */
  faces?: ImportFace[];
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
 * Signed area (mm²) of the loop; positive when it runs counter-clockwise.
 * Lines and circular arcs are integrated exactly. NURBS curves are sampled
 * only for area ordering and winding; their emitted B-rep geometry is exact.
 */
function signedArea(loop: readonly ImportSegment[]): number {
  let sum = 0;
  for (const seg of loop) {
    if (seg.nurbs) {
      const samples = sampleNurbs(seg.nurbs);
      for (let i = 0; i + 1 < samples.length; i++) {
        sum += samples[i][0] * samples[i + 1][1] - samples[i + 1][0] * samples[i][1];
      }
      continue;
    }
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

/** Evaluate one point on a rational B-spline with the de Boor algorithm. */
function evaluateNurbs(curve: ImportNurbsSegment, u: number): [number, number] {
  const { degree, controlPoints, knots, weights } = curve;
  const n = controlPoints.length - 1;
  const domainEnd = knots[n + 1];
  let span = n;
  if (u < domainEnd) {
    let low = degree;
    let high = n + 1;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (u < knots[mid]) high = mid;
      else if (u >= knots[mid + 1]) low = mid + 1;
      else { low = mid; high = mid; }
    }
    span = low;
  }

  const work: Array<[number, number, number]> = [];
  for (let j = 0; j <= degree; j++) {
    const index = span - degree + j;
    const weight = weights?.[index] ?? 1;
    work.push([controlPoints[index][0] * weight, controlPoints[index][1] * weight, weight]);
  }
  for (let r = 1; r <= degree; r++) {
    for (let j = degree; j >= r; j--) {
      const index = span - degree + j;
      const denominator = knots[index + degree - r + 1] - knots[index];
      const alpha = denominator === 0 ? 0 : (u - knots[index]) / denominator;
      work[j] = [
        (1 - alpha) * work[j - 1][0] + alpha * work[j][0],
        (1 - alpha) * work[j - 1][1] + alpha * work[j][1],
        (1 - alpha) * work[j - 1][2] + alpha * work[j][2],
      ];
    }
  }
  const [xw, yw, weight] = work[degree];
  return [xw / weight, yw / weight];
}

/** Sample only for contour area ranking and HATCH nesting tests. The emitted
 * sketch keeps the exact NURBS control net and lowers it to a B-spline edge. */
export function sampleNurbs(curve: ImportNurbsSegment): [number, number][] {
  const { degree, controlPoints, knots } = curve;
  const start = knots[degree];
  const end = knots[controlPoints.length];
  const breaks = [...new Set(knots.filter(k => k >= start && k <= end))].sort((a, b) => a - b);
  const points: [number, number][] = [];
  const samplesPerSpan = 128;
  for (let span = 0; span + 1 < breaks.length; span++) {
    const a = breaks[span];
    const b = breaks[span + 1];
    if (b <= a) continue;
    const first = span === 0 ? 0 : 1;
    for (let i = first; i <= samplesPerSpan; i++) {
      points.push(evaluateNurbs(curve, a + (b - a) * i / samplesPerSpan));
    }
  }
  return points;
}

export function reverseSegment(seg: ImportSegment): ImportSegment {
  const nurbs = seg.nurbs;
  const reversedNurbs = nurbs === undefined ? undefined : {
    ...nurbs,
    controlPoints: [...nurbs.controlPoints].reverse(),
    knots: [...nurbs.knots].reverse().map(
      k => nurbs.knots[0] + nurbs.knots[nurbs.knots.length - 1] - k,
    ),
    ...(nurbs.weights === undefined ? {} : { weights: [...nurbs.weights].reverse() }),
  };
  return {
    x0: seg.x1, y0: seg.y1, x1: seg.x0, y1: seg.y0,
    // Walking an arc backwards swaps which side of the chord it bulges to.
    bulge: seg.bulge === undefined ? undefined : -seg.bulge,
    source: seg.source,
    ...(reversedNurbs === undefined ? {} : { nurbs: reversedNurbs }),
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
    // Endpoint identity cannot prove two NURBS segments are duplicates. Keep
    // them so the contour walk reports an ambiguous junction instead.
    if (seg.nurbs) {
      kept.push(seg);
      continue;
    }
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

function buildEndpointIndex(segs: readonly ImportSegment[], tol: number): EndpointIndex {
  // Index every segment END as `segIndex * 2 + (0 = start, 1 = end)`.
  const index = new EndpointIndex(tol);
  for (let i = 0; i < segs.length; i++) {
    index.add(segs[i].x0, segs[i].y0, i * 2);
    index.add(segs[i].x1, segs[i].y1, i * 2 + 1);
  }
  return index;
}

function collectCandidates(
  index: EndpointIndex,
  segs: readonly ImportSegment[],
  used: readonly boolean[],
  cx: number,
  cy: number,
  tol: number,
): Array<{ seg: ImportSegment; idx: number }> {
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
  return candidates;
}

function walkChain(
  segs: readonly ImportSegment[],
  index: EndpointIndex,
  used: boolean[],
  start: number,
  tol: number,
): ImportSegment[] {
  const loop: ImportSegment[] = [segs[start]];
  let cx = segs[start].x1;
  let cy = segs[start].y1;
  const originX = segs[start].x0;
  const originY = segs[start].y0;

  for (;;) {
    if (near(cx, cy, originX, originY, tol)) break; // closed

    const candidates = collectCandidates(index, segs, used, cx, cy, tol);

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

  return loop;
}

// Snap the closing gap. It is at most `tolerance`, but leaving it would
// hand replicad a wire whose last vertex is not its first. Returns 1 when a
// gap was snapped, 0 when the chain already ended exactly on its start.
function closeLoopGap(loop: ImportSegment[], originX: number, originY: number): number {
  const last = loop[loop.length - 1];
  if (last.x1 !== originX || last.y1 !== originY) {
    if (last.nurbs) {
      loop.push({
        x0: last.x1, y0: last.y1, x1: originX, y1: originY,
        source: `${last.source} closure gap`,
      });
      return 1;
    }
    loop[loop.length - 1] = { ...last, x1: originX, y1: originY };
    return 1;
  }
  return 0;
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
  const index = buildEndpointIndex(segs, tol);

  const used = new Array(segs.length).fill(false);
  const loops: ImportSegment[][] = [];
  let gapsClosed = 0;

  for (let start = 0; start < segs.length; start++) {
    if (used[start]) continue;
    used[start] = true;
    const loop = walkChain(segs, index, used, start, tol);

    gapsClosed += closeLoopGap(loop, segs[start].x0, segs[start].y0);
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
    if (seg.nurbs) {
      cmds.push({
        kind: 'nurbsSegment',
        controlPoints: seg.nurbs.controlPoints.map(([x, y]) => ({
          x: toParam(x, 'mm'), y: toParam(y, 'mm'),
        })),
        degree: toParam(seg.nurbs.degree, 'unitless'),
        ...(seg.nurbs.weights === undefined
          ? {}
          : { weights: seg.nurbs.weights.map(weight => toParam(weight, 'unitless')) }),
        knots: seg.nurbs.knots.map(knot => toParam(knot, 'unitless')),
      });
      continue;
    }
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

/** The loop wound counter-clockwise, with its enclosed area in mm². */
function orientLoop(loop: ImportSegment[], tol: number): { oriented: ImportSegment[]; area: number } {
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
  return { oriented: area < 0 ? loop.map(reverseSegment).reverse() : loop, area: Math.abs(area) };
}

/** One region from an outer loop and its declared holes, outer loop first. */
function faceRegion(face: ImportFace, tol: number): ImportedRegion {
  const outer = orientLoop(face.outer, tol);
  const holes = face.holes.map(hole => orientLoop(hole, tol));
  const area = outer.area - holes.reduce((sum, hole) => sum + hole.area, 0);
  if (area < tol * tol) {
    throw new ContourError(
      'degenerate-region',
      `region from ${describeLoop(outer.oriented)} encloses no area once its holes are removed (${area.toExponential(2)} mm²).`,
    );
  }
  return {
    commands: [outer, ...holes].flatMap(loop => loopToCommands(loop.oriented)),
    areaMm2: area,
    segmentCount: [outer, ...holes].reduce((sum, loop) => sum + loop.oriented.length, 0),
    source: `${describeLoop(outer.oriented)} with ${holes.length} hole${holes.length === 1 ? '' : 's'}`,
  };
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
 * the caller unions or cuts them explicitly. The exception is `input.faces`:
 * there the file itself declared the holes, and each face becomes one region
 * whose commands list the outer loop first and then each hole.
 *
 * @throws {ContourError} on empty input, an unclosed chain, an ambiguous
 *   junction, or a loop that encloses no area.
 */
export function assembleRegions(input: AssembleInput, opts: AssembleOptions): AssembleResult {
  const tol = opts.tolerance;

  let duplicatesDropped = 0;
  let degeneratesDropped = 0;

  const clean = (loop: readonly ImportSegment[]): ImportSegment[] => {
    const { kept, duplicates, degenerates } = dedupe(loop, tol);
    duplicatesDropped += duplicates;
    degeneratesDropped += degenerates;
    return kept;
  };
  const cleanedClosed = input.closed.map(clean).filter(loop => loop.length > 0);
  const cleanedFaces = (input.faces ?? []).map(face => ({
    outer: clean(face.outer),
    holes: face.holes.map(clean).filter(loop => loop.length > 0),
  })).filter(face => face.outer.length > 0);

  const openClean = dedupe(input.open, tol);
  duplicatesDropped += openClean.duplicates;
  degeneratesDropped += openClean.degenerates;

  if (cleanedClosed.length === 0 && cleanedFaces.length === 0 && openClean.kept.length === 0) {
    throw new ContourError(
      'no-geometry',
      'no usable 2D geometry: the file parsed cleanly but produced zero non-degenerate segments.',
    );
  }

  const chained = chainLoops(openClean.kept, tol);
  const allLoops = [...cleanedClosed, ...chained.loops];

  const regions: ImportedRegion[] = allLoops.map(loop => {
    const { oriented, area } = orientLoop(loop, tol);
    return {
      commands: loopToCommands(oriented),
      areaMm2: area,
      segmentCount: oriented.length,
      source: describeLoop(oriented),
    };
  });
  regions.push(...cleanedFaces.map(face => faceRegion(face, tol)));

  regions.sort((a, b) => b.areaMm2 - a.areaMm2);
  return {
    regions,
    duplicatesDropped,
    degeneratesDropped,
    gapsClosed: chained.gapsClosed,
  };
}
