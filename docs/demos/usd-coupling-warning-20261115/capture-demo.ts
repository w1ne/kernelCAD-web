// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../src/modeling/api';
import { usdIsaacSerialize } from '../../../src/modeling/export/usd/usdIsaacSerializer';
import type { Vec3 } from '../../../src/shared/intent/types';

type Part = ReturnType<ReturnType<typeof createModelingApi>['assembly']>['part'];
const outDir = dirname(fileURLToPath(import.meta.url));

function axisConn(part: Part, name: string, origin: Vec3, axis: Vec3) {
  part.connector(name, { type: 'axis', origin: { kind: 'vec3', value: origin }, axis });
}

async function main() {
  await initOcct();
  const kcad = createModelingApi({ session: new CaptureSession() });
  const arm = kcad.assembly('coupling-warning-demo');
  const base = arm.part('base', kcad.box(60, 20, 10), { density: 2700 });
  const input = arm.part('input', kcad.cylinder(8, 5), { density: 2700 });
  const output = arm.part('output', kcad.cylinder(16, 5), { density: 2700 });
  axisConn(base, 'in', [0, 0, 10], [0, 0, 1]);
  axisConn(base, 'out', [24, 0, 10], [0, 0, 1]);
  axisConn(input, 'hub', [0, 0, 0], [0, 0, 1]);
  axisConn(output, 'hub', [0, 0, 0], [0, 0, 1]);
  arm.mate('input', 'base.in', 'input.hub', 'revolute', { limitsDeg: [-180, 180] });
  arm.mate('output', 'base.out', 'output.hub', 'revolute', { limitsDeg: [-90, 90] });
  arm.coupleMates('output', { source: 'input', ratio: -0.5 });

  const { usda, diagnostics } = await usdIsaacSerialize(arm, {});
  const couplingWarnings = diagnostics.filter((item) => item.code === 'export.usd.coupling-dropped');
  const hasIndependentDrivenJoint = usda.includes('PhysicsRevoluteJoint "output"');
  const hasMimicApi = /Mimic/i.test(usda);
  if (couplingWarnings.length !== 1 || couplingWarnings[0].severity !== 'warn') {
    throw new Error(`Expected one coupling warning, got ${couplingWarnings.length}.`);
  }
  if (!hasIndependentDrivenJoint || hasMimicApi) {
    throw new Error('Expected an independent output joint and no mimic API in the emitted stage.');
  }

  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, 'stage.usda'), usda);
  await writeFile(join(outDir, 'diagnostics.json'), `${JSON.stringify(diagnostics, null, 2)}\n`);
  const stageHash = createHash('sha256').update(usda).digest('hex');
  await writeFile(join(outDir, 'verification.json'), `${JSON.stringify({
    date: new Date().toISOString(),
    invocation: 'npx tsx docs/demos/usd-coupling-warning-20261115/capture-demo.ts',
    target: 'usd-isaac',
    localSerializer: {
      outputWritten: true,
      stageBytes: Buffer.byteLength(usda),
      stageSha256: stageHash,
      couplingWarnings: couplingWarnings.length,
      severity: couplingWarnings[0].severity,
      warningMessage: couplingWarnings[0].message,
      independentDrivenJointPresent: hasIndependentDrivenJoint,
      mimicApiPresent: hasMimicApi,
    },
    scope: {
      isaacSimRuntimeReplay: false,
      deployedBehavior: false,
      hardwareAcceptance: false,
    },
  }, null, 2)}\n`);
  console.log(JSON.stringify({
    stage: 'stage.usda',
    diagnostics: 'diagnostics.json',
    warningCount: couplingWarnings.length,
    warning: couplingWarnings[0].message,
    independentDrivenJointPresent: hasIndependentDrivenJoint,
    mimicApiPresent: hasMimicApi,
    stageBytes: Buffer.byteLength(usda),
    stageSha256: stageHash,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
