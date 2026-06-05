import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { sectionRange, computeGeometryBox } from './sectionRange';

const box = (min: [number, number, number], max: [number, number, number]) =>
  new THREE.Box3(new THREE.Vector3(...min), new THREE.Vector3(...max));

describe('sectionRange', () => {
  it('returns min/max/center for the chosen axis', () => {
    const b = box([-10, 0, 2], [30, 8, 22]);
    expect(sectionRange(b, 'x')).toEqual({ min: -10, max: 30, center: 10 });
    expect(sectionRange(b, 'y')).toEqual({ min: 0, max: 8, center: 4 });
    expect(sectionRange(b, 'z')).toEqual({ min: 2, max: 22, center: 12 });
  });

  it('zero-extent axis yields min===max===center', () => {
    const b = box([5, 5, 5], [5, 9, 5]);
    expect(sectionRange(b, 'x')).toEqual({ min: 5, max: 5, center: 5 });
  });
});

describe('computeGeometryBox', () => {
  it('returns null for empty geometry', () => {
    expect(computeGeometryBox([])).toBeNull();
  });

  it('unions face vertices into a Box3', () => {
    const geom = [{
      faces: [{ vertices: [0, 0, 0, 10, 2, 4] }],
    }] as unknown as Parameters<typeof computeGeometryBox>[0];
    const b = computeGeometryBox(geom)!;
    expect(b.min.toArray()).toEqual([0, 0, 0]);
    expect(b.max.toArray()).toEqual([10, 2, 4]);
  });
});
