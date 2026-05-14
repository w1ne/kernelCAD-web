import { useMemo } from 'react';
import { useWorkbench } from '../../context/WorkbenchContext';
import type { StudioRecomputeResult } from '../types';

/**
 * Single source of truth for shell consumers. Aggregates the bits the
 * existing pipeline produces into the `StudioRecomputeResult` contract.
 *
 * Phase 2 wiring: geometries flow through verbatim; features / validity /
 * paramTable / diagnostics are exposed as nulls/empties until Phase 3
 * deepens `WorkbenchContext` to surface them (or until subagents working
 * on individual tabs pull from the right sub-context themselves).
 *
 * Subscribers must tolerate empty/null fields — the shell renders the
 * always-visible `scene` and `code` tabs unconditionally, and adapts the
 * rest via `getVisibleTabs`.
 */
export function useRecomputeResult(): StudioRecomputeResult {
    const workbench = useWorkbench();

    return useMemo<StudioRecomputeResult>(() => ({
        features: [],
        geometries: workbench.geometries ?? [],
        validity: null,
        paramTable: null,
        diagnostics: [],
        recomputeMs: 0,
    }), [workbench.geometries]);
}
