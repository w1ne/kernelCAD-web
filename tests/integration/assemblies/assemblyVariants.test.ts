// SPDX-License-Identifier: MIT
// Connected children follow a mated imported parent. A named variant leaves
// parts out of the assembly's own scene and of a sub-assembly import.
import { dirname, resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { computeBom } from '../../../src/agent/script-runtime/bom';
import { runScript } from '../../../src/composition/runScript';
import { initOcct, OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { isSceneBackend, type SceneBackendPart } from '../../../src/kernel/backends/sceneBackend';
import { Assembly } from '../../../src/modeling/capture/assembly';
import { RecomputeEngine } from '../../../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../../src/modeling/backends/occt/occtLowerer';
import { resolvedPartAt } from '../../../src/modeling/mates/partFrame';
import { KernelError } from '../../../src/shared/intent/kernelError';
import type { Scene } from '../../../src/modeling/validation/scene';
import type { Vec3 } from '../../../src/shared/intent/types';

const MISMATCH = resolve('tests/fixtures/assembly-configurations/interface-mismatch.kcad.ts');
const SCRIPT_DIR = dirname(MISMATCH);
const ALUMINUM = 2700;

beforeAll(async () => { await initOcct(); }, 60_000);

type ScriptRun = Awaited<ReturnType<typeof runScript>>;

function massG(volumeMm3: number, densityKgM3: number): number {
  return volumeMm3 * densityKgM3 / 1e6;
}

function close(point: Vec3, expected: readonly [number, number, number], digits = 6): void {
  expect(point[0]).toBeCloseTo(expected[0], digits);
  expect(point[1]).toBeCloseTo(expected[1], digits);
  expect(point[2]).toBeCloseTo(expected[2], digits);
}

function expectLoweredWorldBox(
  part: SceneBackendPart,
  min: readonly [number, number, number],
  max: readonly [number, number, number],
): void {
  const shape = part.shape as OcctBackend;
  expect(shape).toBeInstanceOf(OcctBackend);
  const box = shape.boundingBox();
  close(part.worldTransform.point([box.min[0], box.min[1], box.min[2]]), min);
  close(part.worldTransform.point([box.max[0], box.max[1], box.max[2]]), max);
}

async function evalScript(code: string, fileName: string): Promise<ScriptRun> {
  return runScript({ code, fileName, scriptDir: SCRIPT_DIR });
}

function assemblyNamed(run: ScriptRun, name: string): Assembly {
  const arm = run.session.assemblies.get(name);
  expect(arm).toBeInstanceOf(Assembly);
  return arm as Assembly;
}

async function loweredParts(run: ScriptRun): Promise<Map<string, SceneBackendPart>> {
  const model = [...run.records].reverse().find((record) => record.kind === 'assemblyModel');
  expect(model).toBeDefined();
  const lowered = await new RecomputeEngine(createOcctLowerer(run.session)).run(run.records, { paramTable: run.paramTable });
  expect(lowered.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  const scene = lowered.shapes.get(model!.id);
  expect(isSceneBackend(scene)).toBe(true);
  if (!isSceneBackend(scene)) throw new Error('the model did not lower to a scene');
  return new Map(scene.parts.map((part) => [part.name, part]));
}

async function failScript(code: string): Promise<KernelError> {
  try {
    await evalScript(code, 'negative.kcad.ts');
  } catch (error) {
    expect(error).toBeInstanceOf(KernelError);
    return error as KernelError;
  }
  throw new Error('the script was expected to fail');
}

describe('connected parts survive subAssembly import', () => {
  it('moves an imported connected child when a mate moves its base', async () => {
    const run = await evalScript(`
      const child = assembly('nest');
      const base = child.part('base', box(10, 10, 10), {
        connectors: { face: { origin: [10, 0, 0] } },
      });
      base.connector('seat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] }, normal: [0, 0, 1] });
      const pad = child.part('pad', box(4, 4, 4), {
        connectors: { root: { origin: [0, 0, 0] }, tip: { origin: [4, 0, 0] } },
        connect: { connector: 'root', to: base.connector('face') },
      });
      child.part('tip', box(2, 2, 2), {
        connectors: { root: { origin: [0, 0, 0] } },
        connect: { connector: 'root', to: pad.connector('tip') },
      });
      child.part('loose', box(3, 3, 3), { at: [10, 40, 0] });
      const parent = assembly('rig');
      const mount = parent.part('mount', box(10, 10, 10).translate(-10, 0, 0), { at: [100, 0, 0] });
      mount.connector('seat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] }, normal: [0, 0, 1] });
      const sub = parent.subAssembly('nest', child);
      parent.mate('seat', 'mount.seat', sub.ref('base', 'seat'), 'fastened');
      return parent.model();
    `, 'connect-follows.kcad.ts');

    const child = assemblyNamed(run, 'nest');
    const parent = assemblyNamed(run, 'rig');
    const oldBase = child.__parts().find((part) => part.name === 'base');
    const oldPad = child.__parts().find((part) => part.name === 'pad');
    const mount = parent.__parts().find((part) => part.name === 'mount');
    const base = parent.__parts().find((part) => part.name === 'nest_base');
    const pad = parent.__parts().find((part) => part.name === 'nest_pad');
    const tip = parent.__parts().find((part) => part.name === 'nest_tip');
    const loose = parent.__parts().find((part) => part.name === 'nest_loose');
    expect(oldBase).toBeDefined();
    expect(mount).toBeDefined();
    expect(base).toBeDefined();
    expect(pad).toBeDefined();
    expect(tip).toBeDefined();
    expect(loose).toBeDefined();

    close(resolvedPartAt(pad!.at, run.paramTable), [10, 0, 0]);
    close(resolvedPartAt(tip!.at, run.paramTable), [14, 0, 0]);
    close(resolvedPartAt(loose!.at, run.paramTable), [10, 40, 0]);
    expect(pad!.connectParentId).toBe(base!.id);
    expect(pad!.connectParentId).not.toBe(oldBase!.id);
    expect(tip!.connectParentId).toBe(pad!.id);
    expect(oldPad!.connectParentId).toBe(oldBase!.id);
    expect(base!.connectParentId).toBeUndefined();
    expect(loose!.connectParentId).toBeUndefined();

    const records = parent.__session().getRecords();
    const padRecord = records.find((record) => record.id === pad!.id);
    const tipRecord = records.find((record) => record.id === tip!.id);
    expect(padRecord?.metadata?.placedBy).toMatchObject({
      connector: 'root',
      to: { partId: base!.id, partName: 'nest_base', connector: 'face' },
    });
    expect(tipRecord?.metadata?.placedBy).toMatchObject({
      connector: 'root',
      to: { partId: pad!.id, partName: 'nest_pad', connector: 'tip' },
    });
    const padConnect = records.find((record) => record.kind === 'assemblyConnect' && record.inputs.b?.kind === 'feature' && record.inputs.b.id === pad!.id);
    expect(padConnect?.inputs.a).toMatchObject({ kind: 'feature', id: base!.id });

    const scene = run.returnValue as Scene;
    close(scene.part('nest_base').worldTransform.point([0, 0, 0]), [100, 0, 0]);
    close(scene.part('nest_pad').worldTransform.point(resolvedPartAt(pad!.at, run.paramTable)), [110, 0, 0]);
    close(scene.part('nest_tip').worldTransform.point(resolvedPartAt(tip!.at, run.paramTable)), [114, 0, 0]);

    const boxes = await loweredParts(run);
    expectLoweredWorldBox(boxes.get('mount')!, [90, 0, 0], [100, 10, 10]);
    expectLoweredWorldBox(boxes.get('nest_base')!, [100, 0, 0], [110, 10, 10]);
    expectLoweredWorldBox(boxes.get('nest_pad')!, [110, 0, 0], [114, 4, 4]);
    expectLoweredWorldBox(boxes.get('nest_tip')!, [114, 0, 0], [116, 2, 2]);
    expectLoweredWorldBox(boxes.get('nest_loose')!, [10, 40, 0], [13, 43, 3]);
    expect((await mount!.originalShape.lower()).volume()).toBeCloseTo(1000, 6);
    expect((await base!.originalShape.lower()).volume()).toBeCloseTo(1000, 6);
    expect((await pad!.originalShape.lower()).volume()).toBeCloseTo(64, 6);
    expect((await tip!.originalShape.lower()).volume()).toBeCloseTo(8, 6);
    expect((await loose!.originalShape.lower()).volume()).toBeCloseTo(27, 6);
  });

  it('rejects an import whose connected parent is not copied', async () => {
    const run = await evalScript(`
      const child = assembly('child');
      const base = child.part('base', box(10, 10, 10), { connectors: { face: { origin: [10, 0, 0] } } });
      child.part('pad', box(4, 4, 4), {
        connectors: { root: { origin: [0, 0, 0] } },
        connect: { connector: 'root', to: base.connector('face') },
      });
      child.variant('bare', { suppress: ['base'] });
      child.useVariant('bare');
      child.part('late', box(2, 2, 2), {
        connectors: { root: { origin: [0, 0, 0] } },
        connect: { connector: 'root', to: base.connector('face') },
      });
      const parent = assembly('parent');
      parent.part('rail', box(1, 1, 1));
      let failed = null;
      try { parent.subAssembly('nest', child); }
      catch (error) { failed = { code: error.code, message: error.message, hint: error.hint }; }
      return {
        failed,
        parent: parent.__parts().map((part) => part.name),
        child: child.__parts().map((part) => part.name),
      };
    `, 'connect-parent-missing.kcad.ts');
    const returned = run.returnValue as {
      failed: { code: string; message: string; hint: string } | null;
      parent: string[];
      child: string[];
    };
    expect(returned.failed?.code).toBe('feature.invalid-args');
    expect(returned.failed?.hint).toContain('invalid-args.assembly.connect-parent-missing');
    expect(returned.failed?.message).toContain('late');
    expect(returned.parent).toEqual(['rail']);
    expect(returned.child).toEqual(['late']);
  });
});

describe('assembly variants', () => {
  it('leaves a suppressed part out of the scene and the bill of materials, then restores it', async () => {
    const run = await evalScript(`
      const arm = assembly('arm');
      arm.part('base', box(20, 10, 4), { density: ${ALUMINUM} });
      arm.part('cover', box(20, 10, 2), { at: [0, 0, 4], density: ${ALUMINUM} });
      arm.variant('open', { suppress: ['cover', 'cover'] });
      arm.variant('full', { suppress: [] });
      arm.useVariant('open');
      arm.useVariant('open');
      return arm.model();
    `, 'variant-open.kcad.ts');
    const arm = assemblyNamed(run, 'arm');
    expect(arm.__parts().map((part) => part.name)).toEqual(['base']);
    const boxes = await loweredParts(run);
    expect([...boxes.keys()]).toEqual(['base']);
    expectLoweredWorldBox(boxes.get('base')!, [0, 0, 0], [20, 10, 4]);
    const openBom = await computeBom(arm, run.session);
    expect(openBom.rows.some((row) => row.instancePaths.includes('cover'))).toBe(false);
    expect(openBom.rows.find((row) => row.instancePaths.includes('base'))?.massGPerUnit).toBeCloseTo(massG(800, ALUMINUM), 4);

    const restored = await evalScript(`
      const arm = assembly('arm');
      arm.part('base', box(20, 10, 4), { density: ${ALUMINUM} });
      arm.part('cover', box(20, 10, 2), { at: [0, 0, 4], density: ${ALUMINUM} });
      arm.variant('open', { suppress: ['cover'] });
      arm.variant('full', { suppress: [] });
      arm.useVariant('open');
      arm.useVariant('full');
      return arm.model();
    `, 'variant-full.kcad.ts');
    const full = assemblyNamed(restored, 'arm');
    expect(full.__parts().map((part) => part.name)).toEqual(['base', 'cover']);
    const fullBoxes = await loweredParts(restored);
    expectLoweredWorldBox(fullBoxes.get('cover')!, [0, 0, 4], [20, 10, 6]);
    const fullBom = await computeBom(full, restored.session);
    expect(fullBom.rows.find((row) => row.instancePaths.includes('cover'))?.massGPerUnit).toBeCloseTo(massG(400, ALUMINUM), 4);
  });

  it('parks mates, joints, and couplings that mention a suppressed part', async () => {
    const run = await evalScript(`
      const arm = assembly('arm');
      const base = arm.part('base', box(20, 10, 4));
      const cover = arm.part('cover', box(20, 10, 2), { at: [0, 0, 4] });
      const shoe = arm.part('shoe', box(6, 6, 6), { at: [40, 0, 0] });
      base.connector('lid', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 4] }, axis: [1, 0, 0] });
      cover.connector('lid', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [1, 0, 0] });
      base.connector('toe', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
      shoe.connector('toe', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
      arm.mate('lid', 'base.lid', 'cover.lid', 'revolute');
      arm.mate('toe', 'base.toe', 'shoe.toe', 'revolute');
      arm.coupleMates('toe', { source: 'lid', ratio: 1 });
      arm.revolute('pin', base, cover, { axis: [1, 0, 0], origin: [0, 0, 4] });
      arm.variant('open', { suppress: ['cover'] });
      arm.variant('full', {});
      arm.useVariant('open');
      const open = {
        parts: arm.__parts().map((part) => part.name),
        mates: arm.__mates().map((mate) => mate.name),
        joints: arm.__joints().map((joint) => joint.name),
        couplings: arm.__mateCouplings().map((coupling) => coupling.driven),
      };
      arm.useVariant('full');
      return {
        open,
        full: {
          parts: arm.__parts().map((part) => part.name),
          mates: arm.__mates().map((mate) => mate.name),
          joints: arm.__joints().map((joint) => joint.name),
          couplings: arm.__mateCouplings().map((coupling) => ({ driven: coupling.driven, source: coupling.source, ratio: coupling.ratio })),
        },
      };
    `, 'variant-mates.kcad.ts');
    const returned = run.returnValue as {
      open: { parts: string[]; mates: string[]; joints: string[]; couplings: string[] };
      full: { parts: string[]; mates: string[]; joints: string[]; couplings: { driven: string; source: string; ratio: number }[] };
    };
    expect(returned.open).toEqual({
      parts: ['base', 'shoe'],
      mates: ['toe'],
      joints: [],
      couplings: [],
    });
    expect(returned.full.parts).toEqual(['base', 'cover', 'shoe']);
    expect(returned.full.mates).toEqual(['lid', 'toe']);
    expect(returned.full.joints).toEqual(['pin']);
    expect(returned.full.couplings).toEqual([{ driven: 'toe', source: 'lid', ratio: 1 }]);
  });

  it('drops a connected child when its base is suppressed and keeps an unconnected part', async () => {
    const run = await evalScript(`
      const child = assembly('child');
      const base = child.part('base', box(10, 10, 10), { connectors: { face: { origin: [10, 0, 0] } } });
      child.part('pad', box(4, 4, 4), {
        connectors: { root: { origin: [0, 0, 0] } },
        connect: { connector: 'root', to: base.connector('face') },
      });
      child.part('tag', box(2, 2, 2), { at: [50, 0, 0] });
      child.variant('bare', { suppress: ['base'] });
      const parent = assembly('parent');
      parent.subAssembly('nest', child, { variant: 'bare' });
      return parent.model();
    `, 'variant-closure.kcad.ts');
    const child = assemblyNamed(run, 'child');
    const parent = assemblyNamed(run, 'parent');
    expect(child.__parts().map((part) => part.name)).toEqual(['base', 'pad', 'tag']);
    expect(parent.__parts().map((part) => part.name)).toEqual(['nest_tag']);
    const boxes = await loweredParts(run);
    expectLoweredWorldBox(boxes.get('nest_tag')!, [50, 0, 0], [52, 2, 2]);
    expect((await parent.__parts()[0]!.originalShape.lower()).volume()).toBeCloseTo(8, 6);
  });

  it('imports two variants of one child without changing the child', async () => {
    const run = await evalScript(`
      const child = assembly('child');
      child.part('base', box(20, 10, 4));
      child.part('cover', box(20, 10, 2), { at: [0, 0, 4] });
      child.variant('open', { suppress: ['cover'] });
      child.variant('full', { suppress: [] });
      const parent = assembly('parent');
      parent.subAssembly('openNest', child, { variant: 'open' });
      parent.subAssembly('fullNest', child, { variant: 'full' });
      return parent.model();
    `, 'two-variants.kcad.ts');
    const child = assemblyNamed(run, 'child');
    const parent = assemblyNamed(run, 'parent');
    expect(child.__parts().map((part) => part.name)).toEqual(['base', 'cover']);
    expect(parent.__parts().map((part) => part.name)).toEqual(['openNest_base', 'fullNest_base', 'fullNest_cover']);
    const boxes = await loweredParts(run);
    expectLoweredWorldBox(boxes.get('openNest_base')!, [0, 0, 0], [20, 10, 4]);
    expectLoweredWorldBox(boxes.get('fullNest_base')!, [0, 0, 0], [20, 10, 4]);
    expectLoweredWorldBox(boxes.get('fullNest_cover')!, [0, 0, 4], [20, 10, 6]);
  });

  it('lets an explicit variant win over the child selection', async () => {
    const run = await evalScript(`
      const child = assembly('child');
      child.part('base', box(20, 10, 4));
      child.part('cover', box(20, 10, 2), { at: [0, 0, 4] });
      child.variant('open', { suppress: ['cover'] });
      child.variant('full', { suppress: [] });
      child.useVariant('open');
      const parent = assembly('parent');
      parent.subAssembly('fullNest', child, { variant: 'full' });
      parent.subAssembly('shown', child);
      return {
        child: child.__parts().map((part) => part.name),
        parent: parent.__parts().map((part) => part.name),
      };
    `, 'variant-wins.kcad.ts');
    const returned = run.returnValue as { child: string[]; parent: string[] };
    expect(returned.child).toEqual(['base']);
    expect(returned.parent).toEqual(['fullNest_base', 'fullNest_cover', 'shown_base']);
  });

  it('can name a part that the active variant has already hidden', async () => {
    const run = await evalScript(`
      const arm = assembly('arm');
      arm.part('base', box(20, 10, 4));
      arm.part('cover', box(20, 10, 2), { at: [0, 0, 4] });
      arm.variant('open', { suppress: ['cover'] });
      arm.useVariant('open');
      arm.variant('baseOnly', { suppress: ['base', 'cover'] });
      arm.useVariant('baseOnly');
      return arm.__parts().map((part) => part.name);
    `, 'variant-hidden-name.kcad.ts');
    expect(run.returnValue).toEqual([]);
  });

  it('does not build a scene when every part is suppressed', async () => {
    const error = await failScript(`
      const arm = assembly('arm');
      arm.part('base', box(20, 10, 4));
      arm.part('cover', box(20, 10, 2));
      arm.variant('none', { suppress: ['base', 'cover'] });
      arm.useVariant('none');
      return arm.model();
    `);
    expect(error.code).toBe('feature.invalid-args');
    expect(error.message).toContain('at least one part');
  });

  it('rejects an unknown variant, a duplicate name, and an unknown part without changing the assembly', async () => {
    const run = await evalScript(`
      const child = assembly('child');
      child.part('base', box(2, 2, 2));
      child.part('cover', box(2, 2, 2), { at: [3, 0, 0] });
      child.variant('open', { suppress: [] });
      const parent = assembly('parent');
      parent.part('rail', box(2, 2, 2));
      let unknownImport = null;
      try { parent.subAssembly('nest', child, { variant: 'missing' }); }
      catch (error) { unknownImport = { code: error.code, message: error.message, hint: error.hint }; }
      let duplicate = null;
      try { child.variant('open', { suppress: ['base'] }); }
      catch (error) { duplicate = { code: error.code, message: error.message, hint: error.hint }; }
      let unknownPart = null;
      try { child.variant('bad', { suppress: ['nope'] }); }
      catch (error) { unknownPart = { code: error.code, message: error.message, hint: error.hint }; }
      let unknownUse = null;
      const before = child.__parts().map((part) => part.name);
      try { child.useVariant('nope'); }
      catch (error) { unknownUse = { code: error.code, message: error.message, hint: error.hint }; }
      child.useVariant('open');
      return {
        unknownImport,
        duplicate,
        unknownPart,
        unknownUse,
        before,
        afterUnknown: child.__parts().map((part) => part.name),
        parent: parent.__parts().map((part) => part.name),
        child: child.__parts().map((part) => part.name),
      };
    `, 'variant-negatives.kcad.ts');
    const returned = run.returnValue as {
      unknownImport: { code: string; message: string; hint: string };
      duplicate: { code: string; message: string; hint: string };
      unknownPart: { code: string; message: string; hint: string };
      unknownUse: { code: string; message: string; hint: string };
      before: string[];
      afterUnknown: string[];
      parent: string[];
      child: string[];
    };
    expect(returned.unknownImport.code).toBe('feature.invalid-args');
    expect(returned.unknownImport.hint).toContain('invalid-args.assembly.variant-unknown');
    expect(returned.unknownImport.message).toContain('missing');
    expect(returned.duplicate.hint).toContain('invalid-args.assembly.variant-duplicate');
    expect(returned.unknownPart.hint).toContain('invalid-args.assembly.variant-suppress');
    expect(returned.unknownPart.message).toContain('nope');
    expect(returned.unknownUse.hint).toContain('invalid-args.assembly.variant-unknown');
    expect(returned.before).toEqual(['base', 'cover']);
    expect(returned.afterUnknown).toEqual(['base', 'cover']);
    expect(returned.parent).toEqual(['rail']);
    expect(returned.child).toEqual(['base', 'cover']);
  });

  it('does not let a suppressed configuration commit a mismatched interface', async () => {
    const run = await evalScript(`
      const source = ${JSON.stringify(MISMATCH)};
      const lid = assembly('lid');
      await lid.instance('plate', { source, configuration: 'plate', density: ${ALUMINUM} });
      lid.part('tag', box(6, 6, 6), { at: [30, 0, 0], density: 1000 });
      lid.variant('tagOnly', { suppress: ['plate'] });
      lid.variant('full', { suppress: [] });
      const parent = assembly('parent');
      parent.subAssembly('nest', lid, { variant: 'tagOnly' });
      let pin = null;
      try { await parent.instance('pin', { source, configuration: 'pin' }); }
      catch (error) { pin = { code: error.code, message: error.message, hint: error.hint }; }
      let plate = null;
      try { await parent.instance('plateLater', { source, configuration: 'plate' }); }
      catch (error) { plate = { code: error.code, message: error.message, hint: error.hint }; }
      const parent2 = assembly('parent2');
      await parent2.instance('pin', { source, configuration: 'pin' });
      let kept = null;
      try { parent2.subAssembly('lids', lid, { variant: 'full' }); }
      catch (error) { kept = { code: error.code, message: error.message, hint: error.hint }; }
      return {
        lid: lid.__parts().map((part) => part.name),
        parent: parent.__parts().map((part) => ({
          name: part.name,
          configuration: part.configuration && part.configuration.name,
          signature: part.configuration && part.configuration.interfaceSignature,
        })),
        pin,
        plate,
        parent2: parent2.__parts().map((part) => part.name),
        kept,
      };
    `, 'variant-interface.kcad.ts');
    const returned = run.returnValue as {
      lid: string[];
      parent: { name: string; configuration?: string; signature?: string }[];
      pin: { code: string; message: string; hint: string } | null;
      plate: { code: string; message: string; hint: string } | null;
      parent2: string[];
      kept: { code: string; message: string; hint: string } | null;
    };
    expect(returned.lid).toEqual(['plate', 'tag']);
    expect(returned.parent).toEqual([
      { name: 'nest_tag', configuration: undefined, signature: undefined },
      { name: 'pin', configuration: 'pin', signature: 'mount:axis' },
    ]);
    expect(returned.pin).toBeNull();
    expect(returned.plate?.code).toBe('feature.invalid-args');
    expect(returned.plate?.hint).toContain('invalid-args.assembly.configuration-interface-mismatch');
    expect(returned.parent2).toEqual(['pin']);
    expect(returned.kept?.code).toBe('feature.invalid-args');
    expect(returned.kept?.hint).toContain('invalid-args.assembly.configuration-interface-mismatch');
    const parent = assemblyNamed(run, 'parent');
    const tag = parent.__parts().find((part) => part.name === 'nest_tag');
    expect((await tag!.originalShape.lower()).volume()).toBeCloseTo(216, 6);
    const bom = await computeBom(parent, run.session);
    expect(bom.rows.some((row) => row.configuration?.name === 'plate')).toBe(false);
    expect(bom.rows.find((row) => row.instancePaths.includes('nest_tag'))?.massGPerUnit).toBeCloseTo(massG(216, 1000), 4);
  });
});
