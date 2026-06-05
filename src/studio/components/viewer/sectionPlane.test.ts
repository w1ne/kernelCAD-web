import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { sectionPlaneFromState } from './sectionPlane';

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
