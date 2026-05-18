// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { ScriptReviewSummary } from '../context/GeometryContext';
import type { SerializedParamEntry } from '../../shared/runtime/paramTable';

const workbenchValue: {
    geometries: never[];
    featureRecords: FeatureRecord[];
    recomputeMs: number;
    scriptReview: ScriptReviewSummary | null;
    scriptParams: SerializedParamEntry[];
    updateParam?: (edits: { name: string; value: number | boolean }[]) => Promise<void>;
} = {
    geometries: [],
    featureRecords: [],
    recomputeMs: 0,
    scriptReview: null,
    scriptParams: [],
};

vi.mock('../context/WorkbenchContext', () => ({
    useWorkbench: () => workbenchValue,
}));

describe('useRecomputeResult — Slice 1.2 data wiring', () => {
    it('passes featureRecords through unchanged', async () => {
        const records: FeatureRecord[] = [
            {
                id: 'box1',
                kind: 'box',
                inputs: {},
                params: {},
                transforms: [],
                suppressed: false,
            },
            {
                id: 'cyl1',
                kind: 'cylinder',
                inputs: {},
                params: {},
                transforms: [],
                suppressed: false,
            },
        ];
        workbenchValue.featureRecords = records;

        const { useRecomputeResult } = await import('../hooks/useRecomputeResult');
        const { result } = renderHook(() => useRecomputeResult());

        expect(result.current.features).toHaveLength(2);
        expect(result.current.features[0].id).toBe('box1');
        expect(result.current.features[1].kind).toBe('cylinder');
    });

    it('passes recomputeMs through', async () => {
        workbenchValue.featureRecords = [];
        workbenchValue.recomputeMs = 184;

        const { useRecomputeResult } = await import('../hooks/useRecomputeResult');
        const { result } = renderHook(() => useRecomputeResult());

        expect(result.current.recomputeMs).toBe(184);
    });

    it('returns empty defaults when WorkbenchContext returns nullish', async () => {
        workbenchValue.featureRecords = [];
        workbenchValue.recomputeMs = 0;
        workbenchValue.scriptReview = null;
        workbenchValue.scriptParams = [];

        const { useRecomputeResult } = await import('../hooks/useRecomputeResult');
        const { result } = renderHook(() => useRecomputeResult());

        expect(result.current.features).toEqual([]);
        expect(result.current.geometries).toEqual([]);
        expect(result.current.validity).toBeNull();
        expect(result.current.paramTable).toBeNull();
        expect(result.current.diagnostics).toEqual([]);
        expect(result.current.recomputeMs).toBe(0);
    });

    it('exposes updateParam from the workbench so ParamsTab can drive live edits', async () => {
        // Slice 2E.bridge: WorkbenchContext owns the sessionToken + SSE stream
        // and exposes `updateParam(edits)` that POSTs to /__kernelcad/params.
        // useRecomputeResult forwards it so any inspector tab (ParamsTab today,
        // FormulasTab tomorrow) can call it without reaching into the workbench.
        const updateParam = vi.fn(async () => undefined);
        workbenchValue.featureRecords = [];
        workbenchValue.updateParam = updateParam;

        const { useRecomputeResult } = await import('../hooks/useRecomputeResult');
        const { result } = renderHook(() => useRecomputeResult());

        expect(result.current.updateParam).toBe(updateParam);
        await result.current.updateParam?.([{ name: 'w', value: 70 }]);
        expect(updateParam).toHaveBeenCalledWith([{ name: 'w', value: 70 }]);
    });
});
