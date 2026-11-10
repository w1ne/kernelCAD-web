// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { describe, expect, it, vi } from 'vitest';
import { CaptureSession } from '../capture/captureSession';
import { createModelingApi } from '../api';
import { initOcct } from '../../kernel/backends/occt/occtBackend';
import { checkMechanismTruth } from './mechanismTruth';
import type { MujocoSessionFactory } from './mujocoSessionCore';

describe('unsupported closed-loop physics', () => {
  it('reports the loop as unverified and does not start a dynamics session', async () => {
    await initOcct();
    const kcad = createModelingApi({ session: new CaptureSession() });
    const arm = kcad.assembly('closed-loop');
    const parent = arm.part('parent', kcad.box(10, 10, 10, true).translate(0, 0, -5));
    const child = arm.part('child', kcad.box(10, 10, 10, true).translate(0, 0, 5));
    const tie = arm.part('tie', kcad.box(10, 10, 10, true).translate(20, 0, 0));
    const axis = { type: 'axis' as const, origin: { kind: 'vec3' as const, value: [0, 0, 0] as [number, number, number] }, axis: [0, 0, 1] as [number, number, number] };
    parent.connector('joint', axis);
    child.connector('joint', axis);
    child.connector('out', { type: 'frame', origin: { kind: 'vec3', value: [5, 0, 0] } });
    tie.connector('in', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
    parent.connector('side', { type: 'frame', origin: { kind: 'vec3', value: [5, 0, 0] } });
    tie.connector('back', { type: 'frame', origin: { kind: 'vec3', value: [-5, 0, 0] } });
    arm.mate('hinge', 'parent.joint', 'child.joint', 'revolute', { limitsDeg: [-30, 30] });
    arm.mate('reach', 'child.out', 'tie.in', 'fastened');
    arm.mate('close', 'parent.side', 'tie.back', 'fastened');

    const loadSession: MujocoSessionFactory = vi.fn(async () => {
      throw new Error('closed-loop physics must not compile a session');
    });
    const result = await checkMechanismTruth(arm, {
      physicsCheck: true,
      physicsBudget: Infinity,
      physicsSessionFactory: loadSession,
    });

    expect(loadSession).not.toHaveBeenCalled();
    expect(result.coverage?.physics).toBe(false);
    expect(result.mechanism).not.toBe('real');
    expect(result.failures.filter((failure) => failure.code === 'mechanism.unstable-under-gravity')).toEqual([]);
    expect(result.failures.filter((failure) => failure.code === 'mechanism.drops-on-release' && failure.severity === 'error')).toEqual([]);
    expect(result.failures).toContainEqual(expect.objectContaining({
      code: 'mechanism.physics-unsupported',
      severity: 'warn',
    }));
    const physicsErrors = result.failures.filter((failure) =>
      failure.severity === 'error'
      && (failure.code === 'mechanism.unstable-under-gravity' || failure.code === 'mechanism.drops-on-release' || failure.code === 'mechanism.physics-unsupported'));
    expect(physicsErrors).toEqual([]);
  }, 60_000);
});
