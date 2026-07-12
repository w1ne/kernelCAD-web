// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { ScriptReviewSummary } from '../context/GeometryContext';
import type { SerializedParamEntry } from '../../shared/runtime/paramTable';
import { fingerprintStudioScript, shellStore } from '../store/shellStore';

const workbenchValue: {
    code: string;
    geometries: never[];
    featureRecords: FeatureRecord[];
    recomputeMs: number;
    scriptReview: ScriptReviewSummary | null;
    scriptParams: SerializedParamEntry[];
    updateParam?: (edits: { name: string; value: number | boolean }[]) => Promise<void>;
} = {
    code: '',
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
    beforeEach(() => {
        shellStore.reset();
        workbenchValue.code = '';
        workbenchValue.geometries = [];
        workbenchValue.featureRecords = [];
        workbenchValue.recomputeMs = 0;
        workbenchValue.scriptReview = null;
        workbenchValue.scriptParams = [];
        workbenchValue.updateParam = undefined;
    });

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
        expect(result.current.repairEvidence).toBeNull();
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

    it('exposes normalized repairEvidence from scriptReview fitness', async () => {
        workbenchValue.featureRecords = [];
        workbenchValue.scriptReview = {
            ok: false,
            diagnostics: [],
            fitness: {
                repairMode: '  topology-redesign  ',
                blockingReasons: [
                    {
                        code: '  mechanism.disconnect  ',
                        message: '  drive chain is disconnected  ',
                        repairHint: '  connect the actuator to the output link  ',
                    },
                    {
                        code: '   ',
                        message: '',
                        repairHint: undefined,
                    },
                    {
                        message: '  missing a code and hint still has evidence  ',
                    },
                ],
            },
        };

        const { useRecomputeResult } = await import('../hooks/useRecomputeResult');
        const { result } = renderHook(() => useRecomputeResult());

        expect(result.current.repairEvidence).toEqual({
            repairMode: 'topology-redesign',
            blockingReasons: [
                {
                    code: 'mechanism.disconnect',
                    message: 'drive chain is disconnected',
                    repairHint: 'connect the actuator to the output link',
                },
                {
                    code: '',
                    message: 'missing a code and hint still has evidence',
                    repairHint: '',
                },
            ],
        });
    });

    it('normalizes repairEvidence to null when scriptReview fitness is missing or unusable', async () => {
        workbenchValue.featureRecords = [];
        workbenchValue.scriptReview = null;

        const { useRecomputeResult } = await import('../hooks/useRecomputeResult');
        const missingReview = renderHook(() => useRecomputeResult());

        expect(missingReview.result.current.repairEvidence).toBeNull();

        workbenchValue.scriptReview = {
            ok: false,
            diagnostics: [],
            fitness: {
                repairMode: '   ',
                blockingReasons: [
                    { code: ' ', message: '', repairHint: undefined },
                    {},
                ],
            },
        };

        const unusable = renderHook(() => useRecomputeResult());

        expect(unusable.result.current.repairEvidence).toBeNull();
    });

    it('normalizes repairEvidence to null when repairMode is none with no usable blockers', async () => {
        workbenchValue.featureRecords = [];
        workbenchValue.scriptReview = {
            ok: true,
            diagnostics: [],
            fitness: {
                repairMode: ' none ',
                blockingReasons: [
                    { code: ' ', message: '', repairHint: undefined },
                ],
            },
        };

        const { useRecomputeResult } = await import('../hooks/useRecomputeResult');
        const { result } = renderHook(() => useRecomputeResult());

        expect(result.current.repairEvidence).toBeNull();
    });

    it('forwards rawInterferencePairs from scriptReview unchanged', async () => {
        // Raw detection output remains available for detail surfaces even
        // when the footer uses the classified interferenceSummary.
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

    it('publishes validity with the current workbench code fingerprint', async () => {
        const approvedCode = 'const part = box(20);\nreturn part;';
        shellStore.recordStagedEditOutcome(
            {
                id: 'approved-from-hook',
                intent: 'approved from hook',
                fromCode: 'return box(10);',
                toCode: approvedCode,
            },
            'approved',
        );
        workbenchValue.code = approvedCode;
        workbenchValue.scriptReview = { ok: true, diagnostics: [] };

        const { useRecomputeResult } = await import('../hooks/useRecomputeResult');
        renderHook(() => useRecomputeResult());

        expect(shellStore.getSnapshot().appliedEditHistory[0]).toMatchObject({
            editId: 'approved-from-hook',
            recheckStatus: 'rechecked-solved',
            recheckedScriptFingerprint: fingerprintStudioScript(approvedCode),
        });
    });

    it('does not recheck an approved edit with stale review output when only code changed', async () => {
        const oldCode = 'const part = box(10);\nreturn part;';
        const approvedCode = 'const part = box(20);\nreturn part;';
        shellStore.recordStagedEditOutcome(
            {
                id: 'approved-stale-review',
                intent: 'approved stale review',
                fromCode: oldCode,
                toCode: approvedCode,
            },
            'approved',
        );
        const oldReview: ScriptReviewSummary = { ok: true, diagnostics: [] };
        workbenchValue.code = oldCode;
        workbenchValue.scriptReview = oldReview;

        const { useRecomputeResult } = await import('../hooks/useRecomputeResult');
        const { rerender } = renderHook(() => useRecomputeResult());

        workbenchValue.code = approvedCode;
        workbenchValue.scriptReview = oldReview;
        rerender();

        expect(shellStore.getSnapshot().appliedEditHistory[0]).toMatchObject({
            editId: 'approved-stale-review',
            recheckStatus: 'pending-recheck',
        });

        workbenchValue.scriptReview = { ok: true, diagnostics: [] };
        rerender();

        expect(shellStore.getSnapshot().appliedEditHistory[0]).toMatchObject({
            editId: 'approved-stale-review',
            recheckStatus: 'rechecked-solved',
            recheckedScriptFingerprint: fingerprintStudioScript(approvedCode),
        });
    });
});
