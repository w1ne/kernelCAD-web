// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Phase helpers for `reviewPhysicalUseCases` in `physicalUseCase.ts`, plus the
// connector/vector primitives they share with the orchestrator. Code moved
// here unchanged; each phase returns the diagnostics in the same order the
// orchestrator previously pushed them.
import type { Vec3 } from '../../shared/intent/types';
import type { PoseEnvelopeReviewResult, TrackedConnectorPose } from './poseEnvelope';
import { parseConnectorRef } from './mate';
import type {
  PhysicalUseCaseContact,
  PhysicalUseCaseDiagnostic,
  PhysicalUseCaseRecord,
} from './physicalUseCase';

type PartConnectorIndex = ReadonlyMap<string, { mateConnectors: readonly { name: string }[] }>;
type MateIndex = ReadonlyMap<string, { name: string; a: string; b: string; type: string }>;

export function hasNonZeroVec(v: readonly number[] | undefined): v is Vec3 {
  return Array.isArray(v) && v.length === 3 && v.every((n) => Number.isFinite(n)) && Math.hypot(v[0], v[1], v[2]) > 0;
}

export function connectorExists(ref: string, partsByName: PartConnectorIndex): boolean {
  try {
    const parsed = parseConnectorRef(ref);
    const part = partsByName.get(parsed.partName);
    return part?.mateConnectors.some((connector) => connector.name === parsed.connectorName) ?? false;
  } catch {
    return false;
  }
}

export function reviewMissingPhysicalUseCase(
  requirePhysicalUseCase: boolean | undefined,
  useCaseCount: number,
  hasArticulatedMate: boolean,
): PhysicalUseCaseDiagnostic | undefined {
  if (requirePhysicalUseCase === true && useCaseCount === 0 && hasArticulatedMate) {
    return {
      code: 'assembly.physical-use-case.missing',
      severity: 'error',
      message: 'Assembly has articulated mates but no declared physical use case.',
      hint: 'physical-use-case.missing — add arm.physicalUseCase(name, { loads, contacts, actuatorLimits, stableParts }) so review can check physical task evidence, not just geometry.',
    };
  }
  return undefined;
}

export function reviewUseCaseStableParts(
  useCase: PhysicalUseCaseRecord,
  partsByName: PartConnectorIndex,
): PhysicalUseCaseDiagnostic[] {
  const diagnostics: PhysicalUseCaseDiagnostic[] = [];
  for (const partName of useCase.stableParts) {
    if (!partsByName.has(partName)) {
      diagnostics.push({
        code: 'assembly.physical-use-case.part-missing',
        severity: 'error',
        useCaseName: useCase.name,
        role: 'stablePart',
        partName,
        message: `Physical use case '${useCase.name}' references missing stable part '${partName}'.`,
        hint: `physical-use-case.part-missing — declare arm.part('${partName}', ...) or remove it from stableParts.`,
      });
    }
  }
  return diagnostics;
}

export function reviewUseCaseLoads(
  useCase: PhysicalUseCaseRecord,
  partsByName: PartConnectorIndex,
): PhysicalUseCaseDiagnostic[] {
  const diagnostics: PhysicalUseCaseDiagnostic[] = [];

  if (useCase.loads.length === 0) {
    diagnostics.push({
      code: 'assembly.physical-use-case.zero-load',
      severity: 'error',
      useCaseName: useCase.name,
      partName: '',
      message: `Physical use case '${useCase.name}' declares no load.`,
      hint: 'physical-use-case.zero-load — add at least one load with a non-zero force or torque vector.',
    });
  }

  for (const load of useCase.loads) {
    if (!partsByName.has(load.part)) {
      diagnostics.push({
        code: 'assembly.physical-use-case.part-missing',
        severity: 'error',
        useCaseName: useCase.name,
        role: 'load',
        partName: load.part,
        message: `Physical use case '${useCase.name}' load references missing part '${load.part}'.`,
        hint: `physical-use-case.part-missing — declare arm.part('${load.part}', ...) or move the load to a real part.`,
      });
    }
    if (!hasNonZeroVec(load.force) && !hasNonZeroVec(load.torque)) {
      diagnostics.push({
        code: 'assembly.physical-use-case.zero-load',
        severity: 'error',
        useCaseName: useCase.name,
        partName: load.part,
        message: `Physical use case '${useCase.name}' load on '${load.part}' has zero force and zero torque.`,
        hint: 'physical-use-case.zero-load — specify force or torque as a finite non-zero Vec3.',
      });
    }
  }
  return diagnostics;
}

export function reviewUseCaseContacts(
  useCase: PhysicalUseCaseRecord,
  poseEnvelope: PoseEnvelopeReviewResult | undefined,
  partsByName: PartConnectorIndex,
): PhysicalUseCaseDiagnostic[] {
  const diagnostics: PhysicalUseCaseDiagnostic[] = [];

  if (useCase.contacts.length === 0) {
    diagnostics.push({
      code: 'assembly.physical-use-case.contact-invalid',
      severity: 'error',
      useCaseName: useCase.name,
      message: `Physical use case '${useCase.name}' declares no contacts.`,
      hint: 'physical-use-case.contact-invalid — add at least one contact with two connector refs, a normal, and positive friction.',
    });
  }
  for (const contact of useCase.contacts) {
    const badRef = !connectorExists(contact.a, partsByName) ? contact.a : !connectorExists(contact.b, partsByName) ? contact.b : undefined;
    if (
      badRef !== undefined ||
      !hasNonZeroVec(contact.normal) ||
      !Number.isFinite(contact.friction) ||
      contact.friction <= 0 ||
      (contact.normalForceN !== undefined && (!Number.isFinite(contact.normalForceN) || contact.normalForceN <= 0))
    ) {
      diagnostics.push({
        code: 'assembly.physical-use-case.contact-invalid',
        severity: 'error',
        useCaseName: useCase.name,
        contactRef: badRef,
        message: `Physical use case '${useCase.name}' has an invalid contact declaration.`,
        hint: 'physical-use-case.contact-invalid — contact refs must name existing connectors, normal must be a finite non-zero Vec3, friction must be > 0, and normalForceN must be > 0 when declared.',
      });
      continue;
    }

    reviewContactReachability(useCase, contact, poseEnvelope, diagnostics);
  }
  return diagnostics;
}

function reviewContactReachability(
  useCase: PhysicalUseCaseRecord,
  contact: PhysicalUseCaseContact,
  poseEnvelope: PoseEnvelopeReviewResult | undefined,
  diagnostics: PhysicalUseCaseDiagnostic[],
): void {
  if (poseEnvelope === undefined) return;
  const toleranceMm = useCase.criteria?.maxSlipMm ?? 0;
  const minDistanceMm = minContactDistanceMm(poseEnvelope.connectorPoses, contact.a, contact.b);
  if (minDistanceMm === undefined || minDistanceMm > toleranceMm) {
    diagnostics.push({
      code: 'assembly.physical-use-case.contact-unreachable',
      severity: 'error',
      useCaseName: useCase.name,
      contactA: contact.a,
      contactB: contact.b,
      ...(minDistanceMm === undefined ? {} : { minDistanceMm }),
      toleranceMm,
      message: minDistanceMm === undefined
        ? `Physical use case '${useCase.name}' contact '${contact.a}' to '${contact.b}' could not be checked in the sampled pose envelope.`
        : `Physical use case '${useCase.name}' contact '${contact.a}' to '${contact.b}' never gets within ${toleranceMm.toFixed(2)} mm; closest sampled distance is ${minDistanceMm.toFixed(2)} mm.`,
      hint: minDistanceMm === undefined
        ? `physical-use-case.contact-unreachable — ensure '${contact.a}' and '${contact.b}' use numeric vec3 connector origins and are included in pose-envelope tracking.`
        : `physical-use-case.contact-unreachable — move the contact connectors, widen mate travel, or revise the use case so '${contact.a}' can reach '${contact.b}' within maxSlipMm ${toleranceMm.toFixed(2)}.`,
    });
  }
}

export function reviewUseCaseActuatorLimits(
  useCase: PhysicalUseCaseRecord,
  hasArticulatedMate: boolean,
  matesByName: MateIndex,
  mechanicallySupportedMates: ReadonlySet<string>,
): PhysicalUseCaseDiagnostic[] {
  const diagnostics: PhysicalUseCaseDiagnostic[] = [];

  if (hasArticulatedMate && useCase.actuatorLimits.length === 0) {
    diagnostics.push({
      code: 'assembly.physical-use-case.actuator-limit-invalid',
      severity: 'error',
      useCaseName: useCase.name,
      mateName: '',
      message: `Physical use case '${useCase.name}' has no actuator torque limits for an articulated assembly.`,
      hint: 'physical-use-case.actuator-limit-invalid — add actuatorLimits naming driven mates and positive maxTorqueNmm values.',
    });
  }
  for (const limit of useCase.actuatorLimits) {
    const mate = matesByName.get(limit.mate);
    if (mate === undefined || !Number.isFinite(limit.maxTorqueNmm) || limit.maxTorqueNmm <= 0) {
      diagnostics.push({
        code: 'assembly.physical-use-case.actuator-limit-invalid',
        severity: 'error',
        useCaseName: useCase.name,
        mateName: limit.mate,
        message: `Physical use case '${useCase.name}' has an invalid actuator limit for mate '${limit.mate}'.`,
        hint: 'physical-use-case.actuator-limit-invalid — actuatorLimits must reference an existing mate and maxTorqueNmm must be > 0.',
      });
      continue;
    }
    if (mate.type !== 'fastened' && !mechanicallySupportedMates.has(limit.mate)) {
      diagnostics.push({
        code: 'assembly.physical-use-case.actuator-support-missing',
        severity: 'error',
        useCaseName: useCase.name,
        mateName: limit.mate,
        message: `Physical use case '${useCase.name}' declares actuator torque for mate '${limit.mate}' but no mechanicalJoint(...) support contract backs that driven joint.`,
        hint: `physical-use-case.actuator-support-missing — add arm.mechanicalJoint(name, { mate: '${limit.mate}', actuator, shaft, supports, output }) with real support geometry, or remove '${limit.mate}' from actuatorLimits until the joint is physically grounded.`,
      });
    }
  }
  return diagnostics;
}

function minContactDistanceMm(
  poses: readonly TrackedConnectorPose[],
  aRef: string,
  bRef: string,
): number | undefined {
  const bySample = new Map<string, Map<string, Vec3>>();
  for (const pose of poses) {
    let sample = bySample.get(pose.sampleName);
    if (!sample) {
      sample = new Map<string, Vec3>();
      bySample.set(pose.sampleName, sample);
    }
    sample.set(pose.ref, pose.world);
  }

  let min: number | undefined;
  for (const sample of bySample.values()) {
    const a = sample.get(aRef);
    const b = sample.get(bRef);
    if (!a || !b) continue;
    const distance = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    min = min === undefined ? distance : Math.min(min, distance);
  }
  return min;
}
