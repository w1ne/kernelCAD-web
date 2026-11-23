// tests/unit/animation/demoPlayerAppearance.test.ts
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { applyFeatureAppearance } from '../../../src/render-player/components/demoPlayer/demoPlayerAppearance';
import { KCAD_FEATURE_GROUP_KEY } from '../../../src/render-player/components/demoPlayer/demoPlayerGeometry';

function group(id: string): { group: THREE.Group; material: THREE.MeshPhysicalMaterial } {
  const material = new THREE.MeshPhysicalMaterial({ color: '#808080' });
  const g = new THREE.Group();
  g.name = id;
  g.userData[KCAD_FEATURE_GROUP_KEY] = true;
  g.userData.featureId = id;
  g.add(new THREE.Mesh(new THREE.BufferGeometry(), material));
  return { group: g, material };
}

describe('applyFeatureAppearance', () => {
  it('sets base and emissive colour on the named groups only', () => {
    const scene = new THREE.Scene();
    const a = group('a');
    const b = group('b');
    scene.add(a.group, b.group);
    const result = applyFeatureAppearance(scene, [
      { featureId: 'a', emissive: '#00ff00' },
      { featureId: 'missing', color: '#ff0000' },
    ]);
    expect(result.updated).toBe(1);
    expect(a.material.emissive.getHexString()).toBe('00ff00');
    expect(a.material.color.getHexString()).toBe('808080');
    expect(b.material.emissive.getHexString()).toBe('000000');
    applyFeatureAppearance(scene, [{ featureId: 'b', color: '#123456' }]);
    expect(b.material.color.getHexString()).toBe('123456');
  });
});
