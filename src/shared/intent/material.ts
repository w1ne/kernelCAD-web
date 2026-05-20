/**
 * Physically-based-rendering material spec applied to a Shape at capture time.
 * Mutated onto `FeatureRecord.metadata.material` by `Shape.material()`. The
 * lowerer reads it via `pbrFromMetadata` and emits it on the bridge payload;
 * the renderer constructs a `THREE.MeshPhysicalMaterial`. Numeric fields are
 * clamped to [0, 1] at capture time except `ior` which is clamped to [1.0, 2.5].
 *
 * Identity dies at boolean operations (same convention as `metadata.color`).
 */
import type { TextureSet } from './textureRef';

export interface PBRMaterial {
  baseColor: string;              // CSS color or role token
  metalness?: number;             // 0..1, default 0
  roughness?: number;             // 0..1, default 0.5
  clearcoat?: number;             // 0..1, default 0
  clearcoatRoughness?: number;    // 0..1, default 0.03
  ior?: number;                   // 1.0..2.5, default 1.5
  transmission?: number;          // 0..1, default 0 (>0 enables glass effects)
  sheen?: number;                 // 0..1, default 0
  /** Volume thickness in mm (units convention: world unit = mm). Used by
   *  Three's `MeshPhysicalMaterial.thickness` to attenuate the transmitted
   *  light through the volume. Default 0. Must be non-negative finite. */
  thickness?: number;
  /** Volume attenuation tint (CSS color or role token). Tints transmitted
   *  light. Default `#ffffff` (no tint). */
  attenuationColor?: string;
  /** Mean free path of light through the volume, in mm. Default `Infinity`
   *  (no attenuation). Must be positive finite or `Infinity`. */
  attenuationDistance?: number;
  /** Anisotropy strength in [0, 1] (brushed-metal effect). Default 0. */
  anisotropy?: number;
  /** Anisotropy direction in degrees. Normalized to [0, 360) at capture. */
  anisotropyRotation?: number;
  /** Image-map slots (albedo / normal / roughness / metalness / anisotropy /
   *  emissive). Paths resolved by `src/shared/textures/index.ts` at render
   *  time. */
  textures?: TextureSet;
}

export function isPBRMaterial(value: unknown): value is PBRMaterial {
  if (typeof value !== 'object' || value === null) return false;
  return typeof (value as PBRMaterial).baseColor === 'string';
}
