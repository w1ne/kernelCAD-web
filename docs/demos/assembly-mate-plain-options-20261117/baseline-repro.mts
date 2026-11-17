// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Run on origin/develop fafb4063e897f0d979ed3bc301ad33bb6ff75ef6:
// npx tsx docs/demos/assembly-mate-plain-options-20261117/baseline-repro.mts

import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../src/modeling/api';

const kcad = createModelingApi({ session: new CaptureSession() });
const arm = kcad.assembly('mate-plain-options-baseline');
const pivot = {
  type: 'axis' as const,
  origin: { kind: 'vec3' as const, value: [0, 0, 0] as [number, number, number] },
  axis: [0, 0, 1] as [number, number, number],
};
arm.part('base', kcad.box(10, 10, 5)).connector('pivot', pivot);
arm.part('link', kcad.box(10, 10, 5)).connector('pivot', pivot);

const malformedOptions = new Date('2026-01-01T00:00:00.000Z') as unknown as Parameters<typeof arm.mate>[4];
arm.mate('hinge', 'base.pivot', 'link.pivot', 'revolute', malformedOptions);
const captured = arm.__mates().find((mate) => mate.name === 'hinge');
if (captured === undefined || captured.limitsDeg !== undefined) {
  throw new Error(`Expected baseline to treat Date as omitted options; got ${JSON.stringify(captured)}.`);
}
console.log(JSON.stringify(captured, null, 2));
