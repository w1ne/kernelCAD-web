// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { beforeAll, describe, expect, it } from 'vitest';
import { OcctBackend, initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { approxOcctBytes } from '../../../src/kernel/backends/occt/shapeWeight';
import { buildModel } from '../../../src/composition/buildModel';
import { updateModelParams } from '../../../src/modeling/paramUpdate';
import { disposeModelShapes, registerRetainedShapeSource } from '../../../src/modeling/warm/releaseShapes';
import type { BuiltModel } from '../../../src/modeling/buildModel';

beforeAll(async () => { await initOcct(); }, 60_000);

function rootOf(model: BuiltModel) {
  const shape = model.rootShape ?? model.tailShape;
  if (!shape) throw new Error('model has no root shape');
  return shape;
}

describe('releaseShapes', () => {
  it('disposeModelShapes tolerates a model with no shapes or session', () => {
    expect(() => disposeModelShapes({})).not.toThrow();
  });

  it('charges a fastener envelope as a second solid', () => {
    const main = OcctBackend.box(4, 4, 4);
    const alone = approxOcctBytes(main);
    main.analysisBody = OcctBackend.box(2, 2, 2);
    expect(approxOcctBytes(main)).toBeGreaterThan(alone);
    main.dispose();
  });

  it('keeps a solid a retained host still serves', async () => {
    const code = `const s = param('s', 4, { min: 1, max: 20 }); return box(s, s, s);`;
    const model = await buildModel({ code, fileName: 'keep.kcad.ts' });
    const original = rootOf(model);
    const originalVolume = original.volume();
    const unregister = registerRetainedShapeSource(() => [original]);
    try {
      const edited = await updateModelParams(model, [{ name: 's', value: 6 }]);
      expect(rootOf(edited.model).volume()).toBeCloseTo(216, 3);
      expect(original.volume()).toBeCloseTo(originalVolume, 3);
      rootOf(edited.model).dispose();
    } finally {
      unregister();
      original.dispose();
    }
  }, 30_000);

  it('frees the previous generation when the caller reuses the original model', async () => {
    const code = `const s = param('s', 4, { min: 1, max: 20 }); return box(s, s, s);`;
    const model = await buildModel({ code, fileName: 'reuse.kcad.ts' });
    const first = await updateModelParams(model, [{ name: 's', value: 5 }]);
    const mid = rootOf(first.model);
    expect(mid.volume()).toBeCloseTo(125, 3);
    const second = await updateModelParams(model, [{ name: 's', value: 6 }]);
    expect(rootOf(second.model).volume()).toBeCloseTo(216, 3);
    expect(() => mid.volume()).toThrow(/deleted/);
    rootOf(second.model).dispose();
  }, 30_000);
});
