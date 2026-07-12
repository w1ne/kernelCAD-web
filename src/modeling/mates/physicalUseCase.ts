// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { Assembly } from '../capture/assembly';
import type { Vec3 } from '../../shared/intent/types';
import type { PoseEnvelopeReviewResult, TrackedConnectorPose } from './poseEnvelope';
import { parseConnectorRef } from './mate';
import { assessPhysicalUseCaseReachability } from './physicalUseCaseReachability';
import {
  DEFAULT_FORCE_RESIDUAL_N,
  DEFAULT_TORQUE_RESIDUAL_NMM,
  reviewPhysicalUseCaseStatics,
  type PhysicalUseCaseStaticActuatorTorqueEvidence,
  type PhysicalUseCaseStaticCertificate,
} from './physicalUseCaseStatics';
import {
  reviewPhysicalUseCaseJointReactions,
  type PhysicalUseCaseJointReactionCertificate,
} from './physicalUseCaseJointReactions';
import {
  reviewJointReactionCapacity,
  type JointReactionCapacityEvidence,
} from './physicalUseCaseJointCapacity';
import {
  DEFAULT_MIN_JOINT_SAFETY_FACTOR,
  reviewClevisJointStructure,
  type ClevisJointStructureReview,
} from './clevisJointStructure';

export interface PhysicalUseCaseLoad {
  readonly part: string;
  /** Connector on part where force is applied. Required for non-zero force. */
  readonly at?: string;
  /** World-frame force in Newtons. */
  readonly force?: readonly [number, number, number];
  /** World-frame pure couple in Newton-millimetres. */
  readonly torque?: readonly [number, number, number];
}

export type PhysicalUseCaseContactNormalFrame = 'world' | 'a' | 'b';

export interface PhysicalUseCaseContact {
  readonly a: string;
  readonly b: string;
  readonly normal: readonly [number, number, number];
  readonly normalFrame?: PhysicalUseCaseContactNormalFrame;
  readonly friction: number;
  readonly normalForceN?: number;
}

export interface PhysicalUseCaseActuatorLimit {
  readonly mate: string;
  readonly maxTorqueNmm: number;
}

export interface PhysicalUseCaseCriteria {
  readonly maxSlipMm?: number;
  readonly settleTimeMs?: number;
  readonly maxForceResidualN?: number;
  readonly maxTorqueResidualNmm?: number;
  readonly minJointSafetyFactor?: number;
}

export interface PhysicalUseCaseOptions {
  readonly stableParts?: readonly string[];
  readonly loads?: readonly PhysicalUseCaseLoad[];
  readonly contacts?: readonly PhysicalUseCaseContact[];
  readonly actuatorLimits?: readonly PhysicalUseCaseActuatorLimit[];
  readonly criteria?: PhysicalUseCaseCriteria;
}

export interface PhysicalUseCaseRecord {
  readonly name: string;
  readonly stableParts: readonly string[];
  readonly loads: readonly PhysicalUseCaseLoad[];
  readonly contacts: readonly PhysicalUseCaseContact[];
  readonly actuatorLimits: readonly PhysicalUseCaseActuatorLimit[];
  readonly criteria?: PhysicalUseCaseCriteria;
}

export type PhysicalUseCaseDiagnostic =
  | PhysicalUseCaseMissingDiagnostic
  | PhysicalUseCasePartMissingDiagnostic
  | PhysicalUseCaseZeroLoadDiagnostic
  | PhysicalUseCaseLoadPathMissingDiagnostic
  | PhysicalUseCaseContactForceInsufficientDiagnostic
  | PhysicalUseCaseTorqueInsufficientDiagnostic
  | PhysicalUseCaseContactInvalidDiagnostic
  | PhysicalUseCaseContactUnreachableDiagnostic
  | PhysicalUseCaseSimultaneousContactsUnreachableDiagnostic
  | PhysicalUseCaseStaticInputIncompleteDiagnostic
  | PhysicalUseCaseStaticEquilibriumUnmetDiagnostic
  | PhysicalUseCaseStaticActuatorTorqueInsufficientDiagnostic
  | PhysicalUseCaseJointReactionInputIncompleteDiagnostic
  | PhysicalUseCaseJointReactionIndeterminateDiagnostic
  | PhysicalUseCaseJointCapacityUndeclaredDiagnostic
  | PhysicalUseCaseJointCapacityExceededDiagnostic
  | PhysicalUseCaseJointStructureInputIncompleteDiagnostic
  | PhysicalUseCaseJointStructureUnsupportedLoadCaseDiagnostic
  | PhysicalUseCaseJointStructureInsufficientDiagnostic
  | PhysicalUseCaseActuatorSupportMissingDiagnostic
  | PhysicalUseCaseActuatorLimitInvalidDiagnostic;

interface PhysicalUseCaseDiagnosticBase {
  readonly severity: 'error';
  readonly useCaseName?: string;
  readonly message: string;
  readonly hint: string;
}

export interface PhysicalUseCaseMissingDiagnostic extends PhysicalUseCaseDiagnosticBase {
  readonly code: 'assembly.physical-use-case.missing';
}

export interface PhysicalUseCasePartMissingDiagnostic extends PhysicalUseCaseDiagnosticBase {
  readonly code: 'assembly.physical-use-case.part-missing';
  readonly partName: string;
  readonly role: 'stablePart' | 'load';
}

export interface PhysicalUseCaseZeroLoadDiagnostic extends PhysicalUseCaseDiagnosticBase {
  readonly code: 'assembly.physical-use-case.zero-load';
  readonly partName: string;
}

export interface PhysicalUseCaseLoadPathMissingDiagnostic extends PhysicalUseCaseDiagnosticBase {
  readonly code: 'assembly.physical-use-case.load-path-missing';
  readonly loadPart: string;
  readonly stableParts: readonly string[];
}

export interface PhysicalUseCaseContactForceInsufficientDiagnostic extends PhysicalUseCaseDiagnosticBase {
  readonly code: 'assembly.physical-use-case.contact-force-insufficient';
  readonly loadPart: string;
  readonly requiredForceN: number;
  readonly availableForceN: number;
}

export interface PhysicalUseCaseTorqueInsufficientDiagnostic extends PhysicalUseCaseDiagnosticBase {
  readonly code: 'assembly.physical-use-case.torque-insufficient';
  readonly mateName: string;
  readonly loadPart: string;
  readonly requiredTorqueNmm: number;
  readonly maxTorqueNmm: number;
}

export interface PhysicalUseCaseContactInvalidDiagnostic extends PhysicalUseCaseDiagnosticBase {
  readonly code: 'assembly.physical-use-case.contact-invalid';
  readonly contactRef?: string;
}

export interface PhysicalUseCaseContactUnreachableDiagnostic extends PhysicalUseCaseDiagnosticBase {
  readonly code: 'assembly.physical-use-case.contact-unreachable';
  readonly contactA: string;
  readonly contactB: string;
  readonly minDistanceMm?: number;
  readonly toleranceMm: number;
}

export interface PhysicalUseCaseSimultaneousContactsUnreachableDiagnostic extends PhysicalUseCaseDiagnosticBase {
  readonly code: 'assembly.physical-use-case.simultaneous-contacts-unreachable';
  readonly toleranceMm: number;
  readonly bestMaxDistanceMm?: number;
  readonly contactDistances: readonly {
    readonly contactA: string;
    readonly contactB: string;
    readonly distanceMm?: number;
  }[];
}

export interface PhysicalUseCaseActuatorLimitInvalidDiagnostic extends PhysicalUseCaseDiagnosticBase {
  readonly code: 'assembly.physical-use-case.actuator-limit-invalid';
  readonly mateName: string;
}

export interface PhysicalUseCaseActuatorSupportMissingDiagnostic extends PhysicalUseCaseDiagnosticBase {
  readonly code: 'assembly.physical-use-case.actuator-support-missing';
  readonly mateName: string;
}

export interface PhysicalUseCaseStaticInputIncompleteDiagnostic extends PhysicalUseCaseDiagnosticBase {
  readonly code: 'assembly.physical-use-case.static-input-incomplete';
}

export interface PhysicalUseCaseStaticEquilibriumUnmetDiagnostic extends PhysicalUseCaseDiagnosticBase {
  readonly code: 'assembly.physical-use-case.static-equilibrium-unmet';
  readonly bestPoses?: import('../capture/forwardKinematics').NumericPoses;
  readonly bestForceResidualN?: number;
  readonly bestTorqueResidualNmm?: number;
}

export interface PhysicalUseCaseStaticActuatorTorqueInsufficientDiagnostic extends PhysicalUseCaseDiagnosticBase {
  readonly code: 'assembly.physical-use-case.static-actuator-torque-insufficient';
  readonly bestPoses?: import('../capture/forwardKinematics').NumericPoses;
  readonly actuatorTorques: readonly PhysicalUseCaseStaticActuatorTorqueEvidence[];
}

export interface PhysicalUseCaseJointReactionInputIncompleteDiagnostic extends PhysicalUseCaseDiagnosticBase {
  readonly code: 'assembly.physical-use-case.joint-reaction-input-incomplete';
}

export interface PhysicalUseCaseJointReactionIndeterminateDiagnostic extends PhysicalUseCaseDiagnosticBase {
  readonly code: 'assembly.physical-use-case.joint-reaction-indeterminate';
}

export interface PhysicalUseCaseJointCapacityUndeclaredDiagnostic extends PhysicalUseCaseDiagnosticBase {
  readonly code: 'assembly.physical-use-case.joint-capacity-undeclared';
  readonly mateName: string;
  readonly evidence: JointReactionCapacityEvidence;
}

export interface PhysicalUseCaseJointCapacityExceededDiagnostic extends PhysicalUseCaseDiagnosticBase {
  readonly code: 'assembly.physical-use-case.joint-capacity-exceeded';
  readonly mateName: string;
  readonly evidence: JointReactionCapacityEvidence;
}

export interface PhysicalUseCaseJointStructureInputIncompleteDiagnostic extends PhysicalUseCaseDiagnosticBase {
  readonly code: 'assembly.physical-use-case.joint-structure-input-incomplete';
  readonly mateName: string;
  readonly review?: ClevisJointStructureReview;
}

export interface PhysicalUseCaseJointStructureUnsupportedLoadCaseDiagnostic extends PhysicalUseCaseDiagnosticBase {
  readonly code: 'assembly.physical-use-case.joint-structure-unsupported-load-case';
  readonly mateName: string;
  readonly review: ClevisJointStructureReview;
}

export interface PhysicalUseCaseJointStructureInsufficientDiagnostic extends PhysicalUseCaseDiagnosticBase {
  readonly code: 'assembly.physical-use-case.joint-structure-insufficient';
  readonly mateName: string;
  readonly review: ClevisJointStructureReview;
}

export interface PhysicalUseCaseJointStructuralCertificate {
  readonly useCaseName: string;
  readonly poses: import('../capture/forwardKinematics').NumericPoses;
  readonly joints: readonly {
    readonly mateName: string;
    readonly envelope: JointReactionCapacityEvidence;
    readonly structure?: ClevisJointStructureReview;
  }[];
}

export interface PhysicalUseCaseReviewResult {
  readonly diagnostics: readonly PhysicalUseCaseDiagnostic[];
  readonly checkedUseCaseCount: number;
  readonly staticCertificates: readonly PhysicalUseCaseStaticCertificate[];
  readonly jointReactionCertificates: readonly PhysicalUseCaseJointReactionCertificate[];
  readonly jointStructuralCertificates: readonly PhysicalUseCaseJointStructuralCertificate[];
}

export interface PhysicalUseCaseReviewOptions {
  readonly requirePhysicalUseCase?: boolean;
  readonly poseEnvelope?: PoseEnvelopeReviewResult;
  readonly includeReachability?: boolean;
  readonly includeStatics?: boolean;
  readonly includeJointReactions?: boolean;
  readonly includeJointStructure?: boolean;
  readonly reachabilitySamplesPerMate?: number;
}

export function makePhysicalUseCaseRecord(
  name: string,
  opts: PhysicalUseCaseOptions,
): PhysicalUseCaseRecord {
  if (typeof name !== 'string' || name.trim() === '') {
    throw new Error('assembly.physicalUseCase: name must be a non-empty string.');
  }
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
  for (const [field, value, maximum] of [
    ['maxForceResidualN', opts.criteria?.maxForceResidualN, DEFAULT_FORCE_RESIDUAL_N],
    ['maxTorqueResidualNmm', opts.criteria?.maxTorqueResidualNmm, DEFAULT_TORQUE_RESIDUAL_NMM],
  ] as const) {
    if (value !== undefined && (!Number.isFinite(value) || value <= 0)) {
      throw new Error(`assembly.physicalUseCase: criteria.${field} must be a positive finite number.`);
    }
    if (value !== undefined && value > maximum) {
      throw new Error(`assembly.physicalUseCase: criteria.${field} cannot exceed ${maximum}.`);
    }
  }
  const minJointSafetyFactor = opts.criteria?.minJointSafetyFactor;
  if (
    minJointSafetyFactor !== undefined &&
    (!Number.isFinite(minJointSafetyFactor) || minJointSafetyFactor < DEFAULT_MIN_JOINT_SAFETY_FACTOR)
  ) {
    throw new Error(
      `assembly.physicalUseCase: criteria.minJointSafetyFactor must be finite and at least ${DEFAULT_MIN_JOINT_SAFETY_FACTOR}.`,
    );
  }
  return {
    name,
    stableParts: [...(opts.stableParts ?? [])],
    loads: (opts.loads ?? []).map((load) => ({
      part: load.part,
      ...(load.at === undefined ? {} : { at: load.at }),
      ...(load.force === undefined ? {} : { force: copyVec3(load.force) }),
      ...(load.torque === undefined ? {} : { torque: copyVec3(load.torque) }),
    })),
    contacts: (opts.contacts ?? []).map((contact) => ({
      a: contact.a,
      b: contact.b,
      normal: copyVec3(contact.normal),
      ...(contact.normalFrame === undefined ? {} : { normalFrame: contact.normalFrame }),
      friction: contact.friction,
      ...(contact.normalForceN === undefined ? {} : { normalForceN: contact.normalForceN }),
    })),
    actuatorLimits: (opts.actuatorLimits ?? []).map((limit) => ({
      mate: limit.mate,
      maxTorqueNmm: limit.maxTorqueNmm,
    })),
    ...(opts.criteria === undefined ? {} : { criteria: { ...opts.criteria } }),
  };
}

export function reviewPhysicalUseCases(
  arm: Assembly,
  opts: { requirePhysicalUseCase?: boolean; poseEnvelope?: PoseEnvelopeReviewResult } = {},
): PhysicalUseCaseReviewResult {
  const useCases = arm.__physicalUseCases();
  const diagnostics: PhysicalUseCaseDiagnostic[] = [];
  const partsByName = new Map(arm.__parts().map((part) => [part.name, part]));
  const matesByName = new Map(arm.__mates().map((mate) => [mate.name, mate]));
  const mechanicallySupportedMates = new Set(arm.__mechanicalJointIntents().map((intent) => intent.mate));
  const hasArticulatedMate = arm.__mates().some((mate) => mate.type !== 'fastened');

  if (opts.requirePhysicalUseCase === true && useCases.length === 0 && hasArticulatedMate) {
    diagnostics.push({
      code: 'assembly.physical-use-case.missing',
      severity: 'error',
      message: 'Assembly has articulated mates but no declared physical use case.',
      hint: 'physical-use-case.missing — add arm.physicalUseCase(name, { loads, contacts, actuatorLimits, stableParts }) so review can check physical task evidence, not just geometry.',
    });
  }

  for (const useCase of useCases) {
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

      if (opts.poseEnvelope !== undefined) {
        const toleranceMm = useCase.criteria?.maxSlipMm ?? 0;
        const minDistanceMm = minContactDistanceMm(opts.poseEnvelope.connectorPoses, contact.a, contact.b);
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
    }

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

    diagnostics.push(...reviewLoadPaths(arm, useCase, partsByName));
    diagnostics.push(...reviewContactForceCapacity(useCase, partsByName));
    diagnostics.push(...reviewTorqueLimits(useCase, partsByName, matesByName));
  }

  return {
    diagnostics,
    checkedUseCaseCount: useCases.length,
    staticCertificates: [],
    jointReactionCertificates: [],
    jointStructuralCertificates: [],
  };
}

export async function reviewPhysicalUseCasesWithReachability(
  arm: Assembly,
  opts: PhysicalUseCaseReviewOptions = {},
): Promise<PhysicalUseCaseReviewResult> {
  const base = reviewPhysicalUseCases(arm, opts);
  const includeJointReactions = opts.includeJointReactions === true || opts.includeJointStructure === true;
  const includeStatics = opts.includeStatics === true || includeJointReactions;
  const includeReachability = opts.includeReachability === true || includeStatics;
  if (!includeReachability) return base;

  const diagnostics: PhysicalUseCaseDiagnostic[] = [...base.diagnostics];
  const staticCertificates: PhysicalUseCaseStaticCertificate[] = [];
  const jointReactionCertificates: PhysicalUseCaseJointReactionCertificate[] = [];
  const jointStructuralCertificates: PhysicalUseCaseJointStructuralCertificate[] = [];
  const existingUnreachableContacts = new Set(
    base.diagnostics
      .filter((diagnostic): diagnostic is PhysicalUseCaseContactUnreachableDiagnostic =>
        diagnostic.code === 'assembly.physical-use-case.contact-unreachable')
      .map((diagnostic) => unreachableContactKey(diagnostic.useCaseName, diagnostic.contactA, diagnostic.contactB)),
  );
  for (const useCase of arm.__physicalUseCases()) {
    const assessment = await assessPhysicalUseCaseReachability(arm, useCase, {
      samplesPerMate: opts.reachabilitySamplesPerMate,
    });
    for (const issue of assessment.findings) {
      if (!('contactA' in issue)) {
        diagnostics.push({
          code: 'assembly.physical-use-case.simultaneous-contacts-unreachable',
          severity: 'error',
          useCaseName: issue.useCaseName,
          toleranceMm: issue.toleranceMm,
          ...(issue.bestMaxDistanceMm === undefined ? {} : { bestMaxDistanceMm: issue.bestMaxDistanceMm }),
          contactDistances: issue.contactDistances,
          message: issue.bestMaxDistanceMm === undefined
            ? `Physical use case '${issue.useCaseName}' has no solved targeted actuator sample where all ${issue.contactDistances.length} contacts can be checked together.`
            : `Physical use case '${issue.useCaseName}' has no single targeted actuator sample that satisfies all ${issue.contactDistances.length} contacts within ${issue.toleranceMm.toFixed(2)} mm; the best sample's worst contact is ${issue.bestMaxDistanceMm.toFixed(2)} mm away.`,
          hint: 'physical-use-case.simultaneous-contacts-unreachable — revise mate couplings, contact geometry, or actuator ranges until one sampled mechanism state satisfies every declared contact; independent per-contact poses do not form a grasp.',
        });
        continue;
      }
      if (existingUnreachableContacts.has(unreachableContactKey(issue.useCaseName, issue.contactA, issue.contactB))) continue;
      diagnostics.push({
        code: 'assembly.physical-use-case.contact-unreachable',
        severity: 'error',
        useCaseName: issue.useCaseName,
        contactA: issue.contactA,
        contactB: issue.contactB,
        ...(issue.minDistanceMm === undefined ? {} : { minDistanceMm: issue.minDistanceMm }),
        toleranceMm: issue.toleranceMm,
        message: issue.minDistanceMm === undefined
          ? `Physical use case '${issue.useCaseName}' contact '${issue.contactA}' to '${issue.contactB}' could not be checked by targeted actuator sampling.`
          : `Physical use case '${issue.useCaseName}' contact '${issue.contactA}' to '${issue.contactB}' cannot be reached by the declared actuator limits; closest targeted sample is ${issue.minDistanceMm.toFixed(2)} mm away with tolerance ${issue.toleranceMm.toFixed(2)} mm.`,
        hint: `physical-use-case.contact-unreachable — repair the target connector, move '${issue.contactA}' or '${issue.contactB}', or widen the declared actuatorLimits so the contact can get within maxSlipMm ${issue.toleranceMm.toFixed(2)}.`,
      });
    }

    if (!includeStatics || assessment.findings.length > 0) continue;
    const statics = await reviewPhysicalUseCaseStatics(arm, useCase, assessment.commonPoseSamples);
    staticCertificates.push(...statics.certificates);
    for (const issue of statics.issues) {
      if (issue.kind === 'static-input-incomplete') {
        diagnostics.push({
          code: 'assembly.physical-use-case.static-input-incomplete',
          severity: 'error',
          useCaseName: issue.useCaseName,
          message: `Physical use case '${issue.useCaseName}' cannot run pose-bound static review: ${issue.message}`,
          hint: 'physical-use-case.static-input-incomplete - add explicit load application connectors, contact capacities and frames, finite revolute limits, and transmission evidence for every coupled joint.',
        });
        continue;
      }
      if (issue.kind === 'static-equilibrium-unmet') {
        diagnostics.push({
          code: 'assembly.physical-use-case.static-equilibrium-unmet',
          severity: 'error',
          useCaseName: issue.useCaseName,
          ...(issue.bestPoses === undefined ? {} : { bestPoses: issue.bestPoses }),
          ...(issue.bestForceResidualN === undefined ? {} : { bestForceResidualN: issue.bestForceResidualN }),
          ...(issue.bestTorqueResidualNmm === undefined ? {} : { bestTorqueResidualNmm: issue.bestTorqueResidualNmm }),
          message: `Physical use case '${issue.useCaseName}' has no verified contact-force allocation that balances force and moment at a sampled common-contact pose.`,
          hint: 'physical-use-case.static-equilibrium-unmet - revise contact locations/normals, friction, force capacity, or the applied load. This sampled linearized failure is not a proof of analytical impossibility.',
        });
        continue;
      }
      diagnostics.push({
        code: 'assembly.physical-use-case.static-actuator-torque-insufficient',
        severity: 'error',
        useCaseName: issue.useCaseName,
        ...(issue.bestPoses === undefined ? {} : { bestPoses: issue.bestPoses }),
        actuatorTorques: issue.actuatorTorques,
        message: `Physical use case '${issue.useCaseName}' can balance its held-object wrench, but no verified sampled allocation stays within every actuator torque limit.`,
        hint: 'physical-use-case.static-actuator-torque-insufficient - increase real actuator/transmission capacity, shorten moment arms, reduce the load, or redesign contact placement without weakening the gate.',
      });
    }

    if (!includeJointReactions) continue;
    for (const certificate of statics.certificates) {
      const jointReview = await reviewCertifiedJointLoads(
        arm,
        useCase,
        certificate,
        opts.includeJointStructure === true,
      );
      diagnostics.push(...jointReview.diagnostics);
      jointReactionCertificates.push(...jointReview.reactionCertificates);
      jointStructuralCertificates.push(...jointReview.structuralCertificates);
    }
  }

  return {
    diagnostics,
    checkedUseCaseCount: base.checkedUseCaseCount,
    staticCertificates,
    jointReactionCertificates,
    jointStructuralCertificates,
  };
}

async function reviewCertifiedJointLoads(
  arm: Assembly,
  useCase: PhysicalUseCaseRecord,
  staticCertificate: PhysicalUseCaseStaticCertificate,
  includeStructure: boolean,
): Promise<{
  diagnostics: PhysicalUseCaseDiagnostic[];
  reactionCertificates: PhysicalUseCaseJointReactionCertificate[];
  structuralCertificates: PhysicalUseCaseJointStructuralCertificate[];
}> {
  const diagnostics: PhysicalUseCaseDiagnostic[] = [];
  const reactions = await reviewPhysicalUseCaseJointReactions(arm, useCase, staticCertificate);
  for (const issue of reactions.issues) {
    diagnostics.push({
      code: issue.kind === 'joint-reaction-input-incomplete'
        ? 'assembly.physical-use-case.joint-reaction-input-incomplete'
        : 'assembly.physical-use-case.joint-reaction-indeterminate',
      severity: 'error',
      useCaseName: issue.useCaseName,
      message: `Physical use case '${issue.useCaseName}' cannot derive determinate pose-bound joint reactions: ${issue.message}`,
      hint: issue.kind === 'joint-reaction-input-incomplete'
        ? 'physical-use-case.joint-reaction-input-incomplete - preserve the exact passing contact certificate, solved pose, contact points, loads, and connector frames.'
        : 'physical-use-case.joint-reaction-indeterminate - use one stable root and a tree load path, or provide a future stiffness model for loops and multiple supports.',
    });
  }

  const matesByName = new Map(arm.__mates().map((mate) => [mate.name, mate]));
  const structuralCertificates: PhysicalUseCaseJointStructuralCertificate[] = [];
  for (const certificate of reactions.certificates) {
    const joints: PhysicalUseCaseJointStructuralCertificate['joints'][number][] = [];
    for (const reaction of certificate.reactions) {
      const mate = matesByName.get(reaction.mateName);
      if (mate === undefined) {
        diagnostics.push({
          code: 'assembly.physical-use-case.joint-reaction-input-incomplete',
          severity: 'error',
          useCaseName: useCase.name,
          message: `Physical use case '${useCase.name}' reaction references missing mate '${reaction.mateName}'.`,
          hint: 'physical-use-case.joint-reaction-input-incomplete - regenerate reaction evidence from the current assembly mate graph.',
        });
        continue;
      }

      const envelope = reviewJointReactionCapacity(mate, reaction);
      if (envelope.status === 'undeclared') {
        diagnostics.push({
          code: 'assembly.physical-use-case.joint-capacity-undeclared',
          severity: 'error',
          useCaseName: useCase.name,
          mateName: mate.name,
          evidence: envelope,
          message: `Physical use case '${useCase.name}' derives a reaction at mate '${mate.name}', but the mate has no complete resultant force and moment envelope.`,
          hint: `physical-use-case.joint-capacity-undeclared - add capacity.envelope with positive maxResultantForceN and maxResultantMomentNmm to mate '${mate.name}'. A declaration is a rating check, not structural proof.`,
        });
      } else if (envelope.status === 'exceeded') {
        diagnostics.push({
          code: 'assembly.physical-use-case.joint-capacity-exceeded',
          severity: 'error',
          useCaseName: useCase.name,
          mateName: mate.name,
          evidence: envelope,
          message: `Physical use case '${useCase.name}' reaction at mate '${mate.name}' exceeds its declared resultant capacity envelope.`,
          hint: `physical-use-case.joint-capacity-exceeded - increase real rated joint capacity or redesign the load path; do not raise the declaration without physical evidence.`,
        });
      }

      let structure: ClevisJointStructureReview | undefined;
      if (includeStructure) {
        if (mate.capacity?.structure === undefined) {
          diagnostics.push({
            code: 'assembly.physical-use-case.joint-structure-input-incomplete',
            severity: 'error',
            useCaseName: useCase.name,
            mateName: mate.name,
            message: `Physical use case '${useCase.name}' has no geometry/material structural descriptor for mate '${mate.name}'.`,
            hint: `physical-use-case.joint-structure-input-incomplete - build '${mate.name}' with joint.clevis(...), declare pin/fork/tongue engineering materials, and attach clevis.structural as capacity.structure.`,
          });
        } else {
          structure = reviewClevisJointStructure({
            reaction,
            model: mate.capacity.structure,
            minSafetyFactor: useCase.criteria?.minJointSafetyFactor,
          });
          if (structure.status === 'input-incomplete') {
            diagnostics.push({
              code: 'assembly.physical-use-case.joint-structure-input-incomplete',
              severity: 'error',
              useCaseName: useCase.name,
              mateName: mate.name,
              review: structure,
              message: `Physical use case '${useCase.name}' cannot derive clevis strength for mate '${mate.name}': ${structure.message ?? 'structural input is incomplete'}`,
              hint: `physical-use-case.joint-structure-input-incomplete - use the unmodified joint.clevis structural descriptor with explicit valid materials and geometry.`,
            });
          } else if (structure.status === 'unsupported-load-case') {
            diagnostics.push({
              code: 'assembly.physical-use-case.joint-structure-unsupported-load-case',
              severity: 'error',
              useCaseName: useCase.name,
              mateName: mate.name,
              review: structure,
              message: `Physical use case '${useCase.name}' reaction at mate '${mate.name}' is outside the clevis v1 load model: ${structure.message ?? 'unsupported load component'}`,
              hint: `physical-use-case.joint-structure-unsupported-load-case - add explicit thrust/moment load-path geometry or use a later structural model; the current gate will not silently omit this component.`,
            });
          } else if (structure.status === 'failed') {
            diagnostics.push({
              code: 'assembly.physical-use-case.joint-structure-insufficient',
              severity: 'error',
              useCaseName: useCase.name,
              mateName: mate.name,
              review: structure,
              message: `Physical use case '${useCase.name}' clevis at mate '${mate.name}' is below minimum factor of safety ${structure.minSafetyFactor}.`,
              hint: `physical-use-case.joint-structure-insufficient - increase real pin/ligament/bearing dimensions, select stronger declared materials, reduce load, or redesign the load path.`,
            });
          }
        }
      }

      joints.push({
        mateName: mate.name,
        envelope,
        ...(structure === undefined ? {} : { structure }),
      });
    }
    if (includeStructure) {
      structuralCertificates.push({
        useCaseName: useCase.name,
        poses: certificate.poses,
        joints,
      });
    }
  }
  return {
    diagnostics,
    reactionCertificates: [...reactions.certificates],
    structuralCertificates,
  };
}

function copyVec3(v: readonly [number, number, number]): [number, number, number] {
  return [v[0], v[1], v[2]];
}

function unreachableContactKey(useCaseName: string | undefined, contactA: string, contactB: string): string {
  return `${useCaseName ?? ''}\n${contactA}\n${contactB}`;
}

function hasNonZeroVec(v: readonly number[] | undefined): v is Vec3 {
  return Array.isArray(v) && v.length === 3 && v.every((n) => Number.isFinite(n)) && Math.hypot(v[0], v[1], v[2]) > 0;
}

function connectorExists(ref: string, partsByName: ReadonlyMap<string, { mateConnectors: readonly { name: string }[] }>): boolean {
  try {
    const parsed = parseConnectorRef(ref);
    const part = partsByName.get(parsed.partName);
    return part?.mateConnectors.some((connector) => connector.name === parsed.connectorName) ?? false;
  } catch {
    return false;
  }
}

function reviewLoadPaths(
  arm: Assembly,
  useCase: PhysicalUseCaseRecord,
  partsByName: ReadonlyMap<string, { mateConnectors: readonly { name: string }[] }>,
): PhysicalUseCaseLoadPathMissingDiagnostic[] {
  const stableParts = useCase.stableParts.filter((partName) => partsByName.has(partName));
  const graph = buildLoadPathGraph(arm, useCase, partsByName);
  const diagnostics: PhysicalUseCaseLoadPathMissingDiagnostic[] = [];

  for (const load of useCase.loads) {
    if (!partsByName.has(load.part)) continue;
    if (stableParts.length > 0 && reachesAnyStablePart(graph, load.part, stableParts)) continue;
    diagnostics.push({
      code: 'assembly.physical-use-case.load-path-missing',
      severity: 'error',
      useCaseName: useCase.name,
      loadPart: load.part,
      stableParts,
      message: stableParts.length === 0
        ? `Physical use case '${useCase.name}' load on '${load.part}' has no valid stable part to react it.`
        : `Physical use case '${useCase.name}' load on '${load.part}' has no mate/contact path to stable part(s): ${stableParts.join(', ')}.`,
      hint: stableParts.length === 0
        ? 'physical-use-case.load-path-missing — add at least one existing stableParts entry, or move the load onto a part already grounded by the task.'
        : `physical-use-case.load-path-missing — connect '${load.part}' to ${stableParts.join(', ')} through mates or declared physical contacts so the applied load has a structural reaction path.`,
    });
  }

  return diagnostics;
}

function reviewTorqueLimits(
  useCase: PhysicalUseCaseRecord,
  partsByName: ReadonlyMap<string, { mateConnectors: readonly ConnectorLike[] }>,
  matesByName: ReadonlyMap<string, { name: string; a: string; b: string; type: string }>,
): PhysicalUseCaseTorqueInsufficientDiagnostic[] {
  const diagnostics: PhysicalUseCaseTorqueInsufficientDiagnostic[] = [];

  for (const limit of useCase.actuatorLimits) {
    const mate = matesByName.get(limit.mate);
    if (mate === undefined || (mate.type !== 'revolute' && mate.type !== 'cylindrical')) continue;
    if (!Number.isFinite(limit.maxTorqueNmm) || limit.maxTorqueNmm <= 0) continue;

    for (const load of useCase.loads) {
      const requiredTorqueNmm = estimateDirectMateTorqueNmm(mate, load, useCase.contacts, partsByName);
      if (requiredTorqueNmm === undefined || requiredTorqueNmm <= limit.maxTorqueNmm) continue;
      diagnostics.push({
        code: 'assembly.physical-use-case.torque-insufficient',
        severity: 'error',
        useCaseName: useCase.name,
        mateName: limit.mate,
        loadPart: load.part,
        requiredTorqueNmm,
        maxTorqueNmm: limit.maxTorqueNmm,
        message: `Physical use case '${useCase.name}' needs at least ${requiredTorqueNmm.toFixed(1)} Nmm at mate '${limit.mate}' for load on '${load.part}', but actuator limit is ${limit.maxTorqueNmm.toFixed(1)} Nmm.`,
        hint: `physical-use-case.torque-insufficient — increase actuatorLimits for '${limit.mate}', reduce the declared load, shorten the moment arm, or add a transmission/support path that reduces the torque demand below ${requiredTorqueNmm.toFixed(1)} Nmm.`,
      });
    }
  }

  return diagnostics;
}

function reviewContactForceCapacity(
  useCase: PhysicalUseCaseRecord,
  partsByName: ReadonlyMap<string, { mateConnectors: readonly ConnectorLike[] }>,
): PhysicalUseCaseContactForceInsufficientDiagnostic[] {
  const diagnostics: PhysicalUseCaseContactForceInsufficientDiagnostic[] = [];

  for (const load of useCase.loads) {
    if (!partsByName.has(load.part) || !hasNonZeroVec(load.force)) continue;
    const relevantContacts = useCase.contacts.filter((contact) => {
      if (contact.normalForceN === undefined || !isValidContactDeclaration(contact, partsByName)) return false;
      return safePartNameFromConnectorRef(contact.a) === load.part || safePartNameFromConnectorRef(contact.b) === load.part;
    });
    if (relevantContacts.length === 0) continue;

    const requiredForceN = Math.hypot(load.force[0], load.force[1], load.force[2]);
    const loadDirection = unit([-load.force[0], -load.force[1], -load.force[2]]);
    const availableForceN = relevantContacts.reduce(
      (sum, contact) => sum + projectedContactCapacityN(contact, loadDirection),
      0,
    );

    if (availableForceN + 1e-6 >= requiredForceN) continue;
    diagnostics.push({
      code: 'assembly.physical-use-case.contact-force-insufficient',
      severity: 'error',
      useCaseName: useCase.name,
      loadPart: load.part,
      requiredForceN,
      availableForceN,
      message: `Physical use case '${useCase.name}' declares ${availableForceN.toFixed(1)} N contact capacity for load on '${load.part}', but the applied force is ${requiredForceN.toFixed(1)} N.`,
      hint: `physical-use-case.contact-force-insufficient — increase declared normalForceN/friction, add more declared contacts on '${load.part}', or reduce the applied load below ${availableForceN.toFixed(1)} N.`,
    });
  }

  return diagnostics;
}

function projectedContactCapacityN(contact: PhysicalUseCaseContact, loadDirection: Vec3): number {
  const normalForceN = contact.normalForceN;
  if (normalForceN === undefined || !Number.isFinite(normalForceN) || normalForceN <= 0) return 0;
  const normal = unit(contact.normal);
  const normalAlignment = Math.max(0, dot(normal, loadDirection));
  const tangentialAlignment = Math.sqrt(Math.max(0, 1 - normalAlignment * normalAlignment));
  return normalForceN * normalAlignment + contact.friction * normalForceN * tangentialAlignment;
}

interface ConnectorLike {
  readonly name: string;
  readonly origin: { readonly kind: string; readonly value?: readonly number[] };
  readonly axis?: readonly [number, number, number];
}

function estimateDirectMateTorqueNmm(
  mate: { a: string; b: string },
  load: PhysicalUseCaseLoad,
  contacts: readonly PhysicalUseCaseContact[],
  partsByName: ReadonlyMap<string, { mateConnectors: readonly ConnectorLike[] }>,
): number | undefined {
  const axisRef = directMateConnectorForPart(mate, load.part);
  if (axisRef === undefined) return undefined;
  const axisConnector = connectorForRef(axisRef, partsByName);
  if (axisConnector?.origin.kind !== 'vec3' || axisConnector.axis === undefined) return undefined;

  const forceMoment = hasNonZeroVec(load.force)
    ? maxForceMomentFromContacts(load.part, load.force, contacts, axisConnector.origin.value as Vec3, axisConnector.axis, partsByName)
    : undefined;
  const directTorque = hasNonZeroVec(load.torque)
    ? Math.abs(dot(load.torque, unit(axisConnector.axis)))
    : undefined;

  const candidates = [forceMoment, directTorque].filter((value): value is number => value !== undefined);
  return candidates.length === 0 ? undefined : Math.max(...candidates);
}

function directMateConnectorForPart(
  mate: { a: string; b: string },
  partName: string,
): string | undefined {
  const a = safePartNameFromConnectorRef(mate.a);
  if (a === partName) return mate.a;
  const b = safePartNameFromConnectorRef(mate.b);
  if (b === partName) return mate.b;
  return undefined;
}

function maxForceMomentFromContacts(
  loadPart: string,
  force: readonly [number, number, number],
  contacts: readonly PhysicalUseCaseContact[],
  axisOrigin: Vec3,
  axis: readonly [number, number, number],
  partsByName: ReadonlyMap<string, { mateConnectors: readonly ConnectorLike[] }>,
): number | undefined {
  const axisUnit = unit(axis);
  let maxMoment: number | undefined;
  for (const contact of contacts) {
    const loadRef = safePartNameFromConnectorRef(contact.a) === loadPart
      ? contact.a
      : safePartNameFromConnectorRef(contact.b) === loadPart
        ? contact.b
        : undefined;
    if (loadRef === undefined) continue;
    const connector = connectorForRef(loadRef, partsByName);
    if (connector?.origin.kind !== 'vec3') continue;
    const point = connector.origin.value as Vec3;
    const r: Vec3 = [point[0] - axisOrigin[0], point[1] - axisOrigin[1], point[2] - axisOrigin[2]];
    const moment = Math.abs(dot(cross(r, force), axisUnit));
    maxMoment = maxMoment === undefined ? moment : Math.max(maxMoment, moment);
  }
  return maxMoment;
}

function connectorForRef(
  ref: string,
  partsByName: ReadonlyMap<string, { mateConnectors: readonly ConnectorLike[] }>,
): ConnectorLike | undefined {
  try {
    const parsed = parseConnectorRef(ref);
    return partsByName.get(parsed.partName)?.mateConnectors.find((connector) => connector.name === parsed.connectorName);
  } catch {
    return undefined;
  }
}

function buildLoadPathGraph(
  arm: Assembly,
  useCase: PhysicalUseCaseRecord,
  partsByName: ReadonlyMap<string, { mateConnectors: readonly { name: string }[] }>,
): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();
  for (const partName of partsByName.keys()) graph.set(partName, new Set<string>());

  const addEdge = (a: string, b: string): void => {
    graph.get(a)?.add(b);
    graph.get(b)?.add(a);
  };

  for (const mate of arm.__mates()) {
    const a = safePartNameFromConnectorRef(mate.a);
    const b = safePartNameFromConnectorRef(mate.b);
    if (a !== undefined && b !== undefined && partsByName.has(a) && partsByName.has(b)) addEdge(a, b);
  }

  for (const contact of useCase.contacts) {
    if (!isValidContactDeclaration(contact, partsByName)) {
      continue;
    }
    const a = safePartNameFromConnectorRef(contact.a);
    const b = safePartNameFromConnectorRef(contact.b);
    if (a !== undefined && b !== undefined && partsByName.has(a) && partsByName.has(b)) addEdge(a, b);
  }

  return graph;
}

function isValidContactDeclaration(
  contact: PhysicalUseCaseContact,
  partsByName: ReadonlyMap<string, { mateConnectors: readonly { name: string }[] }>,
): boolean {
  return (
    connectorExists(contact.a, partsByName) &&
    connectorExists(contact.b, partsByName) &&
    hasNonZeroVec(contact.normal) &&
    Number.isFinite(contact.friction) &&
    contact.friction > 0 &&
    (contact.normalForceN === undefined || (Number.isFinite(contact.normalForceN) && contact.normalForceN > 0))
  );
}

function reachesAnyStablePart(
  graph: ReadonlyMap<string, ReadonlySet<string>>,
  start: string,
  stableParts: readonly string[],
): boolean {
  const stable = new Set(stableParts);
  const seen = new Set<string>();
  const queue = [start];
  while (queue.length > 0) {
    const part = queue.shift() as string;
    if (stable.has(part)) return true;
    if (seen.has(part)) continue;
    seen.add(part);
    for (const next of graph.get(part) ?? []) {
      if (!seen.has(next)) queue.push(next);
    }
  }
  return false;
}

function safePartNameFromConnectorRef(ref: string): string | undefined {
  try {
    return parseConnectorRef(ref).partName;
  } catch {
    return undefined;
  }
}

function cross(a: readonly [number, number, number], b: readonly [number, number, number]): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot(a: readonly [number, number, number], b: readonly [number, number, number]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function unit(v: readonly [number, number, number]): Vec3 {
  const length = Math.hypot(v[0], v[1], v[2]);
  return length === 0 ? [0, 0, 0] : [v[0] / length, v[1] / length, v[2] / length];
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
