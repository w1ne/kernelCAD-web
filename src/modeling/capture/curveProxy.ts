import type { CaptureSession } from './captureSession';
import type { FeatureId, Vec3 } from '../../shared/intent/types';
import type { Curve3DMetadata } from '../../shared/intent/curve3dRecord';
import { KernelError } from '../../shared/intent/kernelError';
import { lazyEvalCurve } from '../backends/occt/curve3dEval';
import { Curve3DAnalyticsImpl } from './curveAnalyticsProxy';

/**
 * Capture-time proxy for a 3D parametric curve produced by `nurbsCurve()`.
 *
 * A `Curve3D` is a NEW peer-type alongside `Shape` and `Surface` — it does
 * NOT implement `ShapeBackend`. The capture-time record (`kind: 'curve3d'`)
 * lowers to a `TopoDS_Edge` backed by `Geom_BSplineCurve`; the edge lives on
 * `session.importedGeometry` keyed by the curve's feature id and is consumed
 * by downstream features (today: `variableSweep`; next slice: `surfaceFromBoundary`).
 *
 * The synchronous evaluation methods (`sample`, `pointAt`, `tangentAt`,
 * `length`) materialize the OCCT edge on first call via `lazyEvalCurve`
 * (`src/modeling/backends/occt/curve3dEval.ts`) and reuse the cached
 * evaluator on subsequent calls. The session must have been initialized
 * with `initOcct()` before any of these methods is called; the evaluator
 * throws a `KernelError('feature.kernel-failed')` if it cannot build the
 * curve (degenerate control net, OCCT internal failure, etc.).
 *
 * Drift-sentinel contract: adding a public method here REQUIRES updating
 * `CURVE3D_METHODS` (TBD) in `src/agent/mcp/tools/listApi.ts` and the
 * drift-sentinel test. Today the proxy is consumed by `variableSweep` —
 * agents can also call the evaluation methods directly for sampling.
 */
export interface Curve3D {
  readonly id: FeatureId;
  readonly metadata: Curve3DMetadata;
  /** Sample `n + 1` evenly-spaced points along the curve in `[0, 1]`. */
  sample(n: number): [number, number, number][];
  /** Point on the curve at parameter `t ∈ [0, 1]` (clamped). */
  pointAt(t: number): [number, number, number];
  /** Unit tangent vector at parameter `t ∈ [0, 1]` (clamped). */
  tangentAt(t: number): [number, number, number];
  /** Total arc length in mm. */
  length(): number;
  /** Parametric domain. Always `[0, 1]` today — the evaluator
   *  normalizes the OCCT first/last knot range internally. */
  domain(): [number, number];

  // V slice — JS-side analytics namespace. Read-only computed queries.
  // Authoritative geometry stays in the kernel; analytics methods return
  // data directly (no round-trip). See ./curveAnalyticsProxy.ts.
  readonly analytics: Curve3DAnalytics;
}

/**
 * Per-sample record returned by `Curve3D.analytics.divideBy*`.
 * - `t` is the normalised domain coordinate in `[0, 1]`.
 * - `pt` is the world-space point at that `t`.
 * - `arcLength` is the accumulated arc length in mm from the curve start.
 */
export interface CurveLengthSample {
  t: number;
  pt: Vec3;
  arcLength: number;
}

/**
 * Read-only computed-query namespace on every `Curve3D`. All methods
 * delegate to the JS analytics module via the curveBridge cache; raw
 * data is returned without a kernel round-trip (geometry stays in OCCT).
 *
 * Errors surface as `KernelError` with `feature.curve3d.analytics.*` codes
 * (see `src/shared/diagnostics/registry.ts`).
 */
export interface Curve3DAnalytics {
  /** Closest point on the curve to `pt` (Newton-Raphson). */
  closestPoint(pt: Vec3, opts?: { tolerance?: number }): Vec3;
  /** Parametric coordinate `t ∈ [0, 1]` of the closest point on the curve. */
  closestParam(pt: Vec3, opts?: { tolerance?: number }): number;
  /** Divide the curve into `n` equal-arc-length segments (returns `n+1` samples). */
  divideByEqualArcLength(n: number): CurveLengthSample[];
  /** Sample the curve every `arcLength` mm starting from `t=0`. */
  divideByArcLength(arcLength: number): CurveLengthSample[];
  /** Evaluate the curve and its first `numDerivs` derivatives at `t ∈ [0, 1]`. */
  derivatives(t: number, numDerivs?: number): Vec3[];
  /** Adaptive polyline approximation of the curve at the given tolerance (mm). */
  tessellate(opts?: { tolerance?: number }): Vec3[];
  // intersect(other) lands in Task V3 — declared there to keep the V2/V3
  // split clean.
}

export class Curve3DProxy implements Curve3D {
  readonly id: FeatureId;
  readonly metadata: Curve3DMetadata;
  readonly analytics: Curve3DAnalytics;
  private readonly session: CaptureSession;

  constructor(id: FeatureId, metadata: Curve3DMetadata, session: CaptureSession) {
    this.id = id;
    this.metadata = metadata;
    this.session = session;
    this.analytics = new Curve3DAnalyticsImpl(this);
  }

  private evaluator() {
    try {
      return lazyEvalCurve(this.session, this.id, this.metadata);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new KernelError(
        'feature.kernel-failed',
        `Curve3D evaluation failed: ${msg}`,
        this.id,
        'kernel-failed — verify nurbsCurve() inputs (control points, degree, weights, knots) and that initOcct() has been called.',
      );
    }
  }

  sample(n: number): [number, number, number][] {
    return this.evaluator().sample(n);
  }
  pointAt(t: number): [number, number, number] {
    return this.evaluator().pointAt(t);
  }
  tangentAt(t: number): [number, number, number] {
    return this.evaluator().tangentAt(t);
  }
  length(): number {
    return this.evaluator().length();
  }
  domain(): [number, number] {
    return [0, 1];
  }
}
