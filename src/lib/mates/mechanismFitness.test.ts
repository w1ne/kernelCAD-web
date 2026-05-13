import { describe, it, expect } from 'vitest';
import {
  summarizeMechanismFitness,
  type MechanismFitnessResult,
  type MechanismBlockingReason,
} from './mechanismFitness';
import type { PoseEnvelopeReviewResult } from './poseEnvelope';
import type { ValidatorDiagnostic } from './validator';

function mkPoseEnvelope(overrides: Partial<PoseEnvelopeReviewResult> = {}): PoseEnvelopeReviewResult {
  return {
    samples: [{ name: 'current', poses: {}, reason: 'capture pose' }],
    diagnostics: [],
    interferencePairs: [],
    connectorPoses: [],
    connectorWorkspace: [],
    ...overrides,
  };
}

function mkBlockingReason(code: string, message = ''): MechanismBlockingReason {
  return {
    code,
    message,
    repairHint: 'fix-me',
  };
}

function mkBlockingReasonFromValidatorDiagnostic(code: ValidatorDiagnostic['code']): ValidatorDiagnostic {
  return {
    code,
    severity: 'error',
    message: `${code} error`,
    hint: `${code} hint`,
  };
}

describe('summarizeMechanismFitness', () => {
  it('returns functional=true when there are no blocking diagnostics and tracked connectors move', () => {
    const result: MechanismFitnessResult = summarizeMechanismFitness({
      poseEnvelope: mkPoseEnvelope({
        connectorWorkspace: [
          {
            ref: 'base.output',
            partName: 'base',
            connectorName: 'output',
            min: [0, 0, 0],
            max: [10, 0, 0],
            travelMm: 10,
          },
        ],
      }),
      trackConnectors: ['base.output'],
    });

    expect(result.functional).toBe(true);
    expect(result.blockingReasons).toEqual([]);
    expect(result.passedChecks).toEqual([
      'validator-no-errors',
      'pose-envelope-solved',
      'pose-envelope-no-interference',
      'tracked-connectors-move',
    ]);
    expect(result.mechanismSummary).toMatchObject({
      sampleCount: 1,
      interferenceCount: 0,
      trackedConnectorCount: 1,
      maxTrackedTravelMm: 10,
    });
  });

  it('returns functional=false for pose-envelope interference diagnostics', () => {
    const blocking = mkBlockingReason('assembly.pose-envelope.interference', 'overlap');
    const result = summarizeMechanismFitness({
      poseEnvelope: mkPoseEnvelope({
        diagnostics: [
          {
            code: 'assembly.pose-envelope.interference',
            severity: 'error',
            message: blocking.message,
            hint: blocking.repairHint,
          },
        ],
        interferencePairs: [{ a: 'A', b: 'B', volumeMm3: 4.2 }],
      }),
      trackConnectors: [],
    });

    expect(result.functional).toBe(false);
    expect(result.blockingReasons).toHaveLength(1);
    expect(result.blockingReasons[0].code).toBe('assembly.pose-envelope.interference');
    expect(result.mechanismSummary.interferenceCount).toBe(1);
    expect(result.passedChecks).toEqual(['validator-no-errors']);
    expect(result.passedChecks).not.toContain('pose-envelope-no-interference');
  });

  it('returns functional=false for validator error diagnostics', () => {
    const result = summarizeMechanismFitness({
      validatorDiagnostics: [mkBlockingReasonFromValidatorDiagnostic('assembly.solver.did-not-converge')],
      poseEnvelope: mkPoseEnvelope(),
    });

    expect(result.functional).toBe(false);
    expect(result.blockingReasons).toHaveLength(1);
    expect(result.blockingReasons[0].code).toBe('assembly.solver.did-not-converge');
    expect(result.passedChecks).toEqual(['pose-envelope-solved', 'pose-envelope-no-interference']);
  });

  it('returns functional=false when no requested tracked connectors are in pose-envelope workspace', () => {
    const result = summarizeMechanismFitness({
      poseEnvelope: mkPoseEnvelope({
        connectorWorkspace: [
          {
            ref: 'base.other',
            partName: 'base',
            connectorName: 'other',
            min: [0, 0, 0],
            max: [0, 0, 0],
            travelMm: 0,
          },
        ],
      }),
      trackConnectors: ['base.missing'],
    });

    expect(result.functional).toBe(false);
    expect(result.blockingReasons.map((r) => r.code)).toEqual([
      'assembly.mechanism.no-tracked-workspace',
      'assembly.mechanism.no-tracked-travel',
    ]);
    expect(result.mechanismSummary.trackedConnectorCount).toBe(0);
    expect(result.mechanismSummary.maxTrackedTravelMm).toBeUndefined();
  });
});
