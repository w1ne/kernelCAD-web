// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
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
        expect(result.current.suggestedRepairPrompt).toBeNull();
        expect(result.current.recomputeMs).toBe(0);
    });

    it('exposes a trimmed suggestedRepairPrompt from scriptReview', async () => {
        workbenchValue.featureRecords = [];
        workbenchValue.scriptReview = {
            ok: false,
            diagnostics: [],
            suggestedRepairPrompt: '  Anchor the output horn to the base with a revolute mate.  ',
        };

        const { useRecomputeResult } = await import('../hooks/useRecomputeResult');
        const { result } = renderHook(() => useRecomputeResult());

        expect(result.current.suggestedRepairPrompt).toBe(
            'Anchor the output horn to the base with a revolute mate.',
        );
    });

    it('normalizes blank and missing suggestedRepairPrompt values to null', async () => {
        workbenchValue.featureRecords = [];
        workbenchValue.scriptReview = {
            ok: false,
            diagnostics: [],
            suggestedRepairPrompt: '   ',
        };

        const { useRecomputeResult } = await import('../hooks/useRecomputeResult');
        const blank = renderHook(() => useRecomputeResult());

        expect(blank.result.current.suggestedRepairPrompt).toBeNull();

        workbenchValue.scriptReview = {
            ok: false,
            diagnostics: [],
        };

        const missing = renderHook(() => useRecomputeResult());

        expect(missing.result.current.suggestedRepairPrompt).toBeNull();
    });

    it('forwards rawInterferencePairs from scriptReview unchanged', async () => {
        // The HUD reads `.length` of this directly. It's the RAW detection
        // output — populated regardless of whether the script's
        // `solvedModel` set an `ignore` list. Validator filtering happens
        // upstream and lands on `validity.diagnostics`, NOT here.
        workbenchValue.featureRecords = [];
        workbenchValue.scriptReview = {
            ok: false,
            diagnostics: [],
            rawInterferencePairs: [
                { a: 'base', b: 'lower-arm', volumeMm3: 12 },
                { a: 'lower-arm', b: 'upper-arm', volumeMm3: 14 },
            ],
        };

        const { useRecomputeResult } = await import('../hooks/useRecomputeResult');
        const { result } = renderHook(() => useRecomputeResult());

        expect(result.current.rawInterferencePairs).toHaveLength(2);
        expect(result.current.rawInterferencePairs[0]).toEqual({
            a: 'base',
            b: 'lower-arm',
            volumeMm3: 12,
        });
    });

    it('rawInterferencePairs defaults to empty when scriptReview is null', async () => {
        workbenchValue.featureRecords = [];
        workbenchValue.scriptReview = null;

        const { useRecomputeResult } = await import('../hooks/useRecomputeResult');
        const { result } = renderHook(() => useRecomputeResult());

        expect(result.current.rawInterferencePairs).toEqual([]);
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
