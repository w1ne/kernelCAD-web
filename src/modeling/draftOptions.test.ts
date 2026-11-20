// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Shape.draft rejects unknown option keys instead of dropping them:
// `{ face, pullDirection }` used to draft along the default pull silently.
import { describe, it, expect } from 'vitest';
import { CaptureSession } from './capture/captureSession';
import { createModelingApi } from './api';
import { KernelError } from '../shared/intent/kernelError';

function box() {
  const session = new CaptureSession();
  return { session, shape: createModelingApi({ session }).box(40, 30, 10) };
}

function caught(fn: () => unknown): KernelError {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(KernelError);
    return e as KernelError;
  }
  throw new Error('expected a KernelError');
}

describe('Shape.draft option keys', () => {
  it('rejects a misspelt pullDirection key and names the accepted keys', () => {
    const { session, shape } = box();
    const before = session.getRecords().length;
    const err = caught(() =>
      shape.draft(3, { face: 'front', pullDirection: [0, 0, 1] } as unknown as { face: string }),
    );
    expect(err.code).toBe('feature.invalid-args');
    expect(err.message).toContain('opts.pullDirection');
    expect(err.message).toContain('face, neutralPlane, pullDir');
    expect(session.getRecords().length).toBe(before);
  });

  it.each([null, [], 'front'])('rejects a non-object opts %j', (opts) => {
    const { shape } = box();
    const err = caught(() => shape.draft(3, opts as unknown as { face: string }));
    expect(err.code).toBe('feature.invalid-args');
    expect(err.message).toContain('draft(angleDeg, opts)');
  });

  it('still captures face, neutralPlane and pullDir', () => {
    const { session, shape } = box();
    const drafted = shape.draft(3, { face: 'front', neutralPlane: 'bottom', pullDir: [0, 0, 1] });
    const rec = session.getRecords().find((r) => r.id === drafted.id);
    expect(rec?.kind).toBe('draft');
    expect(rec?.metadata?.neutralPlane).toBe('bottom');
    expect(rec?.metadata?.pullDir).toEqual([0, 0, 1]);
  });
});
