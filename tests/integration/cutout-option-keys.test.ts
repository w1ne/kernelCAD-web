// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Shape.cutout rejects unknown option keys instead of dropping them:
// `{ enable: false }` used to cut the pocket anyway and `{ mode: 'symmetric' }`
// left the cut blind, both without a diagnostic.
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../src/kernel/backends/occt/occtBackend';
import { CaptureSession } from '../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../src/modeling/api';
import { RecomputeEngine } from '../../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../src/modeling/backends/occt/occtLowerer';
import { KernelError } from '../../src/shared/intent/kernelError';

function plate() {
  const session = new CaptureSession();
  session.setEngine(new RecomputeEngine(createOcctLowerer(session)));
  const api = createModelingApi({ session });
  const profile = api.path().moveTo(-2, -2).lineTo(2, -2).lineTo(2, 2).lineTo(-2, 2).close();
  return { session, shape: api.box(20, 20, 10), profile };
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

describe('Shape.cutout option keys', () => {
  beforeAll(async () => { await initOcct(); });

  it.each([
    ['enable', false],
    ['mode', 'symmetric'],
    ['symmetric', true],
    ['upTo', 'bottom'],
    ['through', true],
  ])('rejects a misspelt %s key and names the accepted keys', (key, value) => {
    const { session, shape, profile } = plate();
    const before = session.getRecords().length;
    const err = caught(() => shape.cutout(profile, { face: 'top', depth: 4, [key]: value } as never));
    expect(err.code).toBe('feature.invalid-args');
    expect(err.message).toContain(`opts.${key}`);
    expect(err.message).toContain('face, depth, upToFace, depthMode, name, enabled');
    expect(err.message).toContain('Example:');
    expect(session.getRecords().filter((r) => r.kind === 'cutout')).toHaveLength(0);
    expect(session.getRecords().length).toBe(before);
  });

  it.each([undefined, null, 'top', [4]])('rejects a non-object opts %j with a kernel diagnostic', (opts) => {
    const { shape, profile } = plate();
    const err = caught(() => shape.cutout(profile, opts as never));
    expect(err.code).toBe('feature.invalid-args');
    expect(err.message).toContain('an options object');
  });

  it('still honours every accepted key on a real cut', async () => {
    const cut = plate();
    const blind = await cut.shape.cutout(cut.profile, { face: 'top', depth: 4, depthMode: 'blind', name: 'pocket' }).lower();
    // 20 x 20 x 10 plate less a 4 x 4 x 4 pocket.
    expect(blind.volume()).toBeCloseTo(4000 - 64, 0);

    const gated = plate();
    const skipped = await gated.shape.cutout(gated.profile, { face: 'top', depth: 4, enabled: false }).lower();
    expect(skipped.volume()).toBeCloseTo(4000, 0);
  });
});
