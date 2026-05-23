// tests/unit/assemblies/matesIgnoredByModelCall.test.ts
//
// Regression coverage for the retired
// `assembly.mates-ignored-by-model-call` diagnostic. `assembly.model()` now
// preserves mate metadata and applies default mate FK, so mate-bearing
// assemblies should no longer warn that mates were ignored.

import { describe, expect, it, beforeAll } from 'vitest';
import { buildModel } from '../../../src/modeling/buildModel';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { isSceneBackend } from '../../../src/kernel/backends/sceneBackend';

describe('assembly.model() mate lowering', () => {
  beforeAll(async () => { await initOcct(); });

  it('does NOT fire when arm.model() is used on a mate-bearing assembly', async () => {
    const model = await buildModel({
      fileName: 'model-with-mates.kcad.ts',
      code: `
        const arm = assembly('test');
        arm.part('base', box(10, 10, 10))
           .connector('p', { type: 'frame', origin: { kind: 'vec3', value: [5, 0, 0] } });
        arm.part('child', box(10, 10, 10))
           .connector('q', { type: 'frame', origin: { kind: 'vec3', value: [-5, 0, 0] } });
        arm.mate('m', 'base.p', 'child.q', 'fastened');
        return arm.model();
      `,
    });
    const matesIgnored = model.diagnostics.filter(
      (d) => d.code === 'assembly.mates-ignored-by-model-call',
    );
    expect(matesIgnored.length).toBe(0);
    expect(isSceneBackend(model.tailShape)).toBe(true);
    const scene = model.tailShape;
    if (!isSceneBackend(scene)) throw new Error('expected SceneBackend');
    const child = scene.parts.find((p) => p.name === 'child');
    expect(child).toBeDefined();
    expect(child!.worldTransform.point([0, 0, 0])[0]).toBeCloseTo(10);
  });

  it('does NOT fire when arm.model() is used on a mate-free assembly', async () => {
    const model = await buildModel({
      fileName: 'model-no-mates.kcad.ts',
      code: `
        const arm = assembly('test');
        arm.part('a', box(10, 10, 10));
        arm.part('b', box(10, 10, 10), { at: [20, 0, 0] });
        return arm.model();
      `,
    });
    expect(
      model.diagnostics.some((d) => d.code === 'assembly.mates-ignored-by-model-call'),
    ).toBe(false);
  });

  it('does NOT fire when arm.solvedModel({}) is used', async () => {
    const model = await buildModel({
      fileName: 'solvedmodel-with-mates.kcad.ts',
      code: `
        const arm = assembly('test');
        arm.part('base', box(10, 10, 10))
           .connector('p', { type: 'frame', origin: { kind: 'vec3', value: [5, 0, 0] } });
        arm.part('child', box(10, 10, 10))
           .connector('q', { type: 'frame', origin: { kind: 'vec3', value: [-5, 0, 0] } });
        arm.mate('m', 'base.p', 'child.q', 'fastened');
        return arm.solvedModel({});
      `,
    });
    expect(
      model.diagnostics.some((d) => d.code === 'assembly.mates-ignored-by-model-call'),
    ).toBe(false);
  });
});
