// Reproducible local evidence for unavailable rest-pose joint measurements.
import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../src/modeling/api';
import { checkMechanismTruth } from '../../../src/modeling/runtime/mechanismTruth';
import * as brepDistance from '../../../src/modeling/runtime/brepDistance';
import * as restAnalysisMesh from '../../../src/modeling/runtime/restAnalysisMesh';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO_DIR = resolve(HERE, '../../../docs/demos/rest-joint-continuity-925');

describe('rest-pose joint continuity demo', () => {
  it('keeps unavailable annular-joint continuity unverified when the sweep is forced off', async () => {
    const session = new CaptureSession();
    const kcad = createModelingApi({ session });
    const arm = kcad.assembly('rest-joint-continuity-demo');

    const ring = arm.part('parent', kcad.cylinder(10, 30).subtract(kcad.cylinder(12, 20).translate(0, 0, -1)));
    ring.connector('hinge', {
      type: 'axis',
      origin: { kind: 'vec3', value: [0, 0, 10.2] },
      axis: [0, 0, 1],
    });
    const disc = arm.part('child', kcad.cylinder(3, 28));
    disc.connector('hinge', {
      type: 'axis',
      origin: { kind: 'vec3', value: [0, 0, 0] },
      axis: [0, 0, 1],
    });
    arm.mate('select', 'parent.hinge', 'child.hinge', 'revolute', { limitsDeg: [0, 300] });

    const settings = { sweepBudget: 0 };
    const meshSpy = vi.spyOn(restAnalysisMesh, 'restMeshBvh').mockReturnValue(undefined);
    const distanceSpy = vi.spyOn(brepDistance, 'brepExtremaDistance').mockReturnValue(undefined);
    try {
      const result = await checkMechanismTruth(arm, settings);
      const unknown = result.failures.find((diagnostic) => diagnostic.code === 'mechanism.joint-mesh-unverified');
      expect(meshSpy).toHaveBeenCalled();
      expect(distanceSpy).toHaveBeenCalled();
      expect(unknown?.severity).toBe('warn');
      expect(result.mechanism).toBe('unverified');
      expect(result.coverage?.sweep).toBe(false);
      const sweepWarning = result.failures.find((diagnostic) => diagnostic.code === 'mechanism.unverified-budget-exceeded');
      expect(sweepWarning?.message).toContain('sweepBudget is 0 (forced skip)');
      expect(sweepWarning?.message).not.toContain('exceeds the budget 0');

      const report = {
        invocation: 'npx vitest run tests/integration/fast/restJointContinuityUnavailableDemo.test.ts',
        case: 'Annular rim/disc model with mesh and BREP pivot-distance measurements unavailable; sweep forced off at zero budget.',
        settings,
        evidence: {
          verdict: result.mechanism,
          coverage: { sweep: result.coverage?.sweep, poses: result.coverage?.poses, joints: result.coverage?.joints },
          diagnostics: result.failures.map(({ code, severity, message }) => ({ code, severity, message })),
        },
        scope: {
          localValidation: 'Direct checkMechanismTruth call on an annular rim/disc model; mesh and BREP pivot-distance paths were stubbed unavailable.',
          simulation: 'No physics or motion simulation was run; the BREP pose sweep was forced off by sweepBudget: 0.',
          deployment: 'Not deployed; this is branch-local evidence.',
          hardware: 'No physical hardware was used or accepted.',
        },
      };
      await writeFile(resolve(DEMO_DIR, 'demo-output.json'), `${JSON.stringify(report, null, 2)}\n`);
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    } finally {
      meshSpy.mockRestore();
      distanceSpy.mockRestore();
    }
  }, 90000);
});
