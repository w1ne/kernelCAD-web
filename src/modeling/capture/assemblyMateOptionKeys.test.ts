// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { CaptureSession } from './captureSession';
import { createModelingApi } from '../api';
import { KernelError } from '../../shared/intent/kernelError';
import { runScript } from '../runtime/runScript';

function makeRevoluteAssembly() {
  const session = new CaptureSession();
  const kcad = createModelingApi({ session });
  const arm = kcad.assembly('mate-option-keys');
  const pivot = {
    type: 'axis' as const,
    origin: { kind: 'vec3' as const, value: [0, 0, 0] as [number, number, number] },
    axis: [0, 0, 1] as [number, number, number],
  };
  arm.part('base', kcad.box(10, 10, 10)).connector('pivot', pivot);
  arm.part('link', kcad.box(10, 10, 10)).connector('pivot', pivot);
  return arm;
}

describe('assembly.mate option keys', () => {
  it('accepts an ordinary options object from the isolated script runner', async () => {
    const result = await runScript({
      fileName: 'mate-options.kcad.ts',
      code: `
        const arm = assembly('mate-options-vm');
        const pivot = {
          type: 'axis',
          origin: { kind: 'vec3', value: [0, 0, 0] },
          axis: [0, 0, 1],
        };
        arm.part('base', box(10, 10, 5)).connector('pivot', pivot);
        arm.part('link', box(10, 10, 5)).connector('pivot', pivot);
        arm.mate('hinge', 'base.pivot', 'link.pivot', 'revolute', { limitsDeg: [-45, 45] });
        return arm.model();
      `,
    });

    expect(result.returnValue).toMatchObject({
      mates: [{ name: 'hinge', type: 'revolute', limitsDeg: [-45, 45] }],
    });
  });

  it('rejects a Date instance created in the isolated script runner', async () => {
    let error: unknown;
    try {
      await runScript({
        fileName: 'mate-options-date.kcad.ts',
        code: `
          const arm = assembly('mate-options-date-vm');
          const pivot = {
            type: 'axis',
            origin: { kind: 'vec3', value: [0, 0, 0] },
            axis: [0, 0, 1],
          };
          arm.part('base', box(10, 10, 5)).connector('pivot', pivot);
          arm.part('link', box(10, 10, 5)).connector('pivot', pivot);
          arm.mate('hinge', 'base.pivot', 'link.pivot', 'revolute', new Date());
        `,
      });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(KernelError);
    expect((error as KernelError).code).toBe('feature.invalid-args');
    expect((error as KernelError).message).toContain('got a non-plain object');
  });

  it('continues to allow omitted options', () => {
    const arm = makeRevoluteAssembly();

    arm.mate('hinge', 'base.pivot', 'link.pivot', 'revolute');

    expect(arm.__mates()).toMatchObject([{ name: 'hinge', type: 'revolute' }]);
  });

  it.each([
    ['null', null],
    ['an empty array', []],
    ['a number', 42],
  ])('rejects %s as the options argument', (_label, rawOptions) => {
    const arm = makeRevoluteAssembly();
    const badOptions = rawOptions as unknown as Parameters<typeof arm.mate>[4];
    let error: unknown;

    try {
      arm.mate('hinge', 'base.pivot', 'link.pivot', 'revolute', badOptions);
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(KernelError);
    if (error instanceof KernelError) {
      expect(error.code).toBe('feature.invalid-args');
      expect(error.message).toMatch(/opts.*requires a plain options object/i);
    }
    expect(arm.__mates()).toEqual([]);
  });

  it('rejects a Date instance instead of treating it as an empty options object', () => {
    const arm = makeRevoluteAssembly();
    const badOptions = new Date() as unknown as Parameters<typeof arm.mate>[4];
    let error: unknown;

    try {
      arm.mate('hinge', 'base.pivot', 'link.pivot', 'revolute', badOptions);
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(KernelError);
    if (error instanceof KernelError) {
      expect(error.code).toBe('feature.invalid-args');
      expect(error.message).toMatch(/opts.*requires a plain options object/i);
      expect(error.message).toContain('got a non-plain object');
    }
    expect(arm.__mates()).toEqual([]);
  });

  it('accepts an options record with a null prototype', () => {
    const arm = makeRevoluteAssembly();
    const options = Object.assign(Object.create(null) as Record<string, unknown>, { limitsDeg: [-45, 45] }) as
      Parameters<typeof arm.mate>[4];

    arm.mate('hinge', 'base.pivot', 'link.pivot', 'revolute', options);

    expect(arm.__mates()).toMatchObject([
      { name: 'hinge', type: 'revolute', limitsDeg: [-45, 45] },
    ]);
  });

  it('rejects a misspelled limit instead of recording an unbounded revolute mate', () => {
    const arm = makeRevoluteAssembly();
    const badOptions = { limtsDeg: [-45, 45] } as unknown as Parameters<typeof arm.mate>[4];
    let error: unknown;

    try {
      arm.mate('hinge', 'base.pivot', 'link.pivot', 'revolute', badOptions);
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(KernelError);
    expect((error as KernelError).code).toBe('feature.invalid-args');
    expect((error as KernelError).message).toMatch(/opts\.limtsDeg.*unknown option/i);
    expect((error as KernelError).message).toContain('limitsDeg');
    expect(arm.__mates()).toEqual([]);
  });

  it('continues to capture the declared revolute limit', () => {
    const arm = makeRevoluteAssembly();

    arm.mate('hinge', 'base.pivot', 'link.pivot', 'revolute', { limitsDeg: [-45, 45] });

    expect(arm.__mates()).toMatchObject([
      { name: 'hinge', type: 'revolute', limitsDeg: [-45, 45] },
    ]);
  });
});
