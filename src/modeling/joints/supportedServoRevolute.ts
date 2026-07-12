// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { KernelCadApi } from '../api';
import type { Assembly } from '../capture/assembly';
import type { Shape } from '../capture/proxy';
import { parseConnectorRef } from '../mates/mate';
import { KernelError } from '../../shared/intent/kernelError';

export interface SupportedServoRevoluteOptions {
  /** Intent name. Also prefixes the generated actuator part and mate names. */
  name: string;
  /** Existing driven revolute mate name. */
  mate: string;
  /** Part that carries the shaft / support structure for the driven mate. */
  support: string;
  /** Frame connector ref on `support` where the servo actuator is seated, e.g. "base.servo-mount". */
  supportMount: string;
  /** Moving output part driven by the actuator. */
  output: string;
  /** Connector ref for the supported revolute axis, e.g. "base.axis". */
  axis: string;
  /** Minimum bearing/bracket support length required around the revolute axis. */
  minBearingLengthMm?: number;
  /** Optional nominal servo body dimensions in millimetres. */
  bodySizeMm?: readonly [number, number, number];
}

export interface SupportedServoRevoluteResult {
  actuatorPartName: string;
  actuatorMountRef: string;
  fastenedMateName: string;
}

export function supportedServoRevolute(
  kc: KernelCadApi,
  arm: Assembly,
  opts: SupportedServoRevoluteOptions,
): SupportedServoRevoluteResult {
  preflightSupportedServoRevolute(arm, opts);

  const actuatorPartName = `${opts.name}-servo`;
  const fastenedMateName = `${opts.name}-servo-fix`;
  const actuatorMountRef = `${actuatorPartName}.mount`;

  arm
    .part(actuatorPartName, buildDefaultServo(kc, opts))
    .connector('mount', {
      type: 'frame',
      origin: { kind: 'vec3', value: [0, 0, 0] },
    });

  arm.mate(fastenedMateName, opts.supportMount, actuatorMountRef, 'fastened');
  arm.mechanicalJoint(opts.name, {
    mate: opts.mate,
    actuator: actuatorPartName,
    shaft: opts.support,
    supports: [opts.support],
    output: opts.output,
    requiredSupport: {
      kind: 'hinge-bracket',
      around: opts.axis,
      supports: [opts.support],
      minBearingLengthMm: opts.minBearingLengthMm ?? 8,
    },
  });

  return {
    actuatorPartName,
    actuatorMountRef,
    fastenedMateName,
  };
}

function preflightSupportedServoRevolute(arm: Assembly, opts: SupportedServoRevoluteOptions): void {
  for (const field of ['name', 'mate', 'support', 'supportMount', 'output', 'axis'] as const) {
    assertNonEmptyString(field, opts[field]);
  }
  validateBodySizeMm(opts.bodySizeMm);
  if (
    opts.minBearingLengthMm !== undefined &&
    (!Number.isFinite(opts.minBearingLengthMm) || opts.minBearingLengthMm <= 0)
  ) {
    throw invalidArgs(
      `joint.supportedServoRevolute: minBearingLengthMm must be a positive finite number; got ${opts.minBearingLengthMm}.`,
      'Pass minBearingLengthMm > 0, or omit it to use the 8 mm default.',
    );
  }

  const supportMount = parseConnectorRefForHelper('supportMount', opts.supportMount);
  const axisRef = parseConnectorRefForHelper('axis', opts.axis);
  if (supportMount.partName !== opts.support) {
    throw invalidArgs(
      `joint.supportedServoRevolute: supportMount '${opts.supportMount}' must be on support part '${opts.support}' for this helper.`,
      `Move the mount connector to '${opts.support}', or add a future helper variant with explicit remote support parts.`,
    );
  }

  const parts = arm.__parts();
  const mates = arm.__mates();
  const intents = arm.__mechanicalJointIntents();
  const actuatorPartName = `${opts.name}-servo`;
  const fastenedMateName = `${opts.name}-servo-fix`;

  if (parts.some((part) => part.name === actuatorPartName)) {
    throw invalidArgs(
      `joint.supportedServoRevolute: actuator part '${actuatorPartName}' already exists.`,
      `Choose a different supportedServoRevolute name, or remove the existing '${actuatorPartName}' part before adding the helper.`,
    );
  }
  if (mates.some((mate) => mate.name === fastenedMateName)) {
    throw invalidArgs(
      `joint.supportedServoRevolute: fastened mate '${fastenedMateName}' already exists.`,
      `Choose a different supportedServoRevolute name, or remove the existing '${fastenedMateName}' mate before adding the helper.`,
    );
  }
  if (intents.some((intent) => intent.name === opts.name)) {
    throw invalidArgs(
      `joint.supportedServoRevolute: mechanical joint intent '${opts.name}' already exists.`,
      `Choose a unique supportedServoRevolute name before adding another helper.`,
    );
  }

  const drivenMate = mates.find((mate) => mate.name === opts.mate);
  if (drivenMate === undefined) {
    throw invalidArgs(
      `joint.supportedServoRevolute: required mate '${opts.mate}' does not exist.`,
      `Declare arm.mate('${opts.mate}', ..., 'revolute') before adding the supported servo helper.`,
    );
  }
  if (drivenMate.type !== 'revolute') {
    throw invalidArgs(
      `joint.supportedServoRevolute: mate '${opts.mate}' must be revolute; got '${drivenMate.type}'.`,
      `Use this helper only for driven revolute mates, or choose a helper for '${drivenMate.type}' mates.`,
    );
  }

  const supportPart = parts.find((part) => part.name === opts.support);
  if (supportPart === undefined) {
    throw invalidArgs(
      `joint.supportedServoRevolute: support part '${opts.support}' does not exist.`,
      `Declare arm.part('${opts.support}', ...) before adding the supported servo helper.`,
    );
  }
  if (parts.every((part) => part.name !== opts.output)) {
    throw invalidArgs(
      `joint.supportedServoRevolute: output part '${opts.output}' does not exist.`,
      `Declare arm.part('${opts.output}', ...) before adding the supported servo helper.`,
    );
  }
  const axisPart = parts.find((part) => part.name === axisRef.partName);
  if (axisPart === undefined) {
    throw invalidArgs(
      `joint.supportedServoRevolute: axis part '${axisRef.partName}' does not exist.`,
      `Declare arm.part('${axisRef.partName}', ...) before referencing '${opts.axis}'.`,
    );
  }
  const axisConnector = axisPart.mateConnectors.find((connector) => connector.name === axisRef.connectorName);
  if (axisConnector === undefined) {
    throw invalidArgs(
      `joint.supportedServoRevolute: axis connector '${axisRef.connectorName}' does not exist on part '${axisRef.partName}'.`,
      `Register '${opts.axis}' with partRef.connector('${axisRef.connectorName}', { type: 'axis', ... }) before adding the helper.`,
    );
  }
  if (axisConnector.type !== 'axis') {
    throw invalidArgs(
      `joint.supportedServoRevolute: axis '${opts.axis}' must be an axis connector; got '${axisConnector.type}'.`,
      `Use the support-side axis connector from the driven revolute mate '${opts.mate}'.`,
    );
  }
  const supportSideAxisRef = supportSideConnectorRef(drivenMate.a, drivenMate.b, opts.support, opts.mate);
  if (opts.axis !== supportSideAxisRef) {
    throw invalidArgs(
      `joint.supportedServoRevolute: axis '${opts.axis}' must match support-side connector '${supportSideAxisRef}' from mate '${opts.mate}'.`,
      `Pass axis: '${supportSideAxisRef}' so the requiredSupport contract names the driven revolute shaft axis.`,
    );
  }

  const mountPart = parts.find((part) => part.name === supportMount.partName);
  if (mountPart === undefined) {
    throw invalidArgs(
      `joint.supportedServoRevolute: supportMount part '${supportMount.partName}' does not exist.`,
      `Declare arm.part('${supportMount.partName}', ...) before referencing '${opts.supportMount}'.`,
    );
  }
  const mountConnector = mountPart.mateConnectors.find((connector) => connector.name === supportMount.connectorName);
  if (mountConnector === undefined) {
    throw invalidArgs(
      `joint.supportedServoRevolute: supportMount connector '${supportMount.connectorName}' does not exist on part '${supportMount.partName}'.`,
      `Register '${opts.supportMount}' with partRef.connector('${supportMount.connectorName}', { type: 'frame', ... }) before adding the helper.`,
    );
  }
  if (mountConnector.type !== 'frame') {
    throw invalidArgs(
      `joint.supportedServoRevolute: supportMount '${opts.supportMount}' must be a frame connector; got '${mountConnector.type}'.`,
      `Register '${opts.supportMount}' with partRef.connector('${supportMount.connectorName}', { type: 'frame', ... }) before adding the helper.`,
    );
  }
}

function assertNonEmptyString(field: string, value: string): void {
  if (typeof value === 'string' && value.trim().length > 0) return;
  throw invalidArgs(
    `joint.supportedServoRevolute: ${field} must be a non-empty string.`,
    `Pass a non-empty string for ${field}.`,
  );
}

function validateBodySizeMm(bodySizeMm: SupportedServoRevoluteOptions['bodySizeMm']): void {
  if (bodySizeMm === undefined) return;
  if (
    !Array.isArray(bodySizeMm) ||
    bodySizeMm.length !== 3 ||
    !bodySizeMm.every((value) => typeof value === 'number' && Number.isFinite(value) && value > 0)
  ) {
    throw invalidArgs(
      `joint.supportedServoRevolute: bodySizeMm must be a positive finite 3-tuple; got ${JSON.stringify(bodySizeMm)}.`,
      'Pass bodySizeMm as [x, y, z] with positive finite millimetre dimensions, or omit it.',
    );
  }
}

function parseConnectorRefForHelper(
  field: string,
  ref: string,
): { partName: string; connectorName: string } {
  try {
    return parseConnectorRef(ref);
  } catch {
    throw invalidArgs(
      `joint.supportedServoRevolute: ${field} '${ref}' must be a 'part.connector' reference.`,
      `Pass ${field} in the form '<partName>.<connectorName>'.`,
    );
  }
}

function supportSideConnectorRef(aRef: string, bRef: string, support: string, mate: string): string {
  const a = parseConnectorRefForHelper(`mate '${mate}' side a`, aRef);
  const b = parseConnectorRefForHelper(`mate '${mate}' side b`, bRef);
  if (a.partName === support) return aRef;
  if (b.partName === support) return bRef;
  throw invalidArgs(
    `joint.supportedServoRevolute: mate '${mate}' must have one connector on support part '${support}'.`,
    `Use support: '<part>' matching the shaft/support side of the driven revolute mate.`,
  );
}

function invalidArgs(message: string, hint: string): KernelError {
  return new KernelError(
    'feature.invalid-args',
    message,
    'joint.supportedServoRevolute',
    `invalid-args.joint.supported-servo-revolute — ${hint}`,
  );
}

function buildDefaultServo(kc: KernelCadApi, opts: SupportedServoRevoluteOptions): Shape {
  const [x, y, z] = opts.bodySizeMm ?? [24, 12, 24];
  const body = kc.box(x, y, z, true).material({
    baseColor: '#2f3437',
    metalness: 0.1,
    roughness: 0.45,
  });
  const shaft = kc.cylinder(6, 2.5, 24)
    .rotate([1, 0, 0], 90)
    .translate(0, y / 2 + 3, z * 0.25)
    .material({
      baseColor: '#b7bcc2',
      metalness: 0.7,
      roughness: 0.25,
    });
  const horn = kc.box(18, 2, 4, true)
    .translate(0, y / 2 + 6.5, z * 0.25)
    .material({
      baseColor: '#d9dde2',
      metalness: 0.35,
      roughness: 0.3,
    });

  return body.union(shaft).union(horn);
}
