// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The default swept walk must not walk a coupleMates driven mate on its own:
// that holds the source still, a pose the mechanism cannot reach.

import { describe, expect, it } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../src/modeling/api';
import { enumeratePoses } from '../../../src/kinematic/sweptPoseEnumeration';

function gearPair() {
  const session = new CaptureSession();
  const kcad = createModelingApi({ session });
  const arm = kcad.assembly('swept-coupled-pair');
  const axis = (x: number) => ({ type: 'axis' as const, origin: { kind: 'vec3' as const, value: [x, 0, 0] as [number, number, number] }, axis: [0, 0, 1] as [number, number, number] });
  arm.part('plate', kcad.box(60, 20, 2)).connector('in', axis(0)).connector('out', axis(24));
  arm.part('pinion', kcad.box(5, 5, 5)).connector('axis', axis(0));
  arm.part('gear', kcad.box(5, 5, 5)).connector('axis', axis(24));
  arm.mate('input', 'plate.in', 'pinion.axis', 'revolute', { limitsDeg: [-12, 12] });
  arm.mate('output', 'plate.out', 'gear.axis', 'revolute', { limitsDeg: [-4, 4] });
  arm.coupleMates('output', { source: 'input', ratio: -1 / 3 });
  return arm;
}

describe('enumeratePoses with a coupled mate', () => {
  it('walks the source only in the default sweep', () => {
    const { walks } = enumeratePoses(gearPair(), undefined);
    expect(walks.map((walk) => Object.keys(walk[0]!))).toEqual([['input']]);
    expect(walks[0]!.map((pose) => pose.input)).toEqual(Array.from({ length: 25 }, (_, i) => i - 12));
  });

  it('still walks a driven mate that the caller names', () => {
    const { walks } = enumeratePoses(gearPair(), { joint: 'output' });
    expect(walks.map((walk) => Object.keys(walk[0]!))).toEqual([['output']]);
  });
});
