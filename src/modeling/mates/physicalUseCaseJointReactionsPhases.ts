// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Phase helpers for the static-certificate validation in
// `physicalUseCaseJointReactions.ts`, plus the pure scalar/vector
// primitives they share with the orchestrator.
import type { Assembly, AssemblyPartStored } from '../capture/assembly';
import type { Vec3 } from '../../shared/intent/types';
import type { Transform } from '../../shared/runtime/se3';
import { resolveConnectorOrigin, type Connector } from './connector';
import { parseConnectorRef } from './mate';
import type { PhysicalUseCaseRecord } from './physicalUseCase';
import {
  DEFAULT_FORCE_RESIDUAL_N,
  DEFAULT_TORQUE_RESIDUAL_NMM,
  type PhysicalUseCaseStaticCertificate,
  type PhysicalUseCaseStaticContactForce,
} from './physicalUseCaseStatics';
import type { CertifiedMechanismContact } from './physicalUseCaseJointReactions';

export const CONTACT_DISTANCE_TOLERANCE_MM = 1e-6;
export const CERTIFICATE_POINT_TOLERANCE_MM = 1e-6;
export const CERTIFICATE_NUMERIC_TOLERANCE = 1e-8;

export function validateCertificateIdentity(
  arm: Assembly,
  useCase: PhysicalUseCaseRecord,
  certificate: PhysicalUseCaseStaticCertificate,
  partsByName: ReadonlyMap<string, AssemblyPartStored>,
): string | undefined {
  if (certificate.useCaseName !== useCase.name) {
    return `Static certificate use case '${certificate.useCaseName}' does not match '${useCase.name}'.`;
  }
  if (!partsByName.has(certificate.heldPart)) {
    return `Static certificate held part '${certificate.heldPart}' does not exist in the assembly.`;
  }
  const loadedParts = [...new Set(useCase.loads.map((load) => load.part))];
  if (loadedParts.length !== 1 || loadedParts[0] !== certificate.heldPart) {
    return `Static certificate held part '${certificate.heldPart}' does not match the use-case load owner.`;
  }
  for (const stablePart of useCase.stableParts) {
    if (!partsByName.has(stablePart)) {
      return `Stable part '${stablePart}' does not exist in the assembly.`;
    }
  }
  for (const mate of arm.__mates()) {
    const aPart = safePartName(mate.a);
    const bPart = safePartName(mate.b);
    if (aPart === certificate.heldPart || bPart === certificate.heldPart) {
      return `Static certificate held part '${certificate.heldPart}' is connected by structural mate '${mate.name}'.`;
    }
  }
  return undefined;
}

export function validateCertificateResiduals(
  useCase: PhysicalUseCaseRecord,
  certificate: PhysicalUseCaseStaticCertificate,
): string | undefined {
  const forceLimit = useCase.criteria?.maxForceResidualN ?? DEFAULT_FORCE_RESIDUAL_N;
  const torqueLimit = useCase.criteria?.maxTorqueResidualNmm ?? DEFAULT_TORQUE_RESIDUAL_NMM;
  if (
    !isNonNegativeFinite(certificate.forceResidualN) ||
    certificate.forceResidualN > forceLimit + 1e-12 ||
    !isNonNegativeFinite(certificate.torqueResidualNmm) ||
    certificate.torqueResidualNmm > torqueLimit + 1e-12
  ) {
    return 'Static certificate residuals are not finite passing values for this use case.';
  }
  return undefined;
}

export function validateCertificatePoses(
  arm: Assembly,
  certificate: PhysicalUseCaseStaticCertificate,
): string | undefined {
  const matesByName = new Map(arm.__mates().map((mate) => [mate.name, mate]));
  for (const [mateName, pose] of Object.entries(certificate.poses)) {
    const mate = matesByName.get(mateName);
    if (mate === undefined) return `Static certificate pose names unknown mate '${mateName}'.`;
    if (!isFinitePose(pose)) return `Static certificate pose for mate '${mateName}' is not finite.`;
    if (mate.type === 'ball' ? !Array.isArray(pose) : Array.isArray(pose)) {
      return `Static certificate pose for mate '${mateName}' has the wrong shape for '${mate.type}'.`;
    }
    if (mate.type === 'fastened' || mate.type === 'planar') {
      return `Static certificate must not provide a pose for zero-DOF mate '${mateName}'.`;
    }
  }
  return undefined;
}

export function buildDeclaredContactMap(
  useCase: PhysicalUseCaseRecord,
  certificate: PhysicalUseCaseStaticCertificate,
): Map<string, PhysicalUseCaseRecord['contacts'][number]> | string {
  if (certificate.contactForces.length !== useCase.contacts.length) {
    return `Static certificate has ${certificate.contactForces.length} contact forces for ${useCase.contacts.length} declared contacts.`;
  }
  const declaredContacts = new Map<string, PhysicalUseCaseRecord['contacts'][number]>();
  for (const contact of useCase.contacts) {
    const key = contactKey(contact.a, contact.b);
    if (declaredContacts.has(key)) {
      return `Use case declares duplicate contact '${contact.a}' to '${contact.b}'.`;
    }
    declaredContacts.set(key, contact);
  }
  return declaredContacts;
}

export function validateCertifiedContact(
  evidence: PhysicalUseCaseStaticContactForce,
  declared: PhysicalUseCaseRecord['contacts'][number] | undefined,
  certificate: PhysicalUseCaseStaticCertificate,
  partsByName: ReadonlyMap<string, AssemblyPartStored>,
  seen: ReadonlySet<string>,
): CertifiedMechanismContact | string {
  const key = contactKey(evidence.contactA, evidence.contactB);
  if (declared === undefined || seen.has(key)) {
    return `Static certificate contact '${evidence.contactA}' to '${evidence.contactB}' does not match the declared contacts.`;
  }
  const aPart = safePartName(evidence.contactA);
  const bPart = safePartName(evidence.contactB);
  const heldIsA = aPart === certificate.heldPart;
  const heldIsB = bPart === certificate.heldPart;
  if (aPart === undefined || bPart === undefined || heldIsA === heldIsB) {
    return `Static certificate contact '${evidence.contactA}' to '${evidence.contactB}' has invalid held/mechanism ownership.`;
  }
  const mechanismPart = heldIsA ? bPart : aPart;
  if (evidence.mechanismPart !== mechanismPart || !partsByName.has(mechanismPart)) {
    return `Static certificate mechanism part '${evidence.mechanismPart}' does not own the non-held contact endpoint.`;
  }
  if (
    !connectorExists(partsByName, evidence.contactA) ||
    !connectorExists(partsByName, evidence.contactB)
  ) {
    return `Static certificate contact '${evidence.contactA}' to '${evidence.contactB}' names an unknown connector.`;
  }
  if (hasNonFiniteContactGeometry(evidence)) {
    return `Static certificate contact '${evidence.contactA}' to '${evidence.contactB}' has a non-finite point or force.`;
  }
  if (isOutsideCertifiedContactLimits(evidence)) {
    return `Static certificate contact '${evidence.contactA}' to '${evidence.contactB}' is outside its certified contact limits.`;
  }
  if (doesNotMatchDeclaredContact(evidence, declared)) {
    return `Static certificate contact '${evidence.contactA}' to '${evidence.contactB}' does not match declared capacity or friction.`;
  }
  return {
    evidence,
    mechanismPart,
    pointWorldMm: copyVec(evidence.pointWorldMm),
    forceOnMechanismWorldN: scale(evidence.forceOnHeldWorldN, -1),
  };
}

function hasNonFiniteContactGeometry(evidence: PhysicalUseCaseStaticContactForce): boolean {
  return !isFiniteVec3(evidence.pointWorldMm) || !isFiniteVec3(evidence.forceOnHeldWorldN);
}

function isOutsideCertifiedContactLimits(evidence: PhysicalUseCaseStaticContactForce): boolean {
  return (
    !isNonNegativeFinite(evidence.normalForceN) ||
    !isNonNegativeFinite(evidence.tangentialForceN) ||
    !isPositiveFinite(evidence.normalCapacityN) ||
    !isPositiveFinite(evidence.friction) ||
    evidence.normalForceN > evidence.normalCapacityN + 1e-8 ||
    evidence.tangentialForceN > evidence.friction * evidence.normalForceN + 1e-8
  );
}

function doesNotMatchDeclaredContact(
  evidence: PhysicalUseCaseStaticContactForce,
  declared: PhysicalUseCaseRecord['contacts'][number],
): boolean {
  return (
    declared.normalForceN === undefined ||
    !nearlyEqual(evidence.normalCapacityN, declared.normalForceN) ||
    !nearlyEqual(evidence.friction, declared.friction)
  );
}

export function connectorExists(
  partsByName: ReadonlyMap<string, AssemblyPartStored>,
  ref: string,
): boolean {
  const parsed = safeParseConnectorRef(ref);
  return parsed !== undefined &&
    partsByName.get(parsed.partName)?.mateConnectors.some(
      (connector: Connector) => connector.name === parsed.connectorName,
    ) === true;
}

export function safeParseConnectorRef(ref: string): ReturnType<typeof parseConnectorRef> | undefined {
  try {
    return parseConnectorRef(ref);
  } catch {
    return undefined;
  }
}

export function safePartName(ref: string): string | undefined {
  return safeParseConnectorRef(ref)?.partName;
}

export function contactKey(a: string, b: string): string {
  return `${a}\n${b}`;
}

export function isFinitePose(value: number | [number, number, number]): boolean {
  return Array.isArray(value)
    ? value.length === 3 && value.every(Number.isFinite)
    : Number.isFinite(value);
}

export function isFiniteVec3(value: readonly number[]): value is Vec3 {
  return value.length === 3 && value.every(Number.isFinite);
}

export function isNonNegativeFinite(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

export function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

export function nearlyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
}

export function copyVec(value: readonly [number, number, number]): Vec3 {
  return [value[0], value[1], value[2]];
}

export function scale(value: readonly [number, number, number], scalar: number): Vec3 {
  return [value[0] * scalar, value[1] * scalar, value[2] * scalar];
}

export interface ResolvedConnectorPoint {
  readonly connector: Connector;
  readonly pointWorldMm: Vec3;
  readonly transform: Transform;
}

export interface ResolvedSolvedLoad {
  readonly force: Vec3;
  readonly torque: Vec3;
  readonly pointWorldMm?: Vec3;
}

export async function resolveConnectorPoint(
  arm: Assembly,
  transforms: ReadonlyMap<string, Transform>,
  ref: string,
): Promise<ResolvedConnectorPoint | string> {
  const parsed = safeParseConnectorRef(ref);
  if (parsed === undefined) return `connector reference '${ref}' is malformed.`;
  const part = arm.__parts().find((candidate) => candidate.name === parsed.partName);
  const connector = part?.mateConnectors.find((candidate) => candidate.name === parsed.connectorName);
  const transform = transforms.get(parsed.partName);
  if (part === undefined || connector === undefined || transform === undefined) {
    return `connector '${ref}' could not be resolved in the solved assembly.`;
  }
  let localPoint: Vec3;
  try {
    localPoint = (await resolveConnectorOrigin(
      part.originalShape,
      connector.origin,
      arm.__session().getRecords(),
    )).value;
  } catch (error) {
    return `connector '${ref}' origin could not be resolved: ${errorMessage(error)}.`;
  }
  const pointWorldMm = [...transform.point(localPoint)] as Vec3;
  if (!isFiniteVec3(pointWorldMm)) {
    return `connector '${ref}' has a non-finite solved transform.`;
  }
  return { connector, pointWorldMm, transform };
}

function contactHeldWorldNormal(
  contact: PhysicalUseCaseRecord['contacts'][number],
  heldPart: string,
  transforms: ReadonlyMap<string, Transform>,
): Vec3 | string {
  const frame = contact.normalFrame ?? 'world';
  let worldNormal: Vec3;
  if (frame === 'world') {
    worldNormal = copyVec(contact.normal);
  } else {
    const ref = frame === 'a' ? contact.a : contact.b;
    const partName = safePartName(ref);
    const transform = partName === undefined ? undefined : transforms.get(partName);
    if (transform === undefined) {
      return `Contact normal frame '${frame}' for '${contact.a}' to '${contact.b}' could not be resolved.`;
    }
    worldNormal = [...transform.axisDir(contact.normal)] as Vec3;
  }
  if (!isFiniteVec3(worldNormal) || norm(worldNormal) <= 0) {
    return `Contact normal for '${contact.a}' to '${contact.b}' is not finite and non-zero.`;
  }
  worldNormal = unit(worldNormal);
  return safePartName(contact.a) === heldPart ? worldNormal : scale(worldNormal, -1);
}

interface SolvedContactEndpoints {
  readonly aPoint: ResolvedConnectorPoint;
  readonly bPoint: ResolvedConnectorPoint;
}

export async function validateSolvedContact(
  arm: Assembly,
  transforms: ReadonlyMap<string, Transform>,
  useCase: PhysicalUseCaseRecord,
  certificate: PhysicalUseCaseStaticCertificate,
  contact: CertifiedMechanismContact,
): Promise<string | undefined> {
  const declared = useCase.contacts.find((candidate) =>
    contactKey(candidate.a, candidate.b) ===
    contactKey(contact.evidence.contactA, contact.evidence.contactB));
  if (declared === undefined) {
    return `Certified contact '${contact.evidence.contactA}' to '${contact.evidence.contactB}' is not declared.`;
  }
  const endpoints = await resolveSolvedContactEndpoints(arm, transforms, declared);
  if (typeof endpoints === 'string') return endpoints;
  const pointsIssue = validateSolvedContactPoints(useCase, declared, contact, endpoints);
  if (pointsIssue !== undefined) return pointsIssue;

  const heldNormal = contactHeldWorldNormal(
    declared,
    certificate.heldPart,
    transforms,
  );
  if (typeof heldNormal === 'string') return heldNormal;
  return validateSolvedContactForce(declared, contact, heldNormal);
}

async function resolveSolvedContactEndpoints(
  arm: Assembly,
  transforms: ReadonlyMap<string, Transform>,
  declared: PhysicalUseCaseRecord['contacts'][number],
): Promise<SolvedContactEndpoints | string> {
  const aPoint = await resolveConnectorPoint(arm, transforms, declared.a);
  if (typeof aPoint === 'string') return aPoint;
  const bPoint = await resolveConnectorPoint(arm, transforms, declared.b);
  if (typeof bPoint === 'string') return bPoint;
  return { aPoint, bPoint };
}

function validateSolvedContactPoints(
  useCase: PhysicalUseCaseRecord,
  declared: PhysicalUseCaseRecord['contacts'][number],
  contact: CertifiedMechanismContact,
  endpoints: SolvedContactEndpoints,
): string | undefined {
  const maxSlipMm = useCase.criteria?.maxSlipMm ?? 0;
  if (!Number.isFinite(maxSlipMm) || maxSlipMm < 0) {
    return `Use-case maxSlipMm must be a finite non-negative value.`;
  }
  const endpointDistanceMm = distance(endpoints.aPoint.pointWorldMm, endpoints.bPoint.pointWorldMm);
  if (endpointDistanceMm > maxSlipMm + CONTACT_DISTANCE_TOLERANCE_MM) {
    return `Solved contact endpoint distance ${endpointDistanceMm} mm for '${declared.a}' to '${declared.b}' exceeds maxSlipMm ${maxSlipMm}.`;
  }
  const expectedPoint = midpoint(endpoints.aPoint.pointWorldMm, endpoints.bPoint.pointWorldMm);
  if (distance(contact.evidence.pointWorldMm, expectedPoint) > CERTIFICATE_POINT_TOLERANCE_MM) {
    return `Certified contact point for '${declared.a}' to '${declared.b}' does not match the solved endpoint midpoint.`;
  }
  return undefined;
}

function validateSolvedContactForce(
  declared: PhysicalUseCaseRecord['contacts'][number],
  contact: CertifiedMechanismContact,
  heldNormal: Vec3,
): string | undefined {
  const normalForceN = dot(contact.evidence.forceOnHeldWorldN, heldNormal);
  const tangentialForceN = norm(sub(
    contact.evidence.forceOnHeldWorldN,
    scale(heldNormal, normalForceN),
  ));
  if (
    !numbersMatch(normalForceN, contact.evidence.normalForceN) ||
    !numbersMatch(tangentialForceN, contact.evidence.tangentialForceN)
  ) {
    return `Certified contact force metadata for '${declared.a}' to '${declared.b}' does not match forceOnHeldWorldN at the solved pose.`;
  }
  if (
    normalForceN < -CERTIFICATE_NUMERIC_TOLERANCE ||
    normalForceN > contact.evidence.normalCapacityN + CERTIFICATE_NUMERIC_TOLERANCE ||
    tangentialForceN >
      contact.evidence.friction * Math.max(0, normalForceN) + CERTIFICATE_NUMERIC_TOLERANCE
  ) {
    return `Certified contact force for '${declared.a}' to '${declared.b}' is outside its solved-pose contact limits.`;
  }
  return undefined;
}

export async function resolveSolvedLoads(
  arm: Assembly,
  transforms: ReadonlyMap<string, Transform>,
  useCase: PhysicalUseCaseRecord,
  certificate: PhysicalUseCaseStaticCertificate,
): Promise<{ loads: ResolvedSolvedLoad[]; referencePoint: Vec3 } | string> {
  const loads: ResolvedSolvedLoad[] = [];
  for (const load of useCase.loads) {
    if (load.force !== undefined && !isFiniteVec3(load.force)) {
      return `Declared force load on '${load.part}' is not a finite Vec3.`;
    }
    if (load.torque !== undefined && !isFiniteVec3(load.torque)) {
      return `Declared torque load on '${load.part}' is not a finite Vec3.`;
    }
    let pointWorldMm: Vec3 | undefined;
    if (load.at !== undefined) {
      const parsed = safeParseConnectorRef(load.at);
      if (parsed?.partName !== certificate.heldPart) {
        return `Load application connector '${load.at}' does not belong to held part '${certificate.heldPart}'.`;
      }
      const resolved = await resolveConnectorPoint(arm, transforms, load.at);
      if (typeof resolved === 'string') return resolved;
      pointWorldMm = resolved.pointWorldMm;
    } else if (hasNonZeroVec(load.force)) {
      return `Force load on '${load.part}' has no application connector at the certified pose.`;
    }
    loads.push({
      force: load.force === undefined ? [0, 0, 0] : copyVec(load.force),
      torque: load.torque === undefined ? [0, 0, 0] : copyVec(load.torque),
      ...(pointWorldMm === undefined ? {} : { pointWorldMm }),
    });
  }
  const referencePoint = loads.find((load) => load.pointWorldMm !== undefined)?.pointWorldMm;
  if (referencePoint === undefined) {
    return `Held part '${certificate.heldPart}' has no resolved load application connector.`;
  }
  return { loads, referencePoint };
}

export function computeHeldNetWrench(
  loads: readonly ResolvedSolvedLoad[],
  contacts: readonly CertifiedMechanismContact[],
  referencePoint: Vec3,
): { netForce: Vec3; netMoment: Vec3 } {
  let netForce: Vec3 = [0, 0, 0];
  let netMoment: Vec3 = [0, 0, 0];
  for (const load of loads) {
    netForce = add(netForce, load.force);
    netMoment = add(netMoment, load.torque);
    if (load.pointWorldMm !== undefined) {
      netMoment = add(
        netMoment,
        cross(sub(load.pointWorldMm, referencePoint), load.force),
      );
    }
  }
  for (const contact of contacts) {
    netForce = add(netForce, contact.evidence.forceOnHeldWorldN);
    netMoment = add(
      netMoment,
      cross(
        sub(contact.evidence.pointWorldMm, referencePoint),
        contact.evidence.forceOnHeldWorldN,
      ),
    );
  }
  return { netForce, netMoment };
}

export function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export function norm(value: Vec3): number {
  return Math.hypot(value[0], value[1], value[2]);
}

export function unit(value: Vec3): Vec3 {
  return scale(value, 1 / norm(value));
}

export function midpoint(a: Vec3, b: Vec3): Vec3 {
  return scale(add(a, b), 0.5);
}

export function distance(a: Vec3, b: Vec3): number {
  return norm(sub(a, b));
}

function hasNonZeroVec(value: readonly number[] | undefined): value is Vec3 {
  return value !== undefined && isFiniteVec3(value) && norm(value) > 0;
}

export function numbersMatch(a: number, b: number): boolean {
  return Math.abs(a - b) <=
    CERTIFICATE_NUMERIC_TOLERANCE * Math.max(1, Math.abs(a), Math.abs(b));
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
