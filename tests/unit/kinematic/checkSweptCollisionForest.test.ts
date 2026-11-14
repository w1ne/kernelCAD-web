// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// A hinge whose parts do not reach the first declared part must still swing.
// The skill cookbook 05-clamshell-hinge-swept declares an unmated `table`
// first; the sweep used to leave `lid` at its authored pose and report a
// base/lid overlap at every hinge angle.

import { describe, expect, it } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../src/modeling/api';
import { checkSweptCollision } from '../../../src/kinematic/checkSweptCollision';

function clamshell(tableFirst: boolean) {
  const session = new CaptureSession();
  const kcad = createModelingApi({ session });
  const arm = kcad.assembly('swept-forest-clamshell');
  const table = () => arm.part('table', kcad.box(400, 300, 5, true).translate(0, 0, -10));
  if (tableFirst) table();
  arm.part('base', kcad.box(300, 200, 12, true).translate(0, 0, 6))
    .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [0, -100, 12] }, axis: [1, 0, 0] });
  arm.part('lid', kcad.box(300, 200, 6, true).translate(0, 100, 3))
    .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [1, 0, 0] });
  if (!tableFirst) table();
  arm.mate('hinge', 'base.hinge', 'lid.hinge', 'revolute', { limitsDeg: [-15, 135] });
  return arm;
}

describe('checkSweptCollision with an unmated first part', () => {
  it('swings the hinge pair the same way whichever part is declared first', async () => {
    const opts = { joint: 'hinge', range: [-15, 135, 15] as [number, number, number] };
    const tableFirst = await checkSweptCollision(clamshell(true), opts);
    const tableLast = await checkSweptCollision(clamshell(false), opts);

    const angles = (r: typeof tableFirst) => r.collidingPoses.map((row) => row.pose.hinge);
    expect(angles(tableLast)).toEqual([-15]);
    expect(angles(tableFirst)).toEqual(angles(tableLast));
  }, 60_000);
});
