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

/** World-space fold steps for a chain of bends, in application order. */
export function planFold(bends: readonly FlatBend[], blank: FlatBlank): FoldStep[] {
  const done: { step: FoldStep; frame: FlatFrame }[] = [];
  const nFlat: Vec3 = [0, 0, 1];
  for (const bend of bends) {
    const side = movingSide(bend, blank);
    const frame = flatFrame(bend, side, blank);
    const BA = bendAllowanceOf(bend, blank);
    const W = worldTransformAt(frame.mid, bend.orient, BA / 2, done);
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
    done.push({
      step: { bend, side, bendAllowance: BA, zoneStart, zoneEnd, e, n, d, center, axis, angleRad, flangeTransform },
      frame,
    });
  }
  return done.map((x) => x.step);
}
