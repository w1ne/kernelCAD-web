// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import type { GeometryResult } from '../../shared/worker/geometryEngine';
import { firstFaceHit, pickFromHit } from './pickFromHit';

function face(faceId: number, extra: Partial<GeometryResult['faces'][number]> = {}): GeometryResult['faces'][number] {
  return {
    faceId,
    vertices: new Float32Array(),
    indices: new Uint32Array(),
    normals: new Float32Array(),
    ...extra,
  };
}

const GEOMETRIES: GeometryResult[] = [
  {
    featureId: 'body',
    assemblyPartName: 'chassis',
    faceOwners: ['body', 'roof-fillet'],
    faces: [
      face(0, { plane: { origin: [0, 0, 0], normal: [0, 0, 1] } }),
      face(1, { cylinder: { origin: [0, 0, 0], axis: [0, 0, 1], radius: 6 } }),
    ],
  },
];

function hitOn(userData: Record<string, unknown>, faceIndex: number, normal = new THREE.Vector3(0, 0, 1)): THREE.Intersection {
  const mesh = new THREE.Mesh();
  mesh.userData = userData;
  mesh.updateMatrixWorld();
  return {
    distance: 10,
    point: new THREE.Vector3(1, 2, 3),
    object: mesh,
    faceIndex,
    face: { a: 0, b: 1, c: 2, normal, materialIndex: 0 },
  } as THREE.Intersection;
}

describe('pickFromHit', () => {
  it('maps the triangle to its face, owning feature, part and surface', () => {
    const hit = hitOn({ type: 'FACE', shapeIndex: 0, faceMap: [0, 1, 1] }, 2);
    expect(pickFromHit(hit, GEOMETRIES)).toEqual({
      featureId: 'roof-fillet',
      partName: 'chassis',
      faceId: 1,
      surface: 'cylinder',
      radiusMm: 6,
      point: [1, 2, 3],
      normal: [0, 0, 1],
    });
  });

  it('reports a planar face and falls back to the mesh feature', () => {
    const geometries: GeometryResult[] = [{ ...GEOMETRIES[0]!, faceOwners: undefined }];
    const pick = pickFromHit(hitOn({ type: 'FACE', shapeIndex: 0, faceMap: [0] }, 0), geometries);
    expect(pick.surface).toBe('plane');
    expect(pick.featureId).toBe('body');
  });

  it('turns the normal toward the viewer', () => {
    const hit = hitOn({ type: 'FACE', shapeIndex: 0, faceMap: [0] }, 0, new THREE.Vector3(0, 0, 1));
    const pick = pickFromHit(hit, GEOMETRIES, new THREE.Vector3(0, 0, 1));
    expect(pick.normal).toEqual([-0, -0, -1]);
  });

  it('skips non-face objects', () => {
    const edge = hitOn({ type: 'EDGE', shapeIndex: 0 }, 0);
    const faceHit = hitOn({ type: 'FACE', shapeIndex: 0, faceMap: [0] }, 0);
    expect(firstFaceHit([edge, faceHit])).toBe(faceHit);
    expect(firstFaceHit([edge])).toBeNull();
  });
});
