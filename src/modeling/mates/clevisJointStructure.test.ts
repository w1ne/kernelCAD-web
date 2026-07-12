// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import type { ClevisStructuralModel, StructuralMaterial } from '../joints/types';
import type { PhysicalUseCaseJointReactionEvidence } from './physicalUseCaseJointReactions';
import { reviewClevisJointStructure } from './clevisJointStructure';

const strongSteel: StructuralMaterial = {
  name: 'strong steel',
  model: 'isotropic-ductile',
  yieldStrengthMPa: 250,
  bearingStrengthMPa: 400,
};

function model(
  overrides: Partial<ClevisStructuralModel> = {},
): ClevisStructuralModel {
  return {
    kind: 'clevis-double-shear-v1',
    source: 'joint.clevis',
    pinDiameterMm: 10,
    boreDiameterMm: 10.4,
    forkPlateThicknessMm: 5,
    forkPlateCount: 2,
    tongueThicknessMm: 8,
    forkGapMm: 9,
    supportSpanMm: 14,
    edgeDistanceMm: 15,
    materials: {
      pin: strongSteel,
      fork: strongSteel,
      tongue: strongSteel,
    },
    ...overrides,
  };
}

function reaction(
  overrides: Partial<PhysicalUseCaseJointReactionEvidence> = {},
): PhysicalUseCaseJointReactionEvidence {
  return {
    mateName: 'hinge',
    parentPart: 'base',
    childPart: 'finger',
    pointWorldMm: [0, 0, 0],
    axisWorld: [0, 1, 0],
    forceWorldN: [100, 0, 0],
    momentWorldNmm: [0, 0, 0],
    resultantForceN: 100,
    resultantMomentNmm: 0,
    axialForceN: 0,
    radialForceN: 100,
    axisMomentNmm: 0,
    bendingMomentNmm: 0,
    ...overrides,
  };
}

describe('reviewClevisJointStructure', () => {
  it('computes the v1 double-shear and centered pin-bending equations', () => {
    const result = reviewClevisJointStructure({
      reaction: reaction(),
      model: model(),
      minSafetyFactor: 2,
    });

    expect(result.status).toBe('pass');
    expect(result.checks.pinDoubleShear.stressMPa).toBeCloseTo(
      100 / (2 * Math.PI * 10 ** 2 / 4),
      10,
    );
    expect(result.checks.pinBending.stressMPa).toBeCloseTo(
      32 * (100 * 14 / 4) / (Math.PI * 10 ** 3),
      10,
    );
    expect(result.checks.pinVonMises.stressMPa).toBeCloseTo(
      Math.hypot(
        32 * (100 * 14 / 4) / (Math.PI * 10 ** 3),
        Math.sqrt(3) * (100 / (2 * Math.PI * 10 ** 2 / 4)),
      ),
      10,
    );
    expect(result.checks.tongueBearing.stressMPa).toBeCloseTo(100 / (10 * 8), 10);
    expect(result.checks.forkBearing.stressMPa).toBeCloseTo(100 / (2 * 10 * 5), 10);
    expect(result.assumptions).toEqual(expect.arrayContaining([
      expect.stringMatching(/yield.*sqrt\(3\)|sqrt\(3\).*yield/i),
    ]));
  });

  it('changes status when only pin diameter is reduced', () => {
    const baseline = reviewClevisJointStructure({ reaction: reaction({ forceWorldN: [400, 0, 0], resultantForceN: 400, radialForceN: 400 }), model: model() });
    const reduced = reviewClevisJointStructure({
      reaction: reaction({ forceWorldN: [400, 0, 0], resultantForceN: 400, radialForceN: 400 }),
      model: model({ pinDiameterMm: 3, boreDiameterMm: 3.4 }),
    });

    expect(baseline.status).toBe('pass');
    expect(reduced.status).toBe('failed');
  });

  it('changes status when only declared material strength is reduced', () => {
    const load = reaction({ forceWorldN: [600, 0, 0], resultantForceN: 600, radialForceN: 600 });
    const weak: StructuralMaterial = {
      ...strongSteel,
      name: 'weak test material',
      yieldStrengthMPa: 4,
      bearingStrengthMPa: 4,
      shearStrengthMPa: 2,
    };
    const baseline = reviewClevisJointStructure({ reaction: load, model: model() });
    const reduced = reviewClevisJointStructure({
      reaction: load,
      model: model({ materials: { pin: weak, fork: weak, tongue: weak } }),
    });

    expect(baseline.status).toBe('pass');
    expect(reduced.status).toBe('failed');
  });

  it('rejects missing materials and invalid ligament as input-incomplete', () => {
    const missing = reviewClevisJointStructure({ reaction: reaction(), model: model({ materials: undefined }) });
    const badLigament = reviewClevisJointStructure({ reaction: reaction(), model: model({ edgeDistanceMm: 5 }) });
    const partialMaterials = reviewClevisJointStructure({
      reaction: reaction(),
      model: model({
        materials: { pin: strongSteel, fork: strongSteel } as unknown as ClevisStructuralModel['materials'],
      }),
    });
    const understatedSpan = reviewClevisJointStructure({
      reaction: reaction(),
      model: model({ supportSpanMm: 1 }),
    });

    expect(missing).toMatchObject({ status: 'input-incomplete', checks: {} });
    expect(badLigament).toMatchObject({ status: 'input-incomplete', checks: {} });
    expect(partialMaterials).toMatchObject({ status: 'input-incomplete', checks: {} });
    expect(understatedSpan).toMatchObject({ status: 'input-incomplete', checks: {} });
  });

  it('blocks axial force and perpendicular reaction moment as unsupported', () => {
    const axial = reviewClevisJointStructure({
      reaction: reaction({
        forceWorldN: [100, 0.02, 0],
        resultantForceN: Math.hypot(100, 0.02),
        axialForceN: 0.02,
      }),
      model: model(),
    });
    const moment = reviewClevisJointStructure({
      reaction: reaction({
        momentWorldNmm: [0, 0, 0.2],
        resultantMomentNmm: 0.2,
        bendingMomentNmm: 0.2,
      }),
      model: model(),
    });

    expect(axial.status).toBe('unsupported-load-case');
    expect(axial.message).toMatch(/axial/i);
    expect(moment.status).toBe('unsupported-load-case');
    expect(moment.message).toMatch(/moment/i);
  });

  it('accepts the exact axial and perpendicular-moment support tolerances', () => {
    const result = reviewClevisJointStructure({
      reaction: reaction({
        forceWorldN: [100, 0.01, 0],
        momentWorldNmm: [0, 0, 0.1],
        resultantForceN: Math.hypot(100, 0.01),
        resultantMomentNmm: 0.1,
        axialForceN: 0.01,
        bendingMomentNmm: 0.1,
      }),
      model: model(),
    });

    expect(result.status).toBe('pass');
  });

  it('rejects a safety factor below 2 and inconsistent reaction decomposition', () => {
    const weakCriterion = reviewClevisJointStructure({ reaction: reaction(), model: model(), minSafetyFactor: 1.99 });
    const inconsistent = reviewClevisJointStructure({ reaction: reaction({ radialForceN: 50 }), model: model() });

    expect(weakCriterion.status).toBe('input-incomplete');
    expect(inconsistent.status).toBe('input-incomplete');
  });
});
