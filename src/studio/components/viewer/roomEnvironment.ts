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

/** The room installed on `scene`, or null. A PMREM texture belongs to the
 *  WebGL context that built it, so there is no page-wide "current" room: a
 *  second canvas (another context) must never receive this scene's texture. */
export function roomEnvironmentFor(scene: THREE.Scene | null | undefined): THREE.Texture | null {
  return scene ? installedByScene.get(scene)?.texture ?? null : null;
}

function sceneOf(object: THREE.Object3D): THREE.Scene | null {
  let node: THREE.Object3D | null = object;
  while (node) {
    if (node instanceof THREE.Scene) return node;
    node = node.parent;
  }
  return null;
}

function pinOnMaterial(mat: THREE.Material, texture: THREE.Texture): void {
  if (!(mat instanceof THREE.MeshStandardMaterial)) return;
  if (mat.envMap === texture) return;
  mat.envMap = texture;
  mat.envMapIntensity = 1;
  mat.needsUpdate = true;
}

/** Pin the room of the scene `object` is drawn in onto `material`, so a later
 *  clear of scene.environment cannot turn the metal black. Materials built
 *  before the room exists get it from the install walk instead. A no-op when
 *  `object` is not in a scene with a room (tests, a second canvas mid-mount). */
export function pinRoomEnvironment(object: unknown, material: THREE.Material | THREE.Material[]): void {
  if (!(object instanceof THREE.Object3D)) return;
  const texture = roomEnvironmentFor(sceneOf(object));
  if (!texture) return;
  for (const mat of Array.isArray(material) ? material : [material]) pinOnMaterial(mat, texture);
}

/** Test seam: register `texture` as the room of `scene` without a renderer. */
export function registerRoomForTest(scene: THREE.Scene, texture: THREE.Texture): () => void {
  const record: InstalledRoom = { texture, pmrem: { dispose() {} } as THREE.PMREMGenerator, users: 1 };
  installedByScene.set(scene, record);
  bindEnvironment(scene, texture);
  return () => releaseRoomEnvironment(scene, record);
}

/** IBL strength. A full 1.0 plus the key light clips light aluminium and plastic. */
const ROOM_ENVIRONMENT_INTENSITY = 0.55;

function bindEnvironment(scene: THREE.Scene, texture: THREE.Texture): void {
  scene.environment = texture;
  scene.environmentIntensity = ROOM_ENVIRONMENT_INTENSITY;
  scene.traverse((obj) => {
    const material = (obj as THREE.Mesh).material;
    if (!material) return;
    for (const mat of Array.isArray(material) ? material : [material]) pinOnMaterial(mat, texture);
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
    scene.traverse((obj) => {
      const material = (obj as THREE.Mesh).material;
      if (!material) return;
      for (const mat of Array.isArray(material) ? material : [material]) {
        if (mat instanceof THREE.MeshStandardMaterial && mat.envMap === record.texture) {
          mat.envMap = null;
          mat.needsUpdate = true;
        }
      }
    });
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
