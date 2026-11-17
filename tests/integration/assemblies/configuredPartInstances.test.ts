// SPDX-License-Identifier: MIT
// Two configurations of one bearing-block source, plus a repeated compact
// instance. Oracles are the closed-form blank-minus-bores volume and the
// fastened-mate placement (child connector origin lands on the parent pad).
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { computeBom } from '../../../src/agent/script-runtime/bom';
import { lowerScriptScene } from '../../../src/agent/script-runtime/checkInterference';
import { runScript } from '../../../src/composition/runScript';
import { OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { isSceneBackend, type SceneBackendPart } from '../../../src/kernel/backends/sceneBackend';
import { Assembly } from '../../../src/modeling/capture/assembly';
import type { AssemblyPartStored } from '../../../src/modeling/capture/assemblyTypes';
import { RecomputeEngine } from '../../../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../../src/modeling/backends/occt/occtLowerer';
import { atPlacement, resolvedPartAt } from '../../../src/modeling/mates/partFrame';
import { detectInterferences } from '../../../src/modeling/runtime/detectInterferences';
import { KernelError } from '../../../src/shared/intent/kernelError';
import type { Scene } from '../../../src/modeling/validation/scene';
import type { ParamTable } from '../../../src/shared/runtime/paramTable';
import type { Vec3 } from '../../../src/shared/intent/types';

const ASSEMBLY = resolve('examples/assemblies/configured-bearing-blocks.kcad.ts');
const BEARING = resolve('examples/manufacturing-showcase/bearing-block.kcad.ts');
const BAD_TYPE = resolve('tests/fixtures/assembly-configurations/bad-type.kcad.ts');
const MISMATCH = resolve('tests/fixtures/assembly-configurations/interface-mismatch.kcad.ts');

const COMPACT = { length: 80, width: 50, thickness: 18 } as const;
const WIDE = { length: 110, width: 70, thickness: 22 } as const;
const ALUMINUM_DENSITY = 2700;
const PLATE_MM = { x: 10, y: 10, z: 4 } as const;
const PAD_MM = { x: 8, y: 8, z: 8 } as const;
const RAIL_MM = { x: 10, y: 4, z: 4 } as const;
const BARE_MM = { x: 2, y: 2, z: 2 } as const;
const PAD_DENSITY = 8000;
const RAIL_DENSITY = 1000;

/** Grams from mm³ and kg/m³: mm³ → m³ → kg → g. */
function massG(volumeMm3: number, densityKgM3: number): number {
  return volumeMm3 * densityKgM3 / 1e6;
}

/** Blank minus the 8.5 through bore, the Ø22 × 7 seat, and four Ø5.5 mounts. */
function bearingVolume(length: number, width: number, thickness: number): number {
  const counterboreDepth = 7;
  const removed = Math.PI * (
    4.25 ** 2 * (thickness - counterboreDepth)
    + 11 ** 2 * counterboreDepth
    + 4 * 2.75 ** 2 * thickness
  );
  return length * width * thickness - removed;
}

function close(point: Vec3, expected: readonly [number, number, number], digits = 6): void {
  expect(point[0]).toBeCloseTo(expected[0], digits);
  expect(point[1]).toBeCloseTo(expected[1], digits);
  expect(point[2]).toBeCloseTo(expected[2], digits);
}

/** Part-frame placement. A mate-free part's solid is moved by `at`, and the
 *  scene motion on top of that is identity, so these corners are the world
 *  position of the part. */
function expectPartPlacement(
  part: AssemblyPartStored,
  table: ParamTable,
  origin: readonly [number, number, number],
  local: readonly [number, number, number],
  world: readonly [number, number, number],
): void {
  const placement = atPlacement(resolvedPartAt(part.at, table));
  close(placement.point([0, 0, 0]), origin);
  close(placement.point(local), world);
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

async function failScript(code: string, scriptDir: string): Promise<KernelError> {
  try {
    await runScript({ code, fileName: 'negative.kcad.ts', scriptDir });
  } catch (error) {
    expect(error).toBeInstanceOf(KernelError);
    return error as KernelError;
  }
  throw new Error('the script was expected to fail');
}

describe('configured part instances', () => {
  it('rejects a missing configuration before building the bearing', async () => {
    const started = Date.now();
    const error = await failScript(
      `const arm = assembly('missing');
       await arm.instance('block', { source: ${JSON.stringify(BEARING)}, configuration: 'huge' });`,
      dirname(ASSEMBLY),
    );
    expect(Date.now() - started).toBeLessThan(5000);
    expect(error.code).toBe('feature.invalid-args');
    expect(error.hint).toContain('invalid-args.assembly.configuration-missing');
    expect(error.message).toContain('huge');
    expect(error.message).toContain('compact');
    expect(error.message).toContain('wide');
  });

  it('rejects a configuration value of the wrong type before a solid exists', async () => {
    const started = Date.now();
    const error = await failScript(
      `const arm = assembly('bad');
       await arm.instance('block', { source: ${JSON.stringify(BAD_TYPE)}, configuration: 'bad' });`,
      dirname(BAD_TYPE),
    );
    expect(Date.now() - started).toBeLessThan(5000);
    expect(error.code).toBe('feature.invalid-args');
    expect(error.hint).toContain('invalid-args.assembly.configuration-invalid-value');
    expect(error.message).toContain('bad');
    expect(error.message).toContain('length');
    expect(error.message).toContain('number');
    expect(error.message).toContain('wide');
  });

  it('rejects a legal configuration when a sibling set is not a legal value', async () => {
    const error = await failScript(
      `const arm = assembly('sibling');
       await arm.instance('block', { source: ${JSON.stringify(BAD_TYPE)}, configuration: 'ok' });`,
      dirname(BAD_TYPE),
    );
    expect(error.code).toBe('feature.invalid-args');
    expect(error.hint).toContain('invalid-args.assembly.configuration-invalid-value');
    expect(error.message).toContain('bad');
    expect(error.message).toContain('length');
  });

  it('refuses a second configuration whose connector interface does not match', async () => {
    const run = await runScript({
      code: `
        const arm = assembly('mix');
        const source = ${JSON.stringify(MISMATCH)};
        let caught = null;
        await arm.instance('plate', { source, configuration: 'plate' });
        try {
          await arm.instance('pin', { source, configuration: 'pin' });
        } catch (error) {
          caught = { code: error.code, message: error.message, hint: error.hint };
        }
        return { parts: arm.__parts().map((part) => part.name), caught };
      `,
      fileName: 'mismatch-host.kcad.ts',
      scriptDir: dirname(MISMATCH),
    });
    const returned = run.returnValue as { parts: string[]; caught: { code: string; message: string; hint: string } };
    expect(returned.parts).toEqual(['plate']);
    expect(returned.caught.code).toBe('feature.invalid-args');
    expect(returned.caught.hint).toContain('invalid-args.assembly.configuration-interface-mismatch');
    expect(returned.caught.message).toContain('mount:frame');
    expect(returned.caught.message).toContain('mount:axis');
  });

  it('rejects a mismatched configuration that crosses a subAssembly boundary', async () => {
    const run = await runScript({
      code: `
        const source = ${JSON.stringify(MISMATCH)};
        const child = assembly('child');
        await child.instance('plate', { source, configuration: 'plate' });
        const parent = assembly('parent');
        parent.subAssembly('nest', child);
        let caught = null;
        try {
          await parent.instance('pin', { source, configuration: 'pin' });
        } catch (error) {
          caught = { code: error.code, message: error.message, hint: error.hint };
        }
        let again = null;
        try {
          await parent.instance('again', { source, configuration: 'plate' });
        } catch (error) {
          again = { code: error.code, message: error.message, hint: error.hint };
        }
        return {
          parts: parent.__parts().map((part) => ({
            name: part.name,
            configuration: part.configuration && part.configuration.name,
            interfaceSignature: part.configuration && part.configuration.interfaceSignature,
            connector: (part.mateConnectors.find((connector) => connector.name === 'mount') || {}).type,
          })),
          caught,
          again,
        };
      `,
      fileName: 'import-mismatch-host.kcad.ts',
      scriptDir: dirname(MISMATCH),
    });
    const returned = run.returnValue as {
      parts: { name: string; configuration?: string; interfaceSignature?: string; connector?: string }[];
      caught: { code: string; message: string; hint: string } | null;
      again: { code: string; message: string; hint: string } | null;
    };
    expect(returned.again).toBeNull();
    expect(returned.parts.map((part) => part.name)).toEqual(['nest_plate', 'again']);
    expect(returned.parts[0]).toMatchObject({
      configuration: 'plate',
      interfaceSignature: 'mount:frame',
      connector: 'frame',
    });
    expect(returned.parts[1]?.interfaceSignature).toBe('mount:frame');
    expect(returned.caught?.code).toBe('feature.invalid-args');
    expect(returned.caught?.hint).toContain('invalid-args.assembly.configuration-interface-mismatch');
    expect(returned.caught?.message).toContain('mount:frame');
    expect(returned.caught?.message).toContain('mount:axis');
    const parent = run.session.assemblies.get('parent');
    expect(parent).toBeInstanceOf(Assembly);
    const imported = (parent as Assembly).__parts().find((part) => part.name === 'nest_plate');
    expect(imported?.configuration?.source).toBe(MISMATCH);
    expect((await imported!.originalShape.lower()).volume()).toBeCloseTo(10 * 10 * 4, 6);
  });

  it('rejects a mismatched subAssembly import before any of its parts are recorded', async () => {
    const run = await runScript({
      code: `
        const source = ${JSON.stringify(MISMATCH)};
        const child = assembly('child');
        child.part('spacer', box(4, 4, 4));
        await child.instance('plate', { source, configuration: 'plate' });
        const parent = assembly('parent');
        await parent.instance('pin', { source, configuration: 'pin' });
        let caught = null;
        try {
          parent.subAssembly('nest', child);
        } catch (error) {
          caught = { code: error.code, message: error.message, hint: error.hint };
        }
        let later = null;
        try {
          await parent.instance('pin-b', { source, configuration: 'pin' });
        } catch (error) {
          later = { code: error.code, message: error.message, hint: error.hint };
        }
        let blocked = null;
        try {
          await parent.instance('plate', { source, configuration: 'plate' });
        } catch (error) {
          blocked = { code: error.code, message: error.message, hint: error.hint };
        }
        return {
          parts: parent.__parts().map((part) => part.name),
          childParts: child.__parts().map((part) => part.name),
          caught,
          later,
          blocked,
        };
      `,
      fileName: 'import-rollback-host.kcad.ts',
      scriptDir: dirname(MISMATCH),
    });
    const returned = run.returnValue as {
      parts: string[];
      childParts: string[];
      caught: { code: string; message: string; hint: string } | null;
      later: { code: string; message: string; hint: string } | null;
      blocked: { code: string; message: string; hint: string } | null;
    };
    expect(returned.parts).toEqual(['pin', 'pin-b']);
    expect(returned.childParts).toEqual(['spacer', 'plate']);
    expect(returned.caught?.code).toBe('feature.invalid-args');
    expect(returned.caught?.hint).toContain('invalid-args.assembly.configuration-interface-mismatch');
    expect(returned.caught?.message).toContain('mount:frame');
    expect(returned.caught?.message).toContain('mount:axis');
    expect(returned.later).toBeNull();
    expect(returned.blocked?.hint).toContain('invalid-args.assembly.configuration-interface-mismatch');
    const parent = run.session.assemblies.get('parent');
    expect(parent).toBeInstanceOf(Assembly);
    const pin = (parent as Assembly).__parts().find((part) => part.name === 'pin');
    expect(pin?.configuration?.interfaceSignature).toBe('mount:axis');
    expect((await pin!.originalShape.lower()).volume()).toBeCloseTo(10 * 10 * 4, 6);
  });

  it('does not record a connector interface when the instance fails density validation', async () => {
    const run = await runScript({
      code: `
        const source = ${JSON.stringify(MISMATCH)};
        const parent = assembly('parent');
        let failed = null;
        try {
          await parent.instance('bad', { source, configuration: 'plate', density: -1 });
        } catch (error) {
          failed = { code: error.code, message: error.message, hint: error.hint };
        }
        let later = null;
        try {
          await parent.instance('pin', { source, configuration: 'pin' });
        } catch (error) {
          later = { code: error.code, message: error.message, hint: error.hint };
        }
        return {
          parts: parent.__parts().map((part) => ({
            name: part.name,
            configuration: part.configuration && part.configuration.name,
            interfaceSignature: part.configuration && part.configuration.interfaceSignature,
          })),
          failed,
          later,
        };
      `,
      fileName: 'failed-instance-host.kcad.ts',
      scriptDir: dirname(MISMATCH),
    });
    const returned = run.returnValue as {
      parts: { name: string; configuration?: string; interfaceSignature?: string }[];
      failed: { code: string; message: string; hint: string } | null;
      later: { code: string; message: string; hint: string } | null;
    };
    expect(returned.failed?.code).toBe('feature.invalid-args');
    expect(returned.failed?.message).toContain('density');
    expect(returned.failed?.message).toContain('bad');
    expect(returned.later).toBeNull();
    expect(returned.parts).toEqual([
      { name: 'pin', configuration: 'pin', interfaceSignature: 'mount:axis' },
    ]);
    const parent = run.session.assemblies.get('parent');
    expect(parent).toBeInstanceOf(Assembly);
    const pin = (parent as Assembly).__parts().find((part) => part.name === 'pin');
    expect((await pin!.originalShape.lower()).volume()).toBeCloseTo(10 * 10 * 4, 6);
  });

  it('keeps placement and physical declarations through subAssembly import', async () => {
    const plateVolume = PLATE_MM.x * PLATE_MM.y * PLATE_MM.z;
    const padVolume = PAD_MM.x * PAD_MM.y * PAD_MM.z;
    const railVolume = RAIL_MM.x * RAIL_MM.y * RAIL_MM.z;
    expect(plateVolume).toBe(400);
    const run = await runScript({
      code: `
        const source = ${JSON.stringify(MISMATCH)};
        const child = assembly('child');
        await child.instance('plate', {
          source,
          configuration: 'plate',
          at: [20, 0, 0],
          density: ${ALUMINUM_DENSITY},
          material: 'aluminum-6061',
          process: 'cnc',
          stock: { kind: 'plate', lengthMm: 12, widthMm: 12, thicknessMm: 6 },
          massKg: 0.002,
          crossSection: { kind: 'rectangle', widthMm: 10, heightMm: 4, lengthMm: 10 },
          role: 'structure',
        });
        child.part('pad', box(${PAD_MM.x}, ${PAD_MM.y}, ${PAD_MM.z}), {
          at: [5, 6, 7],
          density: ${PAD_DENSITY},
          material: 'mild-steel',
          process: '3d-print',
        });
        child.part('bare', box(${BARE_MM.x}, ${BARE_MM.y}, ${BARE_MM.z}));
        const parent = assembly('parent');
        parent.part('rail', box(${RAIL_MM.x}, ${RAIL_MM.y}, ${RAIL_MM.z}), {
          at: [100, 0, 0],
          density: ${RAIL_DENSITY},
        });
        parent.subAssembly('nest', child);
        return parent.model();
      `,
      fileName: 'import-placement.kcad.ts',
      scriptDir: dirname(MISMATCH),
    });
    const parent = run.session.assemblies.get('parent');
    expect(parent).toBeInstanceOf(Assembly);
    const assembly = parent as Assembly;
    const plate = assembly.__parts().find((part) => part.name === 'nest_plate');
    const pad = assembly.__parts().find((part) => part.name === 'nest_pad');
    const bare = assembly.__parts().find((part) => part.name === 'nest_bare');
    const rail = assembly.__parts().find((part) => part.name === 'rail');
    expect(plate).toBeDefined();
    expect(pad).toBeDefined();
    expect(bare).toBeDefined();
    expect(rail).toBeDefined();

    expectPartPlacement(plate!, run.paramTable, [20, 0, 0], [PLATE_MM.x, PLATE_MM.y, PLATE_MM.z], [30, 10, 4]);
    expectPartPlacement(pad!, run.paramTable, [5, 6, 7], [PAD_MM.x, PAD_MM.y, PAD_MM.z], [13, 14, 15]);
    expectPartPlacement(bare!, run.paramTable, [0, 0, 0], [BARE_MM.x, BARE_MM.y, BARE_MM.z], [2, 2, 2]);
    expectPartPlacement(rail!, run.paramTable, [100, 0, 0], [RAIL_MM.x, RAIL_MM.y, RAIL_MM.z], [110, 4, 4]);

    expect(plate).toMatchObject({
      density: ALUMINUM_DENSITY,
      material: 'aluminum-6061',
      process: 'cnc',
      stock: { kind: 'plate', lengthMm: 12, widthMm: 12, thicknessMm: 6 },
      massKg: 0.002,
      crossSection: { kind: 'rectangle', widthMm: 10, heightMm: 4, lengthMm: 10 },
      role: 'structure',
      configuration: { source: MISMATCH, name: 'plate', interfaceSignature: 'mount:frame' },
    });
    expect(plate!.mateConnectors.find((connector) => connector.name === 'mount')?.type).toBe('frame');
    expect(pad).toMatchObject({
      density: PAD_DENSITY,
      material: 'mild-steel',
      process: '3d-print',
    });
    expect(pad!.configuration).toBeUndefined();
    expect(pad!.massKg).toBeUndefined();
    expect(pad!.stock).toBeUndefined();
    expect(pad!.crossSection).toBeUndefined();
    expect(pad!.role).toBeUndefined();
    expect(bare!.density).toBeUndefined();
    expect(bare!.material).toBeUndefined();
    expect(bare!.process).toBeUndefined();
    expect(rail).toMatchObject({ density: RAIL_DENSITY });
    expect(rail!.material).toBeUndefined();

    const model = [...run.records].reverse().find((record) => record.kind === 'assemblyModel');
    expect(model?.metadata).toMatchObject({ assemblyName: 'parent' });
    const lowered = await new RecomputeEngine(createOcctLowerer(run.session)).run(run.records, { paramTable: run.paramTable });
    expect(lowered.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    const scene = lowered.shapes.get(model!.id);
    expect(isSceneBackend(scene)).toBe(true);
    if (!isSceneBackend(scene)) return;
    const byName = new Map(scene.parts.map((part) => [part.name, part]));
    expectLoweredWorldBox(byName.get('nest_plate')!, [20, 0, 0], [30, 10, 4]);
    expectLoweredWorldBox(byName.get('nest_pad')!, [5, 6, 7], [13, 14, 15]);
    expectLoweredWorldBox(byName.get('nest_bare')!, [0, 0, 0], [2, 2, 2]);
    expectLoweredWorldBox(byName.get('rail')!, [100, 0, 0], [110, 4, 4]);

    const bom = await computeBom(assembly, run.session);
    const plateRow = bom.rows.find((row) => row.configuration?.name === 'plate');
    const padRow = bom.rows.find((row) => row.name === 'nest_pad');
    const bareRow = bom.rows.find((row) => row.name === 'nest_bare');
    const railRow = bom.rows.find((row) => row.name === 'rail');
    expect(plateRow).toMatchObject({
      quantity: 1,
      density: ALUMINUM_DENSITY,
      material: 'aluminum-6061',
      instancePaths: ['nest_plate'],
    });
    expect(plateRow?.massGPerUnit).toBeCloseTo(massG(plateVolume, ALUMINUM_DENSITY), 4);
    expect(plateRow?.massGTotal).toBeCloseTo(massG(plateVolume, ALUMINUM_DENSITY), 4);
    expect(padRow).toMatchObject({
      density: PAD_DENSITY,
      material: 'mild-steel',
      process: '3d-print',
    });
    expect(padRow?.massGPerUnit).toBeCloseTo(massG(padVolume, PAD_DENSITY), 4);
    expect(bareRow).toMatchObject({ density: null, material: null, massGPerUnit: null, massGTotal: null });
    expect(railRow?.massGPerUnit).toBeCloseTo(massG(railVolume, RAIL_DENSITY), 4);
    const unassigned = bom.diagnostics
      .filter((diagnostic) => diagnostic.code === 'bom.material.unassigned')
      .map((diagnostic) => diagnostic.message);
    expect(unassigned.some((message) => message.includes('nest_bare'))).toBe(true);
    expect(unassigned.some((message) => message.includes('nest_plate') || message.includes('nest_pad') || message.includes("'rail'"))).toBe(false);
  });

  it('instances two sizes of the bearing block, repeats compact, and seats the mates', async () => {
    const run = await runScript({
      code: readFileSync(ASSEMBLY, 'utf8'),
      fileName: 'configured-bearing-blocks.kcad.ts',
      scriptDir: dirname(ASSEMBLY),
    });
    expect(run.paramTable.get('length').value).toBe(1);

    const scene = run.returnValue as Scene;
    const arm = run.session.assemblies.get('blocks');
    expect(arm).toBeInstanceOf(Assembly);
    const assembly = arm as Assembly;
    const parts = assembly.__parts();
    expect(parts.map((part) => part.name)).toEqual(['base', 'block-a', 'block-b', 'block-c']);

    const compactVolume = bearingVolume(COMPACT.length, COMPACT.width, COMPACT.thickness);
    const wideVolume = bearingVolume(WIDE.length, WIDE.width, WIDE.thickness);
    expect(compactVolume).not.toBeCloseTo(wideVolume, 0);
    expect((await scene.part('block-a').shape.lower()).volume()).toBeCloseTo(compactVolume, 1);
    expect((await scene.part('block-c').shape.lower()).volume()).toBeCloseTo(compactVolume, 1);
    expect((await scene.part('block-b').shape.lower()).volume()).toBeCloseTo(wideVolume, 1);

    const compact = parts.find((part) => part.name === 'block-a');
    const wide = parts.find((part) => part.name === 'block-b');
    const repeat = parts.find((part) => part.name === 'block-c');
    expect(compact?.configuration).toMatchObject({
      source: BEARING,
      sourceRef: '../manufacturing-showcase/bearing-block.kcad.ts',
      name: 'compact',
      interfaceSignature: 'foot:frame,seat:axis',
      parameters: { length: 80, width: 50, thickness: 18, seatDiameter: 22, mountInset: 10 },
    });
    expect(wide?.configuration).toMatchObject({
      source: BEARING,
      name: 'wide',
      parameters: { length: 110, width: 70, thickness: 22, seatDiameter: 22, mountInset: 10 },
    });
    expect(repeat?.configuration?.name).toBe('compact');
    expect(parts.find((part) => part.name === 'base')?.configuration).toBeUndefined();

    const compactFoot = compact?.mateConnectors.find((connector) => connector.name === 'foot');
    const wideFoot = wide?.mateConnectors.find((connector) => connector.name === 'foot');
    expect(compactFoot?.origin).toEqual({ kind: 'vec3', value: [40, 25, 0] });
    expect(wideFoot?.origin).toEqual({ kind: 'vec3', value: [55, 35, 0] });
    expect(compactFoot?.configuration).toEqual({ source: BEARING, name: 'compact' });
    expect(wideFoot?.configuration).toEqual({ source: BEARING, name: 'wide' });

    // Fastened placement is a translation: the foot centre lands on the pad,
    // and a local +X step stays +X in the base frame.
    close(scene.part('block-a').worldTransform.point([40, 25, 0]), [50, 45, 8]);
    close(scene.part('block-a').worldTransform.point([50, 25, 0]), [60, 45, 8]);
    close(scene.part('block-a').worldTransform.point([40, 25, 18]), [50, 45, 26]);
    close(scene.part('block-b').worldTransform.point([55, 35, 0]), [190, 50, 8]);
    close(scene.part('block-b').worldTransform.point([55, 35, 22]), [190, 50, 30]);
    close(scene.part('block-c').worldTransform.point([40, 25, 0]), [330, 45, 8]);
    close(scene.part('base').worldTransform.point([0, 0, 0]), [0, 0, 0]);
    close(scene.part('base').worldTransform.point([400, 100, 8]), [400, 100, 8]);

    const seatA = assembly.__mates().find((mate) => mate.name === 'seat-a');
    const seatB = assembly.__mates().find((mate) => mate.name === 'seat-b');
    expect(seatA?.aConfiguration).toBeUndefined();
    expect(seatA?.bConfiguration).toEqual({ source: BEARING, name: 'compact' });
    expect(seatB?.bConfiguration).toEqual({ source: BEARING, name: 'wide' });

    const bom = await computeBom(assembly, run.session);
    const rows = bom.rows;
    expect(rows).toHaveLength(3);
    const base = rows.find((row) => row.name === 'base');
    const compactRow = rows.find((row) => row.configuration?.name === 'compact');
    const wideRow = rows.find((row) => row.configuration?.name === 'wide');
    expect(base).toMatchObject({ quantity: 1, instancePaths: ['base'] });
    expect(base?.configuration).toBeUndefined();
    expect(compactRow).toMatchObject({
      quantity: 2,
      instancePaths: ['block-a', 'block-c'],
      configuration: { source: BEARING, name: 'compact' },
      density: ALUMINUM_DENSITY,
      material: 'aluminum-6061',
    });
    expect(wideRow).toMatchObject({
      quantity: 1,
      instancePaths: ['block-b'],
      configuration: { source: BEARING, name: 'wide' },
      density: ALUMINUM_DENSITY,
    });
    expect(compactRow?.massGPerUnit).toBeCloseTo(compactVolume * ALUMINUM_DENSITY / 1e6, 3);
    expect(wideRow?.massGPerUnit).toBeCloseTo(wideVolume * ALUMINUM_DENSITY / 1e6, 3);
    expect(compactRow?.massGTotal).toBeCloseTo((compactRow?.massGPerUnit ?? 0) * 2, 4);

    const lowered = await lowerScriptScene(run);
    expect(lowered.scene).toBeDefined();
    const clash = detectInterferences(lowered.scene!, 0.01, new Set());
    expect(clash.pairs).toEqual([]);
    expect(clash.partCount).toBe(4);
  }, 55_000);
});
