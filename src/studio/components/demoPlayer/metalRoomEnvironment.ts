// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Default IBL for metals in the demo player (the headless `kernelcad render`
// path). A metal (metalness ~1: steel, aluminium, brass…) reflects only its
// environment, so with no environment it renders near-black except for
// specular glints — `{ material: 'steel' }` parts were unreadable in default
// renders. When the script declares no environment and the scene has a
// metallic material, install three.js's procedural RoomEnvironment: built
// synchronously (no .hdr download), so the render stays deterministic.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ROOM_ENVIRONMENT_INTENSITY, ROOM_ENVIRONMENT_ROTATION_X } from '../viewer/viewerLighting';

/** Metalness at or above this needs an environment to read. */
export const METAL_NEEDS_ENV = 0.5;

/** True when any feature (or per-face override) carries a metallic material. */
export function hasMetallicMaterial(
  features: ReadonlyArray<{ material?: { metalness?: number }; materialByFaceId?: Record<string, { metalness?: number } | undefined> }>,
): boolean {
  return features.some((f) =>
    (f.material?.metalness ?? 0) >= METAL_NEEDS_ENV
    || Object.values(f.materialByFaceId ?? {}).some((m) => (m?.metalness ?? 0) >= METAL_NEEDS_ENV));
}

const owned = new WeakMap<THREE.Scene, THREE.Texture>();

/** Install (once per scene) the neutral room as the scene environment.
 *  Returns false when the renderer cannot build it (no WebGL, tests). */
export function installMetalRoomEnvironment(renderer: THREE.WebGLRenderer, scene: THREE.Scene): boolean {
  let texture = owned.get(scene);
  if (!texture) {
    if (typeof (renderer as unknown as { compile?: unknown }).compile !== 'function') return false;
    const pmrem = new THREE.PMREMGenerator(renderer);
    try {
      texture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    } catch {
      return false;
    } finally {
      pmrem.dispose();
    }
    owned.set(scene, texture);
  }
  scene.environment = texture;
  scene.environmentIntensity = ROOM_ENVIRONMENT_INTENSITY;
  scene.environmentRotation = new THREE.Euler(ROOM_ENVIRONMENT_ROTATION_X, 0, 0);
  return true;
}
