// src/components/demoPlayer/AnimationEngine.test.ts
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { AnimationEngine } from './AnimationEngine';

function makeEngine() {
  const scene = new THREE.Scene();
  return { scene, engine: new AnimationEngine(scene) };
}

function buildSingleMeshGroup(scene: THREE.Scene, name: string): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ color: 0xc8d2e0 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
  const group = new THREE.Group();
  group.name = name;
  group.add(mesh);
  scene.add(group);
  return mat;
}

describe('AnimationEngine — add transition', () => {
  it('starts mesh at opacity 0 + scale 0.85, ends at 1 + 1', async () => {
    const { engine, scene } = makeEngine();
    const mat = buildSingleMeshGroup(scene, 'box-1');
    const group = scene.getObjectByName('box-1') as THREE.Group;
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
    expect(mat.opacity).toBeCloseTo(0, 1);
    expect(group.scale.x).toBeCloseTo(0.85, 2);
    engine.advance(500);
    expect(mat.opacity).toBeCloseTo(1, 1);
    expect(group.scale.x).toBeCloseTo(1, 2);
    await promise;
  });

  it('isFrameReady returns false during animation, true when settled', () => {
    const { engine, scene } = makeEngine();
    buildSingleMeshGroup(scene, 'box-1');
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
    const cutterMat = buildSingleMeshGroup(scene, 'cyl-1');
    const carvedMat = buildSingleMeshGroup(scene, 'bool-1');
    engine.enqueue({
      kind: 'feature.compiled',
      featureId: 'bool-1',
      featureKind: 'boolean',
      shape: {} as any,
      predecessors: ['cyl-1'],
      diagnostics: [],
      health: 'healthy',
      op: 'subtract',
    });
    engine.advance(0);
    expect(carvedMat.opacity).toBeCloseTo(0, 1);
    engine.advance(150); // end of red flash on cutter
    engine.advance(400); // mid fade
    expect(carvedMat.opacity).toBeGreaterThan(0);
    expect(cutterMat.opacity).toBeLessThan(1);
    engine.advance(200); // end (total 600ms +)
    expect(carvedMat.opacity).toBeCloseTo(1, 1);
    expect(cutterMat.opacity).toBeCloseTo(0, 1);
  });

  it('does not overlap predecessor and carved result after the flash', () => {
    const { engine, scene } = makeEngine();
    const predecessorMat = buildSingleMeshGroup(scene, 'box-1');
    const carvedMat = buildSingleMeshGroup(scene, 'hole-1');
    engine.enqueue({
      kind: 'feature.compiled',
      featureId: 'hole-1',
      featureKind: 'hole',
      shape: {} as any,
      predecessors: ['box-1'],
      diagnostics: [],
      health: 'healthy',
    });

    engine.advance(160);

    expect(predecessorMat.opacity).toBe(0);
    expect(carvedMat.opacity).toBe(1);
    expect(carvedMat.transparent).toBe(false);
  });
});

describe('AnimationEngine — boolean.fuse transition', () => {
  it('glows predecessors yellow then fades unified mesh in', () => {
    const { engine, scene } = makeEngine();
    buildSingleMeshGroup(scene, 'box-1');
    buildSingleMeshGroup(scene, 'box-2');
    const fusedMat = buildSingleMeshGroup(scene, 'bool-1');
    engine.enqueue({
      kind: 'feature.compiled',
      featureId: 'bool-1',
      featureKind: 'boolean',
      shape: {} as any,
      predecessors: ['box-1', 'box-2'],
      diagnostics: [],
      health: 'healthy',
      op: 'union',
    });
    engine.advance(0);
    expect(fusedMat.opacity).toBeCloseTo(0, 1);
    engine.advance(500);
    expect(fusedMat.opacity).toBeCloseTo(1, 1);
  });
});

describe('AnimationEngine — modifier transition', () => {
  it('flashes affected mesh cyan then settles to normal', () => {
    const { engine, scene } = makeEngine();
    const mat = buildSingleMeshGroup(scene, 'fillet-1');
    const originalColor = mat.color.clone();
    engine.enqueue({
      kind: 'feature.compiled',
      featureId: 'fillet-1',
      featureKind: 'fillet',
      shape: {} as any,
      predecessors: [],
      diagnostics: [],
      health: 'healthy',
    });
    engine.advance(50);
    // During flash, color is cyan-ish (not original)
    engine.advance(400);
    expect(mat.color.r).toBeCloseTo(originalColor.r, 1);
  });
});

describe('AnimationEngine — transform transition', () => {
  it('mirror feature fades in over 500ms', () => {
    const { engine, scene } = makeEngine();
    const mat = buildSingleMeshGroup(scene, 'mirror-1');
    engine.enqueue({
      kind: 'feature.compiled',
      featureId: 'mirror-1',
      featureKind: 'mirror',
      shape: {} as any,
      predecessors: [],
      diagnostics: [],
      health: 'healthy',
    });
    engine.advance(0);
    expect(mat.opacity).toBeCloseTo(0, 1);
    engine.advance(500);
    expect(mat.opacity).toBeCloseTo(1, 1);
  });
});

describe('AnimationEngine — group-aware transitions (v0.21.1)', () => {
  function buildGroup(scene: THREE.Scene, name: string, meshCount: number): {
    group: THREE.Group;
    mats: THREE.MeshStandardMaterial[];
  } {
    const group = new THREE.Group();
    group.name = name;
    const mats: THREE.MeshStandardMaterial[] = [];
    for (let i = 0; i < meshCount; i++) {
      const mat = new THREE.MeshStandardMaterial({ color: 0xc8d2e0 });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
      group.add(mesh);
      mats.push(mat);
    }
    scene.add(group);
    return { group, mats };
  }

  it('boolean.cut flashes cutter group red within first 150ms', async () => {
    const scene = new THREE.Scene();
    const cutter = buildGroup(scene, 'cylinder_1', 2);
    const result = buildGroup(scene, 'boolean_1', 4);
    const engine = new AnimationEngine(scene);
    const promise = engine.enqueue({
      kind: 'feature.compiled',
      featureId: 'boolean_1',
      featureKind: 'boolean',
      shape: null as unknown as never,
      predecessors: ['cylinder_1'],
      diagnostics: [],
      health: 'healthy',
      op: 'subtract',
    });
    engine.advance(80); // mid-flash window
    for (const m of cutter.mats) {
      expect(m.color.r).toBeCloseTo(1, 1);
      expect(m.color.g).toBeLessThan(0.5);
      expect(m.color.b).toBeLessThan(0.5);
    }
    engine.advance(700); // settle past 600ms total
    await promise;
    for (const m of result.mats) {
      expect(m.opacity).toBe(1);
    }
  });

  it('modifier flashes cyan and all materials in group tween in lockstep', async () => {
    const scene = new THREE.Scene();
    const target = buildGroup(scene, 'box_1', 3);
    const filleted = buildGroup(scene, 'fillet_1', 6);
    const engine = new AnimationEngine(scene);
    const promise = engine.enqueue({
      kind: 'feature.compiled',
      featureId: 'fillet_1',
      featureKind: 'fillet',
      shape: null as unknown as never,
      predecessors: ['box_1'],
      diagnostics: [],
      health: 'healthy',
    });
    engine.advance(80);
    // Cyan flash on the modified group — Fix 1: opacity must be > 0 so the flash is visible
    for (const m of filleted.mats) {
      expect(m.color.b).toBeGreaterThan(0.9);
      expect(m.color.r).toBeLessThan(0.5);
      expect(m.opacity).toBeGreaterThan(0);
    }
    engine.advance(400);
    await promise;
  });

  it('returns resolved promise when group is missing (regression guard)', async () => {
    const scene = new THREE.Scene();
    const engine = new AnimationEngine(scene);
    const promise = engine.enqueue({
      kind: 'feature.compiled',
      featureId: 'no_such_feature',
      featureKind: 'box',
      shape: null as unknown as never,
      predecessors: [],
      diagnostics: [],
      health: 'healthy',
    });
    await expect(promise).resolves.toBeUndefined();
  });
});
