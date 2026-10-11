// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * Turn a raycast hit on the viewer's model into an `EditPick`: the feature
 * that made the face (face lineage), the assembly part, the face id, the
 * surface kind, and the world point + normal in mm.
 */
import * as THREE from 'three';
import type { GeometryResult } from '../../shared/worker/geometryEngine';
import { pickOwner } from '../../studio/selectionCode/geometryLineage';
import type { EditPick, SurfaceKind } from './editRequest';

interface FaceUserData {
  type?: unknown;
  shapeIndex?: unknown;
  faceMap?: unknown;
  id?: unknown;
}

function faceIdOf(hit: THREE.Intersection): number {
  const u = hit.object.userData as FaceUserData;
  if (Array.isArray(u.faceMap) && hit.faceIndex != null) {
    const id = (u.faceMap as unknown[])[hit.faceIndex];
    return typeof id === 'number' ? id : -1;
  }
  return typeof u.id === 'number' ? u.id : -1;
}

/** First visible model face among the hits (edge lines, pins and grids are skipped). */
export function firstFaceHit(hits: readonly THREE.Intersection[]): THREE.Intersection | null {
  for (const hit of hits) {
    const u = hit.object.userData as FaceUserData;
    if (u?.type === 'FACE' && typeof u.shapeIndex === 'number' && (hit.object as THREE.Mesh).isMesh) return hit;
  }
  return null;
}

function surfaceOf(geometry: GeometryResult | undefined, faceId: number): { surface: SurfaceKind; radiusMm?: number } {
  const face = geometry?.faces.find((f) => f.faceId === faceId);
  if (face?.plane) return { surface: 'plane' };
  if (face?.cylinder) return { surface: 'cylinder', radiusMm: face.cylinder.radius };
  return { surface: 'other' };
}

/** World-space normal at the hit, facing the camera ray. */
function worldNormal(hit: THREE.Intersection, rayDir?: THREE.Vector3): THREE.Vector3 {
  const n = hit.face ? hit.face.normal.clone() : new THREE.Vector3(0, 0, 1);
  n.transformDirection(hit.object.matrixWorld);
  if (rayDir && n.dot(rayDir) > 0) n.negate();
  return n;
}

export function pickFromHit(
  hit: THREE.Intersection,
  geometries: readonly GeometryResult[],
  rayDir?: THREE.Vector3,
): EditPick {
  const shapeIndex = (hit.object.userData as FaceUserData).shapeIndex as number;
  const geometry = geometries[shapeIndex];
  const faceId = faceIdOf(hit);
  const owner = faceId >= 0 ? pickOwner(geometry, { shapeIndex, kind: 'face', id: faceId }) : geometry?.featureId ?? null;
  const n = worldNormal(hit, rayDir);
  const pick: EditPick = {
    ...surfaceOf(geometry, faceId),
    point: [hit.point.x, hit.point.y, hit.point.z],
    normal: [n.x, n.y, n.z],
  };
  if (owner) pick.featureId = owner;
  if (geometry?.assemblyPartName) pick.partName = geometry.assemblyPartName;
  if (faceId >= 0) pick.faceId = faceId;
  return pick;
}
