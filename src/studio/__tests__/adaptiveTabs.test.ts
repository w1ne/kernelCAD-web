import { describe, expect, it } from 'vitest';
import { getVisibleTabs } from '../logic/adaptiveTabs';
import type { StudioRecomputeResult, TabId } from '../types';
import { ParamTable } from '../../runtime/paramTable';

function paramTableWith(count: number): ParamTable {
    const table = new ParamTable();
    for (let i = 0; i < count; i++) {
        table.declare(`p${i}`, 'number', 0);
    }
    return table;
}

function fixture(overrides: Partial<StudioRecomputeResult> = {}): StudioRecomputeResult {
    return {
        features: [],
        geometries: [],
        validity: null,
        paramTable: null,
        diagnostics: [],
        recomputeMs: 0,
        ...overrides,
    };
}

describe('getVisibleTabs', () => {
    const cases: Array<{ name: string; result: StudioRecomputeResult | null; expected: TabId[] }> = [
        {
            name: 'null result → scene + code only',
            result: null,
            expected: ['scene', 'code'],
        },
        {
            name: 'empty result → scene + code only',
            result: fixture(),
            expected: ['scene', 'code'],
        },
        {
            name: 'paramTable with 1 entry → adds params',
            result: fixture({ paramTable: paramTableWith(1) }),
            expected: ['scene', 'code', 'params'],
        },
        {
            name: 'paramTable empty (size 0) → no params tab',
            result: fixture({ paramTable: paramTableWith(0) }),
            expected: ['scene', 'code'],
        },
        {
            name: 'validity present (solved) → adds validity',
            result: fixture({
                validity: { status: 'solved', diagnostics: [], partCount: 1, jointCount: 0 },
            }),
            expected: ['scene', 'code', 'validity'],
        },
        {
            name: 'validity present (error) → still adds validity',
            result: fixture({
                validity: { status: 'error', diagnostics: [], partCount: 1, jointCount: 0 },
            }),
            expected: ['scene', 'code', 'validity'],
        },
        {
            name: 'paramTable + validity → adds both, ordered',
            result: fixture({
                paramTable: paramTableWith(3),
                validity: { status: 'solved', diagnostics: [], partCount: 2, jointCount: 1 },
            }),
            expected: ['scene', 'code', 'params', 'validity'],
        },
    ];

    for (const { name, result, expected } of cases) {
        it(name, () => {
            expect(getVisibleTabs(result)).toEqual(expected);
        });
    }

    it('reserved tabs (joints/export/sections/cut/animation/render) are never returned in Phase 2', () => {
        const result = fixture({
            paramTable: paramTableWith(1),
            validity: { status: 'solved', diagnostics: [], partCount: 1, jointCount: 0 },
        });
        const tabs = getVisibleTabs(result);
        for (const reserved of ['joints', 'export', 'sections', 'cut', 'animation', 'render'] as TabId[]) {
            expect(tabs).not.toContain(reserved);
        }
    });
});
