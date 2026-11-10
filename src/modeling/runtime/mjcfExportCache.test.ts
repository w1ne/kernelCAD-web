// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// A mechanism-truth physics pass already built MJCF for the assembly.
// Live playback asks for the same rest-pose export again; returning the
// memoized result avoids a second tessellation of every part.

import { beforeAll, describe, expect, it } from 'vitest';
import { CaptureSession } from '../capture/captureSession';
import { createModelingApi } from '../api';
import { initOcct } from '../../kernel/backends/occt/occtBackend';
import { assemblyToMjcf } from './mjcfExport';

describe('assemblyToMjcf rest-export cache', () => {
  beforeAll(async () => {
    await initOcct();
  }, 60_000);

  it('returns the same rest-pose export on a second call', async () => {
    const session = new CaptureSession();
    const kcad = createModelingApi({ session });
    const arm = kcad.assembly('mjcf-export-cache');
    arm.part('base', kcad.box(20, 20, 8))
      .connector('hinge', {
        type: 'axis',
        origin: { kind: 'vec3', value: [10, 10, 8] },
        axis: [0, 0, 1],
      });
    arm.part('bar', kcad.box(40, 6, 6).translate(10, 7, 8))
      .connector('hinge', {
        type: 'axis',
        origin: { kind: 'vec3', value: [10, 10, 8] },
        axis: [0, 0, 1],
      });
    arm.mate('swing', 'base.hinge', 'bar.hinge', 'revolute', {
      pose: 0,
      limitsDeg: [0, 90],
    });

    const first = await assemblyToMjcf(arm);
    const second = await assemblyToMjcf(arm);
    expect(second).toBe(first);
    expect(first.bodyOrder).toEqual(expect.arrayContaining(['base', 'bar']));
    expect(first.mjcf).toContain('<mujoco');

    const other = kcad.assembly('mjcf-export-cache-other');
    other.part('solo', kcad.box(8, 8, 8));
    const third = await assemblyToMjcf(other);
    expect(third).not.toBe(first);
    expect(third.bodyOrder).toContain('solo');
  }, 30_000);
});
