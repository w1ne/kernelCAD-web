// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { CaptureSession } from './captureSession';
import { createModelingApi } from '../api';
import { KernelError } from '../../shared/intent/kernelError';
import { runScript } from '../runtime/runScript';

function makeCoupledAssembly() {
  const session = new CaptureSession();
  const kcad = createModelingApi({ session });
  const arm = kcad.assembly('couple-mate-option-keys');
  const pivot = {
    type: 'axis' as const,
    origin: { kind: 'vec3' as const, value: [0, 0, 0] as [number, number, number] },
    axis: [0, 0, 1] as [number, number, number],
  };
  arm.part('base', kcad.box(10, 10, 10)).connector('pivot', pivot);
  arm.part('input-link', kcad.box(10, 10, 10)).connector('pivot', pivot);
  arm.part('output-link', kcad.box(10, 10, 10)).connector('pivot', pivot);
  arm.mate('input', 'base.pivot', 'input-link.pivot', 'revolute');
  arm.mate('output', 'base.pivot', 'output-link.pivot', 'revolute');
  return arm;
}

describe('assembly.coupleMates option keys', () => {
  it('rejects a misspelled offset before recording the coupling', () => {
    const arm = makeCoupledAssembly();
    const options = { source: 'input', ratio: -0.25, offest: 12 } as unknown as
      Parameters<typeof arm.coupleMates>[1];
    let error: unknown;

    try {
      arm.coupleMates('output', options);
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(KernelError);
    expect(error).toMatchObject({ code: 'feature.invalid-args' });
    expect((error as Error).message).toMatch(/opts\.offest.*unknown option/i);
    expect((error as Error).message).toContain('offset');
    expect(arm.__mateCouplings()).toEqual([]);
  });

  it('rejects class instances even when their fields otherwise form a valid coupling', () => {
    const arm = makeCoupledAssembly();
    class Options {
      source = 'input';
      ratio = -0.25;
    }

    const options = new Options() as unknown as Parameters<typeof arm.coupleMates>[1];
    expect(() => arm.coupleMates('output', options)).toThrow(/opts.*plain options object/i);
    expect(arm.__mateCouplings()).toEqual([]);
  });

  it('accepts a null-prototype options record and keeps its offset', () => {
    const arm = makeCoupledAssembly();
    const options = Object.assign(Object.create(null) as Record<string, unknown>, {
      source: 'input',
      ratio: -0.25,
      offset: 2,
    }) as Parameters<typeof arm.coupleMates>[1];

    arm.coupleMates('output', options);

    expect(arm.__mateCouplings()).toEqual([
      { driven: 'output', source: 'input', ratio: -0.25, offset: 2 },
    ]);
  });

  it('accepts a plain options literal from the isolated script runner', async () => {
    const result = await runScript({
      fileName: 'couple-mate-options.kcad.ts',
      code: `
        const arm = assembly('couple-mate-options-vm');
        const pivot = {
          type: 'axis',
          origin: { kind: 'vec3', value: [0, 0, 0] },
          axis: [0, 0, 1],
        };
        arm.part('base', box(10, 10, 5)).connector('pivot', pivot);
        arm.part('input-link', box(10, 10, 5)).connector('pivot', pivot);
        arm.part('output-link', box(10, 10, 5)).connector('pivot', pivot);
        arm.mate('input', 'base.pivot', 'input-link.pivot', 'revolute');
        arm.mate('output', 'base.pivot', 'output-link.pivot', 'revolute');
        arm.coupleMates('output', { source: 'input', ratio: -0.25, offset: 2 });
        return arm.model();
      `,
    });

    expect(result.returnValue).toMatchObject({
      mates: [
        { name: 'input', type: 'revolute' },
        { name: 'output', type: 'revolute' },
      ],
    });
  });
});
