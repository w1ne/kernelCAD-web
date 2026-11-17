// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Shape.shell rejects unknown option keys instead of dropping them:
// `{ face: 'top', faces: ['bottom'] }` used to leave the bottom closed and
// `{ enabled: false }` still hollowed the solid, both without a diagnostic.
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../src/kernel/backends/occt/occtBackend';
import { CaptureSession } from '../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../src/modeling/api';
import { RecomputeEngine } from '../../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../src/modeling/backends/occt/occtLowerer';
import { KernelError } from '../../src/shared/intent/kernelError';

function block() {
  const session = new CaptureSession();
  session.setEngine(new RecomputeEngine(createOcctLowerer(session)));
  const api = createModelingApi({ session });
  return { session, shape: api.box(40, 30, 10) };
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

describe('Shape.shell option keys', () => {
  beforeAll(async () => { await initOcct(); });

  it.each([
    ['faces', ['bottom']],
    ['enabled', false],
    ['direction', 'outward'],
    ['thickness', 3],
  ])('rejects an unknown %s key and points at the face array', (key, value) => {
    const { session, shape } = block();
    const before = session.getRecords().length;
    const err = caught(() => shape.shell(2, { face: 'top', [key]: value } as never));
    expect(err.code).toBe('feature.invalid-args');
    expect(err.message).toContain(`opts.${key}`);
    expect(err.message).toContain("shell accepts only face");
    expect(err.message).toContain("{ face: ['top', 'bottom'] }");
    expect(err.message).toContain('Example:');
    expect(session.getRecords().length).toBe(before);
  });

  it.each([undefined, null, 'top'])('still rejects a non-object opts %j on opts.face', (opts) => {
    const { shape } = block();
    const err = caught(() => shape.shell(2, opts as never));
    expect(err.code).toBe('feature.invalid-args');
    expect(err.message).toContain('opts.face');
  });

  it('still hollows with one face or a face array', async () => {
    const one = block();
    // 40 x 30 x 10 block less a 36 x 26 x 8 cavity open at the top.
    expect((await one.shape.shell(2, { face: 'top' }).lower()).volume()).toBeCloseTo(12000 - 7488, 0);

    const both = block();
    // Open at top and bottom: a 2 mm sleeve, 40 x 30 outside, 10 tall.
    expect((await both.shape.shell(2, { face: ['top', 'bottom'] }).lower()).volume()).toBeCloseTo(12000 - 9360, 0);
  });
});
