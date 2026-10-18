// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Default IBL in the demo player (the headless `kernelcad render` path). A
// metal (metalness ~1: steel, aluminium, brass…) reflects only its
// environment, so with no environment it renders near-black except for
// specular glints. When the script declares no environment, install
// three.js's procedural RoomEnvironment — built synchronously (no .hdr
// download), so the render stays deterministic — for EVERY render, not only
// those with a metal on screen: gating it on a metal made the plastics in
// that render 3–4× brighter than the same plastics rendered alone.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ROOM_ENVIRONMENT_INTENSITY, ROOM_ENVIRONMENT_ROTATION_X } from './viewerLighting';

const owned = new WeakMap<THREE.Scene, THREE.Texture>();

/** Install (once per scene) the neutral room as the scene environment.
 *  Returns false when the renderer cannot build it (no WebGL, tests). */
export function installDefaultRoomEnvironment(renderer: THREE.WebGLRenderer, scene: THREE.Scene): boolean {
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
