// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { CaptureSession } from './captureSession';
import { createModelingApi } from '../api';
import { KernelError } from '../../shared/intent/kernelError';

function makePrismaticAssembly() {
  const session = new CaptureSession();
  const kcad = createModelingApi({ session });
  const arm = kcad.assembly('prismatic-option-keys');
  const base = arm.part('base', kcad.box(10, 10, 10));
  const carriage = arm.part('carriage', kcad.box(10, 10, 10));
  return { arm, base, carriage };
}

describe('assembly.prismatic option keys', () => {
  it('rejects a misspelled limitsMm before recording an unbounded joint', () => {
    const { arm, base, carriage } = makePrismaticAssembly();
    const options = {
      axis: [1, 0, 0] as [number, number, number],
      origin: [0, 0, 0] as [number, number, number],
      limitsMM: [0, 120],
    } as unknown as Parameters<typeof arm.prismatic>[3];

    let error: unknown;
    try {
      arm.prismatic('slide', base, carriage, options);
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(KernelError);
    expect(error).toMatchObject({ code: 'feature.invalid-args' });
    expect((error as Error).message).toMatch(/opts\.limitsMM.*unknown option/i);
    expect(arm.__joints()).toEqual([]);
  });

  it('keeps declared travel limits and actuator force', () => {
    const { arm, base, carriage } = makePrismaticAssembly();

    arm.prismatic('slide', base, carriage, {
      axis: [1, 0, 0],
      origin: [0, 0, 0],
      limitsMm: [0, 120],
      actuator: { forceN: 25 },
    });

    expect(arm.__joints()).toMatchObject([
      { name: 'slide', kind: 'prismatic', limitsMm: [0, 120], actuator: { forceN: 25 } },
    ]);
  });
});
