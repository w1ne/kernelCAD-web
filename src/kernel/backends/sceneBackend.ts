import type { ShapeBackend, BackendTarget } from './backend';
import type { Transform } from '../../shared/runtime/se3';
import type { PBRMaterial } from '../../shared/intent/material';

export interface SceneBackendPart {
  readonly name: string;
  readonly shape: ShapeBackend;          // LOCAL-frame, untransformed
  readonly worldTransform: Transform;
  /** Legacy role-token / hex string color attribution (from `.color()`). The
   *  renderer falls back to this when `material` is undefined. */
  readonly color?: string;
  /** Full PBR material attribution (from `.material({...})`). Carries
   *  metalness/roughness/transmission/ior/etc. through the assembly fan-out
   *  so glass crystals, polished metals, sheen fabrics survive
   *  `assembly.part(name, shape)`. */
  readonly material?: PBRMaterial;
}

export interface SceneBackend {
  readonly target: BackendTarget;
  readonly assemblyName: string;
  readonly parts: readonly SceneBackendPart[];
  readonly _kind: 'scene';
}

export function isSceneBackend(x: unknown): x is SceneBackend {
  return typeof x === 'object'
    && x !== null
    && (x as { _kind?: unknown })._kind === 'scene';
}
