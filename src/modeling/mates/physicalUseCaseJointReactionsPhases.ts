// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Phase helpers for the static-certificate validation in
// `physicalUseCaseJointReactions.ts`, plus the pure scalar/vector
// primitives they share with the orchestrator.
import type { Assembly, AssemblyPartStored } from '../capture/assembly';
import type { Vec3 } from '../../shared/intent/types';
import type { Connector } from './connector';
import { parseConnectorRef } from './mate';
import type { PhysicalUseCaseRecord } from './physicalUseCase';
import {
  DEFAULT_FORCE_RESIDUAL_N,
  DEFAULT_TORQUE_RESIDUAL_NMM,
  type PhysicalUseCaseStaticCertificate,
  type PhysicalUseCaseStaticContactForce,
} from './physicalUseCaseStatics';
import type { CertifiedMechanismContact } from './physicalUseCaseJointReactions';

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
