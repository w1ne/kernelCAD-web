// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { CaptureSession } from './captureSession';
import { createModelingApi } from '../api';
import { KernelError } from '../../shared/intent/kernelError';

function makeRevoluteAssembly() {
  const session = new CaptureSession();
  const kcad = createModelingApi({ session });
  const arm = kcad.assembly('revolute-option-keys');
  const base = arm.part('base', kcad.box(10, 10, 10));
  const link = arm.part('link', kcad.box(10, 10, 10));
  return { arm, base, link };
}

describe('assembly.revolute option keys', () => {
  it('rejects a misspelled limitsDeg before recording an unbounded joint', () => {
    const { arm, base, link } = makeRevoluteAssembly();
    const options = {
      axis: [0, 0, 1] as [number, number, number],
      origin: [0, 0, 0] as [number, number, number],
      limitsDg: [-45, 45],
    } as unknown as Parameters<typeof arm.revolute>[3];

    let error: unknown;
    try {
      arm.revolute('hinge', base, link, options);
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(KernelError);
    expect(error).toMatchObject({ code: 'feature.invalid-args' });
    expect((error as Error).message).toMatch(/opts\.limitsDg.*unknown option/i);
    expect(arm.__joints()).toEqual([]);
  });

  it('keeps declared limits and actuator capacity', () => {
    const { arm, base, link } = makeRevoluteAssembly();

    arm.revolute('hinge', base, link, {
      axis: [0, 0, 1],
      origin: [0, 0, 0],
      limitsDeg: [-45, 45],
      actuator: { torqueNm: 0.2 },
    });

    expect(arm.__joints()).toMatchObject([
      { name: 'hinge', kind: 'revolute', limitsDeg: [-45, 45], actuator: { torqueNm: 0.2 } },
    ]);
  });
});
