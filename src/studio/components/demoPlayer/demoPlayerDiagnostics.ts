// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/components/demoPlayer/demoPlayerDiagnostics.ts
//
// Read-only scene snapshot for the demo player's `dumpScene` bridge call.

import * as THREE from 'three';
import type { DemoPlayerWindow } from './demoPlayerGeometry';
import { KCAD_FEATURE_GROUP_KEY } from './demoPlayerGeometry';

interface SceneRef {
  current: { scene: THREE.Scene; camera: THREE.PerspectiveCamera } | null;
}

export function dumpScene(sceneRef: SceneRef): ReturnType<DemoPlayerWindow['dumpScene']> {
  const scene = sceneRef.current?.scene;
  const camera = sceneRef.current?.camera;
  if (!scene || !camera) {
    return {
      childCount: 0, meshCount: 0,
      cameraPos: [0, 0, 0] as [number, number, number],
      cameraLookingAt: [0, 0, 0] as [number, number, number],
      sampleOpacities: [],
      samplePolygonOffsets: [],
      kcadGroupMatrices: [],
    };
  }
  let meshCount = 0;
  const sampleOpacities: number[] = [];
  const samplePolygonOffsets: Array<{ enabled: boolean; factor: number; units: number }> = [];
  const kcadGroupMatrices: number[][] = [];
  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      meshCount++;
      const mat = obj.material as THREE.MeshStandardMaterial;
      if (sampleOpacities.length < 5) sampleOpacities.push(mat.opacity);
      if (samplePolygonOffsets.length < 5) {
        samplePolygonOffsets.push({
          enabled: mat.polygonOffset,
          factor: mat.polygonOffsetFactor,
          units: mat.polygonOffsetUnits,
        });
      }
    }
  });
  for (const child of scene.children) {
    if (child instanceof THREE.Group && child.userData[KCAD_FEATURE_GROUP_KEY]) {
      kcadGroupMatrices.push(child.matrix.toArray());
    }
  }
  const lookDir = new THREE.Vector3();
  camera.getWorldDirection(lookDir);
  const lookAt: [number, number, number] = [
    camera.position.x + lookDir.x,
    camera.position.y + lookDir.y,
    camera.position.z + lookDir.z,
  ];
  return {
    childCount: scene.children.length,
    meshCount,
    cameraPos: [camera.position.x, camera.position.y, camera.position.z],
    cameraLookingAt: lookAt,
    sampleOpacities,
    samplePolygonOffsets,
    kcadGroupMatrices,
  };
}
