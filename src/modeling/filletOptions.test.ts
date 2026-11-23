// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Shape.fillet rejects unknown option keys instead of dropping them:
// `{ continuty: 'G2' }` used to build a G1 blend with no diagnostic.
import { describe, it, expect } from 'vitest';
import { CaptureSession } from './capture/captureSession';
import { createModelingApi } from './api';
import { KernelError } from '../shared/intent/kernelError';

type FilletOpts = Parameters<ReturnType<typeof box>['shape']['fillet']>[2];

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

describe('Shape.fillet option keys', () => {
  it.each([
    ['continuty', 'G2'],
    ['G2', true],
    ['radius2', 3],
  ])('rejects an unknown %s key and names the accepted key', (key, value) => {
    const { session, shape } = box();
    const before = session.getRecords().length;
    const err = caught(() => shape.fillet(2, 'top', { [key]: value } as unknown as FilletOpts));
    expect(err.code).toBe('feature.invalid-args');
    expect(err.message).toContain(`opts.${key}`);
    expect(err.message).toContain('fillet accepts continuity and endRadius');
    expect(session.getRecords().length).toBe(before);
  });

  it.each([null, [], 'G2'])('rejects a non-object opts %j', (opts) => {
    const { shape } = box();
    const err = caught(() => shape.fillet(2, 'top', opts as unknown as FilletOpts));
    expect(err.code).toBe('feature.invalid-args');
    expect(err.message).toContain('fillet(radius, edges, opts)');
  });

  it('retains supported tapered-fillet endRadius instead of rejecting it', () => {
    const { session, shape } = box();
    const tapered = shape.fillet(2, 'top', { endRadius: 4 });
    const record = session.getRecords().find((r) => r.id === tapered.id);
    expect(JSON.stringify(record)).toContain('endRadius');
    expect(JSON.stringify(record)).toContain('4');
  });

  it('still captures continuity and accepts an empty or omitted opts', () => {
    const { session, shape } = box();
    const g2 = shape.fillet(2, 'top', { continuity: 'G2' });
    expect(JSON.stringify(session.getRecords().find((r) => r.id === g2.id))).toContain('G2');
    expect(() => shape.fillet(2, 'top', {})).not.toThrow();
    expect(() => shape.fillet(2, 'top')).not.toThrow();
  });
});
