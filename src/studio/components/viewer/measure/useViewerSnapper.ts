// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useThree } from '@react-three/fiber';
import { useCallback } from 'react';
import * as THREE from 'three';
import { filterClippedIntersections } from '../clipFilter';
import type { EdgePolyline } from './edgePolylines';
import { computeSnap, type Projected, type ScreenPoint, type SnapHit } from './measureSnap';
import type { Vec3 } from './measureMath';
import type { GeometryResult } from '../../../../shared/worker/geometryEngine';
import type { TopologyRef } from '../../../markup/markupSnapshot';

type FaceIntersection = THREE.Intersection<THREE.Object3D>;

/** Nearest visible solid face under the cursor (edge lines and overlays are not faces). */
function visibleFaceHit(raycaster: THREE.Raycaster, scene: THREE.Scene): FaceIntersection | undefined {
  const hits = filterClippedIntersections(raycaster.intersectObjects(scene.children, true));
  return hits.find((hit) => hit.object.userData?.type === 'FACE' && (hit.object as THREE.Mesh).isMesh);
}

function faceIdFromHit(hit: FaceIntersection): number | undefined {
  const data = hit.object.userData;
  if (data.faceMap && hit.faceIndex != null) return data.faceMap[hit.faceIndex] as number | undefined;
  return typeof data.id === 'number' ? data.id : undefined;
}

function faceRefFromHit(hit: FaceIntersection, geometries: readonly GeometryResult[]): TopologyRef | undefined {
  const shapeIndex = hit.object.userData.shapeIndex;
  const faceId = faceIdFromHit(hit);
  if (typeof shapeIndex !== 'number' || typeof faceId !== 'number' || faceId < 0) return undefined;
  const geometry = geometries[shapeIndex];
  const featureId = geometry?.faceOwners?.[faceId] ?? geometry?.featureId;
  return { shapeIndex, kind: 'face', id: faceId, ...(featureId ? { featureId } : {}) };
}

function faceUnder(raycaster: THREE.Raycaster, scene: THREE.Scene, geometries: readonly GeometryResult[]): { point: Vec3; distance: number; ref?: TopologyRef } | null {
  const hit = visibleFaceHit(raycaster, scene);
  if (!hit) return null;
  const ref = faceRefFromHit(hit, geometries);
  return { point: hit.point.toArray() as unknown as Vec3, distance: hit.distance, ...(ref ? { ref } : {}) };
}

/** Screen position -> snapped model point, against the live camera and scene. */
export function useViewerSnapper(polylines: readonly EdgePolyline[], geometries: readonly GeometryResult[]): (p: ScreenPoint) => SnapHit | null {
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
    return computeSnap({ polylines, cursor, project, face: faceUnder(ray, scene, geometries) });
  }, [camera, scene, size, polylines, geometries]);
}
