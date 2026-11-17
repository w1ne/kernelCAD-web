// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Run on baseline 642f9a398 (origin/develop before this fix):
// npx tsx docs/demos/assembly-mate-option-keys-20261117/baseline-repro.mts

import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../src/modeling/api';

const session = new CaptureSession();
const kcad = createModelingApi({ session });
const arm = kcad.assembly('mate-option-repro');
const pivot = {
  type: 'axis' as const,
  origin: { kind: 'vec3' as const, value: [0, 0, 0] as [number, number, number] },
  axis: [0, 0, 1] as [number, number, number],
};
arm.part('base', kcad.box(20, 20, 5)).connector('pivot', pivot);
arm.part('lid', kcad.box(20, 20, 4)).connector('pivot', pivot);

const misspelledOptions = { limtsDeg: [-45, 45] } as unknown as Parameters<typeof arm.mate>[4];
arm.mate('hinge', 'base.pivot', 'lid.pivot', 'revolute', misspelledOptions);

const captured = arm.__mates().find((mate) => mate.name === 'hinge');
if (captured === undefined || captured.limitsDeg !== undefined) {
  throw new Error(`Expected baseline to capture an unbounded hinge; got ${JSON.stringify(captured)}.`);
}
console.log(JSON.stringify(captured, null, 2));
