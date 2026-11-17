// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Shape.lattice rejects unknown option keys instead of dropping them:
// `{ cell: 6, densty: 0.5 }` used to build the default 0.3 solid fraction
// with no diagnostic.
import { describe, it, expect } from 'vitest';
import { CaptureSession } from './capture/captureSession';
import { createModelingApi } from './api';
import { KernelError } from '../shared/intent/kernelError';

function box() {
  const session = new CaptureSession();
  return { session, shape: createModelingApi({ session }).box(20, 20, 20) };
}

function caught(fn: () => unknown): KernelError {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(KernelError);
    return e as KernelError;
  }
  throw new Error('expected lattice() to throw');
}

describe('Shape.lattice option keys', () => {
  it('rejects a misspelt top-level key with feature.invalid-args', () => {
    const { shape } = box();
    const err = caught(() => shape.lattice({ cell: 6, variant: 'network', densty: 0.5 } as never));
    expect(err.code).toBe('feature.invalid-args');
    expect(err.message).toMatch(/opts\.densty/);
    expect(err.message).toMatch(/density/);
  });

  it('rejects a misspelt grade key', () => {
    const { shape } = box();
    const err = caught(() =>
      shape.lattice({ cell: 6, grade: { from: 'surface', near: 1.2, length: 8 } } as never),
    );
    expect(err.code).toBe('feature.invalid-args');
    expect(err.message).toMatch(/opts\.grade\.length/);
  });

  it('rejects a misspelt axis key', () => {
    const { shape } = box();
    const err = caught(() =>
      shape.lattice({
        cell: 6,
        frame: 'cylindrical',
        axis: { origin: [0, 0, 0], direction: [0, 0, 1], dir: [0, 0, 1] },
      } as never),
    );
    expect(err.code).toBe('feature.invalid-args');
    expect(err.message).toMatch(/opts\.axis\.dir/);
  });

  it('rejects an array opts', () => {
    const { shape } = box();
    const err = caught(() => shape.lattice([] as never));
    expect(err.code).toBe('feature.invalid-args');
  });

  it('accepts every documented key', () => {
    const { shape } = box();
    expect(() => shape.lattice({
      type: 'gyroid', variant: 'sheet', cell: 6, wall: 0.8, skin: 1.2,
      grade: { from: 'surface', near: 1.2, far: 0.6, over: 8 },
      frame: 'cylindrical', axis: { origin: [0, 0, 0], direction: [0, 0, 1] },
      resolution: 0.5, tolerance: 0.05,
    })).not.toThrow();
  });
});
