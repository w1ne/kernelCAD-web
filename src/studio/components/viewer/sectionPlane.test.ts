import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { sectionPlaneFromState, cutawayPlanesFromState } from './sectionPlane';

describe('sectionPlaneFromState', () => {
  it('z axis, unflipped: keeps below the cut, removes above', () => {
    const p = sectionPlaneFromState('z', false, 10);
    expect(p.distanceToPoint(new THREE.Vector3(0, 0, 9))).toBeGreaterThan(0);
    expect(p.distanceToPoint(new THREE.Vector3(0, 0, 11))).toBeLessThan(0);
  });

  it('flip swaps the kept side', () => {
    const p = sectionPlaneFromState('z', true, 10);
    expect(p.distanceToPoint(new THREE.Vector3(0, 0, 11))).toBeGreaterThan(0);
    expect(p.distanceToPoint(new THREE.Vector3(0, 0, 9))).toBeLessThan(0);
  });

  it('x and y axes cut along their own axis only', () => {
    const px = sectionPlaneFromState('x', false, 5);
    expect(px.distanceToPoint(new THREE.Vector3(4, 99, -99))).toBeGreaterThan(0);
    expect(px.distanceToPoint(new THREE.Vector3(6, 0, 0))).toBeLessThan(0);
    const py = sectionPlaneFromState('y', false, -3);
    expect(py.distanceToPoint(new THREE.Vector3(0, -4, 0))).toBeGreaterThan(0);
    expect(py.distanceToPoint(new THREE.Vector3(0, -2, 0))).toBeLessThan(0);
  });

  it('plane passes through the cut point (distance 0 on the plane)', () => {
    const p = sectionPlaneFromState('z', false, 10);
    expect(Math.abs(p.distanceToPoint(new THREE.Vector3(7, -3, 10)))).toBeLessThan(1e-9);
  });
});

describe('cutawayPlanesFromState', () => {
  const ALL = { x: true, y: true, z: true };
  const sides = { x: true, y: true, z: true };
  const offsets = { x: 10, y: 20, z: 30 };

  it('all axes enabled: 3 planes; a point inside the removed corner is behind ALL of them', () => {
    const planes = cutawayPlanesFromState(ALL, sides, offsets);
    expect(planes).toHaveLength(3);
    const inside = new THREE.Vector3(11, 21, 31);
    for (const p of planes) expect(p.distanceToPoint(inside)).toBeLessThan(0);
  });

  it('a point outside the corner is in front of at least one plane (kept)', () => {
    const planes = cutawayPlanesFromState(ALL, sides, offsets);
    const outside = new THREE.Vector3(9, 21, 31); // on the kept side of x
    expect(planes.some((p) => p.distanceToPoint(outside) > 0)).toBe(true);
  });

  it('side=false removes the negative side of that axis', () => {
    const planes = cutawayPlanesFromState(ALL, { ...sides, x: false }, offsets);
    const removed = new THREE.Vector3(9, 21, 31); // x < 10 is now the removed side
    for (const p of planes) expect(p.distanceToPoint(removed)).toBeLessThan(0);
  });

  it('two axes enabled: 2 planes, cut independent of the disabled axis coordinate', () => {
    for (const off of ['x', 'y', 'z'] as const) {
      const planes = cutawayPlanesFromState({ ...ALL, [off]: false }, sides, offsets);
      expect(planes).toHaveLength(2);
      const coords: Record<'x' | 'y' | 'z', number> = { x: 11, y: 21, z: 31 };
      coords[off] = -999; // deep along the disabled axis — still inside the wedge
      const probe = new THREE.Vector3(coords.x, coords.y, coords.z);
      for (const p of planes) expect(p.distanceToPoint(probe)).toBeLessThan(0);
    }
  });

  it('one axis enabled behaves like the classic section plane', () => {
    const [p] = cutawayPlanesFromState({ x: false, y: false, z: true }, sides, offsets);
    const legacy = sectionPlaneFromState('z', false, 30);
    expect(p.normal.toArray()).toEqual(legacy.normal.toArray());
    expect(p.constant).toBeCloseTo(legacy.constant, 9);
  });

  it('no axes enabled: empty plane list', () => {
    expect(cutawayPlanesFromState({ x: false, y: false, z: false }, sides, offsets)).toHaveLength(0);
  });

  it('planes pass through their offsets', () => {
    const [px] = cutawayPlanesFromState(ALL, sides, offsets);
    expect(Math.abs(px.distanceToPoint(new THREE.Vector3(10, -50, 99)))).toBeLessThan(1e-9);
  });
});
