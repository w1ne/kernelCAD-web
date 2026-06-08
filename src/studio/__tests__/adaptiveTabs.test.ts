import { describe, expect, it } from 'vitest';
import { getVisibleTabs } from '../logic/adaptiveTabs';
import type { StudioRecomputeResult, TabId } from '../types';
import { ParamTable } from '../../shared/runtime/paramTable';

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
        joints: [],
        ...overrides,
    };
}

function animationViewRecord() {
    return {
        id: 'animationView_1' as never,
        kind: 'animationView' as const,
        inputs: {},
        params: {},
        transforms: [],
        suppressed: false,
        metadata: {
            name: 'spin',
            fps: 30,
            durationMs: 4000,
            virtual: true,
            tracks: [{ param: 'drumDeg', keys: [{ atMs: 0, value: 0, ease: 'linear' }] }],
        },
    };
}

function jointFixture(name: string) {
    return {
        mate: {
            name,
            a: `${name}.a`,
            b: `${name}.b`,
            type: 'revolute' as const,
        },
        pose: 0,
        poseParamNames: [name],
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

    it('reserved tabs (sections/cut/render) are never returned (Phase 2 baseline)', () => {
        const result = fixture({
            paramTable: paramTableWith(1),
            validity: { status: 'solved', diagnostics: [], partCount: 1, jointCount: 0 },
        });
        const tabs = getVisibleTabs(result);
        for (const reserved of ['sections', 'cut', 'render'] as TabId[]) {
            expect(tabs).not.toContain(reserved);
        }
    });

    it('animation tab surfaces when an animationView record is present', () => {
        const result = fixture({ features: [animationViewRecord()] as never });
        expect(getVisibleTabs(result)).toContain('animation');
    });

    it('animation tab is hidden when no animationView record exists', () => {
        const result = fixture({ features: [] });
        expect(getVisibleTabs(result)).not.toContain('animation');
    });

    it('animation last-wins / hidden when the only animation record lacks metadata', () => {
        const bare = { ...animationViewRecord(), metadata: undefined };
        const result = fixture({ features: [bare] as never });
        expect(getVisibleTabs(result)).not.toContain('animation');
    });

    it('joints tab surfaces when at least one mate with pose is present (Slice 2C)', () => {
        const result = fixture({ joints: [jointFixture('shoulder')] });
        expect(getVisibleTabs(result)).toContain('joints');
    });

    it('joints tab is hidden when joints[] is empty', () => {
        expect(getVisibleTabs(fixture({ joints: [] }))).not.toContain('joints');
    });

    it('joints tab orders after params, before validity', () => {
        const result = fixture({
            paramTable: paramTableWith(1),
            joints: [jointFixture('elbow')],
            validity: { status: 'solved', diagnostics: [], partCount: 2, jointCount: 1 },
        });
        expect(getVisibleTabs(result)).toEqual([
            'scene',
            'code',
            'params',
            'joints',
            'validity',
        ]);
    });

    it('export tab surfaces when geometries.length > 0 (Slice 1.4)', () => {
        const result = fixture({
            geometries: [{ faces: [] }],
        });
        expect(getVisibleTabs(result)).toContain('export');
    });

    it('export tab is hidden when geometries are empty', () => {
        expect(getVisibleTabs(fixture({ geometries: [] }))).not.toContain('export');
    });
});
