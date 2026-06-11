// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as THREE from 'three';
import type { ReferenceImageMetadata } from '../../../shared/intent/referenceImageRecord';

/**
 * Apply a PlaneSpec orientation to a THREE.Mesh. This sets the mesh rotation
 * so it lies in the requested cardinal plane, and shifts it along the plane
 * normal by the PlaneSpec offset (if any). The mesh is created in the XY
 * plane by THREE.PlaneGeometry (normal +Z) and rotated here.
 *
 * - `'xy'` (or `{ plane: 'xy' }`) — no rotation; plane normal is +Z.
 * - `'xz'` (or `{ plane: 'xz' }`) — rotate -PI/2 about X so it lies in XZ.
 * - `'yz'` (or `{ plane: 'yz' }`) — rotate PI/2 about Y so it lies in YZ.
 */
function applyPlaneOrientation(
  mesh: THREE.Mesh,
  planeSpec: ReferenceImageMetadata['plane'],
  anchor: ReferenceImageMetadata['anchor'],
): void {
  const plane = typeof planeSpec === 'string' ? planeSpec : planeSpec.plane;
  const offset = typeof planeSpec === 'object' ? (planeSpec.offset ?? 0) : 0;

  switch (plane) {
    case 'xy':
      mesh.rotation.set(0, 0, 0);
      break;
    case 'xz':
      mesh.rotation.set(-Math.PI / 2, 0, 0);
      break;
    case 'yz':
      mesh.rotation.set(0, Math.PI / 2, 0);
      break;
  }

  // Anchor position
  let ax = 0, ay = 0, az = 0;
  if (Array.isArray(anchor)) {
    [ax, ay, az] = anchor as [number, number, number];
  }
  // Shift along plane normal by offset
  switch (plane) {
    case 'xy': az += offset; break;
    case 'xz': ay += offset; break;
    case 'yz': ax += offset; break;
  }
  mesh.position.set(ax, ay, az);
}

/**
 * Build a textured THREE.Mesh representing a reference-image overlay.
 * The mesh is a PlaneGeometry sized by the metadata's scale spec and
 * oriented by its plane/anchor spec. Uses MeshBasicMaterial with the
 * supplied texture so reference images render unlit (no shadow/highlight).
 *
 * The `texture` parameter is already-loaded; the caller owns async loading.
 * `sceneBbox` is used when scale === 'fit-bbox'.
 *
 * Exported for unit tests (allows mocking TextureLoader).
 */
export function buildReferenceImagePlane(
  ri: ReferenceImageMetadata,
  texture: THREE.Texture,
  sceneBbox: THREE.Box3,
): THREE.Mesh {
  if (ri.flipU) { texture.repeat.x = -1; texture.offset.x = 1; }
  if (ri.flipV) { texture.repeat.y = -1; texture.offset.y = 1; }

  const aspect =
    ri.pixelWidth > 0 && ri.pixelHeight > 0
      ? ri.pixelWidth / ri.pixelHeight
      : 1.0;

  let planeWidth: number;
  if (ri.scale === 'fit-bbox') {
    const size = sceneBbox.getSize(new THREE.Vector3());
    planeWidth = Math.max(size.x, size.y, size.z);
    if (planeWidth === 0) planeWidth = 100; // fallback for empty scene
  } else if (typeof ri.scale === 'number') {
    planeWidth = ri.scale;
  } else {
    // { width?, height? } object form
    const scaleObj = ri.scale as { width?: number; height?: number };
    if (scaleObj.width !== undefined) {
      planeWidth = scaleObj.width;
    } else if (scaleObj.height !== undefined) {
      planeWidth = scaleObj.height * aspect;
    } else {
      planeWidth = 100;
    }
  }
  const planeHeight = planeWidth / aspect;

  const geom = new THREE.PlaneGeometry(planeWidth, planeHeight);
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: ri.opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geom, mat);
  applyPlaneOrientation(mesh, ri.plane, ri.anchor);
  return mesh;
}
