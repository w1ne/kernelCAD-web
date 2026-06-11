// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { computeValidityDelta } from '../logic/validityDelta';
import type { ValidatorDiagnostic, ValidatorResult } from '../../modeling/mates/validator';

function result(
    status: ValidatorResult['status'],
    diagnostics: ValidatorDiagnostic[] = [],
): ValidatorResult {
    return {
        status,
        diagnostics,
        partCount: 0,
        jointCount: 0,
    };
}

const floatingHorn: ValidatorDiagnostic = {
    code: 'assembly.part.floating',
    severity: 'error',
    message: 'output-horn floats',
    hint: 'add a mate to output-horn',
    partName: 'output-horn',
};

const overConstrainedJaw: ValidatorDiagnostic = {
    code: 'assembly.mate.over-constrained',
    severity: 'error',
    message: 'jaw-coupling over-constrained',
    hint: 'jaw-coupling and gripper-coupling both fix the jaw',
    mateName: 'jaw-coupling',
};

const interferenceA: ValidatorDiagnostic = {
    code: 'assembly.interference.overlap',
    severity: 'error',
    message: 'shoulder overlaps base',
    hint: 'separate the parts',
    partA: 'shoulder-servo',
    partB: 'base-plate',
    volumeMm3: 12.4,
};

describe('computeValidityDelta', () => {
    it('null prev → null status was, no counts', () => {
        const delta = computeValidityDelta(null, result('solved', []));
        expect(delta.statusWas).toBeNull();
        expect(delta.statusNow).toBe('solved');
        expect(delta.newCount).toBe(0);
        expect(delta.clearedCount).toBe(0);
        expect(delta.netCount).toBe(0);
    });

    it('null curr → null status now', () => {
        const delta = computeValidityDelta(result('solved', []), null);
        expect(delta.statusWas).toBe('solved');
        expect(delta.statusNow).toBeNull();
        expect(delta.newCount).toBe(0);
    });

    it('solved → solved with no diagnostics → no delta', () => {
        const delta = computeValidityDelta(result('solved', []), result('solved', []));
        expect(delta.statusWas).toBe('solved');
        expect(delta.statusNow).toBe('solved');
        expect(delta.newCount).toBe(0);
        expect(delta.clearedCount).toBe(0);
    });

    it('solved → error with 2 new diagnostics', () => {
        const delta = computeValidityDelta(
            result('solved', []),
            result('error', [floatingHorn, overConstrainedJaw]),
        );
        expect(delta.statusWas).toBe('solved');
        expect(delta.statusNow).toBe('error');
        expect(delta.newCount).toBe(2);
        expect(delta.clearedCount).toBe(0);
        expect(delta.netCount).toBe(2);
    });

    it('error → solved with 2 cleared', () => {
        const delta = computeValidityDelta(
            result('error', [floatingHorn, overConstrainedJaw]),
            result('solved', []),
        );
        expect(delta.statusWas).toBe('error');
        expect(delta.statusNow).toBe('solved');
        expect(delta.newCount).toBe(0);
        expect(delta.clearedCount).toBe(2);
        expect(delta.netCount).toBe(-2);
    });

    it('mixed: 1 stays, 1 cleared, 1 new', () => {
        const delta = computeValidityDelta(
            result('error', [floatingHorn, overConstrainedJaw]),
            result('error', [floatingHorn, interferenceA]),
        );
        expect(delta.newCount).toBe(1);
        expect(delta.clearedCount).toBe(1);
        expect(delta.netCount).toBe(0);
    });

    it('diagnostic identity is code + target — same code on a different part counts as new+cleared', () => {
        const onHorn: ValidatorDiagnostic = { ...floatingHorn, partName: 'output-horn' };
        const onBracket: ValidatorDiagnostic = { ...floatingHorn, partName: 'bracket' };
        const delta = computeValidityDelta(
            result('error', [onHorn]),
            result('error', [onBracket]),
        );
        expect(delta.newCount).toBe(1);
        expect(delta.clearedCount).toBe(1);
    });

    it('interference pair uses partA::partB as target', () => {
        const otherInterference: ValidatorDiagnostic = {
            ...interferenceA,
            partA: 'shoulder-servo',
            partB: 'bracket',
        };
        const delta = computeValidityDelta(
            result('error', [interferenceA]),
            result('error', [interferenceA, otherInterference]),
        );
        expect(delta.newCount).toBe(1);
        expect(delta.clearedCount).toBe(0);
    });
});
