import type { FeatureId, PlaneSpec } from '../intent/types';
import { isValidVec3, isValidScaleSpec, isValidPlaneSpec } from '../intent/types';
import { KernelError } from '../intent/kernelError';
import type { CaptureSession } from './captureSession';
import type { EdgeQuery, FaceQuery, EdgeSegment } from '../backends/occt/edgeQueries';

type CanonicalFace = 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back';

export type EdgeSelector =
  | EdgeQuery
  | EdgeSegment
  | EdgeSegment[]
  | { face: CanonicalFace | string }
  | undefined;

export type FaceSelector =
  | FaceQuery
  | { face: CanonicalFace | string };

/**
 * IMPORTANT — drift sentinel contract:
 * Adding a public method to `Sketch`, `PathBuilder`, or `Shape` requires
 * also updating `src/mcp/tools/listApi.ts` (in `SKETCH_METHODS`,
 * `PATH_BUILDER_METHODS`, or `SHAPE_METHODS` respectively). The drift
 * sentinel test at `tests/integration/mcp/listApi.driftSentinel.test.ts`
 * fails CI when `Object.getOwnPropertyNames(<Class>.prototype)` doesn't
 * match the advertised array. This guards agent discoverability — methods
 * not in `list_api` are invisible to MCP clients.
 */
export class Shape {
  readonly id: FeatureId;
  private session: CaptureSession;

  // Lazy lowered backend — cached per-Shape so consecutive selectEdges /
  // selectEdge calls don't re-run RecomputeEngine.run() against the full
  // record list. Invalidated by record-count growth (capture is append-only,
  // so length growth is the only signal we need today).
  private _loweredBackend?: import('../backends/occt/occtBackend').OcctBackend;
  private _loweredAtRecordCount?: number;
  private _loweredAtTransformCount?: number;

  constructor(id: FeatureId, session: CaptureSession) {
    this.id = id;
    this.session = session;
  }

  translate(x: number, y: number, z: number): Shape {
    if (!isValidVec3([x, y, z])) {
      const err = new KernelError(
        'feature.transform.invalid-translate',
        `Translate vector must be three finite numbers; got [${x}, ${y}, ${z}].`,
      );
      err.featureId = this.id;
      throw err;
    }
    this.session.appendTransform(this.id, { op: 'translate', x, y, z });
    return this;
  }

  rotate(axis: [number, number, number], degrees: number, pivot?: [number, number, number]): Shape {
    if (!isValidVec3(axis) || typeof degrees !== 'number' || !Number.isFinite(degrees)) {
      const err = new KernelError(
        'feature.transform.invalid-rotate',
        `Rotate axis must be a finite Vec3 and degrees must be a finite number; got axis=${JSON.stringify(axis)}, degrees=${degrees}.`,
      );
      err.featureId = this.id;
      throw err;
    }
    if (pivot !== undefined && !isValidVec3(pivot)) {
      const err = new KernelError(
        'feature.transform.invalid-rotate',
        `Rotate pivot (when provided) must be a finite Vec3; got ${JSON.stringify(pivot)}.`,
      );
      err.featureId = this.id;
      throw err;
    }
    this.session.appendTransform(this.id, { op: 'rotateAxis', axis, degrees, pivot });
    return this;
  }

  scale(sx: number, sy?: number, sz?: number): Shape {
    const scaleSpec = (sy !== undefined || sz !== undefined)
      ? [sx, sy ?? sx, sz ?? sx] as [number, number, number]
      : sx;
    if (!isValidScaleSpec(scaleSpec)) {
      const err = new KernelError(
        'feature.transform.invalid-scale',
        `Scale factor must be a positive finite number, or a Vec3 of three positive finite numbers; got ${JSON.stringify(scaleSpec)}.`,
      );
      err.featureId = this.id;
      throw err;
    }
    this.session.appendTransform(this.id, {
      op: 'scale',
      sx,
      sy: sy ?? sx,
      sz: sz ?? sx,
    });
    return this;
  }

  reflect(plane: PlaneSpec): Shape {
    if (!isValidPlaneSpec(plane)) {
      const err = new KernelError(
        'feature.transform.invalid-reflect',
        `Reflect plane must be 'xy' | 'xz' | 'yz' or { plane: '<cardinal>', offset?: number }; got ${JSON.stringify(plane)}.`,
      );
      err.featureId = this.id;
      throw err;
    }
    this.session.appendTransform(this.id, { op: 'reflect', plane });
    return this;
  }

  mirror(plane: PlaneSpec): Shape {
    if (!isValidPlaneSpec(plane)) {
      const err = new KernelError(
        'feature.mirror.invalid-plane',
        `Mirror plane must be 'xy' | 'xz' | 'yz' or { plane: '<cardinal>', offset?: number }; got ${JSON.stringify(plane)}.`,
      );
      err.featureId = this.id;
      throw err;
    }
    return this.session.mirrorFeature(this, plane);
  }

  subtract(...others: Shape[]): Shape {
    return this.session.boolean('difference', this, others);
  }

  union(...others: Shape[]): Shape {
    return this.session.boolean('union', this, others);
  }

  intersect(...others: Shape[]): Shape {
    return this.session.boolean('intersection', this, others);
  }

  // Single-radius form (rc.6 — unchanged).
  fillet(radius: number, edges?: EdgeSelector): Shape;
  // Variable-radius form (rc.11).
  fillet(groups: Array<{ edges: EdgeSelector; radius: number }>): Shape;
  fillet(
    radiusOrGroups: number | Array<{ edges: EdgeSelector; radius: number }>,
    edges?: EdgeSelector,
  ): Shape {
    if (typeof radiusOrGroups === 'number') {
      return this.session.edgeFeature('fillet', this, 'radius', radiusOrGroups, edges);
    }
    return this.session.variableEdgeFeature('fillet', this, 'radius', radiusOrGroups);
  }

  // Single-distance form (rc.6 — unchanged).
  chamfer(distance: number, edges?: EdgeSelector): Shape;
  // Variable-distance form (rc.11).
  chamfer(groups: Array<{ edges: EdgeSelector; distance: number }>): Shape;
  chamfer(
    distanceOrGroups: number | Array<{ edges: EdgeSelector; distance: number }>,
    edges?: EdgeSelector,
  ): Shape {
    if (typeof distanceOrGroups === 'number') {
      return this.session.edgeFeature('chamfer', this, 'distance', distanceOrGroups, edges);
    }
    return this.session.variableEdgeFeature('chamfer', this, 'distance', distanceOrGroups);
  }

  shell(thickness: number, opts: { face: FaceSelector | CanonicalFace | string }): Shape {
    return this.session.edgeFeature('shell', this, 'thickness', thickness, { face: opts.face });
  }

  /**
   * Lower this Shape eagerly — runs recompute against the records up to and
   * including this Shape, returns the resulting OcctBackend so script-runtime
   * helpers like `selectEdges` can introspect the lowered geometry.
   *
   * Most agents won't call this directly. It's invoked implicitly when an
   * agent calls `selectEdges(myShape, ...)` from a `.kcad.ts` script.
   */
  async lower(): Promise<import('../backends/occt/occtBackend').OcctBackend> {
    const records = this.session.getRecords();
    // C1 fix: cache invalidates on either record-count growth OR a transform
    // appended to THIS shape. `appendTransform` mutates `record.transforms`
    // in place — `records.length` is unchanged after Shape.translate/rotate/scale.
    // Without the transform-count check, the cache returns the un-transformed
    // backend after a transform, producing silent incorrect results.
    const ownRecord = records.find(r => r.id === this.id);
    const transformCount = ownRecord?.transforms.length ?? 0;
    if (
      this._loweredBackend &&
      this._loweredAtRecordCount === records.length &&
      this._loweredAtTransformCount === transformCount
    ) {
      return this._loweredBackend;
    }
    const { RecomputeEngine } = await import('../compute/recomputeEngine');
    const { OcctLowerer } = await import('../backends/occt/occtLowerer');
    const { OcctBackend, initOcct } = await import('../backends/occt/occtBackend');
    await initOcct();
    const engine = new RecomputeEngine(new OcctLowerer());
    const r = await engine.run(records as readonly import('../intent/featureRecord').FeatureRecord[]);
    const shape = r.shapes.get(this.id);
    if (!shape) {
      throw new Error(`Shape.lower(): shape '${this.id}' not lowered (check upstream diagnostics).`);
    }
    if (!(shape instanceof OcctBackend)) {
      throw new Error(`Shape.lower(): shape '${this.id}' is not an OcctBackend.`);
    }
    this._loweredBackend = shape;
    this._loweredAtRecordCount = records.length;
    this._loweredAtTransformCount = transformCount;
    return shape;
  }
}
