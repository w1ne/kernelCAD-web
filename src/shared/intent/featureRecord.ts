import type {
  CanonicalFace, FeatureId, FeatureKind, FeatureRef, Param, PlaneSpec, ScriptLocation, Vec3Param,
} from './types';
// Re-export so consumers can import CanonicalFace from the same module as FaceLabelsMap.
export type { CanonicalFace };
import type { FaceQuery } from './queryTypes';
import type { PBRMaterial } from './material';

export type ShapeTransform =
  | { op: 'translate'; vec: Vec3Param }
  | { op: 'rotateAxis'; axis: Vec3Param; degrees: Param; pivot?: Vec3Param }
  | { op: 'scale'; sx: number; sy: number; sz: number }
  | { op: 'reflect'; plane: PlaneSpec };

/** Map of user-chosen label → resolution target. Stored under
 *  FeatureRecord.metadata.faceLabels for kinds that accept it (box, cylinder,
 *  extrude, revolve, sweep, loft). Sphere rejects this key at capture time. */
export type FaceLabelsMap = Record<string, CanonicalFace | FaceQuery>;

export interface FeatureMetadata {
  /** Hex color or CSS color string applied to this feature's mesh. */
  color?: string;
  /** Face-label map for features that support canonical-face naming. */
  faceLabels?: FaceLabelsMap;
  /** PBR material applied by `Shape.material()`. Identity dies at booleans. */
  material?: PBRMaterial;
  /** true for capture-graph nodes that produce no OcctBackend geometry
   *  (referenceImage today; future construction-only feature kinds may set this). */
  virtual?: boolean;
  /**
   * When true, the auto-framer/camera-fit ignores this feature's bbox when
   * computing camera position. Useful for parts that extend the natural
   * silhouette far beyond the "main" form (eyewear temples, decorative
   * spires, etc.) where including them tanks framing.
   *
   * Read by `meshFeaturesPerFeature` (skips the feature's vertices when
   * aggregating scene `bounds`) and the renderer's `loadFeatureMeshes` path
   * (places the geometry in a `__excludedFromCameraFit` group that the
   * `setRenderPose` / `setRenderView` bbox traversal also skips).
   */
  excludeFromCameraFit?: boolean;
  /**
   * Catch-all for feature-kind-specific keys (commands, poses, partIds,
   * bendRecord, etc.) accessed via cast in individual lowerers. Promote a
   * key to a typed field above when it is read by >2 modules or when its
   * shape becomes part of a public API contract.
   *
   * Trade-off: this swallows typos at the call site (`metadata.materail`
   * would compile and return `unknown`). New typed fields above catch them.
   */
  [key: string]: unknown;
}

export interface FeatureRecord {
  id: FeatureId;
  kind: FeatureKind;
  inputs: Record<string, FeatureRef>;
  params: Record<string, Param>;
  transforms: ShapeTransform[];
  scriptLocation?: ScriptLocation;
  suppressed: boolean;
  metadata?: FeatureMetadata;
}
