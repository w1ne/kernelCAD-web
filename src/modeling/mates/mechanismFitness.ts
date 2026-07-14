// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { PoseEnvelopeReviewResult } from './poseEnvelope';
import type { ValidatorDiagnostic } from './validator';
import type { MechanicalPlausibilityDiagnostic } from './mechanicalPlausibility';
import type { MechanicalIntentDiagnostic } from './mechanicalIntent';
import type { MechanicalTransmissionDiagnostic } from './mechanicalTransmission';
import type { PhysicalUseCaseDiagnostic } from './physicalUseCase';
import type { JointTopologyDiagnostic } from './jointTopology';

export interface MechanismBlockingReason {
  readonly code: string;
  readonly message: string;
  readonly evidence?: unknown;
  readonly repairHint: string;
}

export type MechanismRepairMode =
  | 'none'
  | 'local-fix'
  | 'parameter-tune'
  | 'topology-redesign';

export interface MechanismSummary {
  readonly sampleCount: number;
  readonly interferenceCount: number;
  readonly trackedConnectorCount: number;
  readonly maxTrackedTravelMm?: number;
  readonly gripperApertureMinMm?: number;
  readonly gripperApertureMaxMm?: number;
  readonly gripperApertureTravelMm?: number;
  readonly mechanicalPlausibilityIssueCount?: number;
  readonly mechanicalIntentIssueCount?: number;
  readonly mechanicalTransmissionIssueCount?: number;
  readonly jointTopologyIssueCount?: number;
  readonly physicalUseCaseCount?: number;
  readonly physicalUseCaseIssueCount?: number;
}

export interface MechanismFitnessResult {
  readonly functional: boolean;
  readonly repairMode: MechanismRepairMode;
  readonly repairDirective: string;
  readonly passedChecks: readonly string[];
  readonly blockingReasons: readonly MechanismBlockingReason[];
  readonly mechanismSummary: MechanismSummary;
}

export interface MechanismFitnessInput {
  readonly validatorDiagnostics?: readonly ValidatorDiagnostic[];
  readonly mechanicalPlausibilityDiagnostics?: readonly MechanicalPlausibilityDiagnostic[];
  readonly mechanicalIntentDiagnostics?: readonly MechanicalIntentDiagnostic[];
  readonly mechanicalTransmissionDiagnostics?: readonly MechanicalTransmissionDiagnostic[];
  readonly jointTopologyDiagnostics?: readonly JointTopologyDiagnostic[];
  readonly physicalUseCaseDiagnostics?: readonly PhysicalUseCaseDiagnostic[];
  readonly physicalUseCaseCount?: number;
  readonly poseEnvelope?: PoseEnvelopeReviewResult;
  readonly trackConnectors?: readonly string[];
}

const PASSED_CHECKS = {
  validatorNoErrors: 'validator-no-errors',
  poseEnvelopeSolved: 'pose-envelope-solved',
  poseEnvelopeNoInterference: 'pose-envelope-no-interference',
  trackedConnectorsMove: 'tracked-connectors-move',
  gripperApertureMoves: 'gripper-aperture-moves',
  physicalUseCaseDeclared: 'physical-use-case-declared',
} as const;

export function summarizeMechanismFitness(
  input: MechanismFitnessInput = {},
): MechanismFitnessResult {
  const validatorDiagnostics = input.validatorDiagnostics ?? [];
  const mechanicalPlausibilityDiagnostics = input.mechanicalPlausibilityDiagnostics ?? [];
  const mechanicalIntentDiagnostics = input.mechanicalIntentDiagnostics ?? [];
  const mechanicalTransmissionDiagnostics = input.mechanicalTransmissionDiagnostics ?? [];
  const jointTopologyDiagnostics = input.jointTopologyDiagnostics ?? [];
  const physicalUseCaseDiagnostics = input.physicalUseCaseDiagnostics ?? [];
  const physicalUseCaseCount = input.physicalUseCaseCount ?? 0;
  const poseEnvelope = input.poseEnvelope;
  const trackConnectors = input.trackConnectors ?? [];

  const blockingReasons: MechanismBlockingReason[] = [];
  const passedChecks: string[] = [];

  const addBlockingReason = (
    code: string,
    message: string,
    repairHint: string,
    evidence?: unknown,
  ): void => {
    blockingReasons.push({ code, message, evidence, repairHint });
  };

  const hasValidatorErrors = validatorDiagnostics.some((diagnostic) => diagnostic.severity === 'error');
  for (const diagnostic of validatorDiagnostics) {
    if (diagnostic.severity !== 'error') continue;
    addBlockingReason(
      diagnostic.code,
      diagnostic.message,
      diagnostic.hint,
      diagnostic,
    );
  }

  if (!hasValidatorErrors) {
    passedChecks.push(PASSED_CHECKS.validatorNoErrors);
  }

  for (const diagnostic of mechanicalPlausibilityDiagnostics) {
    if (diagnostic.severity !== 'error' && diagnostic.code !== 'assembly.mechanical.part-disconnected') continue;
    addBlockingReason(
      diagnostic.code,
      diagnostic.message,
      diagnostic.hint,
      diagnostic,
    );
  }

  for (const diagnostic of mechanicalIntentDiagnostics) {
    addBlockingReason(
      diagnostic.code,
      diagnostic.message,
      diagnostic.hint,
      diagnostic,
    );
  }

  for (const diagnostic of mechanicalTransmissionDiagnostics) {
    addBlockingReason(
      diagnostic.code,
      diagnostic.message,
      diagnostic.hint,
      diagnostic,
    );
  }

  for (const diagnostic of jointTopologyDiagnostics) {
    addBlockingReason(
      diagnostic.code,
      diagnostic.message,
      diagnostic.hint,
      diagnostic,
    );
  }

  for (const diagnostic of physicalUseCaseDiagnostics) {
    addBlockingReason(
      diagnostic.code,
      diagnostic.message,
      diagnostic.hint,
      diagnostic,
    );
  }

  if (physicalUseCaseCount > 0 && physicalUseCaseDiagnostics.length === 0) {
    passedChecks.push(PASSED_CHECKS.physicalUseCaseDeclared);
  }

  const isBlockingPoseDiagnostic = (diagnostic: PoseEnvelopeReviewResult['diagnostics'][number]): boolean =>
    diagnostic.severity === 'error'
    || diagnostic.code === 'assembly.pose-envelope.clearance-unresolved';
  const hasBlockingPoseDiagnostics = poseEnvelope?.diagnostics.some(isBlockingPoseDiagnostic) ?? false;
  if (poseEnvelope) {
    for (const diagnostic of poseEnvelope.diagnostics) {
      if (!isBlockingPoseDiagnostic(diagnostic)) continue;
      addBlockingReason(
        diagnostic.code,
        diagnostic.message,
        diagnostic.hint,
        diagnostic,
      );
    }
    const layoutConflict = summarizePersistentLayoutConflict(poseEnvelope);
    if (layoutConflict !== undefined) {
      addBlockingReason(
        'assembly.mechanism.layout-conflict',
        `Parts '${layoutConflict.partA}' and '${layoutConflict.partB}' interfere in ${layoutConflict.sampleCount}/${poseEnvelope.samples.length} pose-envelope samples (max ${layoutConflict.maxVolumeMm3.toFixed(2)} mm^3).`,
        `This is likely a local layout/topology conflict, not a connector nudge. Redesign the joint layout so '${layoutConflict.partA}' and '${layoutConflict.partB}' occupy separate swept volumes before tuning mates or limits.`,
        layoutConflict,
      );
    }
  }

  if (poseEnvelope && !hasBlockingPoseDiagnostics) {
    passedChecks.push(PASSED_CHECKS.poseEnvelopeSolved);
  }

  const hasPoseInterference = Boolean(
    poseEnvelope?.diagnostics.some((diagnostic) => diagnostic.code === 'assembly.pose-envelope.interference'),
  );
  if (poseEnvelope && !hasPoseInterference) {
    passedChecks.push(PASSED_CHECKS.poseEnvelopeNoInterference);
  }

  const trackedConnectorSet = new Set(trackConnectors);
  const trackedConnectorWorkspaces = trackedConnectorSet.size > 0
    ? (poseEnvelope?.connectorWorkspace ?? []).filter((workspace) => trackedConnectorSet.has(workspace.ref))
    : [];

  const trackedConnectorCount = trackedConnectorWorkspaces.length;
  const maxTrackedTravelMm = trackedConnectorWorkspaces.length > 0
    ? Math.max(...trackedConnectorWorkspaces.map((workspace) => workspace.travelMm))
    : undefined;

  if (trackedConnectorSet.size > 0 && trackedConnectorWorkspaces.length === 0) {
    addBlockingReason(
      'assembly.mechanism.no-tracked-workspace',
      'No tracked connector workspace entries were found for the requested refs.',
      'Track connectors that are present in the pose-envelope review or adjust trackConnectors to existing workspace refs.',
      trackConnectors,
    );
  }

  if (trackedConnectorSet.size > 0 && (maxTrackedTravelMm === undefined || maxTrackedTravelMm === 0)) {
    addBlockingReason(
      'assembly.mechanism.no-tracked-travel',
      'Tracked connectors show no observable workspace travel.',
      'Track connectors with different sample poses (or with greater declared limits) so travel is greater than 0 mm.',
      trackedConnectorWorkspaces,
    );
  }

  if (trackedConnectorSet.size > 0 && maxTrackedTravelMm !== undefined && maxTrackedTravelMm > 0) {
    passedChecks.push(PASSED_CHECKS.trackedConnectorsMove);
  }

  if (poseEnvelope?.gripperApertureRequest !== undefined && poseEnvelope.gripperAperture === undefined) {
    addBlockingReason(
      'assembly.mechanism.gripper-aperture-missing',
      'Requested gripper aperture could not be computed.',
      'Pass two numeric frame connector refs that are present across pose-envelope samples.',
      poseEnvelope.gripperApertureRequest,
    );
  }

  if (poseEnvelope?.gripperAperture !== undefined && poseEnvelope.gripperAperture.travelMm > 0) {
    passedChecks.push(PASSED_CHECKS.gripperApertureMoves);
  }

  const sampleCount = poseEnvelope?.samples.length ?? 0;
  const interferenceCount = poseEnvelope?.interferencePairs.length ?? 0;
  const mechanicalPlausibilityIssueCount = mechanicalPlausibilityDiagnostics.length;
  const mechanicalIntentIssueCount = mechanicalIntentDiagnostics.length;
  const mechanicalTransmissionIssueCount = mechanicalTransmissionDiagnostics.length;
  const jointTopologyIssueCount = jointTopologyDiagnostics.length;
  const physicalUseCaseIssueCount = physicalUseCaseDiagnostics.length;
  const repairMode = chooseRepairMode(blockingReasons);

  return {
    functional: blockingReasons.length === 0,
    repairMode,
    repairDirective: repairDirectiveForMode(repairMode),
    passedChecks,
    blockingReasons,
    mechanismSummary: {
      sampleCount,
      interferenceCount,
      trackedConnectorCount,
      ...(maxTrackedTravelMm === undefined ? {} : { maxTrackedTravelMm }),
      ...(poseEnvelope?.gripperAperture === undefined ? {} : {
        gripperApertureMinMm: poseEnvelope.gripperAperture.minMm,
        gripperApertureMaxMm: poseEnvelope.gripperAperture.maxMm,
        gripperApertureTravelMm: poseEnvelope.gripperAperture.travelMm,
      }),
      ...(mechanicalPlausibilityIssueCount === 0 ? {} : { mechanicalPlausibilityIssueCount }),
      ...(mechanicalIntentIssueCount === 0 ? {} : { mechanicalIntentIssueCount }),
      ...(mechanicalTransmissionIssueCount === 0 ? {} : { mechanicalTransmissionIssueCount }),
      ...(jointTopologyIssueCount === 0 ? {} : { jointTopologyIssueCount }),
      ...(physicalUseCaseCount === 0 ? {} : { physicalUseCaseCount }),
      ...(physicalUseCaseIssueCount === 0 ? {} : { physicalUseCaseIssueCount }),
    },
  };
}

function chooseRepairMode(
  blockingReasons: readonly MechanismBlockingReason[],
): MechanismRepairMode {
  if (blockingReasons.length === 0) return 'none';

  if (blockingReasons.some((reason) => reason.code === 'assembly.mechanism.layout-conflict')) {
    return 'topology-redesign';
  }

  if (blockingReasons.some((reason) =>
    reason.code.startsWith('assembly.connectivity.') ||
    reason.code.startsWith('assembly.joint-topology.')
  )) {
    return 'topology-redesign';
  }

  if (blockingReasons.every((reason) => reason.code === 'assembly.pose.out-of-limits')) {
    return 'parameter-tune';
  }

  return 'local-fix';
}

function repairDirectiveForMode(mode: MechanismRepairMode): string {
  switch (mode) {
    case 'none':
      return 'No repair needed. Preserve the current topology and keep validating with review_cad after changes.';
    case 'parameter-tune':
      return 'Tune numeric poses, limits, or ranges without changing the mechanism topology, then rerun review_cad.';
    case 'topology-redesign':
      return 'Stop patching local coordinates. Redesign the affected joint or module from the original design prompt, preserve declared interfaces, and rerun review_cad against the redesigned topology.';
    case 'local-fix':
      return 'Fix the reported local modeling errors while preserving the current topology, then rerun review_cad.';
  }
}

function summarizePersistentLayoutConflict(
  poseEnvelope: PoseEnvelopeReviewResult,
): { partA: string; partB: string; sampleCount: number; maxVolumeMm3: number } | undefined {
  if (poseEnvelope.samples.length < 2 || poseEnvelope.interferencePairs.length === 0) return undefined;
  const byPair = new Map<string, { partA: string; partB: string; sampleNames: Set<string>; maxVolumeMm3: number }>();
  for (const pair of poseEnvelope.interferencePairs) {
    const names = [pair.a, pair.b].sort();
    const key = `${names[0]}|${names[1]}`;
    let entry = byPair.get(key);
    if (entry === undefined) {
      entry = { partA: names[0], partB: names[1], sampleNames: new Set(), maxVolumeMm3: 0 };
      byPair.set(key, entry);
    }
    entry.sampleNames.add(pair.sampleName);
    entry.maxVolumeMm3 = Math.max(entry.maxVolumeMm3, pair.volumeMm3);
  }

  const threshold = Math.max(2, Math.ceil(poseEnvelope.samples.length * 0.6));
  return [...byPair.values()]
    .filter((entry) => entry.sampleNames.size >= threshold)
    .sort((a, b) => b.sampleNames.size - a.sampleNames.size || b.maxVolumeMm3 - a.maxVolumeMm3)
    .map((entry) => ({
      partA: entry.partA,
      partB: entry.partB,
      sampleCount: entry.sampleNames.size,
      maxVolumeMm3: entry.maxVolumeMm3,
    }))[0];
}
