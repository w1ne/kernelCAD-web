// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { KernelError } from '../../shared/intent/kernelError';
import type { MateCapacity, MateLimitRange, MateLoadLimit } from '../mates/mate';
import type { MateType } from '../mates/mateTypes';
import type { ClevisStructuralModel, StructuralMaterial } from '../joints/types';

export function validateLimitRange(
  mateName: string,
  field: 'limitsDeg' | 'limitsMm',
  range: MateLimitRange,
): void {
  const [min, max] = range;
  if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
    throw new KernelError(
      'feature.invalid-args',
      `assembly.mate.invalid-limits: mate '${mateName}' ${field} must be a finite [min, max] range with min <= max.`,
      undefined,
      `invalid-args.assembly.mate-invalid-limits — pass ${field}: [min, max] with finite numbers and min <= max.`,
    );
  }
}

const NMM_PER_NM = 1000;

export function validateMateCapacityOptions(
  mateName: string,
  mateType: MateType,
  opts: { capacity?: MateCapacity; maxLoad?: MateLoadLimit } | undefined,
): void {
  const capacity: unknown = opts?.capacity;
  const maxLoad: unknown = opts?.maxLoad;
  if (capacity !== undefined && maxLoad !== undefined) {
    throw new KernelError(
      'feature.invalid-args',
      `assembly.mate.capacity-conflict: mate '${mateName}' cannot declare both capacity.envelope (N and Nmm) and deprecated maxLoad (N and Nm); use capacity.envelope only.`,
      undefined,
      `invalid-args.assembly.mate-capacity-conflict — replace maxLoad with capacity: { envelope: { maxResultantForceN, maxResultantMomentNmm } } using N and Nmm.`,
    );
  }

  if (capacity !== undefined) {
    if (!isMateOptionObject(capacity)) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.mate.invalid-capacity: mate '${mateName}' capacity must be an object with an optional envelope.`,
        undefined,
        `invalid-args.assembly.mate-invalid-capacity — pass capacity: {} or capacity: { envelope: { maxResultantForceN, maxResultantMomentNmm } } using N and Nmm.`,
      );
    }
    const envelope = capacity.envelope;
    if (envelope !== undefined) {
      if (!isMateOptionObject(envelope)) {
        throw new KernelError(
          'feature.invalid-args',
          `assembly.mate.invalid-capacity: mate '${mateName}' capacity.envelope must be an object containing force and moment ratings.`,
          undefined,
          `invalid-args.assembly.mate-invalid-capacity — pass capacity.envelope: { maxResultantForceN, maxResultantMomentNmm } using positive finite N and Nmm values.`,
        );
      }
      validatePositiveFiniteMateValue(
        mateName,
        'capacity.envelope.maxResultantForceN',
        envelope.maxResultantForceN,
        'N',
      );
      validatePositiveFiniteMateValue(
        mateName,
        'capacity.envelope.maxResultantMomentNmm',
        envelope.maxResultantMomentNmm,
        'Nmm',
      );
    }
    const structure = capacity.structure;
    if (structure !== undefined) {
      if (mateType !== 'revolute') {
        throw new KernelError(
          'feature.invalid-args',
          `assembly.mate.invalid-capacity: mate '${mateName}' capacity.structure is a clevis revolute model but mate type is '${mateType}'.`,
          undefined,
          `invalid-args.assembly.mate-invalid-capacity — attach joint.clevis(...).structural only to its revolute mate.`,
        );
      }
      validateClevisStructuralModel(mateName, structure);
    }
  }

  if (maxLoad !== undefined) {
    if (!isMateOptionObject(maxLoad)) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.mate.invalid-capacity: mate '${mateName}' maxLoad must be an object with optional force and torque ratings.`,
        undefined,
        `invalid-args.assembly.mate-invalid-capacity — pass maxLoad: {} or maxLoad: { force, torque } using positive finite N and Nm values.`,
      );
    }
    if (maxLoad.force !== undefined) {
      validatePositiveFiniteMateValue(mateName, 'maxLoad.force', maxLoad.force, 'N');
    }
    if (maxLoad.torque !== undefined) {
      const torqueNm = maxLoad.torque;
      validatePositiveFiniteMateValue(mateName, 'maxLoad.torque', torqueNm, 'Nm');
      if (typeof torqueNm === 'number' && !Number.isFinite(torqueNm * NMM_PER_NM)) {
        throw new KernelError(
          'feature.invalid-args',
          `assembly.mate.invalid-capacity: mate '${mateName}' maxLoad.torque=${torqueNm} Nm converts to Nmm as a non-finite value.`,
          undefined,
          `invalid-args.assembly.mate-invalid-capacity — reduce maxLoad.torque so its Nm-to-Nmm conversion remains finite, or use capacity.envelope.maxResultantMomentNmm directly.`,
        );
      }
    }
  }
}

function validateClevisStructuralModel(mateName: string, value: unknown): asserts value is ClevisStructuralModel {
  if (!isMateOptionObject(value)) {
    throwInvalidStructuralModel(mateName, 'capacity.structure must be an object emitted by joint.clevis().');
  }
  if (value.kind !== 'clevis-double-shear-v1' || value.source !== 'joint.clevis') {
    throwInvalidStructuralModel(mateName, "capacity.structure must have kind 'clevis-double-shear-v1' and source 'joint.clevis'.");
  }
  if (value.forkPlateCount !== 2) {
    throwInvalidStructuralModel(mateName, 'capacity.structure.forkPlateCount must equal 2.');
  }
  for (const field of [
    'pinDiameterMm',
    'boreDiameterMm',
    'forkPlateThicknessMm',
    'tongueThicknessMm',
    'forkGapMm',
    'supportSpanMm',
    'edgeDistanceMm',
  ] as const) {
    if (typeof value[field] !== 'number' || !Number.isFinite(value[field]) || value[field] <= 0) {
      throwInvalidStructuralModel(mateName, `capacity.structure.${field} must be a positive finite mm value.`);
    }
  }
  if (value.materials !== undefined) {
    if (!isMateOptionObject(value.materials)) {
      throwInvalidStructuralModel(mateName, 'capacity.structure.materials must be an object when declared.');
    }
    for (const role of ['pin', 'fork', 'tongue'] as const) {
      validateStructuralMaterialDeclaration(mateName, role, value.materials[role]);
    }
  }
}

function validateStructuralMaterialDeclaration(
  mateName: string,
  role: 'pin' | 'fork' | 'tongue',
  value: unknown,
): asserts value is StructuralMaterial {
  if (!isMateOptionObject(value)) {
    throwInvalidStructuralModel(mateName, `capacity.structure.materials.${role} must be an object.`);
  }
  if (
    typeof value.name !== 'string' || value.name.trim() === '' ||
    value.model !== 'isotropic-ductile' ||
    typeof value.yieldStrengthMPa !== 'number' || !Number.isFinite(value.yieldStrengthMPa) || value.yieldStrengthMPa <= 0 ||
    typeof value.bearingStrengthMPa !== 'number' || !Number.isFinite(value.bearingStrengthMPa) || value.bearingStrengthMPa <= 0 ||
    (value.shearStrengthMPa !== undefined &&
      (typeof value.shearStrengthMPa !== 'number' || !Number.isFinite(value.shearStrengthMPa) || value.shearStrengthMPa <= 0))
  ) {
    throwInvalidStructuralModel(mateName, `capacity.structure.materials.${role} has invalid engineering strength evidence.`);
  }
}

function throwInvalidStructuralModel(mateName: string, detail: string): never {
  throw new KernelError(
    'feature.invalid-args',
    `assembly.mate.invalid-capacity: mate '${mateName}' ${detail}`,
    undefined,
    `invalid-args.assembly.mate-invalid-capacity — pass the structural descriptor returned by joint.clevis() without modifying its geometry or material fields.`,
  );
}

function copyStructuralMaterial(material: StructuralMaterial): StructuralMaterial {
  return {
    name: material.name,
    model: material.model,
    yieldStrengthMPa: material.yieldStrengthMPa,
    bearingStrengthMPa: material.bearingStrengthMPa,
    ...(material.shearStrengthMPa === undefined ? {} : { shearStrengthMPa: material.shearStrengthMPa }),
  };
}

function copyClevisStructuralModel(model: ClevisStructuralModel): ClevisStructuralModel {
  return {
    kind: model.kind,
    source: model.source,
    pinDiameterMm: model.pinDiameterMm,
    boreDiameterMm: model.boreDiameterMm,
    forkPlateThicknessMm: model.forkPlateThicknessMm,
    forkPlateCount: 2,
    tongueThicknessMm: model.tongueThicknessMm,
    forkGapMm: model.forkGapMm,
    supportSpanMm: model.supportSpanMm,
    edgeDistanceMm: model.edgeDistanceMm,
    ...(model.materials === undefined ? {} : {
      materials: {
        pin: copyStructuralMaterial(model.materials.pin),
        fork: copyStructuralMaterial(model.materials.fork),
        tongue: copyStructuralMaterial(model.materials.tongue),
      },
    }),
  };
}

export function copyMateCapacity(capacity: MateCapacity): MateCapacity {
  return {
    ...(capacity.envelope === undefined ? {} : {
      envelope: {
        maxResultantForceN: capacity.envelope.maxResultantForceN,
        maxResultantMomentNmm: capacity.envelope.maxResultantMomentNmm,
      },
    }),
    ...(capacity.structure === undefined ? {} : {
      structure: copyClevisStructuralModel(capacity.structure),
    }),
  };
}

function isMateOptionObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validatePositiveFiniteMateValue(
  mateName: string,
  field: string,
  value: unknown,
  unit: 'N' | 'Nm' | 'Nmm',
): void {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return;
  throw new KernelError(
    'feature.invalid-args',
    `assembly.mate.invalid-capacity: mate '${mateName}' ${field} must be a positive finite ${unit} value.`,
    undefined,
    `invalid-args.assembly.mate-invalid-capacity — pass ${field} as a positive finite value in ${unit}.`,
  );
}

