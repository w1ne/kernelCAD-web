// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as THREE from 'three';

/**
 * Reject raycast intersections that land on geometry the active section /
 * clipping planes have visually removed.
 *
 * `THREE.Raycaster` ignores `material.clippingPlanes`, so a section/cutaway view
 * clips the rendered mesh but NOT the pick geometry. Without this filter the
 * hover/selection highlight fires on the cut-away ("invisible") structures,
 * making it impossible to look inside a section.
 *
 * The clip state is read off each hit object's OWN material rather than
 * reconstructed from the section-tool store. That makes the filter:
 *   - correct for parts excluded from sectioning (`sectionKeepWhole` →
 *     `NO_PLANES`): their material has no clipping planes, so they're never
 *     rejected (they're still fully visible),
 *   - exact about which planes apply to which object, and
 *   - mode-aware: it honours `material.clipIntersection`.
 *
 * Clip-mode semantics (matching how the viewer renders, see sectionPlane.ts):
 *   - `clipIntersection = true` (the viewer's cutaway): a fragment is removed
 *     only where it is behind EVERY plane (the corner-wedge intersection of the
 *     negative half-spaces).
 *   - `clipIntersection = false` (union): removed where behind ANY plane.
 * A point exactly on a plane has distance 0 (not < 0), so the visible cut face
 * itself stays hoverable.
 */

function clipStateOf(
  intersection: THREE.Intersection,
): { planes: THREE.Plane[]; clipIntersection: boolean } | null {
  const obj = intersection.object as THREE.Object3D & {
    material?: THREE.Material | THREE.Material[];
  };
  const raw = obj.material;
  if (!raw) return null;
  const material = Array.isArray(raw)
    ? raw[intersection.face?.materialIndex ?? 0] ?? raw[0]
    : raw;
  const planes = (material as THREE.Material & { clippingPlanes?: THREE.Plane[] | null })
    ?.clippingPlanes;
  if (!planes || planes.length === 0) return null;
  const clipIntersection = Boolean(
    (material as THREE.Material & { clipIntersection?: boolean }).clipIntersection,
  );
  return { planes, clipIntersection };
}

function isRemoved(
  point: THREE.Vector3,
  planes: readonly THREE.Plane[],
  clipIntersection: boolean,
): boolean {
  return clipIntersection
    ? planes.every((p) => p.distanceToPoint(point) < 0)
    : planes.some((p) => p.distanceToPoint(point) < 0);
}

export function filterClippedIntersections(
  intersects: readonly THREE.Intersection[],
): THREE.Intersection[] {
  return intersects.filter((hit) => {
    const clip = clipStateOf(hit);
    if (!clip) return true;
    return !isRemoved(hit.point, clip.planes, clip.clipIntersection);
  });
}
