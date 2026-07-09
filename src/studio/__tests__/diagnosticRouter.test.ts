// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { routeDiagnosticToFocusTarget, routeDiagnosticToSelection } from '../logic/diagnosticRouter';
import type { ValidatorDiagnostic } from '../../modeling/mates/validator';

function diag(overrides: Partial<ValidatorDiagnostic>): ValidatorDiagnostic {
    return {
        code: 'assembly.part.floating',
        severity: 'error',
        message: 'x',
        hint: 'x',
        ...overrides,
    };
}

describe('routeDiagnosticToSelection', () => {
    it('partName wins over mateName and partA', () => {
        const target = routeDiagnosticToSelection(diag({
            partName: 'output-horn',
            mateName: 'jaw-coupling',
            partA: 'shoulder-servo',
        }));
        expect(target).toBe('output-horn');
    });

    it('mateName wins when no partName', () => {
        expect(routeDiagnosticToSelection(diag({
            mateName: 'jaw-coupling',
            partA: 'shoulder-servo',
        }))).toBe('jaw-coupling');
    });

    it('partA falls through when no part/mate name', () => {
        expect(routeDiagnosticToSelection(diag({
            partA: 'shoulder-servo',
            partB: 'base-plate',
        }))).toBe('shoulder-servo');
    });

    it('null when no binding fields present (kernel-level diagnostic)', () => {
        expect(routeDiagnosticToSelection(diag({}))).toBeNull();
    });

    it('null when only partB is set (sanity guard — should not happen but defensive)', () => {
        expect(routeDiagnosticToSelection(diag({ partB: 'base-plate' }))).toBeNull();
    });
});

describe('routeDiagnosticToFocusTarget', () => {
    it('focuses both parts for pair diagnostics while keeping partA primary', () => {
        expect(routeDiagnosticToFocusTarget(diag({
            code: 'assembly.interference.overlap',
            partA: 'bracket',
            partB: 'cover',
        }))).toEqual({
            ids: ['bracket', 'cover'],
            primaryId: 'bracket',
        });
    });

    it('deduplicates repeated pair endpoints', () => {
        expect(routeDiagnosticToFocusTarget(diag({
            partA: 'bracket',
            partB: 'bracket',
        }))).toEqual({
            ids: ['bracket'],
            primaryId: 'bracket',
        });
    });

    it('focuses a single named part diagnostic', () => {
        expect(routeDiagnosticToFocusTarget(diag({
            partName: 'output-horn',
        }))).toEqual({
            ids: ['output-horn'],
            primaryId: 'output-horn',
        });
    });

    it('does not treat mateName-only diagnostics as geometry focus targets', () => {
        expect(routeDiagnosticToFocusTarget(diag({
            mateName: 'jaw-coupling',
        }))).toBeNull();
    });

    it('returns null for diagnostics without geometry target fields', () => {
        expect(routeDiagnosticToFocusTarget(diag({}))).toBeNull();
    });
});
