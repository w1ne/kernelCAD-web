// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { describe, expect, it } from 'vitest';
import { CaptureSession } from '../capture/captureSession';
import { createModelingApi } from '../api';
import { solveMates } from '../mates/solver';
import { checkMechanismTruth } from './mechanismTruth';

function fourBarAtFlatStart() {
  const session = new CaptureSession();
  const kcad = createModelingApi({ session });
  const arm = kcad.assembly('flat-start-four-bar');
  const [crankLength, couplerLength, rockerLength, groundLength] = [40, 120, 80, 100];
  const axis = [0, 0, 1] as [number, number, number];
  const connector = (origin: [number, number, number]) => ({
    type: 'axis' as const,
    origin: { kind: 'vec3' as const, value: origin },
    axis,
  });

  arm.part('ground', kcad.box(groundLength, 6, 6, true).translate(groundLength / 2, 0, 0))
    .connector('o2', connector([0, 0, 0]))
    .connector('o4', connector([groundLength, 0, 0]));
  arm.part('crank', kcad.box(crankLength, 4, 4, true))
    .connector('base', connector([-crankLength / 2, 0, 0]))
    .connector('tip', connector([crankLength / 2, 0, 0]));
  arm.part('coupler', kcad.box(couplerLength, 4, 4, true))
    .connector('base', connector([-couplerLength / 2, 0, 0]))
    .connector('tip', connector([couplerLength / 2, 0, 0]));
  arm.part('rocker', kcad.box(rockerLength, 4, 4, true))
    .connector('base', connector([-rockerLength / 2, 0, 0]))
    .connector('tip', connector([rockerLength / 2, 0, 0]));

  arm.mate('crank_ground', 'ground.o2', 'crank.base', 'revolute', { limitsDeg: [0, 20] });
  arm.mate('rocker_ground', 'ground.o4', 'rocker.base', 'revolute');
  arm.mate('crank_coupler', 'crank.tip', 'coupler.base', 'revolute');
  arm.mate('coupler_rocker', 'coupler.tip', 'rocker.tip', 'revolute');
  return arm;
}

describe.skipIf(!process.env.KCAD_SLOW)('mechanism truth — closed-loop solver evidence', () => {
  it('retains loop mobility and solver diagnostics from a non-closing start', async () => {
    const arm = fourBarAtFlatStart();
    const solved = await solveMates(arm);
    expect(solved.loop?.diagnostics.map(({ code }) => code)).toContain('kinematic.loop.lockup');

    const result = await checkMechanismTruth(arm, { sweepBudget: 0 });
    const lockup = result.failures.find(({ code }) => code === 'kinematic.loop.lockup');
    expect(lockup).toMatchObject({
      severity: 'error',
      details: { loop: 'coupler_rocker', sample: expect.any(String), rank: expect.any(Number), mobility: expect.any(Number) },
    });
    expect(result.coverage?.loopMobility).toEqual(expect.arrayContaining([
      expect.objectContaining({
        pose: 'rest',
        loops: ['coupler_rocker'],
        rank: expect.any(Number),
        mobility: expect.any(Number),
      }),
    ]));
  }, 90_000);
});
