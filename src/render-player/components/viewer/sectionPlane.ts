// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as THREE from 'three';

const AXIS_NORMAL: Record<'x' | 'y' | 'z', THREE.Vector3> = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
};

/**
 * Build the section clipping plane for the current tool state.
 *
 * three.js removes fragments on a plane's NEGATIVE side, so the kept region
 * must be the plane's positive side. Unflipped, we keep the negative-axis
 * half-space (e.g. z < position) and remove the positive end, exposing the
 * interior — the plane normal therefore points along -axis. `flip` negates it.
 *
 * Worked example (z, position 10, unflipped): normal (0,0,-1), constant +10;
 * a point at z=9 has distance +1 (kept), z=11 has distance -1 (removed).
 */
export function sectionPlaneFromState(
  axis: 'x' | 'y' | 'z',
  flip: boolean,
  position: number,
): THREE.Plane {
  const dir = AXIS_NORMAL[axis].clone();
  const normal = (flip ? dir : dir.negate());
  const point = AXIS_NORMAL[axis].clone().multiplyScalar(position);
  return new THREE.Plane().setFromNormalAndCoplanarPoint(normal, point);
}

/**
 * Build one cut plane per ENABLED axis (0–3 planes). One enabled axis is a
 * classic section plane, two make a quarter wedge, three an octant corner —
 * a single mechanism, no modes.
 *
 * Used with `material.clipIntersection = true`, which drops a fragment only
 * when it is behind ALL planes — so the removed region must be the
 * INTERSECTION of the planes' NEGATIVE half-spaces (the corner wedge).
 * Removing the +axis side ⇒ the normal points along -axis, so points with
 * coordinate > offset sit at negative distance. `sides[axis] === true`
 * removes the positive side; `false` flips to the negative side.
 *
 * Planes are returned in x, y, z order (enabled axes only). One plane per
 * axis, always — two planes on the same axis (an empty intersection) is
 * unrepresentable by construction.
 */
export function cutawayPlanesFromState(
  enabled: Readonly<Record<'x' | 'y' | 'z', boolean>>,
  sides: Readonly<Record<'x' | 'y' | 'z', boolean>>,
  offsets: Readonly<Record<'x' | 'y' | 'z', number>>,
): THREE.Plane[] {
  const axes = (['x', 'y', 'z'] as const).filter((a) => enabled[a]);
  return axes.map((axis) => {
    const dir = AXIS_NORMAL[axis].clone();
    const normal = sides[axis] ? dir.negate() : dir;
    const point = AXIS_NORMAL[axis].clone().multiplyScalar(offsets[axis]);
    return new THREE.Plane().setFromNormalAndCoplanarPoint(normal, point);
  });
}
