// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/capture/curveAnalyticsProxy.ts
//
// JS-side analytics surface for Curve3D. All methods delegate to the
// vendored NURBS analytics module via the curveBridge; bridge / solver
// errors are wrapped in KernelError. Authoritative geometry stays in
// OCCT — these methods return data (Vec3[], numbers) without round-
// tripping through the kernel.

import type {
  Curve3D,
  Curve3DAnalytics,
  CurveLengthSample,
  CurveCurveIntersection,
  CurveSurfaceIntersection,
} from './curveProxy';
import type { SurfaceProxy } from './surfaceProxy';
import type { Vec3 } from '../../shared/intent/types';
import { KernelError } from '../../shared/intent/kernelError';
import { toVerb, surfaceProxyToVerb } from '../../kernel/backends/verb/curveBridge';
import nurbsJs from 'verb-nurbs';
import type { NurbsCurve } from 'verb-nurbs';

const DEFAULT_TESSELLATE_TOL = 0.05; // mm, matches the K1 mesh-discretisation gate
const DEFAULT_CLOSEST_TOL = 1e-3; // mm
const DEFAULT_INTERSECT_TOL = 1e-3; // mm; matches the verb solver default

/**
 * Structural sniff for the curve-curve intersect overload. A `Curve3D`
 * carries an `analytics` namespace and a `pointAt` evaluator; `SurfaceProxy`
 * carries neither (it has `id` + `__getRecord`). Sufficient to disambiguate
 * the overload at runtime without leaning on a class-identity check.
 */
function isCurve3D(x: unknown): x is Curve3D {
  return (
    typeof x === 'object' &&
    x !== null &&
    'analytics' in x &&
    'pointAt' in (x as object)
  );
}

/**
 * Extract the verb curve's intrinsic parameter range `[u0, u1]` from its
 * knot vector. For curves built via the default clamped-uniform path this
 * is `[0, 1]`; for user-supplied non-uniform knots it can be arbitrary.
 *
 * The Curve3D public domain is always `[0, 1]` (see `Curve3D.domain()`);
 * we map verb's intrinsic `u` into that normalised range here.
 */
function verbDomain(curve: NurbsCurve): [number, number] {
  const knots = curve.knots();
  return [knots[0], knots[knots.length - 1]];
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function wrapKernelFailure<T>(method: string, fn: () => T): T {
  try {
    return fn();
  } catch (e) {
    if (e instanceof KernelError) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    throw new KernelError(
      'feature.curve3d.analytics.kernel-failed',
      `Curve3D.analytics.${method}: kernel-failed — ${msg}`,
      undefined,
      'Inspect the curve via .sample(10) and .length(); if the curve is degenerate, re-author it. If valid, file an issue with the .kcad.ts repro.',
    );
  }
}

export class Curve3DAnalyticsImpl implements Curve3DAnalytics {
  private readonly curve: Curve3D;

  constructor(curve: Curve3D) {
    this.curve = curve;
  }

  closestPoint(pt: Vec3, opts?: { tolerance?: number }): Vec3 {
    return wrapKernelFailure('closestPoint', () => {
      const v = toVerb(this.curve);
      const result = v.closestPoint([pt[0], pt[1], pt[2]]);
      // The JS analytics module does not surface non-convergence as an
      // error — it returns a best-effort result. Pin the contract: if the
      // returned point is NaN-bearing, surface closest-point-no-converge.
      if (
        !Number.isFinite(result[0]) ||
        !Number.isFinite(result[1]) ||
        !Number.isFinite(result[2])
      ) {
        throw new KernelError(
          'feature.curve3d.analytics.closest-point-no-converge',
          `Curve3D.analytics.closestPoint: solver returned non-finite coordinates for query [${pt.join(', ')}] (tolerance ${opts?.tolerance ?? DEFAULT_CLOSEST_TOL} mm). The curve may be degenerate or the query may be outside the curve domain.`,
          this.curve.id,
          'Sample via .tessellate() and pick the nearest polyline vertex as a coarse fallback; or loosen tolerance.',
        );
      }
      return [result[0], result[1], result[2]] as Vec3;
    });
  }

  closestParam(pt: Vec3, opts?: { tolerance?: number }): number {
    return wrapKernelFailure('closestParam', () => {
      const v = toVerb(this.curve);
      const u = v.closestParam([pt[0], pt[1], pt[2]]);
      if (!Number.isFinite(u)) {
        throw new KernelError(
          'feature.curve3d.analytics.closest-point-no-converge',
          `Curve3D.analytics.closestParam: solver returned non-finite t for query [${pt.join(', ')}] (tolerance ${opts?.tolerance ?? DEFAULT_CLOSEST_TOL} mm).`,
          this.curve.id,
          'Sample via .tessellate() and pick the nearest polyline vertex as a coarse fallback; or loosen tolerance.',
        );
      }
      // Map verb's intrinsic [u0, u1] to the public [0, 1] domain.
      const [u0, u1] = verbDomain(v);
      return clamp01((u - u0) / (u1 - u0));
    });
  }

  divideByEqualArcLength(n: number): CurveLengthSample[] {
    if (!Number.isInteger(n) || n < 1) {
      throw new KernelError(
        'feature.curve3d.analytics.degenerate-arclength',
        `Curve3D.analytics.divideByEqualArcLength: n must be a positive integer; got ${n}.`,
        this.curve.id,
        'Pass a positive integer for n. The result contains n+1 samples (start, intermediate, end).',
      );
    }
    return wrapKernelFailure('divideByEqualArcLength', () => {
      const v = toVerb(this.curve);
      const totalLen = v.length();
      if (totalLen < 1e-9) {
        throw new KernelError(
          'feature.curve3d.analytics.degenerate-arclength',
          `Curve3D.analytics.divideByEqualArcLength: curve length is ${totalLen} mm (< 1e-9); cannot divide a degenerate curve.`,
          this.curve.id,
          'Re-author the curve — the control net is likely collapsed or coincident.',
        );
      }
      const samples = v.divideByEqualArcLength(n);
      const [u0, u1] = verbDomain(v);
      const domain = u1 - u0;
      // The JS module returns samples carrying only { u, len } — NO point
      // coordinate. Materialise the world-space point via `v.point(u)`.
      // Our public contract is n+1 samples including both endpoints. The JS
      // module's first sample is already at u=u0 (the start); we de-dupe and
      // append the end endpoint if the last interval did not already land
      // there.
      const result: CurveLengthSample[] = [];
      for (const s of samples) {
        const p = v.point(s.u);
        result.push({
          t: clamp01((s.u - u0) / domain),
          pt: [p[0], p[1], p[2]] as Vec3,
          arcLength: s.len,
        });
      }
      // Endpoint normalisation. The JS algorithm seeds the first sample at
      // `u = curve.knots[0]` (`len = 0`) and pushes samples at `lc =
      // inc, 2*inc, ..., n*inc` while `lc <= totalLen + EPSILON`. In
      // practice we receive `n + 1` entries; the final sample's `u` is
      // computed by Newton-Raphson and lands within ~1e-7 of `u_end`, so
      // we snap it exactly to t=1 (and likewise t=0 at the start) rather
      // than appending a duplicate endpoint.
      if (result.length > 0) {
        // Snap first to exactly t=0 / arcLength=0 if within tolerance.
        if (Math.abs(result[0].t) < 1e-6) {
          result[0] = {
            t: 0,
            pt: this.curve.pointAt(0),
            arcLength: 0,
          };
        } else {
          result.unshift({ t: 0, pt: this.curve.pointAt(0), arcLength: 0 });
        }
        // Snap last to exactly t=1 / arcLength=totalLen if within tolerance.
        const last = result[result.length - 1];
        if (Math.abs(last.t - 1) < 1e-6) {
          result[result.length - 1] = {
            t: 1,
            pt: this.curve.pointAt(1),
            arcLength: totalLen,
          };
        } else {
          result.push({ t: 1, pt: this.curve.pointAt(1), arcLength: totalLen });
        }
      } else {
        result.push({ t: 0, pt: this.curve.pointAt(0), arcLength: 0 });
        result.push({ t: 1, pt: this.curve.pointAt(1), arcLength: totalLen });
      }
      return result;
    });
  }

  divideByArcLength(arcLength: number): CurveLengthSample[] {
    if (!Number.isFinite(arcLength) || arcLength <= 0) {
      throw new KernelError(
        'feature.curve3d.analytics.degenerate-arclength',
        `Curve3D.analytics.divideByArcLength: arcLength must be a positive finite number in mm; got ${arcLength}.`,
        this.curve.id,
        'Pass a positive finite arcLength less than the curve total length().',
      );
    }
    return wrapKernelFailure('divideByArcLength', () => {
      const v = toVerb(this.curve);
      const L = v.length();
      if (arcLength > L) {
        throw new KernelError(
          'feature.curve3d.analytics.degenerate-arclength',
          `Curve3D.analytics.divideByArcLength: arcLength ${arcLength} mm exceeds curve total length ${L} mm.`,
          this.curve.id,
          'Pass an arcLength less than length(). For a single midpoint, use length()/2.',
        );
      }
      const samples = v.divideByArcLength(arcLength);
      const [u0, u1] = verbDomain(v);
      const domain = u1 - u0;
      // Materialise pt via v.point(u) — see divideByEqualArcLength for the
      // reasoning. The JS sample only carries { u, len }.
      return samples.map((s) => {
        const p = v.point(s.u);
        return {
          t: clamp01((s.u - u0) / domain),
          pt: [p[0], p[1], p[2]] as Vec3,
          arcLength: s.len,
        };
      });
    });
  }

  derivatives(t: number, numDerivs: number = 2): Vec3[] {
    // Per V1: Curve3DMetadata.degree is a plain `number`, NOT an Editable —
    // no `.evaluated` access.
    const degree = this.curve.metadata.degree;
    if (!Number.isInteger(numDerivs) || numDerivs < 1) {
      throw new KernelError(
        'feature.curve3d.analytics.derivatives-out-of-range',
        `Curve3D.analytics.derivatives: numDerivs must be a positive integer; got ${numDerivs}.`,
        this.curve.id,
        'Pass a positive integer for numDerivs (typically 1 for tangent, 2 for curvature).',
      );
    }
    if (numDerivs > degree) {
      throw new KernelError(
        'feature.curve3d.analytics.derivatives-out-of-range',
        `Curve3D.analytics.derivatives: requested ${numDerivs} derivatives but curve degree is ${degree}; derivatives above order ${degree} are zero by construction.`,
        this.curve.id,
        `Lower numDerivs to <= ${degree}.`,
      );
    }
    return wrapKernelFailure('derivatives', () => {
      const v = toVerb(this.curve);
      const [u0, u1] = verbDomain(v);
      const u = u0 + clamp01(t) * (u1 - u0);
      const derivs = v.derivatives(u, numDerivs);
      return derivs.map((d) => [d[0], d[1], d[2]] as Vec3);
    });
  }

  tessellate(opts?: { tolerance?: number }): Vec3[] {
    const tol = opts?.tolerance ?? DEFAULT_TESSELLATE_TOL;
    if (!Number.isFinite(tol) || tol <= 0) {
      throw new KernelError(
        'feature.curve3d.analytics.tessellation-tolerance-invalid',
        `Curve3D.analytics.tessellate: tolerance must be a positive finite number in mm; got ${tol}.`,
        this.curve.id,
        'Pass a tolerance in mm (default 0.05; viewport-grade typically 0.01–0.5).',
      );
    }
    return wrapKernelFailure('tessellate', () => {
      const v = toVerb(this.curve);
      // The vendored adaptive-tessellation algorithm calls `Math.random()`
      // to perturb the midpoint of each refinement step, which would make
      // two consecutive calls produce different polylines. Agents must be
      // able to compare tessellations across runs (round-trip tests, eval
      // gates), so we seed `Math.random` with a deterministic mulberry32
      // stream for the duration of the call and restore the global after.
      const originalRandom = Math.random;
      Math.random = mulberry32(0xc0ffee);
      let points;
      try {
        points = v.tessellate(tol);
      } finally {
        Math.random = originalRandom;
      }
      return points.map((p) => [p[0], p[1], p[2]] as Vec3);
    });
  }

  /**
   * Curve-curve and curve-surface geometric intersection (overload pair).
   *
   * The vendored solver's curve bounding-box tree calls `Math.random()`
   * inside `LazyCurveBoundingBoxTree.split()` to perturb the split point
   * — both `Intersect.curves` and `Intersect.curveAndSurface` traverse
   * this code path, so deterministic output requires seeding the global
   * PRNG for the duration of the call (mirrors the `tessellate` pattern).
   * `LazySurfaceBoundingBoxTree.split()` does NOT use random, but the
   * curve tree is the load-bearing source of non-determinism in the
   * curve-surface case as well.
   */
  intersect(other: Curve3D, opts?: { tolerance?: number }): CurveCurveIntersection[];
  intersect(other: SurfaceProxy, opts?: { tolerance?: number }): CurveSurfaceIntersection[];
  intersect(
    other: Curve3D | SurfaceProxy,
    opts?: { tolerance?: number },
  ): CurveCurveIntersection[] | CurveSurfaceIntersection[] {
    const tol = opts?.tolerance ?? DEFAULT_INTERSECT_TOL;
    if (isCurve3D(other)) {
      return this._intersectCurve(other, tol);
    }
    return this._intersectSurface(other, tol);
  }

  private _intersectCurve(other: Curve3D, tol: number): CurveCurveIntersection[] {
    const selfCurve = toVerb(this.curve);
    const otherCurve = toVerb(other);
    const otherKnots = otherCurve.knots();
    const [otherU0, otherU1] = [otherKnots[0], otherKnots[otherKnots.length - 1]];
    const selfKnots = selfCurve.knots();
    const [selfU0, selfU1] = [selfKnots[0], selfKnots[selfKnots.length - 1]];
    const selfDomain = selfU1 - selfU0;
    const otherDomain = otherU1 - otherU0;
    let hits;
    const originalRandom = Math.random;
    Math.random = mulberry32(0xc0ffee);
    try {
      hits = nurbsJs.geom.Intersect.curves(selfCurve, otherCurve, tol);
    } catch (e) {
      if (e instanceof KernelError) throw e;
      const msg = e instanceof Error ? e.message : String(e);
      throw new KernelError(
        'feature.curve3d.analytics.intersect-kernel-failed',
        `Curve3D.analytics.intersect (curve-curve): kernel-failed — ${msg}`,
        this.curve.id,
        'Loosen tolerance (default 1e-3; try 1e-2 for visibly-crossing curves with rough endpoints); or inspect both operands via .sample(20) to verify they are well-formed.',
      );
    } finally {
      Math.random = originalRandom;
    }
    return hits.map((h) => ({
      tA: clamp01((h.u0 - selfU0) / selfDomain),
      tB: clamp01((h.u1 - otherU0) / otherDomain),
      ptA: [h.point0[0], h.point0[1], h.point0[2]] as Vec3,
      ptB: [h.point1[0], h.point1[1], h.point1[2]] as Vec3,
      distance: Math.hypot(
        h.point0[0] - h.point1[0],
        h.point0[1] - h.point1[1],
        h.point0[2] - h.point1[2],
      ),
    }));
  }

  private _intersectSurface(
    other: SurfaceProxy,
    tol: number,
  ): CurveSurfaceIntersection[] {
    const selfCurve = toVerb(this.curve);
    // surfaceProxyToVerb throws intersect-kernel-failed directly for
    // unsupported surface kinds; let it propagate.
    const surfaceVerb = surfaceProxyToVerb(other);
    const selfKnots = selfCurve.knots();
    const [selfU0, selfU1] = [selfKnots[0], selfKnots[selfKnots.length - 1]];
    const selfDomain = selfU1 - selfU0;
    let hits;
    const originalRandom = Math.random;
    Math.random = mulberry32(0xc0ffee);
    try {
      hits = nurbsJs.geom.Intersect.curveAndSurface(selfCurve, surfaceVerb, tol);
    } catch (e) {
      if (e instanceof KernelError) throw e;
      const msg = e instanceof Error ? e.message : String(e);
      throw new KernelError(
        'feature.curve3d.analytics.intersect-kernel-failed',
        `Curve3D.analytics.intersect (curve-surface): kernel-failed — ${msg}`,
        this.curve.id,
        'Loosen tolerance; or inspect both operands via .sample(20) (curve) and a sample grid on the surface.',
      );
    } finally {
      Math.random = originalRandom;
    }
    // verb.core.CurveSurfaceIntersection ships `{ u, uv: [u, v],
    // curvePoint, surfacePoint }` at runtime — see verb.es.js line 2626 /
    // 5869. Normalise to the public `{ tCurve, uv: { u, v }, pt }` shape.
    return hits.map((h) => ({
      tCurve: clamp01((h.u - selfU0) / selfDomain),
      uv: { u: h.uv[0], v: h.uv[1] },
      pt: [h.curvePoint[0], h.curvePoint[1], h.curvePoint[2]] as Vec3,
    }));
  }
}

/**
 * Mulberry32 — a 32-bit deterministic PRNG. Used to swap out `Math.random`
 * for the duration of a `tessellate()` call so the vendored adaptive
 * algorithm produces bit-identical output across calls.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
