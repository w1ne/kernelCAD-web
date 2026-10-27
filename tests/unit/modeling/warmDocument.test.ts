// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { OcctBackend, initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { OcctLowerer } from '../../../src/modeling/backends/occt/occtLowerer';
import { predecessorsByRecord } from '../../../src/modeling/compute/recomputeEngine';
import { buildModel, updateModelParams, type BuiltModel } from '../../../src/modeling/buildModel';
import { createWarmDocumentStore } from '../../../src/modeling/warm/documentSession';
import { featureFingerprints } from '../../../src/modeling/warm/featureFingerprint';
import { importIdentity } from '../../../src/modeling/warm/importIdentity';
import type { ShapeBackend } from '../../../src/kernel/backends/backend';
import type { FeatureRecord } from '../../../src/shared/intent/featureRecord';
import type { SurfaceRecord } from '../../../src/shared/intent/surfaceRecord';
import { ParamTable } from '../../../src/shared/runtime/paramTable';

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

  it('does not place a translated union through a later rotate', async () => {
    const code = `
      const z = param('z', 0, { min: 0, max: 40 });
      const a = cylinder(6, 3).translate(0, 0, z);
      const b = cylinder(5, 2).translate(0, 0, z.add(12));
      return a.union(b).rotateX(90);
    `;
    const warm = await buildModel({ code, fileName: 'warm.kcad.ts' });
    const edited = await updateModelParams(warm, [{ name: 'z', value: 15 }]);
    const cold = await coldAt(code, "param('z', 0,", "param('z', 15,");
    expectSameSolid(rootOf(edited.model), rootOf(cold));
  });

  it('does not translate a twisted extrude when the profile shifts in plane', async () => {
    const code = `
      const x = param('x', 0, { min: -20, max: 20 });
      return path()
        .moveTo(x, 0).lineTo(x.add(10), 0).lineTo(x.add(10), 8).lineTo(x, 8).close()
        .extrude(12, { twistAngle: 90 });
    `;
    const warm = await buildModel({ code, fileName: 'warm.kcad.ts' });
    const edited = await updateModelParams(warm, [{ name: 'x', value: 10 }]);
    const cold = await coldAt(code, "param('x', 0,", "param('x', 10,");
    expectSameSolid(rootOf(edited.model), rootOf(cold));
  });

  it('re-lowers an extrude of sketch text when the text size changes', async () => {
    const code = `
      const size = param('size', 4, { min: 1, max: 20 });
      const x = param('x', 0, { min: 0, max: 30 });
      return sketch.text('A', { size, position: [x, 0] }).extrude(1);
    `;
    const warm = await buildModel({ code, fileName: 'warm.kcad.ts' });
    const extrude = warm.records.find((record) => record.kind === 'extrude')!;
    const lowered = spyLowers();
    const edited = await updateModelParams(warm, [{ name: 'size', value: 8 }]);
    expect(lowered).toContain(extrude.id);
    const cold = await coldAt(code, "param('size', 4,", "param('size', 8,");
    expectSameSolid(rootOf(edited.model), rootOf(cold));
  });

  it('fillets a moved cap instead of storing the uncut union', async () => {
    const code = `
      const x = param('x', 0, { min: 0, max: 40 });
      const cap = path()
        .moveTo(0, 0).lineTo(10, 0).lineTo(10, 6).lineTo(0, 6).close()
        .extrude(4, { faceLabels: { cap: 'top' } })
        .translate(x, 0, 0);
      const foot = box(4, 4, 2).translate(0, 0, -3);
      return cap.union(foot).fillet(0.5, 'cap');
    `;
    const warm = await buildModel({ code, fileName: 'warm.kcad.ts' });
    const edited = await updateModelParams(warm, [{ name: 'x', value: 12 }]);
    const cold = await coldAt(code, "param('x', 0,", "param('x', 12,");
    expectSameSolid(rootOf(edited.model), rootOf(cold));
    const again = await updateModelParams(edited.model, [{ name: 'x', value: 18 }]);
    const coldAgain = await coldAt(code, "param('x', 0,", "param('x', 18,");
    expectSameSolid(rootOf(again.model), rootOf(coldAgain));
  });

  it('does not treat a spline tangent delta as a profile translation', async () => {
    const code = `
      const x = param('x', 0, { min: -5, max: 20 });
      return path()
        .moveTo(x, 0)
        .spline([[x, 0], [x.add(8), 3], [x.add(4), 8]], { startTangent: [x.add(1), 0.5], endTangent: [1, 0] })
        .lineTo(x, 8)
        .close()
        .extrude(2);
    `;
    const warm = await buildModel({ code, fileName: 'warm.kcad.ts' });
    const edited = await updateModelParams(warm, [{ name: 'x', value: 5 }]);
    const cold = await coldAt(code, "param('x', 0,", "param('x', 5,");
    expectSameSolid(rootOf(edited.model), rootOf(cold));
  });

  it('rebuilds when scriptDir or an imported file changes', async () => {
    const code = `const s = param('s', 4, { min: 1, max: 20 }); return box(s, s, s);`;
    const store = createWarmDocumentStore({ build: (input) => buildModel(input) });
    const first = await store.open({ id: 'doc', code, fileName: 'a.kcad.ts', scriptDir: '/tmp/warm-a' });
    const lowered = spyLowers();
    const same = await store.open({ id: 'doc', code, fileName: 'a.kcad.ts', scriptDir: '/tmp/warm-a' });
    expect(same.model).toBe(first.model);
    expect(lowered).toHaveLength(0);
    const moved = await store.open({ id: 'doc', code, fileName: 'a.kcad.ts', scriptDir: '/tmp/warm-b' });
    expect(moved.model).not.toBe(first.model);
    expect(lowered.length).toBeGreaterThan(0);

    const dir = mkdtempSync(join(tmpdir(), 'warm-import-'));
    try {
      const stl = `solid t
facet normal 0 0 -1
 outer loop
  vertex 0 0 0
  vertex 10 0 0
  vertex 0 10 0
 endloop
endfacet
facet normal 0 -1 0
 outer loop
  vertex 0 0 0
  vertex 0 0 10
  vertex 10 0 0
 endloop
endfacet
facet normal -1 0 0
 outer loop
  vertex 0 0 0
  vertex 0 10 0
  vertex 0 0 10
 endloop
endfacet
facet normal 1 1 1
 outer loop
  vertex 10 0 0
  vertex 0 0 10
  vertex 0 10 0
 endloop
endfacet
endsolid t
`;
      writeFileSync(join(dir, 'part.stl'), stl);
      const imported = `return await lib.fromSTL('part.stl');`;
      const opened = await store.open({ id: 'stl', code: imported, fileName: 'part.kcad.ts', scriptDir: dir });
      const before = rootOf(opened.model).volume();
      writeFileSync(join(dir, 'part.stl'), stl.replaceAll('10', '20'));
      const replaced = await store.open({ id: 'stl', code: imported, fileName: 'part.kcad.ts', scriptDir: dir });
      expect(replaced.model).not.toBe(opened.model);
      const cold = await buildModel({ code: imported, fileName: 'part.kcad.ts', scriptDir: dir });
      expectSameSolid(rootOf(replaced.model), rootOf(cold));
      expect(rootOf(replaced.model).volume()).not.toBeCloseTo(before, 1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('does not keep a failed fillet as the warm document', async () => {
    const code = `
      const w = param('w', 10, { min: 4, max: 30 });
      return box(w, 8, 6).fillet(0.4, 'missing');
    `;
    const store = createWarmDocumentStore({ build: (input) => buildModel(input) });
    await store.open({ id: 'bad-fillet', code, fileName: 'bad.kcad.ts' });
    await expect(store.edit('bad-fillet', [{ name: 'w', value: 14 }])).rejects.toThrow(/no shape produced/);
    expect(store.has('bad-fillet')).toBe(false);
  });

  it('includes a vertex input in the feature fingerprint', () => {
    const upstream = (color: string): FeatureRecord => ({
      id: 'up',
      kind: 'box',
      inputs: {},
      params: {},
      transforms: [],
      suppressed: false,
      metadata: { color },
    });
    const consumer: FeatureRecord = {
      id: 'tip',
      kind: 'fillet',
      inputs: { tip: { kind: 'vertex', featureId: 'up', ref: { kind: 'tracked', vertexName: 'a' } } },
      params: {},
      transforms: [],
      suppressed: false,
    };
    const table = new ParamTable();
    const before = featureFingerprints([upstream('red'), consumer], table).get('tip');
    const after = featureFingerprints([upstream('blue'), consumer], table).get('tip');
    expect(before).toBeDefined();
    expect(after).not.toBe(before);
  });

  it('rebuilds a display mesh when meshFromSTL bytes change', async () => {
    const stl = (span: number) => `solid t
facet normal 0 0 1
 outer loop
  vertex 0 0 0
  vertex ${span} 0 0
  vertex 0 ${span} 0
 endloop
endfacet
endsolid t
`;
    const dir = mkdtempSync(join(tmpdir(), 'warm-mesh-'));
    try {
      writeFileSync(join(dir, 'part.stl'), stl(10));
      const code = `return await lib.meshFromSTL('part.stl');`;
      const store = createWarmDocumentStore({ build: (input) => buildModel(input) });
      const opened = await store.open({ id: 'mesh', code, fileName: 'part.kcad.ts', scriptDir: dir });
      writeFileSync(join(dir, 'part.stl'), stl(30));
      const replaced = await store.open({ id: 'mesh', code, fileName: 'part.kcad.ts', scriptDir: dir });
      expect(replaced.model).not.toBe(opened.model);
      const cold = await buildModel({ code, fileName: 'part.kcad.ts', scriptDir: dir });
      const warmBox = rootOf(replaced.model).boundingBox();
      const coldBox = rootOf(cold).boundingBox();
      expect(warmBox.max[0]).toBeCloseTo(coldBox.max[0], 3);
      expect(warmBox.max[1]).toBeCloseTo(coldBox.max[1], 3);
      expect(rootOf(opened.model).boundingBox().max[0]).not.toBeCloseTo(warmBox.max[0], 0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rebuilds fetchPart when the catalog step changes and refuses an unknown id', async () => {
    const missingA = await importIdentity(`return await lib.fetchPart('no-such-part-zz');`, undefined);
    const missingB = await importIdentity(`return await lib.fetchPart('no-such-part-zz');`, undefined);
    expect(missingA).not.toBe(missingB);

    const dir = mkdtempSync(join(tmpdir(), 'warm-part-'));
    const family = 'socket-head-cap-screw';
    const prev = process.env.KERNELCAD_PARTS_DIR;
    try {
      mkdirSync(join(dir, family), { recursive: true });
      const index = JSON.parse(readFileSync('assets/parts-seed/index.json', 'utf8')) as { records: { id: string }[] };
      index.records = index.records.filter((record) => record.id === 'iso-4762-m2x4');
      writeFileSync(join(dir, 'index.json'), JSON.stringify(index));
      const step = join(dir, family, 'iso-4762-m2x4.step');
      copyFileSync('assets/parts-seed/socket-head-cap-screw/iso-4762-m2x4.step', step);
      process.env.KERNELCAD_PARTS_DIR = dir;
      const code = `return await lib.fetchPart('iso-4762-m2x4');`;
      const store = createWarmDocumentStore({ build: (input) => buildModel(input) });
      const opened = await store.open({ id: 'part', code, fileName: 'part.kcad.ts', scriptDir: dir });
      const before = rootOf(opened.model).volume();
      copyFileSync('assets/parts-seed/heat-set-insert/heatset-m2-5-l3-8.step', step);
      const replaced = await store.open({ id: 'part', code, fileName: 'part.kcad.ts', scriptDir: dir });
      expect(replaced.model).not.toBe(opened.model);
      const cold = await buildModel({ code, fileName: 'part.kcad.ts', scriptDir: dir });
      expectSameSolid(rootOf(replaced.model), rootOf(cold));
      expect(rootOf(replaced.model).volume()).not.toBeCloseTo(before, 1);
    } finally {
      if (prev === undefined) delete process.env.KERNELCAD_PARTS_DIR;
      else process.env.KERNELCAD_PARTS_DIR = prev;
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('dispose frees an analysis envelope and leaves a placed clone', async () => {
    await initOcct();
    const main = OcctBackend.box(4, 4, 4);
    const envelope = OcctBackend.box(1, 1, 1);
    const placed = envelope.clone().translate(10, 0, 0);
    const placedVolume = placed.volume();
    main.analysisBody = envelope;
    main.dispose();
    expect(placed.volume()).toBeCloseTo(placedVolume, 3);
    expect(() => envelope.volume()).toThrow();
  });

  it('includes a surface input in the fingerprint and the affect graph', () => {
    const surface = (x: number): SurfaceRecord => ({
      id: 'surface_1',
      kind: 'nurbsSurface',
      params: {},
      data: {
        kind: 'nurbsSurface',
        controls: [[[x, 0, 0], [1, 0, 0]], [[x, 1, 0], [1, 1, 0]]],
        degree: { u: 1, v: 1 },
      },
    });
    const consumer: FeatureRecord = {
      id: 'thick',
      kind: 'surfaceThicken',
      inputs: { surface: { kind: 'surface', surfaceId: 'surface_1' } },
      params: {},
      transforms: [],
      suppressed: false,
    };
    const table = new ParamTable();
    const before = featureFingerprints([consumer], table, [surface(0)]).get('thick');
    const after = featureFingerprints([consumer], table, [surface(3)]).get('thick');
    expect(before).toBeDefined();
    expect(after).not.toBe(before);
    expect(predecessorsByRecord([consumer]).get('thick')).toEqual(['surface_1']);
  });

  it('does not return a memoised volume or box after dispose', async () => {
    await initOcct();
    const box = OcctBackend.box(2, 2, 2);
    expect(box.volume()).toBeCloseTo(8, 3);
    box.boundingBox();
    box.dispose();
    expect(() => box.volume()).toThrow();
    expect(() => box.boundingBox()).toThrow();
  });

  it('does not reuse a document after its font file disappears', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'warm-font-'));
    const goneA = await importIdentity(`return sketch.text('A', { font: fontPath('A.ttf') });`, dir);
    const goneB = await importIdentity(`return sketch.text('A', { font: fontPath('A.ttf') });`, dir);
    expect(goneA).not.toBe(goneB);
    try {
      copyFileSync('src/shared/fonts/LiberationSans-Regular.ttf', join(dir, 'A.ttf'));
      const code = `return sketch.text('A', { size: 6, font: fontPath('A.ttf') }).extrude(1);`;
      const store = createWarmDocumentStore({ build: (input) => buildModel(input) });
      await store.open({ id: 'plaque', code, fileName: 'a.kcad.ts', scriptDir: dir });
      rmSync(join(dir, 'A.ttf'));
      const again = await store.open({ id: 'plaque', code, fileName: 'a.kcad.ts', scriptDir: dir });
      expect(again.model.rootShape).toBeUndefined();
      expect(again.model.diagnostics.some((d) => d.severity === 'error' && /ENOENT/.test(d.message))).toBe(true);
      const third = await store.open({ id: 'plaque', code, fileName: 'a.kcad.ts', scriptDir: dir });
      expect(third.model).not.toBe(again.model);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('re-lowers a Coons thicken when a boundary curve moves', async () => {
    const code = `
      const z = param('z', 0, { min: -5, max: 30 });
      const bottom = nurbsCurve([[0, 0, z], [12, 0, z]], { degree: 1 });
      const right = nurbsCurve([[12, 0, z], [12, 8, z]], { degree: 1 });
      const top = nurbsCurve([[12, 8, z], [0, 8, z]], { degree: 1 });
      const left = nurbsCurve([[0, 8, z], [0, 0, z]], { degree: 1 });
      return surfaceFromBoundary([bottom, right, top, left]).thicken(2);
    `;
    const warm = await buildModel({ code, fileName: 'warm.kcad.ts' });
    const thicken = warm.records.find((record) => record.kind === 'surfaceThicken')!;
    const lowered = spyLowers();
    const edited = await updateModelParams(warm, [{ name: 'z', value: 6 }]);
    expect(lowered).toContain(thicken.id);
    const cold = await coldAt(code, "param('z', 0,", "param('z', 6,");
    expectSameSolid(rootOf(edited.model), rootOf(cold));
  });
});
