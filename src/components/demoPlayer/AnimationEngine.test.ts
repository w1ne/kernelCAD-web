// src/components/demoPlayer/AnimationEngine.test.ts
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { AnimationEngine } from './AnimationEngine';

function makeEngine() {
  const scene = new THREE.Scene();
  return { scene, engine: new AnimationEngine(scene) };
}

function makeMesh(id: string): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ transparent: true }),
  );
  mesh.name = id;
  return mesh;
}

describe('AnimationEngine — add transition', () => {
  it('starts mesh at opacity 0 + scale 0.85, ends at 1 + 1', async () => {
    const { engine, scene } = makeEngine();
    const mesh = makeMesh('box-1');
    scene.add(mesh);
    const promise = engine.enqueue({
      kind: 'feature.compiled',
      featureId: 'box-1',
      featureKind: 'box',
      shape: {} as any,
      predecessors: [],
      diagnostics: [],
      health: 'healthy',
    });
    // Tick the engine forward — animation runs over 500ms
    engine.advance(0);
    expect(mesh.material.opacity).toBeCloseTo(0, 1);
    expect(mesh.scale.x).toBeCloseTo(0.85, 2);
    engine.advance(500);
    expect(mesh.material.opacity).toBeCloseTo(1, 1);
    expect(mesh.scale.x).toBeCloseTo(1, 2);
    await promise;
  });

  it('isFrameReady returns false during animation, true when settled', () => {
    const { engine, scene } = makeEngine();
    scene.add(makeMesh('box-1'));
    expect(engine.isFrameReady()).toBe(true);
    engine.enqueue({
      kind: 'feature.compiled',
      featureId: 'box-1',
      featureKind: 'box',
      shape: {} as any,
      predecessors: [],
      diagnostics: [],
      health: 'healthy',
    });
    engine.advance(0);
    expect(engine.isFrameReady()).toBe(false);
    engine.advance(500);
    expect(engine.isFrameReady()).toBe(true);
  });
});

describe('AnimationEngine — boolean.cut transition', () => {
  it('flashes cutter mesh red then fades it out while carved result fades in', () => {
    const { engine, scene } = makeEngine();
    const cutter = makeMesh('cyl-1');
    const carved = makeMesh('bool-1');
    scene.add(cutter, carved);
    engine.enqueue({
      kind: 'feature.compiled',
      featureId: 'bool-1',
      featureKind: 'boolean',
      shape: { __op: 'subtract' } as any,
      predecessors: ['cyl-1'],
      diagnostics: [],
      health: 'healthy',
    });
    engine.advance(0);
    expect(carved.material.opacity).toBeCloseTo(0, 1);
    engine.advance(150); // end of red flash on cutter
    engine.advance(400); // mid fade
    expect(carved.material.opacity).toBeGreaterThan(0);
    expect(cutter.material.opacity).toBeLessThan(1);
    engine.advance(200); // end (total 600ms +)
    expect(carved.material.opacity).toBeCloseTo(1, 1);
    expect(cutter.material.opacity).toBeCloseTo(0, 1);
  });
});
