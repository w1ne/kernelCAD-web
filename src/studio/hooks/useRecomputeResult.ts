import { useEffect, useMemo } from 'react';
import { useWorkbench } from '../context/WorkbenchContext';
import { reviewToValidity } from '../adapters/reviewToValidity';
import { serializedParamsToTable } from '../adapters/serializedParamsToTable';
import { reviewDiagnosticsToCompiler } from '../adapters/reviewDiagnosticsToCompiler';
import { shellStore } from '../store/shellStore';
import type { StudioRecomputeResult } from '../types';

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

    const paramTable = useMemo(
        () => serializedParamsToTable(workbench.scriptParams ?? []),
        [workbench.scriptParams],
    );

    const diagnostics = useMemo(
        () => reviewDiagnosticsToCompiler(workbench.scriptReview ?? null),
        [workbench.scriptReview],
    );

    // Publish validity into the shell store so BottomDrawer +
    // ValidityDeltaHeader see the delta (current ↔ previous).
    useEffect(() => {
        shellStore.publishValidity(validity);
    }, [validity]);

    return useMemo<StudioRecomputeResult>(
        () => ({
            features: workbench.featureRecords ?? [],
            geometries: workbench.geometries ?? [],
            validity,
            paramTable,
            diagnostics,
            recomputeMs: workbench.recomputeMs ?? 0,
            updateParam: (workbench as { updateParam?: StudioRecomputeResult['updateParam'] }).updateParam,
        }),
        [workbench, validity, paramTable, diagnostics],
    );
}
