// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * Result validation for fillet / chamfer (and other local ops).
 *
 * OCCT's BRepFilletAPI_MakeFillet / MakeChamfer can report IsDone() and still
 * hand back a broken body: an oversized fillet on a thin plate yields a solid
 * that fails BRepCheck (and has MORE volume than the box it rounded), or one
 * whose blends were silently dropped (volume unchanged). A result like that
 * must be treated as a failure, never returned as `ok`.
 *
 * Kernel-only: returns a reason string, the caller builds the diagnostic.
 */

import { getOC } from 'replicad';
import { volumeOf } from './booleanRecovery';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OC = any;

/** Expected sign of the volume change: convex edges remove material,
 *  concave edges add it; `mixed` only requires a change. */
export type EdgeFeatureVolumeTrend = 'decrease' | 'increase' | 'mixed';

/** Number of TopoDS_Solid sub-shapes in `shape`. */
export function countSolids(shape: unknown): number {
  return countSubShapes(shape, 'TopAbs_SOLID');
}

/** Number of TopoDS_Face sub-shapes in `shape`. */
export function countFaces(shape: unknown): number {
  return countSubShapes(shape, 'TopAbs_FACE');
}

function countSubShapes(shape: unknown, kind: 'TopAbs_SOLID' | 'TopAbs_FACE'): number {
  const oc = getOC() as OC;
  const ex = new oc.TopExp_Explorer_2(shape, oc.TopAbs_ShapeEnum[kind], oc.TopAbs_ShapeEnum.TopAbs_SHAPE);
  let n = 0;
  try {
    while (ex.More()) { n++; ex.Next(); }
  } finally {
    ex.delete();
  }
  return n;
}

/**
 * Topological BRepCheck (GeomControls off). The full geometric check flags
 * planar faces bordering a correct blend (self-intersecting-wire tests at the
 * blend tangency) on results whose volume is exact, so it cannot gate; the
 * topological check is what catches the broken oversized-fillet bodies.
 */
export function isTopologicallyValid(shape: unknown): boolean {
  const oc = getOC() as OC;
  let analyzer: OC;
  try {
    analyzer = new oc.BRepCheck_Analyzer(shape, false, false);
    return Boolean(analyzer.IsValid_2());
  } catch {
    return false;
  } finally {
    analyzer?.delete();
  }
}

/** Relative volume tolerance below which a local op MAY be a no-op. Volume
 *  alone cannot decide it: a real r = 0.1 rim fillet on a 500 mm block
 *  removes ~0.02 mm³ (5e-10 of the body), well inside this band. A result
 *  only counts as unchanged when its face count is unchanged too — every
 *  applied blend adds (or, on a full round, replaces) faces, while a dropped
 *  blend hands back the input topology. */
const NOOP_REL_TOL = 1e-9;
/** Relative tolerance for the convex/concave volume-direction check. */
const TREND_REL_TOL = 1e-6;

/**
 * A shell, draft, or similar local op that hands back the input solid has
 * dropped the operation. Volume inside {@link NOOP_REL_TOL} is not enough on
 * its own: a hairline fillet moves less volume than that and still adds
 * faces. Both have to agree before the result counts as unchanged.
 */
export function localOpUnchanged(
  beforeVolume: number,
  afterVolume: number,
  beforeFaces: number,
  afterFaces: number,
): boolean {
  if (!Number.isFinite(beforeVolume) || !Number.isFinite(afterVolume)) return false;
  if (beforeFaces !== afterFaces) return false;
  const scale = Math.max(Math.abs(beforeVolume), 1);
  return Math.abs(afterVolume - beforeVolume) / scale <= NOOP_REL_TOL;
}

/**
 * Why `result` is not an acceptable outcome of a fillet/chamfer on `input`,
 * or `null` when it is. Checks: BRepCheck validity, solid count not grown and
 * non-zero, finite positive volume, the body actually changed (volume moved
 * beyond round-off, or the face set changed — a selected edge was blended), and the change has the right sign for the edge convexity.
 */
export function edgeFeatureResultProblem(
  input: unknown,
  result: unknown,
  trend: EdgeFeatureVolumeTrend = 'mixed',
): string | null {
  const oc = getOC();
  if (!isTopologicallyValid(result)) return 'the result fails the BRep validity check (self-intersecting or open blend)';
  const inSolids = countSolids(input);
  const outSolids = countSolids(result);
  if (outSolids === 0) return 'the result contains no closed solid';
  if (outSolids > Math.max(1, inSolids)) return `the result split into ${outSolids} solids`;
  const vIn = volumeOf(oc, input);
  const vOut = volumeOf(oc, result);
  if (!Number.isFinite(vOut) || vOut <= 0) return 'the result has no measurable volume';
  if (!Number.isFinite(vIn) || vIn <= 0) return null; // cannot judge further
  const delta = vOut - vIn;
  if (Math.abs(delta) <= vIn * NOOP_REL_TOL && countFaces(result) === countFaces(input)) {
    return 'the kernel returned the body unchanged (the blend was not applied)';
  }
  const tol = vIn * TREND_REL_TOL;
  if (trend === 'decrease' && delta > tol) {
    return `rounding convex edges increased the volume (${vIn.toFixed(1)} → ${vOut.toFixed(1)} mm³)`;
  }
  if (trend === 'increase' && delta < -tol) {
    return `filling concave edges decreased the volume (${vIn.toFixed(1)} → ${vOut.toFixed(1)} mm³)`;
  }
  return null;
}
