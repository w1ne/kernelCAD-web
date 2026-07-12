// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { KernelError } from '../../shared/intent/kernelError';
import { createApi } from '../api';
import { CaptureSession } from '../capture/captureSession';
import type { ClevisStructuralModel, StructuralMaterial } from '../joints/types';
import type {
  MateCapacity,
  MateCapacityEnvelope,
  MateLoadLimit,
  MateRecord,
} from './mate';
import {
  reviewJointReactionCapacity,
  type JointReactionCapacityEvidence,
} from './physicalUseCaseJointCapacity';
import type { PhysicalUseCaseJointReactionEvidence } from './physicalUseCaseJointReactions';

function makeArm() {
  const session = new CaptureSession();
  const kcad = createApi({ session });
  const arm = kcad.assembly('capacity-rig');
  arm
    .part('base', kcad.box(10, 10, 10))
    .connector('axis', {
      type: 'axis',
      origin: { kind: 'vec3', value: [0, 0, 0] },
      axis: [0, 0, 1],
    });
  arm
    .part('link', kcad.box(10, 10, 10))
    .connector('axis', {
      type: 'axis',
      origin: { kind: 'vec3', value: [0, 0, 0] },
      axis: [0, 0, 1],
    });
  return arm;
}

function expectInvalidArgs(action: () => void, messagePattern: RegExp): void {
  let caught: unknown;
  try {
    action();
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(KernelError);
  expect((caught as KernelError).code).toBe('feature.invalid-args');
  expect((caught as Error).message).toMatch(messagePattern);
}

function makeMate(
  opts: {
    name?: string;
    capacity?: MateCapacity;
    maxLoad?: MateLoadLimit;
  } = {},
): MateRecord {
  return {
    name: opts.name ?? 'hinge',
    a: 'base.axis',
    b: 'link.axis',
    type: 'revolute',
    ...(opts.capacity !== undefined ? { capacity: opts.capacity } : {}),
    ...(opts.maxLoad !== undefined ? { maxLoad: opts.maxLoad } : {}),
  };
}

function makeReaction(
  overrides: Partial<PhysicalUseCaseJointReactionEvidence> = {},
): PhysicalUseCaseJointReactionEvidence {
  return {
    mateName: 'hinge',
    parentPart: 'base',
    childPart: 'link',
    pointWorldMm: [0, 0, 0],
    axisWorld: [0, 0, 1],
    forceWorldN: [120, 0, 0],
    momentWorldNmm: [0, 800, 0],
    resultantForceN: 120,
    resultantMomentNmm: 800,
    axialForceN: 0,
    radialForceN: 120,
    axisMomentNmm: 0,
    bendingMomentNmm: 800,
    ...overrides,
  };
}

function capacityEnvelope(
  maxResultantForceN = 120,
  maxResultantMomentNmm = 800,
): MateCapacity {
  return {
    envelope: { maxResultantForceN, maxResultantMomentNmm },
  };
}

function structuralModel(): ClevisStructuralModel {
  const steel: StructuralMaterial = {
    name: 'test steel',
    model: 'isotropic-ductile',
    yieldStrengthMPa: 250,
    bearingStrengthMPa: 400,
  };
  return {
    kind: 'clevis-double-shear-v1',
    source: 'joint.clevis',
    pinDiameterMm: 6,
    boreDiameterMm: 6.4,
    forkPlateThicknessMm: 4,
    forkPlateCount: 2,
    tongueThicknessMm: 5,
    forkGapMm: 6,
    supportSpanMm: 10,
    edgeDistanceMm: 10,
    materials: { pin: steel, fork: steel, tongue: steel },
  };
}

describe('mate capacity capture', () => {
  it('preserves capacity and maxLoad as nested copies through subAssembly import', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const ratedSource = kcad.assembly('rated-source');
    ratedSource
      .part('base', kcad.box(10, 10, 10))
      .connector('axis', {
        type: 'axis',
        origin: { kind: 'vec3', value: [0, 0, 0] },
        axis: [0, 0, 1],
      });
    ratedSource
      .part('link', kcad.box(10, 10, 10))
      .connector('axis', {
        type: 'axis',
        origin: { kind: 'vec3', value: [0, 0, 0] },
        axis: [0, 0, 1],
      });
    ratedSource.mate('hinge', 'base.axis', 'link.axis', 'revolute', {
      capacity: {
        envelope: {
          maxResultantForceN: 120,
          maxResultantMomentNmm: 800,
        },
        structure: structuralModel(),
      },
    });

    const legacySource = kcad.assembly('legacy-source');
    legacySource
      .part('base', kcad.box(10, 10, 10))
      .connector('axis', {
        type: 'axis',
        origin: { kind: 'vec3', value: [0, 0, 0] },
        axis: [0, 0, 1],
      });
    legacySource
      .part('link', kcad.box(10, 10, 10))
      .connector('axis', {
        type: 'axis',
        origin: { kind: 'vec3', value: [0, 0, 0] },
        axis: [0, 0, 1],
      });
    legacySource.mate('hinge', 'base.axis', 'link.axis', 'revolute', {
      maxLoad: { force: 120, torque: 0.8 },
    });

    const parent = kcad.assembly('parent');
    parent.subAssembly('rated', ratedSource);
    parent.subAssembly('legacy', legacySource);

    const importedRated = parent.__mates().find((mate) => mate.name === 'rated_hinge');
    const importedLegacy = parent.__mates().find((mate) => mate.name === 'legacy_hinge');
    expect(importedRated?.capacity).toEqual({
      envelope: {
        maxResultantForceN: 120,
        maxResultantMomentNmm: 800,
      },
      structure: structuralModel(),
    });
    expect(importedRated?.capacity).not.toBe(ratedSource.__mates()[0].capacity);
    expect(importedRated?.capacity?.envelope).not.toBe(
      ratedSource.__mates()[0].capacity?.envelope,
    );
    expect(importedRated?.capacity?.structure).not.toBe(
      ratedSource.__mates()[0].capacity?.structure,
    );
    expect(importedRated?.capacity?.structure?.materials?.pin).not.toBe(
      ratedSource.__mates()[0].capacity?.structure?.materials?.pin,
    );
    expect(importedLegacy?.maxLoad).toEqual({ force: 120, torque: 0.8 });
    expect(importedLegacy?.maxLoad).not.toBe(legacySource.__mates()[0].maxLoad);
  });

  it('captures a unit-bearing capacity envelope on the public mate record', () => {
    const arm = makeArm();

    arm.mate('hinge', 'base.axis', 'link.axis', 'revolute', {
      capacity: {
        envelope: {
          maxResultantForceN: 120,
          maxResultantMomentNmm: 800,
        },
      },
    });

    expect(arm.__mates()[0]).toEqual({
      name: 'hinge',
      a: 'base.axis',
      b: 'link.axis',
      type: 'revolute',
      capacity: {
        envelope: {
          maxResultantForceN: 120,
          maxResultantMomentNmm: 800,
        },
      },
    });
  });

  it('defensively copies the capacity and nested envelope', () => {
    const arm = makeArm();
    const capacity = {
      envelope: {
        maxResultantForceN: 120,
        maxResultantMomentNmm: 800,
      },
    };

    arm.mate('hinge', 'base.axis', 'link.axis', 'revolute', { capacity });
    const captured = arm.__mates()[0].capacity;

    expect(captured).not.toBe(capacity);
    expect(captured?.envelope).not.toBe(capacity.envelope);
    capacity.envelope.maxResultantForceN = 999;
    capacity.envelope.maxResultantMomentNmm = 999;
    expect(captured?.envelope).toEqual({
      maxResultantForceN: 120,
      maxResultantMomentNmm: 800,
    });
  });

  it('captures a clevis structural model only on revolute mates and copies it deeply', () => {
    const arm = makeArm();
    const structure = structuralModel();
    const capacity: MateCapacity = {
      envelope: { maxResultantForceN: 120, maxResultantMomentNmm: 800 },
      structure,
    };

    arm.mate('hinge', 'base.axis', 'link.axis', 'revolute', { capacity });
    const captured = arm.__mates()[0].capacity?.structure;

    expect(captured).toEqual(structure);
    expect(captured).not.toBe(structure);
    expect(captured?.materials).not.toBe(structure.materials);
    expect(captured?.materials?.pin).not.toBe(structure.materials?.pin);

    const prismatic = makeArm();
    expectInvalidArgs(
      () => prismatic.mate('slide', 'base.axis', 'link.axis', 'prismatic', {
        capacity: { structure },
      }),
      /structure.*revolute/i,
    );
  });

  it.each([
    ['null', null],
    ['string', 'invalid'],
    ['number', 42],
    ['array', []],
  ])('rejects malformed capacity shape: %s', (_label, capacity) => {
    const arm = makeArm();

    expectInvalidArgs(
      () => arm.mate('hinge', 'base.axis', 'link.axis', 'revolute', {
        capacity: capacity as unknown as MateCapacity,
      }),
      /capacity.*object/i,
    );
  });

  it.each([
    ['null', null],
    ['string', 'invalid'],
    ['array', []],
  ])('rejects malformed capacity.envelope shape: %s', (_label, envelope) => {
    const arm = makeArm();

    expectInvalidArgs(
      () => arm.mate('hinge', 'base.axis', 'link.axis', 'revolute', {
        capacity: { envelope } as unknown as MateCapacity,
      }),
      /capacity\.envelope.*object/i,
    );
  });

  it.each([
    ['null', null],
    ['string', 'invalid'],
    ['number', 42],
    ['array', []],
  ])('rejects malformed maxLoad shape: %s', (_label, maxLoad) => {
    const arm = makeArm();

    expectInvalidArgs(
      () => arm.mate('hinge', 'base.axis', 'link.axis', 'revolute', {
        maxLoad: maxLoad as unknown as MateLoadLimit,
      }),
      /maxLoad.*object/i,
    );
  });

  it('continues to capture an empty capacity object', () => {
    const arm = makeArm();

    arm.mate('hinge', 'base.axis', 'link.axis', 'revolute', { capacity: {} });

    expect(arm.__mates()[0].capacity).toEqual({});
  });

  it('continues to capture an empty maxLoad object', () => {
    const arm = makeArm();

    arm.mate('hinge', 'base.axis', 'link.axis', 'revolute', { maxLoad: {} });

    expect(arm.__mates()[0].maxLoad).toEqual({});
  });

  const invalidEnvelopeCases: readonly [
    label: string,
    field: 'maxResultantForceN' | 'maxResultantMomentNmm',
    value: number | undefined,
    unit: 'N' | 'Nmm',
  ][] = [
    ['missing force', 'maxResultantForceN', undefined, 'N'],
    ['zero force', 'maxResultantForceN', 0, 'N'],
    ['negative force', 'maxResultantForceN', -1, 'N'],
    ['NaN force', 'maxResultantForceN', Number.NaN, 'N'],
    ['infinite force', 'maxResultantForceN', Number.POSITIVE_INFINITY, 'N'],
    ['missing moment', 'maxResultantMomentNmm', undefined, 'Nmm'],
    ['zero moment', 'maxResultantMomentNmm', 0, 'Nmm'],
    ['negative moment', 'maxResultantMomentNmm', -1, 'Nmm'],
    ['NaN moment', 'maxResultantMomentNmm', Number.NaN, 'Nmm'],
    ['infinite moment', 'maxResultantMomentNmm', Number.POSITIVE_INFINITY, 'Nmm'],
  ];

  it.each(invalidEnvelopeCases)(
    'rejects an envelope with %s',
    (_label, field, value, unit) => {
      const arm = makeArm();
      const envelope: {
        maxResultantForceN?: number;
        maxResultantMomentNmm?: number;
      } = {
        maxResultantForceN: 120,
        maxResultantMomentNmm: 800,
      };
      if (value === undefined) delete envelope[field];
      else envelope[field] = value;

      expectInvalidArgs(
        () => arm.mate('hinge', 'base.axis', 'link.axis', 'revolute', {
          capacity: { envelope: envelope as MateCapacityEnvelope },
        }),
        new RegExp(`${field}.*positive finite.*${unit}`),
      );
    },
  );

  it('rejects capacity and legacy maxLoad together with unit-bearing guidance', () => {
    const arm = makeArm();

    expectInvalidArgs(
      () => arm.mate('hinge', 'base.axis', 'link.axis', 'revolute', {
        capacity: {
          envelope: {
            maxResultantForceN: 120,
            maxResultantMomentNmm: 800,
          },
        },
        maxLoad: { force: 120, torque: 0.8 },
      }),
      /capacity\.envelope.*N.*Nmm.*maxLoad.*N.*Nm/i,
    );
  });

  const invalidLegacyCases: readonly [
    field: 'force' | 'torque',
    value: number,
    unit: 'N' | 'Nm',
  ][] = [
    ['force', 0, 'N'],
    ['force', -1, 'N'],
    ['force', Number.NaN, 'N'],
    ['force', Number.POSITIVE_INFINITY, 'N'],
    ['torque', 0, 'Nm'],
    ['torque', -1, 'Nm'],
    ['torque', Number.NaN, 'Nm'],
    ['torque', Number.POSITIVE_INFINITY, 'Nm'],
  ];

  it.each(invalidLegacyCases)(
    'rejects invalid legacy maxLoad.%s=%s',
    (field, value, unit) => {
      const arm = makeArm();

      expectInvalidArgs(
        () => arm.mate('hinge', 'base.axis', 'link.axis', 'revolute', {
          maxLoad: { [field]: value },
        }),
        new RegExp(`maxLoad\\.${field}.*positive finite.*${unit}`),
      );
    },
  );

  it('rejects legacy torque whose conversion from Nm to Nmm overflows', () => {
    const arm = makeArm();

    expectInvalidArgs(
      () => arm.mate('hinge', 'base.axis', 'link.axis', 'revolute', {
        maxLoad: { force: 120, torque: Number.MAX_VALUE },
      }),
      /maxLoad\.torque.*Nm.*Nmm.*finite/i,
    );
  });

  it('captures and defensively copies the legacy manual-load declaration', () => {
    const arm = makeArm();
    const maxLoad = { force: 120, torque: 0.8 };

    arm.mate('hinge', 'base.axis', 'link.axis', 'revolute', { maxLoad });
    const captured = arm.__mates()[0];

    expect(captured).toEqual({
      name: 'hinge',
      a: 'base.axis',
      b: 'link.axis',
      type: 'revolute',
      maxLoad: { force: 120, torque: 0.8 },
    });
    expect(captured.maxLoad).not.toBe(maxLoad);
    maxLoad.force = 999;
    maxLoad.torque = 999;
    expect(captured.maxLoad).toEqual({ force: 120, torque: 0.8 });
  });
});

describe('reviewJointReactionCapacity', () => {
  it('passes at exact capacity-envelope force and moment thresholds', () => {
    const evidence = reviewJointReactionCapacity(
      makeMate({ capacity: capacityEnvelope() }),
      makeReaction(),
    );

    expect(evidence).toEqual<JointReactionCapacityEvidence>({
      mateName: 'hinge',
      status: 'pass',
      resultantForceN: 120,
      resultantMomentNmm: 800,
      maxResultantForceN: 120,
      maxResultantMomentNmm: 800,
      forceExceeded: false,
      momentExceeded: false,
      source: 'capacity',
    });
  });

  it('marks only force exceeded when moment remains at its threshold', () => {
    const evidence = reviewJointReactionCapacity(
      makeMate({ capacity: capacityEnvelope() }),
      makeReaction({ resultantForceN: 121 }),
    );

    expect(evidence).toMatchObject({
      status: 'exceeded',
      forceExceeded: true,
      momentExceeded: false,
    });
  });

  it('marks only moment exceeded when force remains at its threshold', () => {
    const evidence = reviewJointReactionCapacity(
      makeMate({ capacity: capacityEnvelope() }),
      makeReaction({ resultantMomentNmm: 801 }),
    );

    expect(evidence).toMatchObject({
      status: 'exceeded',
      forceExceeded: false,
      momentExceeded: true,
    });
  });

  it('marks both force and moment exceeded', () => {
    const evidence = reviewJointReactionCapacity(
      makeMate({ capacity: capacityEnvelope() }),
      makeReaction({ resultantForceN: 121, resultantMomentNmm: 801 }),
    );

    expect(evidence).toMatchObject({
      status: 'exceeded',
      forceExceeded: true,
      momentExceeded: true,
    });
  });

  it.each([
    ['no capacity declaration', makeMate()],
    ['capacity without an envelope', makeMate({ capacity: {} })],
  ])('reports undeclared for %s', (_label, mate) => {
    expect(reviewJointReactionCapacity(mate, makeReaction())).toEqual({
      mateName: 'hinge',
      status: 'undeclared',
      resultantForceN: 120,
      resultantMomentNmm: 800,
      forceExceeded: false,
      momentExceeded: false,
    });
  });

  it('captures legacy maxLoad and converts 0.8 Nm to 800 Nmm exactly once', () => {
    const arm = makeArm();
    arm.mate('hinge', 'base.axis', 'link.axis', 'revolute', {
      maxLoad: { force: 120, torque: 0.8 },
    });

    expect(reviewJointReactionCapacity(arm.__mates()[0], makeReaction())).toEqual({
      mateName: 'hinge',
      status: 'pass',
      resultantForceN: 120,
      resultantMomentNmm: 800,
      maxResultantForceN: 120,
      maxResultantMomentNmm: 800,
      forceExceeded: false,
      momentExceeded: false,
      source: 'legacy-max-load',
    });
  });

  it('keeps an overflowing pre-existing legacy torque undeclared without Infinity', () => {
    const evidence = reviewJointReactionCapacity(
      makeMate({ maxLoad: { force: 120, torque: Number.MAX_VALUE } }),
      makeReaction(),
    );

    expect(evidence).toEqual({
      mateName: 'hinge',
      status: 'undeclared',
      resultantForceN: 120,
      resultantMomentNmm: 800,
      maxResultantForceN: 120,
      forceExceeded: false,
      momentExceeded: false,
      source: 'legacy-max-load',
    });
    expect(evidence).not.toHaveProperty('maxResultantMomentNmm');
  });

  it.each([
    [
      'force only',
      { force: 120 },
      makeReaction({ resultantForceN: 121 }),
      {
        maxResultantForceN: 120,
        forceExceeded: true,
        momentExceeded: false,
      },
    ],
    [
      'torque only',
      { torque: 0.8 },
      makeReaction({ resultantMomentNmm: 801 }),
      {
        maxResultantMomentNmm: 800,
        forceExceeded: false,
        momentExceeded: true,
      },
    ],
  ] as const)(
    'keeps partial legacy maxLoad (%s) undeclared without a synthetic counterpart',
    (_label, maxLoad, reaction, expected) => {
      const evidence = reviewJointReactionCapacity(makeMate({ maxLoad }), reaction);

      expect(evidence).toMatchObject({
        status: 'undeclared',
        source: 'legacy-max-load',
        ...expected,
      });
      if ('maxResultantForceN' in expected) {
        expect(evidence).not.toHaveProperty('maxResultantMomentNmm');
      } else {
        expect(evidence).not.toHaveProperty('maxResultantForceN');
      }
    },
  );

  it('rejects a reaction captured for a different mate', () => {
    expect(() => reviewJointReactionCapacity(
      makeMate({ capacity: capacityEnvelope() }),
      makeReaction({ mateName: 'other-hinge' }),
    )).toThrow(/reaction mate 'other-hinge'.*mate 'hinge'/i);
  });
});
