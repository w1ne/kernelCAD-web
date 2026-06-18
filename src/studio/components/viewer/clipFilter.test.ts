// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { filterClippedIntersections } from './clipFilter';
import { sectionPlaneFromState, cutawayPlanesFromState } from './sectionPlane';

// A minimal fake intersection carrying just what the filter reads.
function hit(
  point: [number, number, number],
  material: { clippingPlanes?: THREE.Plane[] | null; clipIntersection?: boolean } | null,
  materialIndex?: number,
): THREE.Intersection {
  const object = { material: material ?? undefined } as unknown as THREE.Object3D;
  return {
    point: new THREE.Vector3(...point),
    object,
    distance: 0,
    ...(materialIndex !== undefined ? { face: { materialIndex } } : {}),
  } as unknown as THREE.Intersection;
}

// z, position 10, unflipped → keep z<10, remove z>10.
const planeZ = sectionPlaneFromState('z', false, 10);

describe('filterClippedIntersections', () => {
  it('keeps everything when the material has no clipping planes (section off / kept-whole)', () => {
    const hits = [hit([0, 0, 50], { clippingPlanes: [] }), hit([0, 0, 50], null)];
    expect(filterClippedIntersections(hits)).toHaveLength(2);
  });

  it('rejects a hit in the removed region of a single section plane', () => {
    const hits = [hit([0, 0, 11], { clippingPlanes: [planeZ], clipIntersection: true })];
    expect(filterClippedIntersections(hits)).toHaveLength(0);
  });

  it('keeps a hit in the visible region of a single section plane', () => {
    const hits = [hit([0, 0, 9], { clippingPlanes: [planeZ], clipIntersection: true })];
    expect(filterClippedIntersections(hits)).toHaveLength(1);
  });

  it('keeps a hit exactly on the cut plane (distance 0, not < 0)', () => {
    const hits = [hit([0, 0, 10], { clippingPlanes: [planeZ], clipIntersection: true })];
    expect(filterClippedIntersections(hits)).toHaveLength(1);
  });

  it('clipIntersection=true (corner wedge): rejects only points behind ALL planes', () => {
    // Remove +x (x>5) AND +z (z>10); the removed region is the corner where both hold.
    const planes = cutawayPlanesFromState(
      { x: true, y: false, z: true },
      { x: true, y: false, z: true },
      { x: 5, y: 0, z: 10 },
    );
    const mat = { clippingPlanes: planes, clipIntersection: true };
    const inCorner = hit([6, 0, 11], mat); // behind both → removed
    const oneSideOnly = hit([4, 0, 11], mat); // behind z only → still visible
    expect(filterClippedIntersections([inCorner])).toHaveLength(0);
    expect(filterClippedIntersections([oneSideOnly])).toHaveLength(1);
  });

  it('clipIntersection=false (union): rejects points behind ANY plane', () => {
    const planes = cutawayPlanesFromState(
      { x: true, y: false, z: true },
      { x: true, y: false, z: true },
      { x: 5, y: 0, z: 10 },
    );
    const mat = { clippingPlanes: planes, clipIntersection: false };
    const oneSideOnly = hit([4, 0, 11], mat); // behind z → removed under union
    expect(filterClippedIntersections([oneSideOnly])).toHaveLength(0);
  });

  it('resolves the per-face material for a multi-material object', () => {
    const clipped = { clippingPlanes: [planeZ], clipIntersection: true };
    const notClipped = { clippingPlanes: [] as THREE.Plane[] };
    // Hit point z=11 (removed by the clipped material); materialIndex 1 picks the clipped one.
    expect(
      filterClippedIntersections([hit([0, 0, 11], [notClipped, clipped] as never, 1)]),
    ).toHaveLength(0);
    // Same point but materialIndex 0 (unclipped) → kept.
    expect(
      filterClippedIntersections([hit([0, 0, 11], [notClipped, clipped] as never, 0)]),
    ).toHaveLength(1);
  });
});
