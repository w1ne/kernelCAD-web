// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import type { ValidatorDiagnostic } from '../../modeling/mates/validator';
import {
    actionableInterferences,
    checkCategory,
    checksBadgeCount,
    countChecks,
    describeCounts,
    groupChecks,
} from '../logic/checksModel';

function diag(code: string, severity: ValidatorDiagnostic['severity'], extra: Partial<ValidatorDiagnostic> = {}): ValidatorDiagnostic {
    return { code: code as ValidatorDiagnostic['code'], severity, message: code, hint: '', ...extra };
}

const base = {
    validity: null,
    mechanismBanner: null,
    rawInterferencePairs: [],
    interferenceSummary: null,
};

describe('checkCategory', () => {
    it('sorts codes into mechanism, assembly, manufacturing and model', () => {
        expect(checkCategory('mechanism.disconnect')).toBe('mechanism');
        expect(checkCategory('kinematic.pose.out-of-limits')).toBe('mechanism');
        expect(checkCategory('assembly.part.floating')).toBe('assembly');
        expect(checkCategory('dfm.fdm.overhang-unsupported')).toBe('manufacturing');
        expect(checkCategory('feature.kernel-failed')).toBe('model');
    });
});

describe('groupChecks', () => {
    it('puts the worst group first and errors first inside a group, keeping validator order for ties', () => {
        const groups = groupChecks([
            diag('dfm.fdm.tip-risk', 'warning'),
            diag('assembly.part.orphan', 'info', { partName: 'a' }),
            diag('assembly.part.floating', 'error', { partName: 'b' }),
            diag('assembly.mate.over-constrained', 'error', { mateName: 'm' }),
        ]);
        expect(groups.map((g) => g.category)).toEqual(['assembly', 'manufacturing']);
        expect(groups[0]!.diagnostics.map((d) => d.code)).toEqual([
            'assembly.part.floating',
            'assembly.mate.over-constrained',
            'assembly.part.orphan',
        ]);
        expect(groups[0]!.severity).toBe('error');
    });
});

describe('actionableInterferences', () => {
    it('keeps pairs above the cap that no validator diagnostic reports, largest first', () => {
        const pairs = actionableInterferences({
            ...base,
            interferenceSummary: { rawCount: 4, contactNoiseCount: 1, actionableCount: 3, capMm3: 20 },
            rawInterferencePairs: [
                { a: 'pin', b: 'arm', volumeMm3: 5 },
                { a: 'lid', b: 'box', volumeMm3: 40 },
                { a: 'gear', b: 'shaft', volumeMm3: 300 },
                { a: 'b', b: 'a', volumeMm3: 90 },
            ],
            validity: {
                status: 'error',
                validated: true,
                partCount: 2,
                jointCount: 0,
                diagnostics: [diag('assembly.interference.overlap', 'error', { partA: 'a', partB: 'b' })],
            },
        });
        expect(pairs.map((p) => `${p.a}/${p.b}`)).toEqual(['gear/shaft', 'lid/box']);
    });
});

describe('countChecks', () => {
    it('counts mechanism failures as errors and extra interferences as warnings', () => {
        const counts = countChecks({
            ...base,
            mechanismBanner: { entries: [{ code: 'mechanism.disconnect', message: '', hint: '' }] },
            rawInterferencePairs: [{ a: 'x', b: 'y', volumeMm3: 1000 }],
            validity: {
                status: 'error',
                validated: true,
                partCount: 1,
                jointCount: 0,
                diagnostics: [diag('assembly.part.floating', 'error'), diag('assembly.part.orphan', 'info')],
            },
        });
        expect(counts).toEqual({ errors: 2, warnings: 1, infos: 1 });
        expect(describeCounts(counts)).toBe('2 errors · 1 warning · 1 note');
    });

    it('has no badge and no description when nothing needs attention', () => {
        expect(checksBadgeCount(null)).toBeUndefined();
        expect(checksBadgeCount(base)).toBeUndefined();
        expect(describeCounts({ errors: 0, warnings: 0, infos: 0 })).toBeNull();
    });
});
