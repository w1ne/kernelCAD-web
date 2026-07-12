// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { MateRecord } from './mate';
import type { PhysicalUseCaseJointReactionEvidence } from './physicalUseCaseJointReactions';

const NMM_PER_NM = 1000;

export interface JointReactionCapacityEvidence {
  readonly mateName: string;
  readonly status: 'pass' | 'exceeded' | 'undeclared';
  readonly resultantForceN: number;
  readonly resultantMomentNmm: number;
  readonly maxResultantForceN?: number;
  readonly maxResultantMomentNmm?: number;
  readonly forceExceeded: boolean;
  readonly momentExceeded: boolean;
  readonly source?: 'capacity' | 'legacy-max-load';
}

interface NormalizedCapacityEnvelope {
  readonly maxResultantForceN?: number;
  readonly maxResultantMomentNmm?: number;
  readonly source?: JointReactionCapacityEvidence['source'];
}

/**
 * Compare a pose-bound joint reaction with a declared resultant rating.
 * A passing rating comparison is not structural proof.
 */
export function reviewJointReactionCapacity(
  mate: MateRecord,
  reaction: PhysicalUseCaseJointReactionEvidence,
): JointReactionCapacityEvidence {
  if (reaction.mateName !== mate.name) {
    throw new Error(
      `Joint reaction mate '${reaction.mateName}' does not match mate '${mate.name}'; compare evidence for the same joint.`,
    );
  }

  const normalized = normalizeCapacityEnvelope(mate);
  const forceExceeded = normalized.maxResultantForceN !== undefined
    && reaction.resultantForceN > normalized.maxResultantForceN;
  const momentExceeded = normalized.maxResultantMomentNmm !== undefined
    && reaction.resultantMomentNmm > normalized.maxResultantMomentNmm;
  const complete = normalized.maxResultantForceN !== undefined
    && normalized.maxResultantMomentNmm !== undefined;

  return {
    mateName: mate.name,
    status: !complete
      ? 'undeclared'
      : forceExceeded || momentExceeded
        ? 'exceeded'
        : 'pass',
    resultantForceN: reaction.resultantForceN,
    resultantMomentNmm: reaction.resultantMomentNmm,
    ...(normalized.maxResultantForceN !== undefined
      ? { maxResultantForceN: normalized.maxResultantForceN }
      : {}),
    ...(normalized.maxResultantMomentNmm !== undefined
      ? { maxResultantMomentNmm: normalized.maxResultantMomentNmm }
      : {}),
    forceExceeded,
    momentExceeded,
    ...(normalized.source !== undefined ? { source: normalized.source } : {}),
  };
}

function normalizeCapacityEnvelope(mate: MateRecord): NormalizedCapacityEnvelope {
  const envelope = mate.capacity?.envelope;
  if (envelope !== undefined) {
    return {
      maxResultantForceN: envelope.maxResultantForceN,
      maxResultantMomentNmm: envelope.maxResultantMomentNmm,
      source: 'capacity',
    };
  }

  if (mate.maxLoad === undefined) return {};
  const legacyForceN = mate.maxLoad.force;
  const legacyMomentNmm = typeof mate.maxLoad.torque === 'number'
    ? mate.maxLoad.torque * NMM_PER_NM
    : undefined;
  return {
    ...(typeof legacyForceN === 'number' && Number.isFinite(legacyForceN) && legacyForceN > 0
      ? { maxResultantForceN: legacyForceN }
      : {}),
    ...(legacyMomentNmm !== undefined && Number.isFinite(legacyMomentNmm) && legacyMomentNmm > 0
      ? { maxResultantMomentNmm: legacyMomentNmm }
      : {}),
    source: 'legacy-max-load',
  };
}
