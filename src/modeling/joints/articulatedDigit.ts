// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { KernelCadApi } from '../api';
import type { Assembly } from '../capture/assembly';
import type { Shape } from '../capture/proxy';
import { KernelError } from '../../shared/intent/kernelError';
import type { PBRMaterial } from '../../shared/intent/material';
import { assertTopoRefSafeName } from '../../shared/naming/topoRefName';
import type { Vec3 } from '../../shared/intent/types';
import { Transform } from '../../shared/runtime/se3';
import { computePivotLift, withDefaults } from './clevis';
import type { AxisHint, ClevisJoint, ClevisStyle, ResolvedClevisStyle } from './types';

/** The minimum fused load path permitted between two adjacent joint packages. */
export const MIN_STRUCTURAL_WEB_MM = 2;

/** Minimum material overlap between a link web and its clevis package. */
const FUSED_PACKAGE_OVERLAP_MM = 1;

export interface ArticulatedDigitFrame {
  readonly origin: Vec3;
  readonly pinAxis: AxisHint;
  readonly forward: Vec3;
  readonly liftDir?: Vec3;
}

export interface ArticulatedDigitSegmentSpec {
  readonly name: string;
  readonly lengthMm: number;
  readonly widthMm: number;
  readonly depthMm: number;
  readonly terminal?: boolean;
}

export interface ArticulatedDigitJointSpec {
  readonly name: string;
  readonly limitsDeg: readonly [number, number];
  readonly style?: ClevisStyle;
}

export interface ArticulatedDigitFitSpec {
  readonly maxWidthMm?: number;
  readonly maxDepthMm?: number;
  readonly terminalPadLengthMm?: number;
}

export interface ArticulatedDigitFitReport {
  readonly status: 'fit' | 'exceeds-envelope';
  readonly reasons: readonly string[];
}

export interface ArticulatedDigitOptions {
  readonly name: string;
  readonly parentMount: string;
  readonly frame: ArticulatedDigitFrame;
  readonly clearanceMm: number;
  readonly segments: readonly ArticulatedDigitSegmentSpec[];
  readonly joints: readonly ArticulatedDigitJointSpec[];
  readonly density?: number;
  readonly material?: PBRMaterial;
  readonly fit?: ArticulatedDigitFitSpec;
}

export interface ArticulatedDigitResult {
  readonly partNames: readonly string[];
  readonly mateNames: readonly string[];
  readonly rootMount: string;
  readonly tipFrame: string;
  readonly fit: ArticulatedDigitFitReport;
}

interface Preflight {
  readonly transform: Transform;
  readonly styles: readonly ResolvedClevisStyle[];
  readonly webLengths: readonly number[];
}

/**
 * Build a planar, clevis-first digit into `arm`. Geometry is authored in the
 * canonical local frame (+X forward, +Y lift, +Z pin), then registered once
 * in the supplied 3D base frame. This is intentionally a physical package
 * generator, not a payload or actuation certification surface.
 */
export function articulatedDigit(
  kc: KernelCadApi,
  arm: Assembly,
  opts: ArticulatedDigitOptions,
): ArticulatedDigitResult {
  const preflight = validatePreflight(arm, opts);
  const localAxis: Vec3 = [0, 0, 1];
  const localLift: Vec3 = [0, 1, 0];
  const links = opts.segments.map((segment, index) => {
    const outgoing = preflight.styles[index + 1];
    const outgoingJoint = opts.joints[index + 1];
    return buildCorridorLink(
      kc,
      segment,
      preflight.styles[index],
      outgoing,
      opts.clearanceMm,
      outgoing === undefined || outgoingJoint === undefined
        ? undefined
        : computePivotLift(outgoing, [outgoingJoint.limitsDeg[0], outgoingJoint.limitsDeg[1]]),
    );
  });

  const packages: ClevisJoint[] = [];
  const completed: Shape[] = [];
  let parent = buildBaseBody(kc, opts.segments[0], preflight.styles[0]);
  const baseRootPivotMm = baseSpanMm(preflight.styles[0]);
  for (let index = 0; index < opts.joints.length; index += 1) {
    const joint = opts.joints[index];
    const packageResult = kc.joint.clevis({
      parentBody: parent,
      childBody: links[index],
      axis: localAxis,
      pivotParent: index === 0 ? [baseRootPivotMm, 0, 0] : [opts.segments[index - 1].lengthMm, 0, 0],
      pivotChild: [0, 0, 0],
      limitsDeg: [joint.limitsDeg[0], joint.limitsDeg[1]],
      style: preflight.styles[index],
      liftDir: localLift,
    });
    completed.push(packageResult.parentGeometry);
    packages.push(packageResult);
    parent = packageResult.childGeometry;
  }
  completed.push(parent);

  const partNames = [
    `${opts.name}-base`,
    ...opts.segments.map((segment) => `${opts.name}-${segment.name}`),
  ];
  const parts = completed.map((shape, index) => {
    let placed = shape.transform(preflight.transform);
    if (opts.material !== undefined) placed = placed.material(opts.material);
    return arm.part(partNames[index], placed, opts.density === undefined ? {} : { density: opts.density });
  });

  const rootMount = `${partNames[0]}.mount`;
  parts[0].connector('mount', frameConnector(preflight.transform.point([0, 0, 0])));
  for (let index = 0; index < packages.length; index += 1) {
    const packageResult = packages[index];
    const jointName = opts.joints[index].name;
    parts[index].connector(jointName, axisConnector(preflight.transform, packageResult.parentConnector));
    parts[index + 1].connector(jointName, axisConnector(preflight.transform, packageResult.childConnector));
  }
  const tipFrame = `${partNames.at(-1)}.tip-frame`;
  parts.at(-1)?.connector('tip-frame', frameConnector(preflight.transform.point([
    opts.segments.at(-1)?.lengthMm ?? 0,
    0,
    0,
  ])));

  const mateNames = [`${opts.name}-base-mount`];
  arm.mate(mateNames[0], opts.parentMount, rootMount, 'fastened');
  for (let index = 0; index < packages.length; index += 1) {
    const mateName = `${opts.name}-${opts.joints[index].name}`;
    mateNames.push(mateName);
    const parentRef = `${partNames[index]}.${opts.joints[index].name}`;
    const childRef = `${partNames[index + 1]}.${opts.joints[index].name}`;
    arm.mate(mateName, parentRef, childRef, 'revolute', {
      limitsDeg: [opts.joints[index].limitsDeg[0], opts.joints[index].limitsDeg[1]],
      capacity: { structure: packages[index].structural },
    });
    arm.jointSupport(`${mateName}-support`, {
      mate: mateName,
      shaft: partNames[index],
      supports: [partNames[index]],
      output: partNames[index + 1],
      requiredSupport: {
        kind: 'hinge-bracket',
        around: parentRef,
        supports: [partNames[index]],
        minBearingLengthMm: packages[index].structural.supportSpanMm,
        clearanceMm: opts.clearanceMm,
      },
    });
  }

  return {
    partNames,
    mateNames,
    rootMount,
    tipFrame,
    fit: evaluateFit(opts, preflight.styles),
  };
}

function validatePreflight(arm: Assembly, opts: ArticulatedDigitOptions): Preflight {
  assertName('name', opts?.name);
  assertTopoRefSafeName(opts.name, 'part-name');
  assertName('parentMount', opts?.parentMount);
  assertPositive('clearanceMm', opts?.clearanceMm);
  if (!Array.isArray(opts.segments) || opts.segments.length === 0) invalidArgs('segments must contain at least one segment.');
  if (!Array.isArray(opts.joints) || opts.joints.length !== opts.segments.length) {
    invalidArgs(`segments (${opts.segments.length}) and joints (${opts.joints?.length ?? 0}) must have the same length.`);
  }
  if (opts.density !== undefined) assertPositive('density', opts.density);
  validateFit(opts.fit);

  const segmentNames = new Set<string>();
  for (const [index, segment] of opts.segments.entries()) {
    assertName('segments[].name', segment?.name);
    assertTopoRefSafeName(segment.name, 'part-name');
    if (segmentNames.has(segment.name)) invalidArgs(`segments contain duplicate name '${segment.name}'.`);
    segmentNames.add(segment.name);
    assertPositive(`segment '${segment.name}' lengthMm`, segment.lengthMm);
    assertPositive(`segment '${segment.name}' widthMm`, segment.widthMm);
    assertPositive(`segment '${segment.name}' depthMm`, segment.depthMm);
    if (segment.terminal === true && index !== opts.segments.length - 1) {
      invalidArgs(`segment '${segment.name}' is terminal but is not the last segment.`);
    }
  }
  const jointNames = new Set<string>();
  for (const joint of opts.joints) {
    assertName('joints[].name', joint?.name);
    assertTopoRefSafeName(joint.name, 'connector-name');
    if (jointNames.has(joint.name)) invalidArgs(`joints contain duplicate name '${joint.name}'.`);
    jointNames.add(joint.name);
    if (!Array.isArray(joint.limitsDeg) || joint.limitsDeg.length !== 2 ||
      !Number.isFinite(joint.limitsDeg[0]) || !Number.isFinite(joint.limitsDeg[1]) ||
      joint.limitsDeg[0] > joint.limitsDeg[1]) {
      invalidArgs(`joint '${joint.name}' limitsDeg must be a finite [min, max] range.`);
    }
  }

  const transform = frameTransform(opts.frame);
  const styles = opts.joints.map((joint) => withDefaults(joint.style));
  const webLengths = opts.segments.map((segment, index) => {
    const incomingKeepoutMm = styles[index].knuckleR + opts.clearanceMm;
    const outgoingStyle = styles[index + 1];
    const outgoingKeepoutMm = outgoingStyle === undefined ? 0 : outgoingStyle.knuckleR + opts.clearanceMm;
    const beamLengthMm = segment.lengthMm - incomingKeepoutMm - outgoingKeepoutMm;
    if (beamLengthMm < MIN_STRUCTURAL_WEB_MM) {
      invalidArgs(
        `segment '${segment.name}' leaves ${beamLengthMm} mm between joint keepouts; need at least ${MIN_STRUCTURAL_WEB_MM} mm.`,
      );
    }
    validateLinkCrossSection(segment, styles[index], outgoingStyle, opts.joints[index + 1]);
    return beamLengthMm;
  });

  const parts = arm.__parts();
  const parent = parentMount(arm, opts.parentMount);
  if (parent === undefined || parent.type !== 'frame') {
    invalidArgs(`parentMount '${opts.parentMount}' must be an existing frame connector.`);
  }
  const partNames = [`${opts.name}-base`, ...opts.segments.map((segment) => `${opts.name}-${segment.name}`)];
  const mateNames = [`${opts.name}-base-mount`, ...opts.joints.map((joint) => `${opts.name}-${joint.name}`)];
  for (const name of partNames) {
    if (parts.some((part) => part.name === name)) invalidArgs(`generated part name '${name}' already exists in assembly '${arm.name}'.`);
  }
  for (const name of mateNames) {
    if (arm.__mates().some((mate) => mate.name === name)) invalidArgs(`generated mate name '${name}' already exists in assembly '${arm.name}'.`);
    if (arm.__jointSupportIntents().some((intent) => intent.name === `${name}-support`)) {
      invalidArgs(`generated joint support name '${name}-support' already exists in assembly '${arm.name}'.`);
    }
  }
  return { transform, styles, webLengths };
}

function buildBaseBody(kc: KernelCadApi, first: ArticulatedDigitSegmentSpec, style: ResolvedClevisStyle): Shape {
  const length = baseSpanMm(style);
  const forkPlateSpanMm = style.forkGapY + 2 * style.plateT;
  return kc.box(
    length,
    Math.max(first.widthMm, style.knuckleR * 2),
    Math.max(first.depthMm, style.knuckleR * 2, forkPlateSpanMm),
    true,
  )
    .translate(length / 2, 0, 0);
}

function baseSpanMm(style: ResolvedClevisStyle): number {
  return style.knuckleR * 2 + MIN_STRUCTURAL_WEB_MM;
}

function buildCorridorLink(
  kc: KernelCadApi,
  segment: ArticulatedDigitSegmentSpec,
  incoming: ResolvedClevisStyle,
  outgoing: ResolvedClevisStyle | undefined,
  clearanceMm: number,
  outgoingLiftMm: number | undefined,
): Shape {
  const coreStart = incoming.knuckleR + clearanceMm;
  const coreEnd = outgoing === undefined
    ? segment.lengthMm
    : segment.lengthMm - outgoing.knuckleR - clearanceMm;
  const coreLength = coreEnd - coreStart;
  const core = kc.box(coreLength, segment.widthMm, segment.depthMm, true)
    .translate(coreStart + coreLength / 2, 0, 0);

  // The incoming fork surrounds the tongue along the pin axis. This stem is
  // deliberately no wider than the tongue, so it fuses the link to its own
  // tongue without entering the parent fork plates. It overlaps the main web
  // and tongue by one millimetre; it is a load path, not an added collar.
  const stemStart = Math.max(0, incoming.knuckleR - FUSED_PACKAGE_OVERLAP_MM);
  const stemEnd = coreStart + FUSED_PACKAGE_OVERLAP_MM;
  const stemLength = stemEnd - stemStart;
  const stem = kc.box(
    stemLength,
    Math.min(segment.widthMm, incoming.knuckleR * 2),
    Math.min(segment.depthMm, incoming.tongueY),
    true,
  ).translate(stemStart + stemLength / 2, 0, 0);
  let link = stem.union(core);
  if (outgoing === undefined || outgoingLiftMm === undefined) return link;

  // The central web ends at the outgoing keepout. Two rails then overlap the
  // beam on its safe side and the fork plates on their safe side. They never
  // span the fork gap, leaving the tongue-clearance pocket empty.
  const railStart = coreEnd - FUSED_PACKAGE_OVERLAP_MM;
  const railEnd = segment.lengthMm - outgoing.knuckleR + FUSED_PACKAGE_OVERLAP_MM;
  const railLength = railEnd - railStart;
  const plateOffset = outgoing.forkGapY / 2 + outgoing.plateT / 2;
  for (const side of [-1, 1]) {
    const rail = kc.box(railLength, segment.widthMm, outgoing.plateT, true)
      .translate((railStart + railEnd) / 2, 0, side * plateOffset);
    link = link.union(rail);
  }
  // This blank is bounded by the fork itself, not the link envelope. The
  // clevis pocket removes its centre, leaving the rails fused to the two fork
  // plates while preserving the child's tongue clearance volume.
  const rootBlank = kc.box(
    2 * outgoing.knuckleR + 1,
    Math.min(segment.widthMm, 2 * outgoing.knuckleR),
    outgoing.forkGapY + 2 * outgoing.plateT,
    true,
  ).translate(segment.lengthMm, outgoingLiftMm, 0);
  link = link.union(rootBlank);
  return link;
}

function validateLinkCrossSection(
  segment: ArticulatedDigitSegmentSpec,
  incoming: ResolvedClevisStyle,
  outgoing: ResolvedClevisStyle | undefined,
  outgoingJoint: ArticulatedDigitJointSpec | undefined,
): void {
  if (segment.widthMm < MIN_STRUCTURAL_WEB_MM ||
    Math.min(segment.depthMm, incoming.tongueY) < MIN_STRUCTURAL_WEB_MM) {
    invalidArgs(
      `segment '${segment.name}' cross-section cannot carry a ${MIN_STRUCTURAL_WEB_MM} mm fused incoming tongue web.`,
    );
  }
  if (outgoing === undefined || outgoingJoint === undefined) return;

  const plateRootHalfLiftMm = Math.sqrt(
    outgoing.knuckleR ** 2 - (outgoing.knuckleR - FUSED_PACKAGE_OVERLAP_MM) ** 2,
  );
  const liftMm = computePivotLift(outgoing, [outgoingJoint.limitsDeg[0], outgoingJoint.limitsDeg[1]]);
  const forkRootLowerMm = liftMm - plateRootHalfLiftMm;
  if (segment.widthMm / 2 - forkRootLowerMm < FUSED_PACKAGE_OVERLAP_MM) {
    invalidArgs(
      `segment '${segment.name}' widthMm cannot overlap the outgoing fork root by ${FUSED_PACKAGE_OVERLAP_MM} mm.`,
    );
  }
  if (segment.depthMm - outgoing.forkGapY < 2 * FUSED_PACKAGE_OVERLAP_MM) {
    invalidArgs(
      `segment '${segment.name}' depthMm cannot overlap both outgoing fork plates by ${FUSED_PACKAGE_OVERLAP_MM} mm.`,
    );
  }
}

function axisConnector(transform: Transform, connector: ClevisJoint['parentConnector']) {
  return {
    type: 'axis' as const,
    origin: { kind: 'vec3' as const, value: mutableVec3(transform.point(connector.origin)) },
    axis: normalize(transform.axisDir(connector.axis)),
    jointClearanceRadius: connector.clearanceRadius,
  };
}

function frameConnector(origin: ReadonlyVec3) {
  return { type: 'frame' as const, origin: { kind: 'vec3' as const, value: mutableVec3(origin) } };
}

function evaluateFit(opts: ArticulatedDigitOptions, styles: readonly ResolvedClevisStyle[]): ArticulatedDigitFitReport {
  const reasons: string[] = [];
  const packageWidth = Math.max(...styles.map((style) => style.knuckleR * 2));
  const packageDepth = Math.max(...styles.map((style) => style.forkGapY + 2 * style.plateT + 2 * style.pinCapThickness));
  const width = Math.max(packageWidth, ...opts.segments.map((segment) => segment.widthMm));
  const depth = Math.max(packageDepth, ...opts.segments.map((segment) => segment.depthMm));
  if (opts.fit?.maxWidthMm !== undefined && width > opts.fit.maxWidthMm) {
    reasons.push(`physical width ${width} mm exceeds reference envelope ${opts.fit.maxWidthMm} mm.`);
  }
  if (opts.fit?.maxDepthMm !== undefined && depth > opts.fit.maxDepthMm) {
    reasons.push(`physical depth ${depth} mm exceeds reference envelope ${opts.fit.maxDepthMm} mm.`);
  }
  const terminalLength = opts.segments.at(-1)?.lengthMm ?? 0;
  if (opts.fit?.terminalPadLengthMm !== undefined && terminalLength < opts.fit.terminalPadLengthMm) {
    reasons.push(`terminal length ${terminalLength} mm is shorter than requested terminal pad ${opts.fit.terminalPadLengthMm} mm.`);
  }
  return { status: reasons.length === 0 ? 'fit' : 'exceeds-envelope', reasons };
}

function frameTransform(frame: ArticulatedDigitFrame): Transform {
  assertFiniteVec3('frame.origin', frame?.origin);
  const pin = normalize(axisVector(frame?.pinAxis, 'frame.pinAxis'));
  const forward = normalize(frame?.forward, 'frame.forward');
  if (Math.abs(dot(pin, forward)) > 1e-6) invalidArgs('frame.pinAxis and frame.forward must be orthogonal.');
  const expectedLift = normalize(cross(pin, forward), 'frame lift');
  const lift = frame.liftDir === undefined ? expectedLift : normalize(frame.liftDir, 'frame.liftDir');
  if (Math.abs(dot(pin, lift)) > 1e-6 || dot(expectedLift, lift) < 1 - 1e-6) {
    invalidArgs('frame.liftDir must be perpendicular to pinAxis and agree with cross(pinAxis, forward).');
  }

  const localPin: Vec3 = [0, 0, 1];
  const alignmentAxis = cross(localPin, pin);
  const alignmentDot = clamp(dot(localPin, pin), -1, 1);
  const align = Math.hypot(...alignmentAxis) < 1e-9
    ? (alignmentDot >= 0 ? Transform.identity() : Transform.rotationAxisAngleDeg([1, 0, 0], 180))
    : Transform.rotationAxisAngleDeg(alignmentAxis, Math.acos(alignmentDot) * 180 / Math.PI);
  const currentLift = normalize(align.axisDir([0, 1, 0]), 'aligned local lift');
  const roll = Math.atan2(dot(pin, cross(currentLift, lift)), clamp(dot(currentLift, lift), -1, 1)) * 180 / Math.PI;
  return Transform.translation(frame.origin[0], frame.origin[1], frame.origin[2])
    .compose(Transform.rotationAxisAngleDeg(pin, roll))
    .compose(align);
}

function parentMount(arm: Assembly, ref: string): { type: string } | undefined {
  const match = /^([^.]+)\.([^.]+)$/.exec(ref);
  if (match === null) return undefined;
  return arm.__parts()
    .find((part) => part.name === match[1])
    ?.mateConnectors.find((connector) => connector.name === match[2]);
}

function validateFit(fit: ArticulatedDigitFitSpec | undefined): void {
  if (fit === undefined) return;
  for (const [name, value] of Object.entries(fit)) {
    if (!Number.isFinite(value) || value < 0) invalidArgs(`fit.${name} must be a non-negative finite number.`);
  }
}

function assertName(name: string, value: unknown): asserts value is string {
  if (typeof value !== 'string' || value.trim() === '') invalidArgs(`${name} must be a non-empty string.`);
}

function assertPositive(name: string, value: unknown): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    invalidArgs(`${name} must be a positive finite number.`);
  }
}

function assertFiniteVec3(name: string, value: unknown): asserts value is Vec3 {
  if (!Array.isArray(value) || value.length !== 3 || !value.every((component) => typeof component === 'number' && Number.isFinite(component))) {
    invalidArgs(`${name} must be a finite Vec3 [x, y, z].`);
  }
}

function axisVector(axis: unknown, name: string): Vec3 {
  if (axis === 'X') return [1, 0, 0];
  if (axis === 'Y') return [0, 1, 0];
  if (axis === 'Z') return [0, 0, 1];
  assertFiniteVec3(name, axis);
  return axis;
}

type ReadonlyVec3 = readonly [number, number, number];

function normalize(vector: ReadonlyVec3, name = 'vector'): Vec3 {
  const length = Math.hypot(vector[0], vector[1], vector[2]);
  if (length < 1e-9) invalidArgs(`${name} must be non-zero.`);
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

function dot(a: ReadonlyVec3, b: ReadonlyVec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a: ReadonlyVec3, b: ReadonlyVec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function mutableVec3(vector: ReadonlyVec3): Vec3 {
  return [vector[0], vector[1], vector[2]];
}

function invalidArgs(message: string): never {
  throw new KernelError(
    'feature.invalid-args',
    `joint.articulatedDigit: ${message}`,
    'joint.articulatedDigit',
    'Pass a complete planar-chain digit specification with a valid base frame and physical joint package spacing.',
  );
}
