// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { markupStore } from '../../../markup/markupStore';

interface OrbitTarget { target: THREE.Vector3; update?: () => void }

/** Keeps the latest Studio camera in the markup store and applies imported poses. */
export function MarkupCameraBridge() {
  useFrame((state) => {
    const camera = state.camera;
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const controls = state.controls as OrbitTarget | null;
    if (controls?.target) {
      const restore = markupStore.consumeCameraRestore();
      if (restore) {
        camera.position.fromArray(restore.position);
        camera.up.fromArray(restore.up);
        camera.fov = restore.fov;
        camera.zoom = restore.zoom;
        controls.target.fromArray(restore.target);
        camera.updateProjectionMatrix();
        controls.update?.();
      }
    }
    const target = controls?.target ?? new THREE.Vector3(0, 0, 0);
    markupStore.setCamera({
      position: camera.position.toArray() as [number, number, number],
      target: target.toArray() as [number, number, number],
      up: camera.up.toArray() as [number, number, number],
      projection: 'perspective',
      fov: camera.fov,
      zoom: camera.zoom,
    });
  });
  return null;
}
