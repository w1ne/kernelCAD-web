import { describe, expect, it } from 'vitest';
import { routeDiagnosticToSelection } from '../logic/diagnosticRouter';
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
