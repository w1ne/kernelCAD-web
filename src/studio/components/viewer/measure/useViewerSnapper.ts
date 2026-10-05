// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useThree } from '@react-three/fiber';
import { useCallback } from 'react';
import * as THREE from 'three';
import { filterClippedIntersections } from '../clipFilter';
import type { EdgePolyline } from './edgePolylines';
import { computeSnap, type Projected, type ScreenPoint, type SnapHit } from './measureSnap';
import type { Vec3 } from './measureMath';

/** Nearest visible solid face under the cursor (edge lines and overlays are not faces). */
function faceUnder(raycaster: THREE.Raycaster, scene: THREE.Scene): { point: Vec3; distance: number } | null {
  const hits = filterClippedIntersections(raycaster.intersectObjects(scene.children, true));
  const hit = hits.find((h) => h.object.userData?.type === 'FACE' && (h.object as THREE.Mesh).isMesh);
  return hit ? { point: hit.point.toArray() as unknown as Vec3, distance: hit.distance } : null;
}

/** Screen position -> snapped model point, against the live camera and scene. */
export function useViewerSnapper(polylines: readonly EdgePolyline[]): (p: ScreenPoint) => SnapHit | null {
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  const size = useThree((s) => s.size);
  return useCallback((cursor: ScreenPoint) => {
    camera.updateMatrixWorld();
    const ray = new THREE.Raycaster();
    ray.params = { ...ray.params, Line: { threshold: 0 }, Points: { threshold: 0 } };
    ray.setFromCamera(new THREE.Vector2((cursor.x / size.width) * 2 - 1, -(cursor.y / size.height) * 2 + 1), camera);
    const v = new THREE.Vector3();
    const project = (p: Vec3): Projected | null => {
      v.set(p[0], p[1], p[2]);
      const depth = camera.position.distanceTo(v);
      v.project(camera);
      if (v.z < -1 || v.z > 1) return null;
      return { x: ((v.x + 1) / 2) * size.width, y: ((1 - v.y) / 2) * size.height, depth };
    };
    return computeSnap({ polylines, cursor, project, face: faceUnder(ray, scene) });
  }, [camera, scene, size, polylines]);
}
