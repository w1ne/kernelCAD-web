// SPDX-License-Identifier: MIT
// Local primitive probe of mechanism budget outcomes; no SO100 model is loaded.
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../src/modeling/api';
import { checkMechanismTruth } from '../../../src/modeling/runtime/mechanismTruth';

const axis = { type: 'axis' as const, origin: { kind: 'vec3' as const, value: [0, 0, 0] as [number, number, number] }, axis: [0, 0, 1] as [number, number, number] };

function makeHinge(name: string, childZ: number) {
  const kcad = createModelingApi({ session: new CaptureSession() });
  const arm = kcad.assembly(name);
  const parent = arm.part('parent', kcad.box(10, 10, 10, true).translate(0, 0, childZ === 0 ? 0 : -5));
  const child = arm.part('child', kcad.box(10, 10, 10, true).translate(0, 0, childZ));
  parent.connector('joint', axis);
  child.connector('joint', axis);
  arm.mate('hinge', 'parent.joint', 'child.joint', 'revolute', { limitsDeg: [-30, 30] });
  return arm;
}

function report(caseName: string, result: Awaited<ReturnType<typeof checkMechanismTruth>>, physicsSessionCalls?: number) {
  console.log(JSON.stringify({
    case: caseName,
    verdict: result.mechanism,
    coverage: { sweep: result.coverage?.sweep, physics: result.coverage?.physics },
    diagnostics: result.failures.map(({ code, severity }) => ({ code, severity })),
    ...(physicsSessionCalls === undefined ? {} : { physicsSessionCalls }),
  }));
}

const brokenRest = await checkMechanismTruth(makeHinge('overlapping-rest', 0), { sweepBudget: 0 });
report('sweep-skipped-rest-broken', brokenRest);

let physicsSessionCalls = 0;
const cleanRest = await checkMechanismTruth(makeHinge('touching-rest', 5), {
  sweepBudget: Infinity,
  physicsCheck: true,
  physicsBudget: 0,
  physicsSessionFactory: async () => {
    physicsSessionCalls += 1;
    throw new Error('MuJoCo must not load when physicsBudget is zero');
  },
});
report('physics-skipped-rest-clean', cleanRest, physicsSessionCalls);
