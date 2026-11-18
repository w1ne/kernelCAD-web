// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { writeFileSync } from 'node:fs';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createScriptApi } from '../../../src/composition/scriptApi';
import { checkStaticHold } from '../../../src/kinematic/checkStaticHold';
import { RecomputeEngine } from '../../../src/modeling/compute/recomputeEngine';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const bundle = new URL('.', import.meta.url);
const session = new CaptureSession();
const kc = createScriptApi({ session });
const arm = kc.assembly('static-hold-mass-unavailable');
const wall = arm.part('wall', kc.box(40, 40, 40, true));
const beam = arm.part(
  'beam',
  kc.box(300, 20, 10, true).translate(150, 0, 0),
  { density: 7850 },
);
arm.revolute('shoulder', wall, beam, {
  axis: [0, 1, 0],
  origin: [0, 0, 0],
  limitsDeg: [-90, 90],
  actuator: { torqueNm: 10 },
});

await initOcct();
const originalRun = RecomputeEngine.prototype.run;
RecomputeEngine.prototype.run = async () => ({
  shapes: new Map(),
  diagnostics: [],
  health: new Map(),
  selections: [],
});

let result;
try {
  result = await checkStaticHold(arm, { pose: { shoulder: 0 } });
} finally {
  RecomputeEngine.prototype.run = originalRun;
}

const diagnostic = result.diagnostics.find(
  (item) => item.code === 'assembly.joint.static-hold.mass-unavailable',
);
if (result.ok || diagnostic?.severity !== 'error' || result.posesSampled !== 0) {
  throw new Error(`Expected fail-closed static-hold result, received ${JSON.stringify(result)}`);
}

const verification = {
  issue: 1270,
  created: '2026-11-13',
  kind: 'local regression replay',
  invocation: 'node --import tsx docs/demos/static-hold-mass-unavailable/capture-demo.mjs',
  fixture: {
    assembly: 'static-hold-mass-unavailable',
    joint: 'shoulder',
    kind: 'revolute',
    beamSizeMm: [300, 20, 10],
    actuatorTorqueNm: 10,
    requestedPose: { shoulder: 0 },
  },
  faultInjection: 'RecomputeEngine.run returns no lowered scene shape for the captured assembly feature.',
  expectation: {
    ok: false,
    posesSampled: 0,
    diagnostic: 'assembly.joint.static-hold.mass-unavailable',
    severity: 'error',
  },
  actual: result,
  limits: [
    'The lowerer result is deliberately injected to exercise the unavailable-scene branch.',
    'No torque estimate or physics simulation is performed in this replay.',
    'This local result does not establish deployed behavior or hardware acceptance.',
  ],
};

writeFileSync(new URL('verification.json', bundle), `${JSON.stringify(verification, null, 2)}\n`);
writeFileSync(
  new URL('slide-intro.txt', bundle),
  [
    'Static-hold regression',
    '',
    'Actuated beam; shoulder pose is explicit.',
    'Lowering returns no scene for mass calculation.',
    '',
    'No scene means no holding-capacity pass.',
  ].join('\n'),
);
writeFileSync(
  new URL('slide-injection.txt', bundle),
  [
    'Local fault injection',
    '',
    'RecomputeEngine.run returns an empty shape map.',
    'No scene is available to measure part mass.',
    '',
    'Injected fault; not a geometry or physics simulation.',
  ].join('\n'),
);
writeFileSync(
  new URL('slide-result.txt', bundle),
  [
    'Result: no verification pass',
    '',
    'ok: false',
    'posesSampled: 0',
    '',
    'assembly.joint.static-hold.mass-unavailable',
    'severity: error',
    '',
    'No actuator capacity comparison was made.',
  ].join('\n'),
);
