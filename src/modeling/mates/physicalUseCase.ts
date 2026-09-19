// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { Assembly } from '../capture/assembly';
import type { Vec3 } from '../../shared/intent/types';
import type { PoseEnvelopeReviewResult } from './poseEnvelope';
import { parseConnectorRef } from './mate';
import { assessPhysicalUseCaseReachability } from './physicalUseCaseReachability';
import {
  appendReachabilityDiagnostics,
  appendStaticsDiagnostics,
  resolvePhysicalUseCasePhases,
  unreachableContactKey,
} from './physicalUseCaseReachabilityPhases';
import {
  connectorExists,
  hasNonZeroVec,
  reviewMissingPhysicalUseCase,
  reviewUseCaseActuatorLimits,
  reviewUseCaseContacts,
  reviewUseCaseLoads,
  reviewUseCaseStableParts,
} from './physicalUseCasePhases';
import {
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
  reviewClevisJointStructure,
  type ClevisJointStructureReview,
} from './clevisJointStructure';
import {
  copyUseCaseActuatorLimit,
  copyUseCaseContact,
  copyUseCaseLoad,
  validateUseCaseContactFrames,
  validateUseCaseCriteria,
  validateUseCaseName,
} from './physicalUseCaseRecordPhases';

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
  validateUseCaseName(name);
  validateUseCaseContactFrames(opts);
  validateUseCaseCriteria(opts.criteria);
  return {
    name,
    stableParts: [...(opts.stableParts ?? [])],
    loads: (opts.loads ?? []).map((load) => copyUseCaseLoad(load)),
    contacts: (opts.contacts ?? []).map((contact) => copyUseCaseContact(contact)),
    actuatorLimits: (opts.actuatorLimits ?? []).map((limit) => copyUseCaseActuatorLimit(limit)),
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

  const missingUseCaseDiagnostic = reviewMissingPhysicalUseCase(
    opts.requirePhysicalUseCase,
    useCases.length,
    hasArticulatedMate,
  );
  if (missingUseCaseDiagnostic !== undefined) {
    diagnostics.push(missingUseCaseDiagnostic);
  }

  for (const useCase of useCases) {
    diagnostics.push(...reviewUseCaseStableParts(useCase, partsByName));
    diagnostics.push(...reviewUseCaseLoads(useCase, partsByName));
    diagnostics.push(...reviewUseCaseContacts(useCase, opts.poseEnvelope, partsByName));
    diagnostics.push(...reviewUseCaseActuatorLimits(useCase, hasArticulatedMate, matesByName, mechanicallySupportedMates));

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
  const { includeJointReactions, includeStatics, includeReachability, includeJointStructure } =
    resolvePhysicalUseCasePhases(opts);
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
    appendReachabilityDiagnostics(assessment.findings, existingUnreachableContacts, diagnostics);

    if (!includeStatics || assessment.findings.length > 0) continue;
    const statics = await reviewPhysicalUseCaseStatics(arm, useCase, assessment.commonPoseSamples);
    staticCertificates.push(...statics.certificates);
    appendStaticsDiagnostics(statics.issues, diagnostics);

    if (!includeJointReactions) continue;
    await appendJointReactionCertificates(
      arm,
      useCase,
      statics.certificates,
      includeJointStructure,
      diagnostics,
      jointReactionCertificates,
      jointStructuralCertificates,
    );
  }

  return {
    diagnostics,
    checkedUseCaseCount: base.checkedUseCaseCount,
    staticCertificates,
    jointReactionCertificates,
    jointStructuralCertificates,
  };
}

/** Run the joint-reaction/structural review for each passing static certificate. */
async function appendJointReactionCertificates(
  arm: Assembly,
  useCase: PhysicalUseCaseRecord,
  certificates: readonly PhysicalUseCaseStaticCertificate[],
  includeStructure: boolean,
  diagnostics: PhysicalUseCaseDiagnostic[],
  jointReactionCertificates: PhysicalUseCaseJointReactionCertificate[],
  jointStructuralCertificates: PhysicalUseCaseJointStructuralCertificate[],
): Promise<void> {
  for (const certificate of certificates) {
    const jointReview = await reviewCertifiedJointLoads(
      arm,
      useCase,
      certificate,
      includeStructure,
    );
    diagnostics.push(...jointReview.diagnostics);
    jointReactionCertificates.push(...jointReview.reactionCertificates);
    jointStructuralCertificates.push(...jointReview.structuralCertificates);
  }
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
