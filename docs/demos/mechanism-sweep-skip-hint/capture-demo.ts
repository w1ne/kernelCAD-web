import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../src/modeling/api';
import { checkMechanismTruth } from '../../../src/modeling/runtime/mechanismTruth';

const output = fileURLToPath(new URL('./demo-output.json', import.meta.url));
const kcad = createModelingApi({ session: new CaptureSession() });
const arm = kcad.assembly('rest-overlap-forced-sweep-skip');
const parent = arm.part('parent', kcad.box(10, 10, 10, true));
const child = arm.part('child', kcad.box(10, 10, 10, true));

parent.connector('joint', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 0] },
  axis: [0, 0, 1],
});
child.connector('joint', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 0] },
  axis: [0, 0, 1],
});
arm.mate('hinge', 'parent.joint', 'child.joint', 'revolute', { limitsDeg: [-30, 30] });

const result = await checkMechanismTruth(arm, { sweepBudget: 0 });
const selectedCodes = new Set([
  'mechanism.rest-interpenetration',
  'mechanism.unverified-budget-exceeded',
]);
const diagnostics = result.failures
  .filter(({ code }) => selectedCodes.has(code))
  .map(({ code, severity, message, hint }) => ({ code, severity, message, hint }));
const report = {
  scenario: 'Two overlapping 10 mm cubes joined by a revolute mate with +/-30 degree limits.',
  invocation: 'checkMechanismTruth(arm, { sweepBudget: 0 })',
  result: {
    mechanism: result.mechanism,
    sweepCoverage: result.coverage?.sweep ?? null,
    diagnostics,
  },
  scope: {
    localCadValidation: true,
    articulatedSweep: 'skipped by the forced zero budget',
    physicsSimulation: false,
    deployment: false,
    hardwareAcceptance: false,
  },
};

await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
