// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// box / cylinder / sphere reject a misplaced or unknown option instead of
// dropping it: `box(10, 20, 30, { centered: false })` used to build a centred
// box, `box(..., { faceLabels })` centred it and dropped the labels, and
// `cylinder(10, 5, { centered: true })` ignored the flag, all silently.
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../src/kernel/backends/occt/occtBackend';
import { CaptureSession } from '../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../src/modeling/api';
import { RecomputeEngine } from '../../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../src/modeling/backends/occt/occtLowerer';
import { KernelError } from '../../src/shared/intent/kernelError';

function setup() {
  const session = new CaptureSession();
  session.setEngine(new RecomputeEngine(createOcctLowerer(session)));
  return { session, api: createModelingApi({ session }) };
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

describe('primitive option keys', () => {
  beforeAll(async () => { await initOcct(); });

  it.each([
    [{ centered: false }],
    [{ centered: true }],
    [{ faceLabels: { lid: 'top' } }],
  ])('box rejects an option object %j in the centered slot', (bag) => {
    const { session, api } = setup();
    const err = caught(() => api.box(10, 20, 30, bag as never));
    expect(err.code).toBe('feature.invalid-args');
    expect(err.message).toContain('centered — got');
    expect(err.message).toContain('fifth argument');
    expect(err.message).toContain('Example:');
    expect(session.getRecords()).toHaveLength(0);
  });

  it.each([
    [{ centered: true }],
    [{ faceLabels: { cap: 'top' } }],
  ])('cylinder rejects an option object %j in the segments slot', (bag) => {
    const { session, api } = setup();
    const err = caught(() => api.cylinder(10, 5, bag as never));
    expect(err.code).toBe('feature.invalid-args');
    expect(err.message).toContain('segments — got');
    expect(err.message).toContain('fourth argument');
    expect(err.message).toContain('no centered flag');
    expect(session.getRecords()).toHaveLength(0);
  });

  it.each([
    ['box', (api: ReturnType<typeof setup>['api']) => api.box(10, 20, 30, false, { center: true } as never), 'opts.center', 'box accepts only faceLabels'],
    ['cylinder', (api: ReturnType<typeof setup>['api']) => api.cylinder(10, 5, 32, { centered: true } as never), 'opts.centered', 'no centered flag'],
    ['sphere', (api: ReturnType<typeof setup>['api']) => api.sphere(5, { segments: 8 } as never), 'opts.segments', 'sphere takes only the radius'],
  ])('%s rejects an unknown option key', (_name, build, path, hint) => {
    const { session, api } = setup();
    const err = caught(() => build(api));
    expect(err.code).toBe('feature.invalid-args');
    expect(err.message).toContain(path);
    expect(err.message).toContain(hint);
    expect(session.getRecords()).toHaveLength(0);
  });

  it('keeps the valid call forms and their geometry', async () => {
    const corner = setup();
    corner.api.box(10, 20, 30);
    expect(corner.session.getRecords().at(-1)?.params.centered?.evaluated).toBe(0);

    const centred = setup();
    centred.api.box(10, 20, 30, true, { faceLabels: { lid: 'top' } });
    const rec = centred.session.getRecords().at(-1);
    expect(rec?.params.centered?.evaluated).toBe(1);
    expect(rec?.metadata?.faceLabels).toEqual({ lid: 'top' });

    const cyl = setup();
    const c = cyl.api.cylinder(10, 5, undefined, { faceLabels: { cap: 'top' } });
    expect(cyl.session.getRecords().at(-1)?.metadata?.faceLabels).toEqual({ cap: 'top' });
    expect((await c.lower()).volume()).toBeCloseTo(Math.PI * 25 * 10, 1);

    const legacy = setup();
    expect((await legacy.api.cylinder(10, 5, 32).lower()).volume()).toBeCloseTo(Math.PI * 25 * 10, 1);
    expect((await legacy.api.sphere(5).lower()).volume()).toBeCloseTo((4 / 3) * Math.PI * 125, 1);
  });

  it('still raises face-ref.not-applicable for sphere faceLabels', () => {
    const { api } = setup();
    expect(caught(() => api.sphere(5, { faceLabels: { skin: 'top' } } as never)).code).toBe('feature.face-ref.not-applicable');
  });
});
