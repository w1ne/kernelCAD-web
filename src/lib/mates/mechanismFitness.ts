import type { PoseEnvelopeReviewResult } from './poseEnvelope';
import type { ValidatorDiagnostic } from './validator';

export interface MechanismBlockingReason {
  readonly code: string;
  readonly message: string;
  readonly evidence?: unknown;
  readonly repairHint: string;
}

export interface MechanismSummary {
  readonly sampleCount: number;
  readonly interferenceCount: number;
  readonly trackedConnectorCount: number;
  readonly maxTrackedTravelMm?: number;
}

export interface MechanismFitnessResult {
  readonly functional: boolean;
  readonly passedChecks: readonly string[];
  readonly blockingReasons: readonly MechanismBlockingReason[];
  readonly mechanismSummary: MechanismSummary;
}

export interface MechanismFitnessInput {
  readonly validatorDiagnostics?: readonly ValidatorDiagnostic[];
  readonly poseEnvelope?: PoseEnvelopeReviewResult;
  readonly trackConnectors?: readonly string[];
}

const PASSED_CHECKS = {
  validatorNoErrors: 'validator-no-errors',
  poseEnvelopeSolved: 'pose-envelope-solved',
  poseEnvelopeNoInterference: 'pose-envelope-no-interference',
  trackedConnectorsMove: 'tracked-connectors-move',
} as const;

export function summarizeMechanismFitness(
  input: MechanismFitnessInput = {},
): MechanismFitnessResult {
  const validatorDiagnostics = input.validatorDiagnostics ?? [];
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

  const hasPoseEnvelopeErrors = poseEnvelope?.diagnostics.some((diagnostic) => diagnostic.severity === 'error') ?? false;
  if (poseEnvelope) {
    for (const diagnostic of poseEnvelope.diagnostics) {
      if (diagnostic.severity !== 'error') continue;
      addBlockingReason(
        diagnostic.code,
        diagnostic.message,
        diagnostic.hint,
        diagnostic,
      );
    }
  }

  if (poseEnvelope && !hasPoseEnvelopeErrors) {
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

  const sampleCount = poseEnvelope?.samples.length ?? 0;
  const interferenceCount = poseEnvelope?.interferencePairs.length ?? 0;

  return {
    functional: blockingReasons.length === 0,
    passedChecks,
    blockingReasons,
    mechanismSummary: {
      sampleCount,
      interferenceCount,
      trackedConnectorCount,
      ...(maxTrackedTravelMm === undefined ? {} : { maxTrackedTravelMm }),
    },
  };
}
