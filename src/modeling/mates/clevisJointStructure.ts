// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type {
  ClevisStructuralModel,
  StructuralMaterial,
} from '../joints/types';
import type { Vec3 } from '../../shared/intent/types';
import type { PhysicalUseCaseJointReactionEvidence } from './physicalUseCaseJointReactions';

export const DEFAULT_MIN_JOINT_SAFETY_FACTOR = 2;
export const MAX_CLEVIS_AXIAL_FORCE_N = 0.01;
export const MAX_CLEVIS_BENDING_MOMENT_NMM = 0.1;
const EVIDENCE_TOLERANCE = 1e-6;

export type ClevisJointStructureStatus =
  | 'pass'
  | 'failed'
  | 'input-incomplete'
  | 'unsupported-load-case';

export interface StructuralCheckEvidence {
  readonly stressMPa: number;
  readonly allowableMPa: number;
  /** Null means the stress is zero and the factor of safety is unbounded. */
  readonly safetyFactor: number | null;
  readonly passed: boolean;
  readonly materialName: string;
}

export interface ClevisJointStructureReview {
  readonly mateName: string;
  readonly status: ClevisJointStructureStatus;
  readonly minSafetyFactor: number;
  readonly checks: Readonly<Record<string, StructuralCheckEvidence>>;
  readonly assumptions: readonly string[];
  readonly message?: string;
}

export interface ReviewClevisJointStructureInput {
  readonly reaction: PhysicalUseCaseJointReactionEvidence;
  readonly model: ClevisStructuralModel;
  readonly minSafetyFactor?: number;
}

export function reviewClevisJointStructure(
  input: ReviewClevisJointStructureInput,
): ClevisJointStructureReview {
  const { reaction, model } = input;
  const minSafetyFactor = input.minSafetyFactor ?? DEFAULT_MIN_JOINT_SAFETY_FACTOR;
  const base = { mateName: reaction.mateName, minSafetyFactor };
  if (!Number.isFinite(minSafetyFactor) || minSafetyFactor < DEFAULT_MIN_JOINT_SAFETY_FACTOR) {
    return incomplete(base, `Minimum joint safety factor must be at least ${DEFAULT_MIN_JOINT_SAFETY_FACTOR}.`);
  }

  const reactionIssue = validateReactionEvidence(reaction);
  if (reactionIssue !== undefined) return incomplete(base, reactionIssue);
  const geometryIssue = validateModelGeometry(model);
  if (geometryIssue !== undefined) return incomplete(base, geometryIssue);
  if (model.materials === undefined) {
    return incomplete(base, 'Clevis structural review requires explicit pin, fork, and tongue engineering materials.');
  }
  const materialIssue = validateMaterials(model.materials);
  if (materialIssue !== undefined) return incomplete(base, materialIssue);

  if (reaction.axialForceN > MAX_CLEVIS_AXIAL_FORCE_N + EVIDENCE_TOLERANCE) {
    return unsupported(
      base,
      `Clevis v1 does not model ${reaction.axialForceN.toFixed(6)} N axial pin load; maximum supported numerical residue is ${MAX_CLEVIS_AXIAL_FORCE_N} N.`,
    );
  }
  if (reaction.bendingMomentNmm > MAX_CLEVIS_BENDING_MOMENT_NMM + EVIDENCE_TOLERANCE) {
    return unsupported(
      base,
      `Clevis v1 does not model ${reaction.bendingMomentNmm.toFixed(6)} Nmm perpendicular reaction moment; maximum supported numerical residue is ${MAX_CLEVIS_BENDING_MOMENT_NMM} Nmm.`,
    );
  }

  const assumptions: string[] = [];
  const pinShear = shearAllowable(model.materials.pin, 'pin', assumptions);
  const forkShear = shearAllowable(model.materials.fork, 'fork', assumptions);
  const tongueShear = shearAllowable(model.materials.tongue, 'tongue', assumptions);
  if (reaction.axisMomentNmm > MAX_CLEVIS_BENDING_MOMENT_NMM) {
    assumptions.push('Revolute-axis moment is delegated to the separately checked actuator/transmission path.');
  }

  const forceN = reaction.radialForceN;
  const pinAreaMm2 = Math.PI * model.pinDiameterMm ** 2 / 4;
  const pinShearMPa = forceN / (2 * pinAreaMm2);
  const pinMomentNmm = forceN * model.supportSpanMm / 4;
  const pinBendingMPa = 32 * pinMomentNmm / (Math.PI * model.pinDiameterMm ** 3);
  const pinVonMisesMPa = Math.sqrt(pinBendingMPa ** 2 + 3 * pinShearMPa ** 2);
  const ligamentMm = model.edgeDistanceMm - model.boreDiameterMm / 2;
  const netWidthMm = 2 * model.edgeDistanceMm - model.boreDiameterMm;

  const checks: Record<string, StructuralCheckEvidence> = {
    pinDoubleShear: makeCheck(pinShearMPa, pinShear, model.materials.pin, minSafetyFactor),
    pinBending: makeCheck(pinBendingMPa, model.materials.pin.yieldStrengthMPa, model.materials.pin, minSafetyFactor),
    pinVonMises: makeCheck(pinVonMisesMPa, model.materials.pin.yieldStrengthMPa, model.materials.pin, minSafetyFactor),
    tongueBearing: makeCheck(
      forceN / (model.pinDiameterMm * model.tongueThicknessMm),
      model.materials.tongue.bearingStrengthMPa,
      model.materials.tongue,
      minSafetyFactor,
    ),
    forkBearing: makeCheck(
      forceN / (model.forkPlateCount * model.pinDiameterMm * model.forkPlateThicknessMm),
      model.materials.fork.bearingStrengthMPa,
      model.materials.fork,
      minSafetyFactor,
    ),
    tongueTearOut: makeCheck(
      forceN / (2 * ligamentMm * model.tongueThicknessMm),
      tongueShear,
      model.materials.tongue,
      minSafetyFactor,
    ),
    forkTearOut: makeCheck(
      forceN / (2 * model.forkPlateCount * ligamentMm * model.forkPlateThicknessMm),
      forkShear,
      model.materials.fork,
      minSafetyFactor,
    ),
    tongueNetSection: makeCheck(
      forceN / (netWidthMm * model.tongueThicknessMm),
      model.materials.tongue.yieldStrengthMPa,
      model.materials.tongue,
      minSafetyFactor,
    ),
    forkNetSection: makeCheck(
      forceN / (model.forkPlateCount * netWidthMm * model.forkPlateThicknessMm),
      model.materials.fork.yieldStrengthMPa,
      model.materials.fork,
      minSafetyFactor,
    ),
  };
  const passed = Object.values(checks).every((check) => check.passed);
  return {
    ...base,
    status: passed ? 'pass' : 'failed',
    checks,
    assumptions,
    ...(passed ? {} : { message: `Clevis '${reaction.mateName}' does not meet minimum factor of safety ${minSafetyFactor}.` }),
  };
}

function validateReactionEvidence(reaction: PhysicalUseCaseJointReactionEvidence): string | undefined {
  const vectors = [
    reaction.pointWorldMm,
    reaction.axisWorld,
    reaction.forceWorldN,
    reaction.momentWorldNmm,
  ];
  if (!vectors.every(isFiniteVec3)) return 'Joint reaction contains a non-finite vector.';
  const scalars = [
    reaction.resultantForceN,
    reaction.resultantMomentNmm,
    reaction.axialForceN,
    reaction.radialForceN,
    reaction.axisMomentNmm,
    reaction.bendingMomentNmm,
  ];
  if (!scalars.every((value) => Number.isFinite(value) && value >= 0)) {
    return 'Joint reaction contains a non-finite or negative magnitude.';
  }
  const axisLength = norm(reaction.axisWorld);
  if (axisLength <= 0) return 'Joint reaction axis must be non-zero.';
  const axis = scale(reaction.axisWorld, 1 / axisLength);
  const axial = Math.abs(dot(reaction.forceWorldN, axis));
  const radial = norm(sub(reaction.forceWorldN, scale(axis, dot(reaction.forceWorldN, axis))));
  const axisMoment = Math.abs(dot(reaction.momentWorldNmm, axis));
  const bendingMoment = norm(sub(
    reaction.momentWorldNmm,
    scale(axis, dot(reaction.momentWorldNmm, axis)),
  ));
  if (
    !close(reaction.resultantForceN, norm(reaction.forceWorldN)) ||
    !close(reaction.resultantMomentNmm, norm(reaction.momentWorldNmm)) ||
    !close(reaction.axialForceN, axial) ||
    !close(reaction.radialForceN, radial) ||
    !close(reaction.axisMomentNmm, axisMoment) ||
    !close(reaction.bendingMomentNmm, bendingMoment)
  ) {
    return 'Joint reaction scalar decomposition does not match its force, moment, and axis vectors.';
  }
  return undefined;
}

function validateModelGeometry(model: ClevisStructuralModel): string | undefined {
  if (model.kind !== 'clevis-double-shear-v1' || model.source !== 'joint.clevis') {
    return 'Structural model must be a joint.clevis clevis-double-shear-v1 descriptor.';
  }
  if (model.forkPlateCount !== 2) return 'Clevis v1 requires exactly two fork plates.';
  for (const [name, value] of Object.entries({
    pinDiameterMm: model.pinDiameterMm,
    boreDiameterMm: model.boreDiameterMm,
    forkPlateThicknessMm: model.forkPlateThicknessMm,
    tongueThicknessMm: model.tongueThicknessMm,
    forkGapMm: model.forkGapMm,
    supportSpanMm: model.supportSpanMm,
    edgeDistanceMm: model.edgeDistanceMm,
  })) {
    if (!Number.isFinite(value) || value <= 0) return `Clevis structural ${name} must be positive and finite.`;
  }
  if (model.boreDiameterMm < model.pinDiameterMm) {
    return 'Clevis bore diameter cannot be smaller than pin diameter.';
  }
  if (model.tongueThicknessMm >= model.forkGapMm) {
    return 'Clevis tongue thickness must be smaller than fork gap.';
  }
  if (!close(model.supportSpanMm, model.forkGapMm + model.forkPlateThicknessMm)) {
    return 'Clevis support span must equal fork gap plus one fork plate thickness.';
  }
  if (model.edgeDistanceMm - model.boreDiameterMm / 2 <= 0) {
    return 'Clevis bore leaves no positive edge ligament.';
  }
  if (2 * model.edgeDistanceMm - model.boreDiameterMm <= 0) {
    return 'Clevis bore leaves no positive net section.';
  }
  return undefined;
}

function validateMaterials(materials: NonNullable<ClevisStructuralModel['materials']>): string | undefined {
  for (const role of ['pin', 'fork', 'tongue'] as const) {
    const material = materials[role];
    if (
      typeof material !== 'object' || material === null ||
      typeof material.name !== 'string' || material.name.trim() === '' ||
      material.model !== 'isotropic-ductile' ||
      !positiveFinite(material.yieldStrengthMPa) ||
      !positiveFinite(material.bearingStrengthMPa) ||
      (material.shearStrengthMPa !== undefined && !positiveFinite(material.shearStrengthMPa))
    ) {
      return `Clevis ${role} structural material declaration is incomplete or invalid.`;
    }
  }
  return undefined;
}

function shearAllowable(
  material: StructuralMaterial,
  role: string,
  assumptions: string[],
): number {
  if (material.shearStrengthMPa !== undefined) return material.shearStrengthMPa;
  assumptions.push(`${role} shear allowable derived as yieldStrengthMPa / sqrt(3) for isotropic ductile material '${material.name}'.`);
  return material.yieldStrengthMPa / Math.sqrt(3);
}

function makeCheck(
  stressMPa: number,
  allowableMPa: number,
  material: StructuralMaterial,
  minSafetyFactor: number,
): StructuralCheckEvidence {
  const safetyFactor = stressMPa === 0 ? null : allowableMPa / stressMPa;
  return {
    stressMPa,
    allowableMPa,
    safetyFactor,
    passed: safetyFactor === null || safetyFactor >= minSafetyFactor,
    materialName: material.name,
  };
}

function incomplete(
  base: { mateName: string; minSafetyFactor: number },
  message: string,
): ClevisJointStructureReview {
  return { ...base, status: 'input-incomplete', checks: {}, assumptions: [], message };
}

function unsupported(
  base: { mateName: string; minSafetyFactor: number },
  message: string,
): ClevisJointStructureReview {
  return { ...base, status: 'unsupported-load-case', checks: {}, assumptions: [], message };
}

function positiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function isFiniteVec3(value: readonly number[]): value is Vec3 {
  return Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);
}

function close(a: number, b: number): boolean {
  return Math.abs(a - b) <= EVIDENCE_TOLERANCE * Math.max(1, Math.abs(a), Math.abs(b));
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function scale(value: Vec3, scalar: number): Vec3 {
  return [value[0] * scalar, value[1] * scalar, value[2] * scalar];
}

function norm(value: Vec3): number {
  return Math.hypot(value[0], value[1], value[2]);
}
