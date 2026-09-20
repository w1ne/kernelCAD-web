// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Phases extracted from `makePhysicalUseCaseRecord` in physicalUseCase.ts:
// name / contact-frame / criteria validation and the per-entry copies used
// when materializing a physical-use-case record.

import type {
  PhysicalUseCaseActuatorLimit,
  PhysicalUseCaseContact,
  PhysicalUseCaseCriteria,
  PhysicalUseCaseLoad,
  PhysicalUseCaseOptions,
} from './physicalUseCase';
import {
  DEFAULT_FORCE_RESIDUAL_N,
  DEFAULT_TORQUE_RESIDUAL_NMM,
} from './physicalUseCaseStatics';
import { DEFAULT_MIN_JOINT_SAFETY_FACTOR } from './clevisJointStructure';

export function validateUseCaseName(name: string): void {
  if (typeof name !== 'string' || name.trim() === '') {
    throw new Error('assembly.physicalUseCase: name must be a non-empty string.');
  }
}

export function validateUseCaseContactFrames(opts: PhysicalUseCaseOptions): void {
  for (const contact of opts.contacts ?? []) {
    if (
      contact.normalFrame !== undefined &&
      contact.normalFrame !== 'world' &&
      contact.normalFrame !== 'a' &&
      contact.normalFrame !== 'b'
    ) {
      throw new Error("assembly.physicalUseCase: contact.normalFrame must be 'world', 'a', or 'b'.");
    }
  }
}

export function validateUseCaseCriteria(criteria: PhysicalUseCaseCriteria | undefined): void {
  for (const [field, value, maximum] of [
    ['maxForceResidualN', criteria?.maxForceResidualN, DEFAULT_FORCE_RESIDUAL_N],
    ['maxTorqueResidualNmm', criteria?.maxTorqueResidualNmm, DEFAULT_TORQUE_RESIDUAL_NMM],
  ] as const) {
    if (value !== undefined && (!Number.isFinite(value) || value <= 0)) {
      throw new Error(`assembly.physicalUseCase: criteria.${field} must be a positive finite number.`);
    }
    if (value !== undefined && value > maximum) {
      throw new Error(`assembly.physicalUseCase: criteria.${field} cannot exceed ${maximum}.`);
    }
  }
  const minJointSafetyFactor = criteria?.minJointSafetyFactor;
  if (
    minJointSafetyFactor !== undefined &&
    (!Number.isFinite(minJointSafetyFactor) || minJointSafetyFactor < DEFAULT_MIN_JOINT_SAFETY_FACTOR)
  ) {
    throw new Error(
      `assembly.physicalUseCase: criteria.minJointSafetyFactor must be finite and at least ${DEFAULT_MIN_JOINT_SAFETY_FACTOR}.`,
    );
  }
}

export function copyUseCaseLoad(load: PhysicalUseCaseLoad): PhysicalUseCaseLoad {
  return {
    part: load.part,
    ...(load.at === undefined ? {} : { at: load.at }),
    ...(load.force === undefined ? {} : { force: copyVec3(load.force) }),
    ...(load.torque === undefined ? {} : { torque: copyVec3(load.torque) }),
  };
}

export function copyUseCaseContact(contact: PhysicalUseCaseContact): PhysicalUseCaseContact {
  return {
    a: contact.a,
    b: contact.b,
    normal: copyVec3(contact.normal),
    ...(contact.normalFrame === undefined ? {} : { normalFrame: contact.normalFrame }),
    friction: contact.friction,
    ...(contact.normalForceN === undefined ? {} : { normalForceN: contact.normalForceN }),
  };
}

export function copyUseCaseActuatorLimit(limit: PhysicalUseCaseActuatorLimit): PhysicalUseCaseActuatorLimit {
  return {
    mate: limit.mate,
    maxTorqueNmm: limit.maxTorqueNmm,
  };
}

function copyVec3(v: readonly [number, number, number]): [number, number, number] {
  return [v[0], v[1], v[2]];
}
