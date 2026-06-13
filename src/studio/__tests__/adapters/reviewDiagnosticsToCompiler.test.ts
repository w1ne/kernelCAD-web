// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { reviewDiagnosticsToCompiler } from '../../adapters/reviewDiagnosticsToCompiler';

describe('reviewDiagnosticsToCompiler', () => {
    it('null review → empty array', () => {
        expect(reviewDiagnosticsToCompiler(null)).toEqual([]);
    });

    it('review without diagnostics → empty array', () => {
        expect(reviewDiagnosticsToCompiler({ ok: true })).toEqual([]);
    });

    it('one diagnostic with full fields → one CompilerDiagnostic', () => {
        const result = reviewDiagnosticsToCompiler({
            ok: false,
            diagnostics: [{
                code: 'feature.kernel-failed',
                severity: 'error',
                message: 'OCCT exception',
                hint: 'reduce fillet radius',
            }],
        });
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            target: 'export-occt',
            code: 'feature.kernel-failed',
            severity: 'error',
            message: 'OCCT exception',
            hint: 'reduce fillet radius',
        });
    });

    it('severity "warning" maps to "warn"', () => {
        const result = reviewDiagnosticsToCompiler({
            ok: false,
            diagnostics: [{ severity: 'warning', message: 'x', hint: 'y' }],
        });
        expect(result[0].severity).toBe('warn');
    });

    it('missing severity defaults to error', () => {
        const result = reviewDiagnosticsToCompiler({
            ok: false,
            diagnostics: [{ message: 'x', hint: 'y' }],
        });
        expect(result[0].severity).toBe('error');
    });
});
