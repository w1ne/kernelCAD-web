import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { FeatureKind, Vec3 } from '../../shared/intent/types';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import type { RuntimeMesh } from './runtimeMesh';

// BackendTarget moved to shared/types/backendTarget so shared/diagnostics can
// depend on it without breaking shared-stays-leaf. Re-exported here for
// backwards compatibility with existing kernel-internal consumers.
import type { BackendTarget } from '../../shared/types/backendTarget';
export { BACKEND_TARGETS } from '../../shared/types/backendTarget';
export type { BackendTarget };

export interface ShapeBackend {
  readonly target: BackendTarget;
  translate(x: number, y: number, z: number): ShapeBackend;
  rotate(axis: Vec3, degrees: number, pivot?: Vec3): ShapeBackend;
  scale(s: number | Vec3): ShapeBackend;
  union(other: ShapeBackend): ShapeBackend;
  subtract(other: ShapeBackend): ShapeBackend;
  intersect(other: ShapeBackend): ShapeBackend;
  splitByPlane(normal: Vec3, offset: number): [ShapeBackend, ShapeBackend];
  boundingBox(): { min: Vec3; max: Vec3 };
  volume(): number;
  surfaceArea(): number;
  isEmpty(): boolean;
  getMesh(): RuntimeMesh;
  exportSTL(): Uint8Array;
  exportSTEP(): Uint8Array;
  exportBREP?(): Uint8Array;
  dispose?(): void;
}

export interface ResolvedInputs {
  byKey: Record<string, ShapeBackend>;
  /**
   * Read-only access to the full record list. Used by lowerers that need to
   * walk upstream features (e.g. label resolution that walks back to the
   * sketch). Optional because lowerers without that need don't pay for it.
   */
  records?: readonly FeatureRecord[];
  /**
   * W1.3 NURBS: per-record map of resolved surfaces keyed by SurfaceId.
   * Populated by the recompute engine for `surfaceThicken` / `surfaceToShape`
   * records that have a `{ kind: 'surface' }` input ref. Values are
   * `BuiltSurface` (either a single Replicad Face for `nurbsSurface` or a
   * multi-face shell for `surfaceFromCurves`). Optional — most lowerers
   * never read it.
   */
  surfaces?: Map<
    import('../../shared/intent/surfaceRecord').SurfaceId,
    import('./occt/nurbsSurfaceLowerer').BuiltSurface
  >;
}

export interface LowerResult {
  shape: ShapeBackend;
  diagnostics: CompilerDiagnostic[];
}

export interface FeatureLowerer {
  readonly target: BackendTarget;
  readonly supports: ReadonlySet<FeatureKind>;
  lower(record: FeatureRecord, inputs: ResolvedInputs): Promise<LowerResult>;
}

// Lowerer dispatch return type. Most features lower to a single ShapeBackend;
// solvedAssembly and assemblyModel lower to a SceneBackend (multi-body, no
// union). Consumers downstream (meshing, exporters) discriminate via the
// `_kind: 'scene'` marker on SceneBackend (see isSceneBackend type guard).
export type LoweringResult = ShapeBackend | import('./sceneBackend').SceneBackend;
