// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { KernelError } from '../../shared/intent/kernelError';
import { makePhysicalUseCaseRecord, type PhysicalUseCaseOptions } from '../mates/physicalUseCase';
import type {
  AssemblyState,
  JointSupportIntentOpts,
  MechanicalJointIntentOpts,
  TransmissionIntentOpts,
  TransmissionKind,
} from './assemblyTypes';

function validateMechanicalIntentName(field: string, value: string): void {
  if (typeof value === 'string' && value.trim().length > 0) return;
  throw new KernelError(
    'feature.invalid-args',
    `assembly.mechanicalJoint.invalid-ref: ${field} must be a non-empty string.`,
    undefined,
    `invalid-args.assembly.mechanical-joint-invalid-ref — pass non-empty part and mate names in mechanicalJoint(...).`,
  );
}

function isTransmissionKind(value: unknown): value is TransmissionKind {
  return (
    value === 'direct-horn' ||
    value === 'link-rod' ||
    value === 'four-bar' ||
    value === 'gear-pair' ||
    value === 'belt' ||
    value === 'tendon'
  );
}

export function recordPhysicalUseCase(state: AssemblyState, name: string, opts: PhysicalUseCaseOptions): void {
  if (state.physicalUseCases.some((useCase) => useCase.name === name)) {
    throw new KernelError(
      'feature.invalid-args',
      `assembly.physicalUseCase.duplicate-name: physical use case '${name}' is already declared.`,
      undefined,
      `invalid-args.assembly.physical-use-case-duplicate-name — use a unique physicalUseCase name.`,
    );
  }
  state.physicalUseCases.push(makePhysicalUseCaseRecord(name, opts));
}

/**
 * Declare an SRDF planning group. Either a chain form (base->tip) or an
 * enumeration of joint / link names. Consumed by `export_model({
 * format: 'srdf' })`.
 */
export function recordPlanningGroup(
  state: AssemblyState,
  name: string,
  opts: { chain?: { baseLink: string; tipLink: string }; joints?: string[]; links?: string[] },
): void {
  if (state.planningGroups.some(g => g.name === name)) {
    throw new KernelError(
      'feature.invalid-args',
      `arm.planningGroup: duplicate group name '${name}'.`,
      undefined,
      'Each planning group must have a unique name. Pick a different name or remove the earlier declaration.',
    );
  }
  if (!opts.chain
    && (!opts.joints || opts.joints.length === 0)
    && (!opts.links || opts.links.length === 0)) {
    throw new KernelError(
      'feature.invalid-args',
      `arm.planningGroup '${name}' must declare chain, joints, or links.`,
      undefined,
      'Pass { chain: { baseLink, tipLink } } for a serial chain, or { joints: [...] } / { links: [...] } for an enumeration.',
    );
  }
  state.planningGroups.push({
    name,
    ...(opts.chain !== undefined
      ? { chain: { baseLink: opts.chain.baseLink, tipLink: opts.chain.tipLink } }
      : {}),
    ...(opts.joints !== undefined ? { joints: [...opts.joints] } : {}),
    ...(opts.links !== undefined ? { links: [...opts.links] } : {}),
  });
}

/** Declare an SRDF end-effector. */
export function recordEndEffector(
  state: AssemblyState,
  name: string,
  opts: { parentLink: string; group: string; parentGroup: string },
): void {
  if (!state.parts.some(p => p.name === opts.parentLink)) {
    throw new KernelError(
      'feature.invalid-args',
      `arm.endEffector '${name}': parentLink '${opts.parentLink}' is not a known part.`,
      undefined,
      `Declare the parent link via arm.part('${opts.parentLink}', ...) before calling arm.endEffector(...).`,
    );
  }
  state.endEffectors.push({
    name,
    parentLink: opts.parentLink,
    group: opts.group,
    parentGroup: opts.parentGroup,
  });
}

/** Declare an SRDF virtual joint (world -> base linkage). */
export function recordVirtualJoint(
  state: AssemblyState,
  name: string,
  opts: { type: 'fixed' | 'floating' | 'planar'; parentFrame: string; childLink: string },
): void {
  state.virtualJoints.push({
    name,
    type: opts.type,
    parentFrame: opts.parentFrame,
    childLink: opts.childLink,
  });
}

/** Declare an SRDF named group state (a pose snapshot keyed by joint name). */
export function recordGroupState(state: AssemblyState, name: string, group: string, values: Record<string, number>): void {
  if (!state.planningGroups.some(g => g.name === group)) {
    throw new KernelError(
      'feature.invalid-args',
      `arm.groupState '${name}' references unknown group '${group}'.`,
      undefined,
      `Declare arm.planningGroup('${group}', ...) before referencing it in arm.groupState(...).`,
    );
  }
  state.groupStates.push({ name, group, values: { ...values } });
}

/** Declare an SRDF allowed-collision override. */
export function recordDisabledCollision(
  state: AssemblyState,
  link1: string,
  link2: string,
  opts: { reason: 'Adjacent' | 'Never' | 'Default' | 'User' },
): void {
  state.disabledCollisions.push({ link1, link2, reason: opts.reason });
}

/** Validate the `requiredSupport` sub-object shared by `mechanicalJoint` and
 *  `jointSupport`. Split out to keep each caller's branching complexity
 *  under the quality-ratchet budget; no behavior change. */
function validateRequiredSupport(
  diagnosticPrefix: string,
  requiredSupport: {
    kind: string;
    around: string;
    supports?: readonly string[];
    minBearingLengthMm?: number;
    clearanceMm?: number;
  } | undefined,
): void {
  if (requiredSupport === undefined) return;
  validateMechanicalIntentName('requiredSupport.kind', requiredSupport.kind);
  validateMechanicalIntentName('requiredSupport.around', requiredSupport.around);
  for (const support of requiredSupport.supports ?? []) {
    validateMechanicalIntentName('requiredSupport.supports[]', support);
  }
  if (
    requiredSupport.minBearingLengthMm !== undefined &&
    (!Number.isFinite(requiredSupport.minBearingLengthMm) || requiredSupport.minBearingLengthMm <= 0)
  ) {
    throw new KernelError(
      'feature.invalid-args',
      `${diagnosticPrefix}.invalid-required-support: minBearingLengthMm must be a positive finite number.`,
      undefined,
      `invalid-args.${diagnosticPrefix.replace(/\./g, '-')}-invalid-required-support — pass minBearingLengthMm > 0, or omit it.`,
    );
  }
  if (
    requiredSupport.clearanceMm !== undefined &&
    (!Number.isFinite(requiredSupport.clearanceMm) || requiredSupport.clearanceMm < 0)
  ) {
    throw new KernelError(
      'feature.invalid-args',
      `${diagnosticPrefix}.invalid-required-support: clearanceMm must be a non-negative finite number.`,
      undefined,
      `invalid-args.${diagnosticPrefix.replace(/\./g, '-')}-invalid-required-support — pass clearanceMm >= 0, or omit it.`,
    );
  }
}

export function recordMechanicalJoint(state: AssemblyState, name: string, opts: MechanicalJointIntentOpts): void {
  validateMechanicalIntentName('name', name);
  if (state.mechanicalJointIntents.some((intent) => intent.name === name)) {
    throw new KernelError(
      'feature.invalid-args',
      `assembly.mechanicalJoint.duplicate-name: mechanical joint intent '${name}' is already declared.`,
      undefined,
      `invalid-args.assembly.mechanical-joint-duplicate-name — use a unique mechanicalJoint name.`,
    );
  }
  validateMechanicalIntentName('mate', opts.mate);
  validateMechanicalIntentName('actuator', opts.actuator);
  validateMechanicalIntentName('shaft', opts.shaft);
  validateMechanicalIntentName('output', opts.output);
  if (!Array.isArray(opts.supports) || opts.supports.length === 0) {
    throw new KernelError(
      'feature.invalid-args',
      `assembly.mechanicalJoint.invalid-ref: mechanical joint intent '${name}' requires at least one support part.`,
      undefined,
      `invalid-args.assembly.mechanical-joint-invalid-ref — pass supports: ['support-part-name', ...].`,
    );
  }
  for (const support of opts.supports) {
    validateMechanicalIntentName('supports[]', support);
  }
  validateRequiredSupport('assembly.mechanicalJoint', opts.requiredSupport);

  state.mechanicalJointIntents.push({
    name,
    mate: opts.mate,
    actuator: opts.actuator,
    shaft: opts.shaft,
    supports: [...opts.supports],
    output: opts.output,
    ...(opts.requiredSupport !== undefined ? {
      requiredSupport: {
        ...opts.requiredSupport,
        ...(opts.requiredSupport.supports !== undefined ? { supports: [...opts.requiredSupport.supports] } : {}),
      },
    } : {}),
  });
}

export function recordJointSupport(state: AssemblyState, name: string, opts: JointSupportIntentOpts): void {
  validateMechanicalIntentName('name', name);
  if (state.jointSupportIntents.some((intent) => intent.name === name)) {
    throw new KernelError(
      'feature.invalid-args',
      `assembly.jointSupport.duplicate-name: joint support intent '${name}' is already declared.`,
      undefined,
      `invalid-args.assembly.joint-support-duplicate-name — use a unique jointSupport name.`,
    );
  }
  validateMechanicalIntentName('mate', opts.mate);
  validateMechanicalIntentName('shaft', opts.shaft);
  validateMechanicalIntentName('output', opts.output);
  if (!Array.isArray(opts.supports) || opts.supports.length === 0) {
    throw new KernelError(
      'feature.invalid-args',
      `assembly.jointSupport.invalid-ref: joint support intent '${name}' requires at least one support part.`,
      undefined,
      `invalid-args.assembly.joint-support-invalid-ref — pass supports: ['support-part-name', ...].`,
    );
  }
  for (const support of opts.supports) {
    validateMechanicalIntentName('supports[]', support);
  }
  validateRequiredSupport('assembly.jointSupport', opts.requiredSupport);

  state.jointSupportIntents.push({
    name,
    mate: opts.mate,
    shaft: opts.shaft,
    supports: [...opts.supports],
    output: opts.output,
    ...(opts.requiredSupport !== undefined ? {
      requiredSupport: {
        ...opts.requiredSupport,
        ...(opts.requiredSupport.supports !== undefined ? { supports: [...opts.requiredSupport.supports] } : {}),
      },
    } : {}),
  });
}

/** Validate the fields of `transmission(...)` other than `name`/`kind`/duplicate
 *  checking. Split out to keep `recordTransmission`'s branching complexity
 *  under the quality-ratchet budget; no behavior change. */
function validateTransmissionFields(name: string, opts: TransmissionIntentOpts): void {
  validateMechanicalIntentName('sourceMate', opts.sourceMate);
  if (!Array.isArray(opts.drivenMates) || opts.drivenMates.length === 0) {
    throw new KernelError(
      'feature.invalid-args',
      `assembly.transmission.invalid-driven-mates: transmission '${name}' requires at least one driven mate.`,
      undefined,
      `invalid-args.assembly.transmission-invalid-driven-mates — pass drivenMates: ['mate-name', ...].`,
    );
  }
  for (const driven of opts.drivenMates) {
    validateMechanicalIntentName('drivenMates[]', driven);
  }
  if (!Array.isArray(opts.path) || opts.path.length === 0) {
    throw new KernelError(
      'feature.invalid-args',
      `assembly.transmission.invalid-path: transmission '${name}' requires at least one physical path part.`,
      undefined,
      `invalid-args.assembly.transmission-invalid-path — pass path: ['input-part', 'linkage-part', 'output-part'].`,
    );
  }
  for (const partName of opts.path) {
    validateMechanicalIntentName('path[]', partName);
  }
  for (const optional of [opts.actuator, opts.input, opts.output]) {
    if (optional !== undefined) validateMechanicalIntentName('part ref', optional);
  }
  if (opts.ratio !== undefined && !Number.isFinite(opts.ratio)) {
    throw new KernelError(
      'feature.invalid-args',
      `assembly.transmission.invalid-ratio: transmission '${name}' ratio must be finite.`,
      undefined,
      `invalid-args.assembly.transmission-invalid-ratio — pass a finite ratio or omit it.`,
    );
  }
}

export function recordTransmission(state: AssemblyState, name: string, opts: TransmissionIntentOpts): void {
  validateMechanicalIntentName('name', name);
  if (state.transmissionIntents.some((intent) => intent.name === name)) {
    throw new KernelError(
      'feature.invalid-args',
      `assembly.transmission.duplicate-name: transmission intent '${name}' is already declared.`,
      undefined,
      `invalid-args.assembly.transmission-duplicate-name — use a unique arm.transmission(...) name.`,
    );
  }
  if (!isTransmissionKind(opts.kind)) {
    throw new KernelError(
      'feature.invalid-args',
      `assembly.transmission.invalid-kind: '${String(opts.kind)}' is not a supported transmission kind.`,
      undefined,
      `invalid-args.assembly.transmission-invalid-kind — use direct-horn, link-rod, four-bar, gear-pair, belt, or tendon.`,
    );
  }
  validateTransmissionFields(name, opts);

  state.transmissionIntents.push({
    name,
    kind: opts.kind,
    sourceMate: opts.sourceMate,
    drivenMates: [...opts.drivenMates],
    ...(opts.actuator !== undefined ? { actuator: opts.actuator } : {}),
    ...(opts.input !== undefined ? { input: opts.input } : {}),
    ...(opts.output !== undefined ? { output: opts.output } : {}),
    path: [...opts.path],
    ...(opts.ratio !== undefined ? { ratio: opts.ratio } : {}),
    ...(opts.notes !== undefined ? { notes: opts.notes } : {}),
  });
}
