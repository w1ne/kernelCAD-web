// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Shape.embossText rejects unknown option keys instead of dropping them:
// `{ font, halign }` used to engrave centred text in the default font silently.
import { describe, it, expect } from 'vitest';
import { CaptureSession } from './capture/captureSession';
import { createModelingApi } from './api';
import { KernelError } from '../shared/intent/kernelError';

type EmbossOpts = Parameters<ReturnType<typeof box>['shape']['embossText']>[0];

function box() {
  const session = new CaptureSession();
  return { session, shape: createModelingApi({ session }).box(40, 20, 6) };
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

describe('Shape.embossText option keys', () => {
  it.each([
    ['font', 'Courier'],
    ['halign', 'right'],
    ['text', 'KC'],
  ])('rejects a misspelt %s key and names the accepted keys', (key, value) => {
    const { session, shape } = box();
    const before = session.getRecords().length;
    const opts = { textContent: 'KC', face: 'top', size: 6, depth: 0.4, [key]: value };
    const err = caught(() => shape.embossText(opts as unknown as EmbossOpts));
    expect(err.code).toBe('feature.invalid-args');
    expect(err.message).toContain(`opts.${key}`);
    expect(err.message).toContain('textContent, fontFamily, size, depth, align');
    expect(session.getRecords().length).toBe(before);
  });

  it.each([null, [], 'KC'])('rejects a non-object opts %j', (opts) => {
    const { shape } = box();
    const err = caught(() => shape.embossText(opts as unknown as EmbossOpts));
    expect(err.code).toBe('feature.invalid-args');
    expect(err.message).toContain('embossText(opts)');
  });

  it('still captures every accepted key', () => {
    const { session, shape } = box();
    const embossed = shape.embossText({
      textContent: 'KC',
      fontFamily: 'Courier',
      size: 6,
      depth: -0.4,
      align: 'right',
      anchorU: 0.25,
      anchorV: 0.75,
      rotation: 90,
      scaleMode: 'native',
      face: 'top',
    });
    const meta = session.getRecords().find((r) => r.id === embossed.id)?.metadata;
    expect(meta?.fontFamily).toBe('Courier');
    expect(meta?.align).toBe('right');
    expect(meta?.scaleMode).toBe('native');
    expect(meta?.anchorU).toMatchObject({ evaluated: 0.25 });
    expect(meta?.rotation).toMatchObject({ evaluated: 90 });
  });
});
