// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useEffect, useMemo } from 'react';
import { useWorkbench } from '../context/WorkbenchContext';
import { reviewToValidity, reviewToMechanismBanner } from '../adapters/reviewToValidity';
import { serializedParamsToTable } from '../adapters/serializedParamsToTable';
import { reviewDiagnosticsToCompiler } from '../adapters/reviewDiagnosticsToCompiler';
import { extractJointSnapshots } from '../adapters/featureRecordsToMates';
import { fingerprintStudioScript, shellStore } from '../store/shellStore';
import type { ScriptReviewSummary } from '../context/GeometryContext';
import type { StudioRecomputeResult, StudioRepairEvidence } from '../types';

/**
 * Single source of truth for shell consumers. Adapts the bits the
 * existing pipeline produces (geometries from the worker, scriptReview
 * from `/__kernelcad/review`, scriptParams from `/__kernelcad/mesh`)
 * into the `StudioRecomputeResult` contract.
 *
 * Slice 1.1: validity + paramTable + diagnostics now plumbed. Features
 * still empty pending a worker-side `FeatureRecord` serialization
 * (Slice 1.2). SceneTab falls back to its legacy rows when features is
 * empty.
 *
 * Slice 2E.bridge: the SSE channel that closes the kernel→browser loop
 * is wired up. `WorkbenchContext` (via `GeometryContext`) opens an
 * `EventSource` against `/__kernelcad/events?session=<token>` and re-
 * fetches mesh+review on each `relower` event, so `scriptParams` and
 * `scriptReview` stay live. `updateParam` (POST `/__kernelcad/params`)
 * is forwarded through this hook so any inspector tab can drive edits
 * without reaching into the workbench directly.
 */
export function useRecomputeResult(): StudioRecomputeResult {
    const workbench = useWorkbench();

    const validity = useMemo(
        () => reviewToValidity(workbench.scriptReview ?? null),
        [workbench.scriptReview],
    );

    // Physics-loop banner (P1). `null` unless the recompute's mechanism
    // verdict is 'broken' — the Validity tab renders the banner above
    // the existing diagnostic rows.
    const mechanismBanner = useMemo(
        () => reviewToMechanismBanner(workbench.scriptReview ?? null),
        [workbench.scriptReview],
    );

    // Raw interference pairs are read directly from the script review payload
    // (filtering is applied at the validator layer, not here). Empty array
    // when scriptReview is null OR when the server omitted the field — the
    // Studio HUD treats that as "interferences: 0" rather than a missing
    // signal. See StudioRecomputeResult.rawInterferencePairs JSDoc for why
    // the HUD reads this and not validity.diagnostics.
    const rawInterferencePairs = useMemo(
        () => workbench.scriptReview?.rawInterferencePairs ?? [],
        [workbench.scriptReview],
    );

    const paramTable = useMemo(
        () => serializedParamsToTable(workbench.scriptParams ?? []),
        [workbench.scriptParams],
    );

    const diagnostics = useMemo(
        () => reviewDiagnosticsToCompiler(workbench.scriptReview ?? null),
        [workbench.scriptReview],
    );

    const suggestedRepairPrompt = useMemo(
        () => normalizePrompt(workbench.scriptReview?.suggestedRepairPrompt),
        [workbench.scriptReview],
    );

    const repairEvidence = useMemo(
        () => reviewToRepairEvidence(workbench.scriptReview ?? null),
        [workbench.scriptReview],
    );

    const joints = useMemo(
        () => extractJointSnapshots(workbench.featureRecords ?? [], paramTable),
        [workbench.featureRecords, paramTable],
    );
    const scriptFingerprint = useMemo(
        () => fingerprintStudioScript(workbench.code ?? ''),
        [workbench.code],
    );

    // Publish validity into the shell store so BottomDrawer +
    // ValidityDeltaHeader see the delta (current ↔ previous).
    useEffect(() => {
        shellStore.publishValidity(validity, { scriptFingerprint });
    }, [scriptFingerprint, validity]);

    const updateParam = (workbench as { updateParam?: StudioRecomputeResult['updateParam'] }).updateParam;
    const setGeometryTransformOverride =
        (workbench as { setGeometryTransformOverride?: StudioRecomputeResult['setGeometryTransformOverride'] })
            .setGeometryTransformOverride;
    const clearGeometryTransformOverrides =
        (workbench as { clearGeometryTransformOverrides?: StudioRecomputeResult['clearGeometryTransformOverrides'] })
            .clearGeometryTransformOverrides;
    const setViewportDriverLock =
        (workbench as { setViewportDriverLock?: StudioRecomputeResult['setViewportDriverLock'] })
            .setViewportDriverLock;

    return useMemo<StudioRecomputeResult>(
        () => ({
            features: workbench.featureRecords ?? [],
            geometries: workbench.geometries ?? [],
            validity,
            paramTable,
            diagnostics,
            suggestedRepairPrompt,
            repairEvidence,
            recomputeMs: workbench.recomputeMs ?? 0,
            joints,
            rawInterferencePairs,
            mechanismBanner,
            updateParam,
            setGeometryTransformOverride,
            clearGeometryTransformOverrides,
            setViewportDriverLock,
        }),
        [
            workbench.featureRecords,
            workbench.geometries,
            workbench.recomputeMs,
            updateParam,
            validity,
            paramTable,
            diagnostics,
            suggestedRepairPrompt,
            repairEvidence,
            joints,
            rawInterferencePairs,
            mechanismBanner,
            setGeometryTransformOverride,
            clearGeometryTransformOverrides,
            setViewportDriverLock,
        ],
    );
}

function normalizePrompt(value: string | undefined): string | null {
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
}

function reviewToRepairEvidence(review: ScriptReviewSummary | null): StudioRepairEvidence | null {
    const fitness = review?.fitness;
    const repairMode = normalizeRepairMode(fitness?.repairMode);
    const blockingReasons =
        fitness?.blockingReasons
            ?.map((reason) => ({
                code: normalizeEvidenceField(reason.code),
                message: normalizeEvidenceField(reason.message),
                repairHint: normalizeEvidenceField(reason.repairHint),
            }))
            .filter(
                (reason) =>
                    reason.code !== '' ||
                    reason.message !== '' ||
                    reason.repairHint !== '',
            ) ?? [];

    if (repairMode == null && blockingReasons.length === 0) return null;
    return { repairMode, blockingReasons };
}

function normalizeRepairMode(value: string | undefined): string | null {
    const normalized = normalizePrompt(value);
    if (normalized == null) return null;
    return normalized.toLowerCase() === 'none' ? null : normalized;
}

function normalizeEvidenceField(value: string | undefined): string {
    return value?.trim() ?? '';
}
