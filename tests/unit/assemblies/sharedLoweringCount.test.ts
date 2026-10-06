// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildModel } from '../../../src/composition/buildModel';
import { updateModelParams } from '../../../src/modeling/buildModel';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { OcctLowerer } from '../../../src/modeling/backends/occt/occtLowerer';
import { isSceneBackend } from '../../../src/kernel/backends/sceneBackend';
import { setGeometrySharingForTests } from '../../../src/modeling/compute/geometryIdentity';
import { __geometryKeyComputesForTests } from '../../../src/modeling/compute/sharedLowering';

const ROW = `
  const arm = assembly('row');
  const shapes = [
    () => box(40, 20, 4).subtract(cylinder(10, 2).translate(10, 10, -1)),
    () => cylinder(30, 5),
    () => box(5, 5, 50),
  ];
  for (let i = 0; i < 60; i++) arm.part('p' + i, shapes[i % 3](), { at: [i * 60, 0, 0] });
  return arm.model();
`;

function countByKind(spy: ReturnType<typeof vi.spyOn>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const call of spy.mock.calls) {
    const kind = (call[0] as { kind: string }).kind;
    out[kind] = (out[kind] ?? 0) + 1;
  }
  return out;
}

describe('engine lowers each geometry key once', () => {
  beforeAll(async () => { await initOcct(); });
  afterEach(() => { vi.restoreAllMocks(); setGeometrySharingForTests(true); });

  it('60 parts from 3 recipes -> 3 assemblyPart lowerings and shared part shapes', async () => {
    const spy = vi.spyOn(OcctLowerer.prototype, 'lower');
    const model = await buildModel({ code: ROW, fileName: 'row.kcad.ts' });
    const counts = countByKind(spy);
    expect(counts.assemblyPart).toBe(3);
    expect(counts.boolean).toBe(1);
    const scene = model.rootShape;
    expect(isSceneBackend(scene)).toBe(true);
    if (!isSceneBackend(scene)) return;
    expect(scene.parts[3].shape).toBe(scene.parts[0].shape);
    expect(scene.parts[3].geometryKey).toBe(scene.parts[0].geometryKey);
    expect(scene.parts[1].geometryKey).not.toBe(scene.parts[0].geometryKey);
    expect(scene.parts[3].worldTransform.point([0, 0, 0])).toEqual([180, 0, 0]);
    expect(model.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  }, 120_000);

  it('with sharing off every part lowers on its own', async () => {
    setGeometrySharingForTests(false);
    const spy = vi.spyOn(OcctLowerer.prototype, 'lower');
    await buildModel({ code: ROW, fileName: 'row.kcad.ts' });
    expect(countByKind(spy).assemblyPart).toBe(60);
  }, 120_000);

  it('a param-driven placement update moves parts without recomputing geometry keys', async () => {
    const model = await buildModel({
      fileName: 'pose.kcad.ts',
      code: `
        const gap = param('gap', 30);
        const arm = assembly('row');
        for (let i = 0; i < 4; i++) arm.part('p' + i, box(10, 10, 10), { at: [gap.multiply(i), 0, 0] });
        return arm.model();
      `,
    });
    const before = __geometryKeyComputesForTests();
    const updated = await updateModelParams(model, [{ name: 'gap', value: 50 }]);
    expect(__geometryKeyComputesForTests()).toBe(before);
    const scene = updated.model.rootShape;
    if (!isSceneBackend(scene)) throw new Error('expected a scene');
    expect(scene.parts[3].worldTransform.point([0, 0, 0])).toEqual([150, 0, 0]);
    expect(scene.parts[3].shape).toBe(scene.parts[0].shape);
  }, 120_000);
});
