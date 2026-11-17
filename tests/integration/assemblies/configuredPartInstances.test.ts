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
import { Assembly } from '../../../src/modeling/capture/assembly';
import { detectInterferences } from '../../../src/modeling/runtime/detectInterferences';
import { KernelError } from '../../../src/shared/intent/kernelError';
import type { Scene } from '../../../src/modeling/validation/scene';
import type { Vec3 } from '../../../src/shared/intent/types';

const ASSEMBLY = resolve('examples/assemblies/configured-bearing-blocks.kcad.ts');
const BEARING = resolve('examples/manufacturing-showcase/bearing-block.kcad.ts');
const BAD_TYPE = resolve('tests/fixtures/assembly-configurations/bad-type.kcad.ts');
const MISMATCH = resolve('tests/fixtures/assembly-configurations/interface-mismatch.kcad.ts');

const COMPACT = { length: 80, width: 50, thickness: 18 } as const;
const WIDE = { length: 110, width: 70, thickness: 22 } as const;
const ALUMINUM_DENSITY = 2700;

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
