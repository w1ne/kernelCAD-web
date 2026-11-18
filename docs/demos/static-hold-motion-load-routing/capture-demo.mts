// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Runs static-hold and motion-load on the #1270 mate-only fixture and writes
// the real results to verification.json and the demo slide text.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { checkStaticHold } from '../../../src/kinematic/checkStaticHold';
import { checkMotionLoad } from '../../../src/kinematic/motionLoad';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createScriptApi } from '../../../src/composition/scriptApi';

const dir = dirname(fileURLToPath(import.meta.url));
await initOcct();
const kc = createScriptApi({ session: new CaptureSession() });
const arm = kc.assembly('mate-only-arm');
const wall = arm.part('wall', kc.box(40, 40, 40, true));
const beam = arm.part('beam', kc.box(300, 20, 10, true).translate(150, 0, 0), { density: 7850 });
const pivot = { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0] } as const;
wall.connector('pivot', pivot);
beam.connector('pivot', pivot);
arm.mate('shoulder', 'wall.pivot', 'beam.pivot', 'revolute', { limitsDeg: [-90, 90] });
arm.mechanicalJoint('drive', { mate: 'shoulder', actuator: 'wall', shaft: 'wall', supports: ['wall'], output: 'beam', torqueNm: 1e-6 });

const hold = await checkStaticHold(arm, { joint: 'shoulder', pose: { shoulder: 0 } });
const load = await checkMotionLoad(arm, { mode: 'poses', poses: [{ shoulder: 0 }], quasiStatic: true, gravity: [0, 0, -9.81] });
const holdDiag = hold.diagnostics.find((d) => d.code === 'assembly.joint.static-hold.no-actuator');
const loadDiag = load.diagnostics.find((d) => d.code === 'mechanism.load.torque-exceeded');
const peak = load.joints[0]?.peakTorqueNm ?? Number.NaN;

writeFileSync(join(dir, 'verification.json'), `${JSON.stringify({
  fixture: '300 x 20 x 10 mm steel beam on mate shoulder; mechanicalJoint drive torqueNm 1e-6',
  staticHold: { ok: hold.ok, joints: hold.joints.length, posesSampled: hold.posesSampled, code: holdDiag?.code, message: holdDiag?.message },
  motionLoad: { ok: load.ok, peakTorqueNm: peak, code: loadDiag?.code, message: loadDiag?.message },
}, null, 2)}\n`);
writeFileSync(join(dir, 'slide-intro.txt'), [
  'Fixture: 300 x 20 x 10 mm steel beam',
  "Mate 'shoulder' (revolute), no arm.revolute actuator",
  "mechanicalJoint 'drive': torqueNm 0.000001",
  '',
  'Question: which check evaluates this rating?',
].join('\n'));
writeFileSync(join(dir, 'slide-static-hold.txt'), [
  "verify static-hold, joint 'shoulder', pose 0 deg",
  `ok: ${hold.ok}   joints: ${hold.joints.length}   posesSampled: ${hold.posesSampled}`,
  `code: ${holdDiag?.code}`,
  '',
  "New: names rated mechanicalJoint 'drive' and routes",
  "to verify({ check:'motion-load', quasi_static:true })",
].join('\n'));
writeFileSync(join(dir, 'slide-result.txt'), [
  'verify motion-load, quasi-static, pose 0 deg',
  `ok: ${load.ok}`,
  `peak torque: ${(peak * 1000).toFixed(1)} N.mm  rating: 0.001 N.mm`,
  `code: ${loadDiag?.code}`,
  '',
  'Static-hold: no coverage, not a pass.',
  'Motion-load: rating evaluated and exceeded.',
  'Hand calc m*g*L/2 = 0.4710 kg * 9.81 * 0.15 m = 0.6931 N.m',
].join('\n'));
console.log(JSON.stringify({ holdOk: hold.ok, loadOk: load.ok, peak, loadCode: loadDiag?.code }));
