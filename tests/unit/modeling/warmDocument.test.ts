// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { afterEach, describe, expect, it } from 'vitest';
import { OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { OcctLowerer } from '../../../src/modeling/backends/occt/occtLowerer';
import { buildModel, updateModelParams, type BuiltModel } from '../../../src/modeling/buildModel';
import { createWarmDocumentStore } from '../../../src/modeling/warm/documentSession';
import type { ShapeBackend } from '../../../src/kernel/backends/backend';

function faceCount(shape: ShapeBackend): number {
  return (shape as OcctBackend).getReplicadShape().faces.length;
}

function expectSameSolid(actual: ShapeBackend, expected: ShapeBackend): void {
  expect(actual.volume()).toBeCloseTo(expected.volume(), 3);
  const a = actual.boundingBox();
  const b = expected.boundingBox();
  for (let i = 0; i < 3; i++) {
    expect(a.min[i]).toBeCloseTo(b.min[i], 3);
    expect(a.max[i]).toBeCloseTo(b.max[i], 3);
  }
  expect(faceCount(actual)).toBe(faceCount(expected));
}

function rootOf(model: BuiltModel): ShapeBackend {
  const shape = model.rootShape;
  if (!shape) throw new Error('model has no root shape');
  return shape;
}

async function coldAt(code: string, from: string, to: string): Promise<BuiltModel> {
  return buildModel({ code: code.replace(from, to), fileName: 'warm.kcad.ts' });
}

describe('warm document rebuild', () => {
  let restore: (() => void) | undefined;
  afterEach(() => {
    restore?.();
    restore = undefined;
  });

  function spyLowers(): string[] {
    const ids: string[] = [];
    const orig = OcctLowerer.prototype.lower;
    OcctLowerer.prototype.lower = async function (record, inputs) {
      ids.push(record.id);
      return orig.call(this, record, inputs);
    };
    const previous = restore;
    restore = () => {
      OcctLowerer.prototype.lower = orig;
      previous?.();
    };
    return ids;
  }

  it('matches a cold rebuild and does not re-lower a translated union', async () => {
    const code = `
      const z = param('z', 0, { min: 0, max: 40 });
      const fixed = box(4, 4, 4).translate(30, 0, 0);
      const a = cylinder(6, 3).translate(0, 0, z);
      const b = cylinder(5, 2).translate(0, 0, z.add(12));
      return a.union(b);
    `;
    const warm = await buildModel({ code, fileName: 'warm.kcad.ts' });
    const fixed = warm.records.find((record) => record.kind === 'box')!;
    const lowered = spyLowers();
    const edited = await updateModelParams(warm, [{ name: 'z', value: 15 }]);
    expect(lowered).not.toContain(fixed.id);
    for (const record of warm.records) {
      if (record.kind === 'cylinder' || record.kind === 'boolean') expect(lowered).not.toContain(record.id);
    }
    expect(edited.result.rigidReused.length).toBeGreaterThan(0);
    const cold = await coldAt(code, "param('z', 0,", "param('z', 15,");
    expectSameSolid(rootOf(edited.model), rootOf(cold));
  });

  it('does not re-lower an upstream solid when only a later feature moves', async () => {
    const code = `
      const z = param('z', 0, { min: 0, max: 20 });
      const base = box(10, 10, 4);
      const cap = cylinder(3, 2).translate(0, 0, z.add(4));
      return base.union(cap);
    `;
    const warm = await buildModel({ code, fileName: 'warm.kcad.ts' });
    const base = warm.records.find((record) => record.kind === 'box')!;
    const cap = warm.records.find((record) => record.kind === 'cylinder')!;
    const lowered = spyLowers();
    const edited = await updateModelParams(warm, [{ name: 'z', value: 6 }]);
    expect(lowered).not.toContain(base.id);
    expect(lowered).not.toContain(cap.id);
    expect(lowered.some((id) => id.startsWith('boolean'))).toBe(true);
    const cold = await coldAt(code, "param('z', 0,", "param('z', 6,");
    expectSameSolid(rootOf(edited.model), rootOf(cold));
  });

  it('re-lowers a solid whose size changed and leaves an untouched solid alone', async () => {
    const code = `
      const h = param('h', 8, { min: 1, max: 30 });
      const fixed = box(3, 3, 3).translate(20, 0, 0);
      return cylinder(h, 4).union(fixed);
    `;
    const warm = await buildModel({ code, fileName: 'warm.kcad.ts' });
    const fixed = warm.records.find((record) => record.kind === 'box')!;
    const cylinder = warm.records.find((record) => record.kind === 'cylinder')!;
    const lowered = spyLowers();
    const edited = await updateModelParams(warm, [{ name: 'h', value: 14 }]);
    expect(lowered).toContain(cylinder.id);
    expect(lowered).not.toContain(fixed.id);
    const cold = await coldAt(code, "param('h', 8,", "param('h', 14,");
    expectSameSolid(rootOf(edited.model), rootOf(cold));
  });

  it('places a shifted revolve union instead of lowering it', async () => {
    const code = `
      const z = param('z', 0, { min: 0, max: 30 });
      const a = path().moveTo(2, z).lineTo(5, z).lineTo(5, z.add(4)).lineTo(2, z.add(4)).close().revolve();
      const b = path().moveTo(6, z).lineTo(8, z).lineTo(8, z.add(4)).lineTo(6, z.add(4)).close().revolve();
      return a.union(b);
    `;
    const warm = await buildModel({ code, fileName: 'warm.kcad.ts' });
    const lowered = spyLowers();
    const edited = await updateModelParams(warm, [{ name: 'z', value: 10 }]);
    for (const record of warm.records) {
      if (record.kind === 'revolve' || record.kind === 'boolean') expect(lowered).not.toContain(record.id);
    }
    expect(lowered.some((id) => id.startsWith('sketch'))).toBe(true);
    const again = await updateModelParams(edited.model, [{ name: 'z', value: 18 }]);
    for (const record of warm.records) {
      if (record.kind === 'revolve' || record.kind === 'boolean') expect(lowered).not.toContain(record.id);
    }
    const cold = await coldAt(code, "param('z', 0,", "param('z', 18,");
    expectSameSolid(rootOf(again.model), rootOf(cold));
  });

  it('drops a document when its source changes or the store evicts it', async () => {
    const disposed: OcctBackend[] = [];
    const orig = OcctBackend.prototype.dispose;
    OcctBackend.prototype.dispose = function () {
      disposed.push(this);
      return orig.call(this);
    };
    restore = () => {
      OcctBackend.prototype.dispose = orig;
    };
    const store = createWarmDocumentStore({
      maxDocuments: 1,
      build: (input) => buildModel(input),
    });
    const small = `const s = param('s', 4, { min: 1, max: 20 }); return box(s, s, s);`;
    const large = `const s = param('s', 8, { min: 1, max: 20 }); return box(s, s, s);`;
    const first = await store.open({ id: 'doc', code: small, fileName: 'a.kcad.ts' });
    const firstVolume = rootOf(first.model).volume();
    const lowered = spyLowers();
    const again = await store.open({ id: 'doc', code: small, fileName: 'a.kcad.ts' });
    expect(again.model).toBe(first.model);
    expect(lowered).toHaveLength(0);
    const replaced = await store.open({ id: 'doc', code: large, fileName: 'a.kcad.ts' });
    expect(replaced.model).not.toBe(first.model);
    expect(rootOf(replaced.model).volume()).toBeGreaterThan(firstVolume);
    expect(disposed.length).toBeGreaterThan(0);
    disposed.length = 0;
    await store.open({ id: 'other', code: small, fileName: 'b.kcad.ts' });
    expect(store.has('doc')).toBe(false);
    expect(store.has('other')).toBe(true);
    expect(disposed.length).toBeGreaterThan(0);
    const edited = await store.edit('other', [{ name: 's', value: 5 }]);
    expect(edited.path).toBe('incremental');
    expect(rootOf(edited.document.model).volume()).toBeCloseTo(125, 3);
  });

  it('invalidates the cached document when a lower fails', async () => {
    const store = createWarmDocumentStore({
      build: (input) => buildModel(input),
    });
    const code = `
      const x0 = param('x0', 2, { min: -2, max: 5 });
      return path().moveTo(x0, 0).lineTo(x0.add(3), 0).lineTo(x0.add(3), 2).lineTo(x0, 2).close().revolve();
    `;
    await store.open({ id: 'cross', code, fileName: 'cross.kcad.ts' });
    await expect(store.edit('cross', [{ name: 'x0', value: -1 }])).rejects.toThrow(/no shape produced/);
    expect(store.has('cross')).toBe(false);
    const reopened = await store.open({ id: 'cross', code, fileName: 'cross.kcad.ts' });
    expect(rootOf(reopened.model).volume()).toBeGreaterThan(0);
  });
});
