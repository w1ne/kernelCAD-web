// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// filletIntersection rejects unknown options instead of silently using the
// defaults (for example, a misspelt tolerance must not look successful).
import { describe, expect, it } from 'vitest';
import { CaptureSession } from './capture/captureSession';
import { createModelingApi } from './api';
import { KernelError } from '../shared/intent/kernelError';

function fixture() {
  const session = new CaptureSession();
  const kcad = createModelingApi({ session });
  const body = kcad.box(40, 30, 20);
  const cutter = kcad.cylinder(30, 5).translate(20, 15, -5);
  const cut = body.subtract(cutter);
  return { session, cut, cutter };
}

function caught(fn: () => unknown): KernelError {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(KernelError);
    return error as KernelError;
  }
  throw new Error('expected filletIntersection() to reject the option');
}

describe('Shape.filletIntersection option keys', () => {
  it('rejects a misspelt tolerance instead of capturing the default', () => {
    const { session, cut, cutter } = fixture();
    const before = session.getRecords().length;

    const error = caught(() => cut.filletIntersection(cutter, 1, {
      tolerenceMm: 0.1,
    } as never));

    expect(error.code).toBe('feature.invalid-args');
    expect(error.message).toContain('opts.tolerenceMm');
    expect(error.message).toContain('sides, toleranceMm, continuity');
    expect(session.getRecords()).toHaveLength(before);
  });

  it.each([false, 1, 'body', []])('rejects a non-object options bag: %j', (opts) => {
    const { cut, cutter } = fixture();
    const error = caught(() => cut.filletIntersection(cutter, 1, opts as never));

    expect(error.code).toBe('feature.invalid-args');
    expect(error.message).toContain('opts');
    expect(error.message).toContain('an option object');
  });

  it('keeps the documented options and explicit null behavior', () => {
    const { session, cut, cutter } = fixture();
    const configured = cut.filletIntersection(cutter, 1, {
      sides: 'body',
      toleranceMm: 0.1,
      continuity: 'G2',
    });
    const record = session.getRecords().find((candidate) => candidate.id === configured.id)!;

    expect(record.params.tolerance).toMatchObject({ evaluated: 0.1, unit: 'mm' });
    expect(record.metadata).toMatchObject({ sides: 'body', continuity: 'G2' });

    expect(() => cut.filletIntersection(cutter, 1, null as never)).not.toThrow();
  });
});
