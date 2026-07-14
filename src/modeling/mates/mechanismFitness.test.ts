// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import {
  summarizeMechanismFitness,
  type MechanismFitnessResult,
  type MechanismBlockingReason,
} from './mechanismFitness';
import type { PoseEnvelopeReviewResult } from './poseEnvelope';
import type { ValidatorDiagnostic } from './validator';
import type { MechanicalPlausibilityDiagnostic } from './mechanicalPlausibility';

function mkPoseEnvelope(overrides: Partial<PoseEnvelopeReviewResult> = {}): PoseEnvelopeReviewResult {
  return {
    samples: [{ name: 'current', poses: {}, reason: 'capture pose' }],
    diagnostics: [],
    interferencePairs: [],
    clearancePairs: [],
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

function mkMechanicalDiagnostic(): MechanicalPlausibilityDiagnostic {
  return {
    code: 'assembly.mechanical.connector-not-in-solid',
    severity: 'error',
    message: 'connector is away from modeled material',
    hint: 'add support geometry',
    mateName: 'yaw',
    partName: 'link',
    connectorName: 'axis',
    connectorRef: 'link.axis',
    distanceMm: 42,
    bbox: { min: [50, -2, -2], max: [70, 2, 2] },
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
    expect(result.repairMode).toBe('none');
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
    expect(result.repairMode).toBe('local-fix');
    expect(result.repairDirective).toMatch(/Fix the reported local modeling errors/);
    expect(result.blockingReasons).toHaveLength(1);
    expect(result.blockingReasons[0].code).toBe('assembly.pose-envelope.interference');
    expect(result.mechanismSummary.interferenceCount).toBe(1);
    expect(result.passedChecks).toEqual(['validator-no-errors']);
    expect(result.passedChecks).not.toContain('pose-envelope-no-interference');
  });

  it('blocks an unresolved requested clearance measurement', () => {
    const result = summarizeMechanismFitness({
      poseEnvelope: mkPoseEnvelope({
        diagnostics: [
          {
            code: 'assembly.pose-envelope.clearance-unresolved',
            severity: 'warning',
            message: 'exact clearance was not measured',
            hint: 'repair the lowering path',
            sampleName: 'yaw:max',
            partA: 'base',
            partB: 'link',
          },
        ],
      }),
      trackConnectors: [],
    });

    expect(result.functional).toBe(false);
    expect(result.blockingReasons.map((reason) => reason.code)).toContain(
      'assembly.pose-envelope.clearance-unresolved',
    );
    expect(result.passedChecks).not.toContain('pose-envelope-solved');
  });

  it('adds a layout-conflict blocker when the same parts collide across most pose samples', () => {
    const result = summarizeMechanismFitness({
      poseEnvelope: mkPoseEnvelope({
        samples: [
          { name: 'current', poses: {}, reason: 'current' },
          { name: 'yaw:min', poses: { yaw: -45 }, reason: 'min' },
          { name: 'yaw:max', poses: { yaw: 45 }, reason: 'max' },
        ],
        diagnostics: [
          {
            code: 'assembly.pose-envelope.interference',
            severity: 'error',
            sampleName: 'current',
            partA: 'shoulder-cheeks',
            partB: 'upper-arm-beam',
            volumeMm3: 10,
            message: 'current overlap',
            hint: 'fix overlap',
          },
          {
            code: 'assembly.pose-envelope.interference',
            severity: 'error',
            sampleName: 'yaw:min',
            partA: 'shoulder-cheeks',
            partB: 'upper-arm-beam',
            volumeMm3: 12,
            message: 'min overlap',
            hint: 'fix overlap',
          },
          {
            code: 'assembly.pose-envelope.interference',
            severity: 'error',
            sampleName: 'yaw:max',
            partA: 'shoulder-cheeks',
            partB: 'upper-arm-beam',
            volumeMm3: 8,
            message: 'max overlap',
            hint: 'fix overlap',
          },
        ],
        interferencePairs: [
          { sampleName: 'current', a: 'shoulder-cheeks', b: 'upper-arm-beam', volumeMm3: 10 },
          { sampleName: 'yaw:min', a: 'shoulder-cheeks', b: 'upper-arm-beam', volumeMm3: 12 },
          { sampleName: 'yaw:max', a: 'shoulder-cheeks', b: 'upper-arm-beam', volumeMm3: 8 },
        ],
      }),
    });

    expect(result.functional).toBe(false);
    expect(result.repairMode).toBe('topology-redesign');
    expect(result.repairDirective).toMatch(/redesign the affected joint or module from the original design prompt/i);
    expect(result.blockingReasons.map((reason) => reason.code)).toContain('assembly.mechanism.layout-conflict');
    const layout = result.blockingReasons.find((reason) => reason.code === 'assembly.mechanism.layout-conflict');
    expect(layout?.message).toContain('shoulder-cheeks');
    expect(layout?.message).toContain('upper-arm-beam');
    expect(layout?.repairHint).toMatch(/redesign/i);
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

  it('uses parameter-tune mode when the only blocker is a pose outside limits', () => {
    const result = summarizeMechanismFitness({
      poseEnvelope: mkPoseEnvelope({
        diagnostics: [
          {
            code: 'assembly.pose.out-of-limits',
            severity: 'error',
            mateName: 'elbow',
            sampleName: 'current',
            pose: 120,
            limits: [-90, 90],
            message: 'elbow is outside limits',
            hint: 'clamp elbow',
          },
        ],
      }),
    });

    expect(result.functional).toBe(false);
    expect(result.repairMode).toBe('parameter-tune');
    expect(result.repairDirective).toMatch(/Tune numeric poses, limits, or ranges/);
  });

  it('returns functional=false for mechanical plausibility diagnostics', () => {
    const result = summarizeMechanismFitness({
      mechanicalPlausibilityDiagnostics: [mkMechanicalDiagnostic()],
      poseEnvelope: mkPoseEnvelope(),
    });

    expect(result.functional).toBe(false);
    expect(result.blockingReasons).toHaveLength(1);
    expect(result.blockingReasons[0].code).toBe('assembly.mechanical.connector-not-in-solid');
    expect(result.mechanismSummary.mechanicalPlausibilityIssueCount).toBe(1);
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
