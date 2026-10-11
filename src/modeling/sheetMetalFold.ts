// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/sheetMetalFold.ts
//
// Pure-TS fold planner for sheet-metal bend chains. Every `.bend()` names its
// bend line in FLAT-BLANK coordinates (`{ atX }` / `{ atY }`, the same frame
// `flattenPattern()` reports). The planner replays the chain in order and
// returns, for each bend, where its bend zone sits in world space at the
// moment it is folded:
//
//   - the flat bend zone is the strip [L - BA/2, L + BA/2] across the line,
//     where BA is the K-factor bend allowance — the material the arc consumes;
//   - the SHORTER side of the blank across the line folds (ties: the +X / +Y
//     side), so a web with flanges at both ends keeps the web in place;
//   - a positive angle folds the moving side toward the sheet's +normal, a
//     negative one toward -normal; the inner radius sits on that side;
//   - a bend line that lies on the moving side of an earlier bend is located
//     through that bend's rigid transform, so chained bends fold the flange
//     that is already folded.
//
// The OCCT lowerer consumes `FoldStep` to split the current body at the zone
// planes, revolve the zone section into the bend arc and move the flange.
//
// The split is local: only the flat CELL holding the bend line (the strip
// between the neighbouring earlier bend zones, as one rigid piece of the
// folded body) is cut at the zone planes. Every other flange and arc moves
// or stays as a whole, so a lip folded on one flange cannot slice an
// unrelated flange that happens to cross the same world plane.
//
// Bend lines span the whole blank, so an { atX } and an { atY } bend always
// cross. That only folds if the blank has corner relief there: no material
// where the two bends' zone-plus-moving sides meet. The planner reports the
// flat regions the lowerer must find empty (`reliefChecks`).

export type Vec3 = [number, number, number];
type Mat3 = [number, number, number, number, number, number, number, number, number];

/** A rigid transform x -> R·x + t. */
export interface Rigid { R: Mat3; t: Vec3 }

/** One bend of a chain, in flat-blank coordinates. */
export interface FlatBend {
  /** 'x': the line is x = at (runs along Y). 'y': the line is y = at (runs along X). */
  orient: 'x' | 'y';
  at: number;
  angleDeg: number;
  radius: number;
}

/** The flat blank: XY extents and the bottom-surface z. */
export interface FlatBlank {
  min: [number, number];
  max: [number, number];
  z0: number;
  thickness: number;
  kFactor: number;
}

/** World-space description of one bend at the moment it is folded. */
export interface FoldStep {
  bend: FlatBend;
  /** +1 when the +X/+Y side of the line folds, -1 when the -X/-Y side does. */
  side: 1 | -1;
  bendAllowance: number;
  /** Zone start (fixed side) and end (moving side), on the bottom surface. */
  zoneStart: Vec3;
  zoneEnd: Vec3;
  /** Unit vectors: toward the moving side, sheet +normal, along the line. */
  e: Vec3;
  n: Vec3;
  d: Vec3;
  /** Bend-arc centre and rotation axis (rotating by +angle folds e toward n). */
  center: Vec3;
  axis: Vec3;
  angleRad: number;
  /** World transform the moving flange receives (translate by -BA·e, then rotate). */
  flangeTransform: Rigid;
  /** The flat cell the bend line lies in (one rigid piece of the folded body). */
  cell: FlatCell;
  /** Flat corner regions that must hold no material (crossing earlier bends). */
  reliefChecks: ReliefCheck[];
}

/** An axis-aligned flat-blank rectangle (bottom surface z0, full thickness)
 *  and the world transform of the rigid piece of the folded body it lies in. */
export interface FlatCell {
  min: [number, number];
  max: [number, number];
  transform: Rigid;
}

/** A flat region where a crossing earlier bend and this bend overlap: it
 *  must be empty (corner relief) or the fold would tear the corner. */
export interface ReliefCheck {
  /** The earlier, crossing bend. */
  crossing: FlatBend;
  /** Regions to probe for material, each with the transform it lies under. */
  regions: FlatCell[];
}

const I3: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

export const IDENTITY: Rigid = { R: I3, t: [0, 0, 0] };

function add(a: Vec3, b: Vec3): Vec3 { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function sub(a: Vec3, b: Vec3): Vec3 { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function scale(a: Vec3, s: number): Vec3 { return [a[0] * s, a[1] * s, a[2] * s]; }
function dot(a: Vec3, b: Vec3): number { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function unit(a: Vec3): Vec3 {
  const l = Math.hypot(a[0], a[1], a[2]);
  return l < 1e-12 ? a : scale(a, 1 / l);
}

function mulMV(R: Mat3, v: Vec3): Vec3 {
  return [
    R[0] * v[0] + R[1] * v[1] + R[2] * v[2],
    R[3] * v[0] + R[4] * v[1] + R[5] * v[2],
    R[6] * v[0] + R[7] * v[1] + R[8] * v[2],
  ];
}

function mulMM(A: Mat3, B: Mat3): Mat3 {
  const out = new Array<number>(9).fill(0) as Mat3;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      out[r * 3 + c] = A[r * 3] * B[c] + A[r * 3 + 1] * B[3 + c] + A[r * 3 + 2] * B[6 + c];
    }
  }
  return out;
}

export function applyPoint(T: Rigid, p: Vec3): Vec3 { return add(mulMV(T.R, p), T.t); }
export function applyDir(T: Rigid, d: Vec3): Vec3 { return mulMV(T.R, d); }

/** A ∘ B: apply B first, then A. */
export function compose(A: Rigid, B: Rigid): Rigid {
  return { R: mulMM(A.R, B.R), t: add(mulMV(A.R, B.t), A.t) };
}

/** Rotation by `angle` (rad, right-hand rule) about the line through `c` along unit `a`. */
export function rotationAbout(c: Vec3, a: Vec3, angle: number): Rigid {
  const [x, y, z] = unit(a);
  const cs = Math.cos(angle), sn = Math.sin(angle), k = 1 - cs;
  const R: Mat3 = [
    cs + x * x * k, x * y * k - z * sn, x * z * k + y * sn,
    y * x * k + z * sn, cs + y * y * k, y * z * k - x * sn,
    z * x * k - y * sn, z * y * k + x * sn, cs + z * z * k,
  ];
  return { R, t: sub(c, mulMV(R, c)) };
}

export function translation(v: Vec3): Rigid { return { R: I3, t: v }; }

/** K-factor bend allowance (developed neutral-axis length of the arc). */
export function bendAllowanceOf(bend: FlatBend, blank: FlatBlank): number {
  return (Math.PI * Math.abs(bend.angleDeg) / 180) * (blank.kFactor * blank.thickness + bend.radius);
}

/** The folding side: the shorter side of the blank across the line (ties: +). */
export function movingSide(bend: FlatBend, blank: FlatBlank): 1 | -1 {
  const i = bend.orient === 'x' ? 0 : 1;
  const below = bend.at - blank.min[i];
  const above = blank.max[i] - bend.at;
  return above <= below + 1e-9 ? 1 : -1;
}

interface FlatFrame { line: Vec3; mid: Vec3; e: Vec3; d: Vec3 }

/** Flat-space frame of a bend line: a point on it (bottom surface), its
 *  midpoint, the in-plane direction toward the moving side, and its direction. */
function flatFrame(bend: FlatBend, side: 1 | -1, blank: FlatBlank): FlatFrame {
  if (bend.orient === 'x') {
    return {
      line: [bend.at, blank.min[1], blank.z0],
      mid: [bend.at, (blank.min[1] + blank.max[1]) / 2, blank.z0],
      e: [side, 0, 0],
      d: [0, 1, 0],
    };
  }
  return {
    line: [blank.min[0], bend.at, blank.z0],
    mid: [(blank.min[0] + blank.max[0]) / 2, bend.at, blank.z0],
    e: [0, side, 0],
    d: [1, 0, 0],
  };
}

/** Thrown when two bend zones overlap or a line falls inside an earlier zone. */
export class FoldPlanError extends Error {}

/** World transform of the flat region holding `point`, given earlier steps. */
function worldTransformAt(
  point: Vec3,
  orient: FlatBend['orient'],
  halfZone: number,
  prior: readonly { step: FoldStep; frame: FlatFrame }[],
): Rigid {
  let W = IDENTITY;
  for (const { step, frame } of prior) {
    const s = dot(sub(point, frame.line), frame.e);
    if (step.bend.orient === orient && Math.abs(s) < step.bendAllowance / 2 + halfZone - 1e-9) {
      throw new FoldPlanError(
        `bend at ${step.bend.orient} = ${step.bend.at} and a later bend overlap: bend zones (the bend allowance strip across each line) may not overlap.`,
      );
    }
    if (s > 0) W = compose(step.flangeTransform, W);
  }
  return W;
}

/** Index of the flat coordinate a bend line of this orientation is constant in. */
function uIndex(orient: FlatBend['orient']): 0 | 1 {
  return orient === 'x' ? 0 : 1;
}

/** Flat range [lo, hi] along `axis` of one side of an earlier bend (its zone
 *  excluded): the side holding `at`, clipped to the blank. */
function sideRange(
  prior: FoldStep,
  towardMoving: boolean,
  blank: FlatBlank,
): [number, number] {
  const i = uIndex(prior.bend.orient);
  const half = prior.bendAllowance / 2;
  const plusIsMoving = prior.side === 1;
  const plus = towardMoving === plusIsMoving;
  return plus ? [prior.bend.at + half, blank.max[i]] : [blank.min[i], prior.bend.at - half];
}

/** The rigid flat cell holding bend `bend`'s line, bounded by earlier
 *  parallel bend zones across it and by earlier crossing bends' fixed side
 *  along it. */
function cellOf(bend: FlatBend, halfZone: number, blank: FlatBlank, prior: readonly FoldStep[]): { min: [number, number]; max: [number, number] } {
  const min: [number, number] = [blank.min[0], blank.min[1]];
  const max: [number, number] = [blank.max[0], blank.max[1]];
  const u = uIndex(bend.orient);
  let boundedByBend = false;
  for (const step of prior) {
    const j = uIndex(step.bend.orient);
    const half = step.bendAllowance / 2;
    if (j === u) {
      boundedByBend = true;
      if (step.bend.at < bend.at) min[u] = Math.max(min[u], step.bend.at + half);
      else max[u] = Math.min(max[u], step.bend.at - half);
    } else {
      const [lo, hi] = sideRange(step, false, blank);
      min[j] = Math.max(min[j], lo);
      max[j] = Math.min(max[j], hi);
    }
  }
  // A line off the blank is reported by the lowerer ("does not cross the
  // sheet"); here only an earlier parallel zone can be in the way.
  const onBlank = bend.at > blank.min[u] && bend.at < blank.max[u];
  if (boundedByBend && onBlank && (bend.at - halfZone < min[u] - 1e-9 || bend.at + halfZone > max[u] + 1e-9)) {
    throw new FoldPlanError(
      `bend at ${bend.orient} = ${bend.at} and an earlier bend overlap: bend zones (the bend allowance strip across each line) may not overlap.`,
    );
  }
  return { min, max };
}

/** Corner regions of each crossing earlier bend that this bend would fold
 *  through: (this bend's zone + moving side) x (that bend's zone / moving side). */
function reliefChecksOf(
  bend: FlatBend,
  side: 1 | -1,
  halfZone: number,
  blank: FlatBlank,
  prior: readonly { step: FoldStep; frame: FlatFrame }[],
): ReliefCheck[] {
  const u = uIndex(bend.orient);
  const mine: [number, number] = side === 1 ? [bend.at - halfZone, blank.max[u]] : [blank.min[u], bend.at + halfZone];
  const out: ReliefCheck[] = [];
  for (const { step } of prior) {
    const j = uIndex(step.bend.orient);
    if (j === u) continue;
    const half = step.bendAllowance / 2;
    const moving = sideRange(step, true, blank);
    const zone: [number, number] = [step.bend.at - half, step.bend.at + half];
    // The zone strip's material is revolved from the fixed side's section,
    // so the section just inside the fixed side stands for the arc.
    const sectionAt = step.side === 1 ? zone[0] : zone[1];
    const sliver: [number, number] = step.side === 1 ? [sectionAt - 0.05, sectionAt] : [sectionAt, sectionAt + 0.05];
    const box = (along: [number, number]): { min: [number, number]; max: [number, number] } => {
      const min: [number, number] = [0, 0];
      const max: [number, number] = [0, 0];
      min[u] = mine[0]; max[u] = mine[1];
      min[j] = along[0]; max[j] = along[1];
      return { min, max };
    };
    const regions: FlatCell[] = [];
    for (const along of [moving, sliver]) {
      const r = box(along);
      if (r.max[0] - r.min[0] <= 1e-9 || r.max[1] - r.min[1] <= 1e-9) continue;
      const centre: Vec3 = [(r.min[0] + r.max[0]) / 2, (r.min[1] + r.max[1]) / 2, blank.z0];
      regions.push({ ...r, transform: transformAt(centre, prior) });
    }
    out.push({ crossing: step.bend, regions });
  }
  return out;
}

/** World transform of the flat point `point`, given the earlier steps. */
function transformAt(point: Vec3, prior: readonly { step: FoldStep; frame: FlatFrame }[]): Rigid {
  let W = IDENTITY;
  for (const { step, frame } of prior) {
    if (dot(sub(point, frame.line), frame.e) > 0) W = compose(step.flangeTransform, W);
  }
  return W;
}

/** World-space fold steps for a chain of bends, in application order. */
export function planFold(bends: readonly FlatBend[], blank: FlatBlank): FoldStep[] {
  const done: { step: FoldStep; frame: FlatFrame }[] = [];
  const nFlat: Vec3 = [0, 0, 1];
  for (const bend of bends) {
    const side = movingSide(bend, blank);
    const frame = flatFrame(bend, side, blank);
    const BA = bendAllowanceOf(bend, blank);
    const priorSteps = done.map((x) => x.step);
    const box = cellOf(bend, BA / 2, blank, priorSteps);
    const centre: Vec3 = [(box.min[0] + box.max[0]) / 2, (box.min[1] + box.max[1]) / 2, blank.z0];
    if (bend.orient === 'x') centre[0] = bend.at; else centre[1] = bend.at;
    const W = worldTransformAt(centre, bend.orient, BA / 2, done);
    const e = applyDir(W, frame.e);
    const n = applyDir(W, nFlat);
    const d = applyDir(W, frame.d);
    const zoneStart = applyPoint(W, add(frame.line, scale(frame.e, -BA / 2)));
    const zoneEnd = applyPoint(W, add(frame.line, scale(frame.e, BA / 2)));
    const angleRad = bend.angleDeg * Math.PI / 180;
    const offset = angleRad >= 0 ? blank.thickness + bend.radius : -bend.radius;
    const center = add(zoneStart, scale(n, offset));
    const axis = unit(cross(e, n));
    const flangeTransform = compose(rotationAbout(center, axis, angleRad), translation(scale(e, -BA)));
    const cell: FlatCell = { min: box.min, max: box.max, transform: W };
    const reliefChecks = reliefChecksOf(bend, side, BA / 2, blank, done);
    done.push({
      step: { bend, side, bendAllowance: BA, zoneStart, zoneEnd, e, n, d, center, axis, angleRad, flangeTransform, cell, reliefChecks },
      frame,
    });
  }
  return done.map((x) => x.step);
}
