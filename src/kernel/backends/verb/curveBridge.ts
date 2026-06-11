// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/verb/curveBridge.ts
//
// Internal-only bridge between kernelCAD's OCCT-backed Curve3D proxy and the
// vendored JS NURBS analytics module at vendor/verb-nurbs/build/verb.es.js
// (resolved by the path alias `verb-nurbs`). NEVER imported outside
// src/kernel/backends/ or src/modeling/capture/ — the public Kcad surface
// stays native (no JS-NURBS-typed parameters or returns).
//
// Authoritative geometry stays in the kernel: any JS-NURBS-produced curve that
// PERSISTS past a single function call is rebuilt as a Geom_BSplineCurve via
// fromVerb(). Raw analytics data (Vec3[], numbers) returned from JS is NOT
// round-tripped — data is not geometry.
//
// Cache strategy: the JS curve is stashed on the Curve3D proxy via a Symbol
// keyed by the proxy's __paramVersion counter. When the carrier's
// __paramVersion bumps (Param mutation, recompute cycle), the next toVerb()
// call rebuilds.

import nurbsJs from 'verb-nurbs';
import type { NurbsCurve, NurbsCurveData, NurbsSurface, Point } from 'verb-nurbs';
import * as replicad from 'replicad';
import { getOC } from 'replicad';
import type { Curve3D } from '../../../modeling/capture/curveProxy';
import type { SurfaceProxy } from '../../../modeling/capture/surfaceProxy';
import { KernelError } from '../../../shared/intent/kernelError';
import { clampedUniformKnots, decomposeKnots } from '../occt/nurbsSurfaceLowerer';

const VERB_CACHE = Symbol.for('kernelcad.curve3d.__verbCurve');
const VERB_VERSION = Symbol.for('kernelcad.curve3d.__verbCurveVersion');
const PARAM_VERSION = Symbol.for('kernelcad.curve3d.__paramVersion');

interface CacheCarrier {
  [VERB_CACHE]?: NurbsCurve;
  [VERB_VERSION]?: number;
  [PARAM_VERSION]?: number;
}

/**
 * Expand a (distinct, multiplicities) knot description into the flat
 * knot vector that the JS analytics module expects. Inverse of
 * `decomposeKnots` (from `nurbsSurfaceLowerer`).
 */
function expandKnots(distinctKnots: number[], multiplicities: number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < distinctKnots.length; i++) {
    for (let k = 0; k < multiplicities[i]; k++) out.push(distinctKnots[i]);
  }
  return out;
}

/**
 * Convert a kernelCAD `Curve3D` into a JS-side analytics curve. Cached on
 * the proxy instance via a `Symbol`; invalidated when the proxy's
 * `__paramVersion` counter bumps.
 */
export function toVerb(curve: Curve3D): NurbsCurve {
  const carrier = curve as unknown as CacheCarrier;
  const live = carrier[PARAM_VERSION] ?? 0;
  const cached = carrier[VERB_CACHE];
  if (cached !== undefined && carrier[VERB_VERSION] === live) {
    return cached;
  }

  const md = curve.metadata;
  const controlPoints: Point[] = md.controlPoints.map((p) => [p[0], p[1], p[2]]);
  const degree = md.degree;
  const weights = md.weights;
  const n = controlPoints.length;
  const flatKnots = md.knots !== undefined
    ? md.knots.slice()
    : (() => {
        const { knots, mults } = clampedUniformKnots(n, degree);
        return expandKnots(knots, mults);
      })();

  const built = nurbsJs.geom.NurbsCurve.byKnotsControlPointsWeights(
    degree,
    flatKnots,
    controlPoints,
    weights,
  );

  carrier[VERB_CACHE] = built;
  carrier[VERB_VERSION] = live;
  return built;
}

/**
 * Rebuild a JS-side analytics curve as an OCCT-backed `replicad.Edge`
 * wrapping a `Geom_BSplineCurve`. Mirrors the ctor selection from
 * `pathNurbsLowerer.buildNurbsSegmentEdge` (Geom_BSplineCurve_1 for the
 * non-rational case, _2 for rational).
 *
 * Throws `KernelError('feature.nurbs.bridge-conversion-failed')` when the
 * kernel rejects the knot vector (typically: non-monotonic, or interior
 * multiplicity > degree + 1).
 */
export function fromVerb(verbCurve: NurbsCurve): replicad.Edge {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const data: NurbsCurveData = verbCurve.asNurbs();
  const degree = data.degree;
  const homogeneous = data.controlPoints;

  // The analytics module returns control points in homogeneous form: rows
  // are [x*w, y*w, z*w, w] for rational curves; non-rational curves still
  // carry the trailing w=1. A row is "rational" when w !== 1; we treat the
  // ANY-non-unit-weight case as rational.
  const isRational = homogeneous.some((row) => row.length >= 4 && row[3] !== 1);

  const cpArray = new oc.TColgp_Array1OfPnt_2(1, homogeneous.length);
  const wArray = isRational ? new oc.TColStd_Array1OfReal_2(1, homogeneous.length) : null;
  for (let i = 0; i < homogeneous.length; i++) {
    const w = homogeneous[i].length >= 4 ? homogeneous[i][3] : 1;
    const x = homogeneous[i][0] / w;
    const y = homogeneous[i][1] / w;
    const z = homogeneous[i][2] / w;
    cpArray.SetValue(i + 1, new oc.gp_Pnt_3(x, y, z));
    if (wArray) wArray.SetValue(i + 1, w);
  }

  const decomposed = decomposeKnots(data.knots);
  const kArray = new oc.TColStd_Array1OfReal_2(1, decomposed.knots.length);
  const mArray = new oc.TColStd_Array1OfInteger_2(1, decomposed.mults.length);
  for (let i = 0; i < decomposed.knots.length; i++) {
    kArray.SetValue(i + 1, decomposed.knots[i]);
    mArray.SetValue(i + 1, decomposed.mults[i]);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let bspline: any;
  try {
    bspline = isRational
      ? new oc.Geom_BSplineCurve_2(cpArray, wArray, kArray, mArray, degree, false, false)
      : new oc.Geom_BSplineCurve_1(cpArray, kArray, mArray, degree, false);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const knotPreview = data.knots.slice(0, 8).map((k) => k.toFixed(6)).join(', ');
    throw new KernelError(
      'feature.nurbs.bridge-conversion-failed',
      `nurbs.bridge: JS→kernel conversion failed for a degree-${degree} curve with ${homogeneous.length} control points and knot vector [${knotPreview}${data.knots.length > 8 ? ', ...' : ''}]; the kernel rejected the knot vector with: ${msg}`,
      undefined,
      'Re-author the curve with explicit knots the kernel accepts (non-decreasing; multiplicity ≤ degree+1 at interior; multiplicity = degree+1 at clamped ends). The default clamped-uniform knot vector always works.',
    );
  }

  const handle = new oc.Handle_Geom_Curve_2(bspline);
  const edgeBuilder = new oc.BRepBuilderAPI_MakeEdge_24(handle);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new (replicad as any).Edge(edgeBuilder.Edge());
}

/**
 * Convert a kernelCAD `SurfaceProxy` into a JS-side analytics surface.
 *
 * V3 scope is the bare minimum needed for the `Curve3D.analytics.intersect`
 * curve-surface overload: only `kind: 'nurbsSurface'` SurfaceRecords are
 * supported because their NURBS data is captured directly in the session.
 * Coons-patch (`surfaceFromBoundary`) and lofted (`surfaceFromCurves`)
 * surfaces are built kernel-side via OCCT; extracting their NURBS
 * representation back into JS would require a Geom_Surface → Geom_BSplineSurface
 * conversion + pole/knot extraction pass that does not exist today. Those
 * kinds throw `feature.curve3d.analytics.intersect-kernel-failed` upstream.
 *
 * Plan-vs-reality: the original plan stub assumed a `metadata` field on
 * `SurfaceProxy` that does not exist. The proxy holds only the surface id
 * + a session reference; this implementation routes through the session
 * via `__getRecord()` and reads the NurbsSurfaceData payload directly.
 * Coons-patch support is deferred until either the kernel exposes a
 * Geom_BSplineSurface extraction helper or `kind: 'coonsPatch'` records
 * grow a JS-accessible NURBS representation.
 */
export function surfaceProxyToVerb(surface: SurfaceProxy): NurbsSurface {
  const record = surface.__getRecord();
  if (record === undefined) {
    throw new KernelError(
      'feature.curve3d.analytics.intersect-kernel-failed',
      `surfaceProxyToVerb: SurfaceRecord ${surface.id} not found on the capture session; cannot route to the JS analytics module.`,
      undefined,
      'Re-author the surface inside the same capture session as the curve operand, or call the analytics method from the script that built the surface.',
    );
  }
  if (record.data.kind !== 'nurbsSurface') {
    throw new KernelError(
      'feature.curve3d.analytics.intersect-kernel-failed',
      `surfaceProxyToVerb: SurfaceRecord ${surface.id} has kind '${record.data.kind}' which does not expose JS-side NURBS data. Only nurbsSurface()-authored surfaces are supported by the V3 intersect path.`,
      undefined,
      'Author the operand via kc.nurbsSurface({ controls, degree, knots? }); Coons-patch (surfaceFromBoundary) and lofted (surfaceFromCurves) surfaces will be supported in v2 of the spec once the kernel exposes a Geom_BSplineSurface extraction helper.',
    );
  }
  const data = record.data;
  const nU = data.controls.length;
  const nV = data.controls[0]?.length ?? 0;
  if (nU === 0 || nV === 0) {
    throw new KernelError(
      'feature.curve3d.analytics.intersect-kernel-failed',
      `surfaceProxyToVerb: SurfaceRecord ${surface.id} has an empty control grid (${nU} x ${nV}).`,
      undefined,
      'Author the surface with a non-empty rectangular Vec3 grid.',
    );
  }
  const knotsU = data.knots?.u !== undefined
    ? data.knots.u.slice()
    : (() => {
        const { knots, mults } = clampedUniformKnots(nU, data.degree.u);
        return expandKnots(knots, mults);
      })();
  const knotsV = data.knots?.v !== undefined
    ? data.knots.v.slice()
    : (() => {
        const { knots, mults } = clampedUniformKnots(nV, data.degree.v);
        return expandKnots(knots, mults);
      })();
  const controls: Point[][] = data.controls.map((row) =>
    row.map((p) => [p[0], p[1], p[2]] as Point),
  );
  return nurbsJs.geom.NurbsSurface.byKnotsControlPointsWeights(
    data.degree.u,
    data.degree.v,
    knotsU,
    knotsV,
    controls,
    data.weights,
  );
}
