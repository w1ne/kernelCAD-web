import type { ShapeBackend, BackendTarget } from './backend';
import type { Transform } from '../../shared/runtime/se3';

export interface SceneBackendPart {
  readonly name: string;
  readonly shape: ShapeBackend;          // LOCAL-frame, untransformed
  readonly worldTransform: Transform;
  readonly color?: string;
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
