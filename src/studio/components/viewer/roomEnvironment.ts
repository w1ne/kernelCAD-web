// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/** Metals (named materials, metalness near 1) only reflect the environment.
 *  The Studio canvas used to light with directional lights alone, so those
 *  faces painted solid black except where a specular lobe went pure white.
 *  A single body with no material still uses Lambert and looked fine.
 *  RoomEnvironment is three.js's procedural neutral room — no HDR asset. */
let disposeInstalled: (() => void) | null = null;

export function installRoomEnvironment(
  gl: { compile?: unknown },
  scene?: THREE.Scene | null,
): void {
  disposeInstalled?.();
  disposeInstalled = null;
  if (!scene || typeof gl.compile !== 'function') return;
  const renderer = gl as THREE.WebGLRenderer;
  let pmrem: THREE.PMREMGenerator | undefined;
  let texture: THREE.Texture | undefined;
  try {
    pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    texture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = texture;
    // Full strength: metalness 1 has no diffuse term, so the room IS the color.
    scene.environmentIntensity = 1;
  } catch {
    texture?.dispose();
    pmrem?.dispose();
    return;
  }
  const tex = texture;
  const generator = pmrem;
  disposeInstalled = () => {
    if (scene.environment === tex) scene.environment = null;
    tex.dispose();
    generator.dispose();
  };
}
