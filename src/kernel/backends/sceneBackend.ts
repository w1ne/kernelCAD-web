// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { ShapeBackend, BackendTarget } from './backend';
import type { Transform } from '../../shared/runtime/se3';
import type { PBRMaterial } from '../../shared/intent/material';

export interface SceneBackendPart {
  readonly name: string;
  readonly shape: ShapeBackend;          // LOCAL-frame, untransformed; placement (at/rotate) lives in worldTransform
  readonly worldTransform: Transform;
  /** Geometry identity of `shape`. Parts with equal keys have identical
   *  local geometry and, when the engine shared them, the SAME `shape`
   *  object — consumers must clone before any transform (replicad transforms
   *  destroy their source handle). Absent = never shared. */
  readonly geometryKey?: string;
  /** Legacy role-token / hex string color attribution (from `.color()`). The
   *  renderer falls back to this when `material` is undefined. */
  readonly color?: string;
  /** Full PBR material attribution (from `.material({...})`). Carries
   *  metalness/roughness/transmission/ior/etc. through the assembly fan-out
   *  so glass crystals, polished metals, sheen fabrics survive
   *  `assembly.part(name, shape)`. */
  readonly material?: PBRMaterial;
  /** Engineering-material name from `arm.part(..., { material })` (e.g.
   *  `pla`). Print exporters (3MF) use it as the named base material. */
  readonly materialName?: string;
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
