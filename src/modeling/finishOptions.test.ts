// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Shape.finish rejects unknown option keys instead of dropping them:
// `{ colour: '#ff0000' }` used to render the default finish hue with no diagnostic.
import { describe, it, expect } from 'vitest';
import { CaptureSession } from './capture/captureSession';
import { createModelingApi } from './api';
import { KernelError } from '../shared/intent/kernelError';

type FinishOpts = Parameters<ReturnType<typeof box>['shape']['finish']>[1];

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

function materialOf(session: CaptureSession, id: string): unknown {
  const record = session.getRecords().find((r) => r.id === id);
  return (record?.metadata as { material?: unknown } | undefined)?.material;
}

describe('Shape.finish option keys', () => {
  it.each([
    ['colour', '#ff0000'],
    ['tint', '#ff0000'],
    ['faces', 'top'],
  ])('rejects an unknown %s key and names the accepted keys', (key, value) => {
    const { session, shape } = box();
    const err = caught(() => shape.finish('anodized-black', { [key]: value } as unknown as FinishOpts));
    expect(err.code).toBe('feature.invalid-args');
    expect(err.message).toContain(`opts.${key}`);
    expect(err.message).toContain('finish accepts color and face');
    expect(materialOf(session, shape.id)).toBeUndefined();
  });

  it.each([null, [], '#ff0000'])('rejects a non-object opts %j', (opts) => {
    const { shape } = box();
    const err = caught(() => shape.finish('anodized-black', opts as unknown as FinishOpts));
    expect(err.code).toBe('feature.invalid-args');
    expect(err.message).toContain('finish(name, opts)');
  });

  it('still applies color and accepts an empty or omitted opts', () => {
    const { session, shape } = box();
    shape.finish('anodized-black', { color: '#ff0000' });
    expect(materialOf(session, shape.id)).toMatchObject({ baseColor: '#ff0000' });
    expect(() => box().shape.finish('anodized-black', {})).not.toThrow();
    expect(() => box().shape.finish('anodized-black')).not.toThrow();
  });
});
