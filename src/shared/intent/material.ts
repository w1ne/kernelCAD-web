/**
 * Physically-based-rendering material spec applied to a Shape at capture time.
 * Mutated onto `FeatureRecord.metadata.material` by `Shape.material()`. The
 * lowerer reads it via `pbrFromMetadata` and emits it on the bridge payload;
 * the renderer constructs a `THREE.MeshPhysicalMaterial`. Numeric fields are
 * clamped to [0, 1] at capture time except `ior` which is clamped to [1.0, 2.5].
 *
 * Identity dies at boolean operations (same convention as `metadata.color`).
 */
export interface PBRMaterial {
  baseColor: string;              // CSS color or role token
  metalness?: number;             // 0..1, default 0
  roughness?: number;             // 0..1, default 0.5
  clearcoat?: number;             // 0..1, default 0
  clearcoatRoughness?: number;    // 0..1, default 0.03
  ior?: number;                   // 1.0..2.5, default 1.5
  transmission?: number;          // 0..1, default 0 (>0 enables glass effects)
  sheen?: number;                 // 0..1, default 0
}

export function isPBRMaterial(value: unknown): value is PBRMaterial {
  if (typeof value !== 'object' || value === null) return false;
  return typeof (value as PBRMaterial).baseColor === 'string';
}
