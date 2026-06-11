// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import {
    STUDIO_DIAGNOSTIC_CODES,
    STUDIO_HINTS,
    makeStudioDiagnostic,
} from '../diagnostics';

describe('Studio diagnostics registry', () => {
    it('exposes exactly 6 codes', () => {
        expect(STUDIO_DIAGNOSTIC_CODES).toHaveLength(6);
        expect(new Set(STUDIO_DIAGNOSTIC_CODES).size).toBe(6);
    });

    it('every code has a non-empty hint', () => {
        for (const code of STUDIO_DIAGNOSTIC_CODES) {
            const hint = STUDIO_HINTS[code];
            expect(hint, `missing hint for ${code}`).toBeTruthy();
            expect(hint.length, `empty hint for ${code}`).toBeGreaterThan(20);
        }
    });

    it('hint keys exactly match the code list (no orphans, no missing)', () => {
        const codeSet = new Set<string>(STUDIO_DIAGNOSTIC_CODES);
        const hintKeys = new Set(Object.keys(STUDIO_HINTS));
        expect(hintKeys).toEqual(codeSet);
    });

    it('makeStudioDiagnostic bakes the canonical hint', () => {
        const d = makeStudioDiagnostic('studio.worker.crashed', 'native exception');
        expect(d.code).toBe('studio.worker.crashed');
        expect(d.hint).toBe(STUDIO_HINTS['studio.worker.crashed']);
        expect(d.message).toBe('native exception');
        expect(d.severity).toBe('error');
    });

    it('makeStudioDiagnostic accepts severity + scriptLocation', () => {
        const d = makeStudioDiagnostic(
            'studio.script.parse-failed',
            'unexpected token',
            { severity: 'warning', scriptLocation: { line: 12, column: 4 } },
        );
        expect(d.severity).toBe('warning');
        expect(d.scriptLocation).toEqual({ line: 12, column: 4 });
    });
});
