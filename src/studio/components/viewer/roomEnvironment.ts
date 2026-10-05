// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/** Metals only reflect the environment. Without one, a face with metalness
 *  near 1 is solid black except where a directional specular lobe goes white.
 *  RoomEnvironment is three.js's procedural neutral room — no HDR asset.
 *
 *  The texture is owned by the scene it was built for. A second viewer, or
 *  React StrictMode's mount/cleanup/mount, must not dispose that texture
 *  before a replacement is on the scene that actually renders. Disposing a
 *  PMREMGenerator also makes a generator created afterwards unusable, so a
 *  failed rebuild used to leave the live scene with `environment === null`. */

interface InstalledRoom {
  texture: THREE.Texture;
  pmrem: THREE.PMREMGenerator;
  users: number;
}

const installedByScene = new WeakMap<THREE.Scene, InstalledRoom>();

/** The texture most recently installed. Materials built after the canvas
 *  mounts read this so they don't depend on a later scene-environment walk. */
let liveEnvironment: THREE.Texture | null = null;

export function currentRoomEnvironment(): THREE.Texture | null {
  return liveEnvironment;
}

/** Test seam. Production code sets the texture only from a successful install. */
export function setRoomEnvironmentForTest(texture: THREE.Texture | null): void {
  liveEnvironment = texture;
}

function bindEnvironment(scene: THREE.Scene, texture: THREE.Texture): void {
  scene.environment = texture;
  scene.environmentIntensity = 1;
  liveEnvironment = texture;
  scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    const material = mesh.material;
    if (!material) return;
    const list = Array.isArray(material) ? material : [material];
    for (const mat of list) {
      if (!(mat instanceof THREE.MeshStandardMaterial)) continue;
      if (mat.envMap === texture) continue;
      mat.envMap = texture;
      mat.envMapIntensity = 1;
      mat.needsUpdate = true;
    }
  });
}

function releaseRoomEnvironment(scene: THREE.Scene, record: InstalledRoom): void {
  record.users -= 1;
  if (record.users > 0) return;
  // StrictMode runs this cleanup and then the effect again in the same turn.
  // Defer the dispose so that remount reuses the texture instead of nulling
  // scene.environment and then failing to build a new PMREM.
  queueMicrotask(() => {
    if (record.users > 0) return;
    if (installedByScene.get(scene) !== record) return;
    if (scene.environment === record.texture) scene.environment = null;
    installedByScene.delete(scene);
    if (liveEnvironment === record.texture) liveEnvironment = null;
    record.texture.dispose();
    record.pmrem.dispose();
  });
}

/**
 * Install a procedural room as `scene.environment` and as `envMap` on the
 * standard materials already in the scene. Returns a cleanup. A renderer
 * that cannot build a PMREM map leaves any environment already on the scene
 * untouched.
 */
export function installRoomEnvironment(
  gl: { compile?: unknown },
  scene?: THREE.Scene | null,
): () => void {
  if (!scene || typeof gl.compile !== 'function') return () => {};
  const existing = installedByScene.get(scene);
  if (existing) {
    existing.users += 1;
    bindEnvironment(scene, existing.texture);
    return () => releaseRoomEnvironment(scene, existing);
  }

  const renderer = gl as THREE.WebGLRenderer;
  let pmrem: THREE.PMREMGenerator | undefined;
  let texture: THREE.Texture | undefined;
  try {
    pmrem = new THREE.PMREMGenerator(renderer);
    texture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  } catch {
    // The previous environment, if any, stays. A thrown rebuild must not
    // blank the scene that is on screen.
    pmrem?.dispose();
    return () => {};
  }

  const record: InstalledRoom = { texture, pmrem, users: 1 };
  installedByScene.set(scene, record);
  bindEnvironment(scene, texture);
  return () => releaseRoomEnvironment(scene, record);
}
