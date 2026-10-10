// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Bent-tube centreline: corner points joined by straight legs, each corner
// replaced by a tangent arc of one radius. Pure math; no kernel imports.

export type V3 = [number, number, number];

export type TubeSegment =
  | { kind: 'line'; a: V3; b: V3 }
  | { kind: 'arc'; start: V3; mid: V3; end: V3; center: V3; angleDeg: number; corner: number };

type ArcSegment = Extract<TubeSegment, { kind: 'arc' }>;

export interface TubeBend { corner: number; angleDeg: number; tangentLen: number; normal: V3 }

export interface TubePath {
  points: V3[];
  segments: TubeSegment[];
  straights: number[];
  bends: TubeBend[];
  bendRadius: number;
  cutLength: number;
  startDir: V3;
  endDir: V3;
}

export type TubePathError =
  | { kind: 'too-few-points' }
  | { kind: 'reversal'; corner: number }
  | { kind: 'unreachable'; leg: number; missingMm: number };

const COLLINEAR_RAD = 1e-6;
const REVERSAL_RAD = 1e-3;
const POINT_EPS = 1e-9;

export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const scale = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 =>
  [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norm = (a: V3): number => Math.hypot(a[0], a[1], a[2]);
export const unit = (a: V3): V3 => scale(a, 1 / norm(a));

export function isTubePathError(v: TubePath | TubePathError): v is TubePathError {
  return 'kind' in v;
}

export function tubePathErrorMessage(name: string, e: TubePathError): string {
  if (e.kind === 'unreachable') {
    return `tube.corner.unreachable: tube '${name}' leg ${e.leg} is ${e.missingMm.toFixed(2)} mm too short for the bends at its ends. Move a corner to lengthen the leg or lower bendRadius.`;
  }
  if (e.kind === 'reversal') {
    return `tube.corner.collinear-reversal: tube '${name}' folds back on itself at corner ${e.corner}. Offset the next corner sideways.`;
  }
  return `tube.corner.too-few-points: tube '${name}' needs two distinct end points.`;
}

/** Angle between two unit vectors, in radians. */
const angleBetween = (u: V3, v: V3): number => Math.acos(Math.min(1, Math.max(-1, dot(u, v))));

/** Drop repeated points, then corners whose legs are collinear. */
function cleanCorners(points: V3[]): V3[] {
  const distinct: V3[] = [];
  for (const p of points) {
    if (distinct.length === 0 || norm(sub(p, distinct[distinct.length - 1])) > POINT_EPS) distinct.push(p);
  }
  return distinct.filter((p, i) => {
    if (i === 0 || i === distinct.length - 1) return true;
    const u = unit(sub(p, distinct[i - 1]));
    const v = unit(sub(distinct[i + 1], p));
    return angleBetween(u, v) > COLLINEAR_RAD;
  });
}

function bendAt(pts: V3[], i: number, r: number): TubeBend | TubePathError {
  const u = unit(sub(pts[i], pts[i - 1]));
  const v = unit(sub(pts[i + 1], pts[i]));
  const theta = angleBetween(u, v);
  if (Math.PI - theta < REVERSAL_RAD) return { kind: 'reversal', corner: i };
  return {
    corner: i,
    angleDeg: (theta * 180) / Math.PI,
    tangentLen: r * Math.tan(theta / 2),
    normal: unit(cross(u, v)),
  };
}

function arcAt(pts: V3[], bend: TubeBend, r: number): ArcSegment {
  const p = pts[bend.corner];
  const u = unit(sub(p, pts[bend.corner - 1]));
  const v = unit(sub(pts[bend.corner + 1], p));
  const half = (bend.angleDeg * Math.PI) / 360;
  const b = unit(sub(v, u));
  const center = add(p, scale(b, r / Math.cos(half)));
  return {
    kind: 'arc',
    start: sub(p, scale(u, bend.tangentLen)),
    mid: sub(center, scale(b, r)),
    end: add(p, scale(v, bend.tangentLen)),
    center,
    angleDeg: bend.angleDeg,
    corner: bend.corner,
  };
}

/** Bends at the interior corners; bend `k` sits at corner `k + 1`. */
function bendsOf(pts: V3[], r: number): TubeBend[] | TubePathError {
  const bends: TubeBend[] = [];
  for (let i = 1; i < pts.length - 1; i++) {
    const b = bendAt(pts, i, r);
    if ('kind' in b) return b;
    bends.push(b);
  }
  return bends;
}

/** Straight length of every leg, or the first leg its tangents do not fit on. */
function straightsOf(pts: V3[], bends: TubeBend[]): number[] | TubePathError {
  const straights: number[] = [];
  for (let j = 0; j < pts.length - 1; j++) {
    const tangents = (bends[j - 1]?.tangentLen ?? 0) + (bends[j]?.tangentLen ?? 0);
    const s = norm(sub(pts[j + 1], pts[j])) - tangents;
    if (s < -POINT_EPS) return { kind: 'unreachable', leg: j, missingMm: -s };
    straights.push(Math.max(0, s));
  }
  return straights;
}

function segmentsOf(pts: V3[], bends: TubeBend[], straights: number[], r: number): TubeSegment[] {
  const segments: TubeSegment[] = [];
  let cursor = pts[0];
  for (let j = 0; j < pts.length - 1; j++) {
    const arc = bends[j] ? arcAt(pts, bends[j], r) : undefined;
    if (straights[j] > POINT_EPS) segments.push({ kind: 'line', a: cursor, b: arc ? arc.start : pts[j + 1] });
    if (arc) {
      segments.push(arc);
      cursor = arc.end;
    }
  }
  return segments;
}

export function buildTubePath(points: V3[], bendRadius: number): TubePath | TubePathError {
  const pts = cleanCorners(points);
  if (pts.length < 2) return { kind: 'too-few-points' };
  const bends = bendsOf(pts, bendRadius);
  if (!Array.isArray(bends)) return bends;
  const straights = straightsOf(pts, bends);
  if (!Array.isArray(straights)) return straights;

  const arcLen = bends.reduce((n, b) => n + (bendRadius * b.angleDeg * Math.PI) / 180, 0);
  return {
    points: pts,
    segments: segmentsOf(pts, bends, straights, bendRadius),
    straights,
    bends,
    bendRadius,
    cutLength: straights.reduce((n, s) => n + s, 0) + arcLen,
    startDir: unit(sub(pts[1], pts[0])),
    endDir: unit(sub(pts[pts.length - 1], pts[pts.length - 2])),
  };
}

/** Shorten the first and last straight (clamped to their length); a negative
 *  trim extends that end instead. Used to measure a tube against the part that
 *  owns its port without the fitting zone. Returns undefined when nothing
 *  remains. */
export function trimPathEnds(path: TubePath, startMm: number, endMm: number): TubePath | undefined {
  const last = path.straights.length - 1;
  const a = Math.min(startMm, path.straights[0]);
  // A single straight is shared by both ends: the end trim gets what the start trim left.
  const b = Math.min(endMm, last === 0 ? path.straights[0] - a : path.straights[last]);
  const pts = path.points.map((p) => [...p] as V3);
  pts[0] = add(pts[0], scale(path.startDir, a));
  pts[pts.length - 1] = sub(pts[pts.length - 1], scale(path.endDir, b));
  const trimmed = buildTubePath(pts, path.bendRadius);
  return isTubePathError(trimmed) || trimmed.cutLength <= POINT_EPS ? undefined : trimmed;
}
