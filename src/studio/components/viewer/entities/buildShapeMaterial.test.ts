import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { buildShapeMaterial } from './buildShapeMaterial';

describe('buildShapeMaterial clippingPlanes', () => {
  it('defaults to no clipping planes', () => {
    const m = buildShapeMaterial(undefined, false, '#ffffff', 'shaded');
    expect(m.clippingPlanes ?? []).toHaveLength(0);
  });

  it('applies passed clipping planes and clipShadows', () => {
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 10);
    const m = buildShapeMaterial(undefined, false, '#ffffff', 'shaded', [plane]);
    expect(m.clippingPlanes).toHaveLength(1);
    expect(m.clippingPlanes![0]).toBe(plane);
    expect(m.clipShadows).toBe(true);
  });
});

describe('buildShapeMaterial cutaway clipping', () => {
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 10);

  it('clipIntersection defaults to false', () => {
    const m = buildShapeMaterial(undefined, false, '#ffffff', 'shaded', [plane]);
    expect(m.clipIntersection).toBe(false);
  });

  it('propagates clipIntersection=true to the material', () => {
    const m = buildShapeMaterial(undefined, false, '#ffffff', 'shaded', [plane], true);
    expect(m.clipIntersection).toBe(true);
  });

  it('clipped Lambert fallback renders double-sided; unclipped stays front-side', () => {
    const clipped = buildShapeMaterial(undefined, false, '#ffffff', 'shaded', [plane]);
    expect(clipped.side).toBe(THREE.DoubleSide);
    const unclipped = buildShapeMaterial(undefined, false, '#ffffff', 'shaded');
    expect(unclipped.side).toBe(THREE.FrontSide);
  });
});
