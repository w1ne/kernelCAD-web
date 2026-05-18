import type { CaptureSession } from './captureSession';
import type { FeatureId } from '../../shared/intent/types';
import type { Curve3DMetadata } from '../../shared/intent/curve3dRecord';
import { KernelError } from '../../shared/intent/kernelError';

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
}

export class Curve3DProxy implements Curve3D {
  constructor(
    public readonly id: FeatureId,
    public readonly metadata: Curve3DMetadata,
    private readonly session: CaptureSession,
  ) {}

  private evaluator() {
    // Dynamic import keeps OCCT off the capture-only hot path and avoids
    // a static cycle (curveProxy -> captureSession -> curveProxy).
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const mod = require('../backends/occt/curve3dEval') as typeof import('../backends/occt/curve3dEval');
    try {
      return mod.lazyEvalCurve(this.session, this.id, this.metadata);
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
