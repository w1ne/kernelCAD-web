// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/sceneToWorldFrame.ts
//
// Canonical world-frame view of a SceneBackend, shared by every multi-body
// exporter (STEP, 3MF, GLB). Each part is cloned BEFORE the transform is
// applied because replicad's translate/rotate mutate-and-destroy the source
// OCCT handle (cf. commit 1d597dd). Color tokens are surfaced as-is; callers
// resolve to hex when the format demands it (STEP/3MF) or feed them directly
// into a `THREE.MeshPhysicalMaterial` (GLB).
//
// Factoring this out of `exportSceneToSTEPAsync` keeps the clone-before-
// transform invariant in one place, so adding new scene-walk exporters does
// not risk re-introducing the lifecycle bug.

import type { SceneBackend } from '../sceneBackend';
import type { PBRMaterial } from '../../../shared/intent/material';
import { OcctBackend } from './occtBackend';

export interface WorldFramePart {
  /** Part name as declared by `assembly.part(name, ...)`. */
  readonly name: string;
  /** Fresh OcctBackend living in world frame — safe to mutate / consume. */
  readonly shape: OcctBackend;
  /** Role-token or hex string from `.color()`. Pass through unresolved so
   *  per-format writers decide whether to resolve to hex (STEP, 3MF) or
   *  feed straight into a THREE.MeshPhysicalMaterial (GLB). */
  readonly color?: string;
  /** Full PBR material attribution (from `.material({...})`). */
  readonly material?: PBRMaterial;
}

/**
 * Walk a `SceneBackend` and return one `WorldFramePart` per part with the
 * part's local-frame shape cloned and transformed into the world frame.
 *
 * Lifecycle: each part's `shape` is cloned BEFORE `applyTransform` because
 * replicad's translate/rotate mutate-and-destroy the source OCCT handle
 * (cf. commit 1d597dd). Without the clone, a second exporter call on the
 * same SceneBackend would see already-mutated shapes.
 *
 * Throws if the scene has no parts — every existing exporter treated empty
 * input as an error, so this helper preserves that contract.
 */
export function sceneToWorldFrameParts(scene: SceneBackend): WorldFramePart[] {
  if (scene.parts.length === 0) {
    throw new Error('sceneToWorldFrameParts: SceneBackend has no parts.');
  }
  return scene.parts.map((p) => {
    const transformed = (p.shape as OcctBackend).clone().applyTransform(p.worldTransform);
    const entry: WorldFramePart = { name: p.name, shape: transformed };
    if (p.color !== undefined) {
      (entry as { color?: string }).color = p.color;
    }
    if (p.material !== undefined) {
      (entry as { material?: PBRMaterial }).material = p.material;
    }
    return entry;
  });
}
