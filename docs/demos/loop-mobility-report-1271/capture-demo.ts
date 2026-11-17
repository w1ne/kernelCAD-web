import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../src/modeling/api';
import { solveMates } from '../../../src/modeling/mates/solver';
import { checkMechanismTruth } from '../../../src/modeling/runtime/mechanismTruth';

const output = fileURLToPath(new URL('./verification.json', import.meta.url));
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

const directSolve = await solveMates(arm);
const result = await checkMechanismTruth(arm, { sweepBudget: 0 });
const report = {
  scenario: 'A four-bar linkage authored at a non-closing start pose.',
  invocation: 'checkMechanismTruth(arm, { sweepBudget: 0 })',
  directSolver: {
    status: directSolve.status,
    diagnostics: directSolve.loop?.diagnostics.map(({ code, severity, message, loop, joint }) => ({ code, severity, message, loop, joint })) ?? [],
    mobility: directSolve.loop?.mobility ?? [],
  },
  mechanismTruth: {
    mechanism: result.mechanism,
    failures: result.failures
      .filter(({ code }) => code.startsWith('kinematic.loop.'))
      .map(({ code, severity, message, hint, details }) => ({ code, severity, message, hint, details })),
    loopMobility: result.coverage?.loopMobility ?? [],
    sweep: result.coverage?.sweep ?? null,
    physics: result.coverage?.physics ?? null,
  },
  scope: {
    localCadValidation: true,
    brepSweep: 'skipped by the forced zero budget',
    physicsSimulation: false,
    deployedBehavior: false,
    hardwareAcceptance: false,
  },
};

await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
