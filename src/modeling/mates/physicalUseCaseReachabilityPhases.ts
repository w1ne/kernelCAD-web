// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Phase helpers for `reviewPhysicalUseCasesWithReachability` in
// `physicalUseCase.ts`. Code moved here unchanged; each phase appends
// diagnostics in the same order the orchestrator previously pushed them.
import type {
  PhysicalUseCaseDiagnostic,
  PhysicalUseCaseReviewOptions,
} from './physicalUseCase';
import type { PhysicalUseCaseReachabilityFinding } from './physicalUseCaseReachability';
import type { PhysicalUseCaseStaticIssue } from './physicalUseCaseStatics';

/** Derive the optional review phases: statics imply reachability, joint
 *  reactions imply statics, and joint structure implies joint reactions. */
export function resolvePhysicalUseCasePhases(opts: PhysicalUseCaseReviewOptions): {
  includeJointReactions: boolean;
  includeStatics: boolean;
  includeReachability: boolean;
  includeJointStructure: boolean;
} {
  const includeJointReactions = opts.includeJointReactions === true || opts.includeJointStructure === true;
  const includeStatics = opts.includeStatics === true || includeJointReactions;
  const includeReachability = opts.includeReachability === true || includeStatics;
  const includeJointStructure = opts.includeJointStructure === true;
  return { includeJointReactions, includeStatics, includeReachability, includeJointStructure };
}

/** Map reachability findings to diagnostics, skipping contact pairs already
 *  reported by the base review. */
export function appendReachabilityDiagnostics(
  findings: readonly PhysicalUseCaseReachabilityFinding[],
  existingUnreachableContacts: ReadonlySet<string>,
  diagnostics: PhysicalUseCaseDiagnostic[],
): void {
  for (const issue of findings) {
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
}

/** Map static-review issues to diagnostics. */
export function appendStaticsDiagnostics(
  issues: readonly PhysicalUseCaseStaticIssue[],
  diagnostics: PhysicalUseCaseDiagnostic[],
): void {
  for (const issue of issues) {
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
}

export function unreachableContactKey(useCaseName: string | undefined, contactA: string, contactB: string): string {
  return `${useCaseName ?? ''}\n${contactA}\n${contactB}`;
}
