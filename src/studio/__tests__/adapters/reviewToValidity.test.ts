import { describe, expect, it } from 'vitest';
import { reviewToValidity } from '../../adapters/reviewToValidity';

describe('reviewToValidity', () => {
    it('null review → null validity', () => {
        expect(reviewToValidity(null)).toBeNull();
    });

    it('ok:true → solved with empty diagnostics', () => {
        const v = reviewToValidity({ ok: true });
        expect(v?.status).toBe('solved');
        expect(v?.diagnostics).toEqual([]);
    });

    it('ok:false + repairMode set → error', () => {
        const v = reviewToValidity({ ok: false, fitness: { repairMode: 'compile' } });
        expect(v?.status).toBe('error');
    });

    it('ok:false + error-severity diag → error', () => {
        const v = reviewToValidity({
            ok: false,
            diagnostics: [{ code: 'assembly.part.floating', severity: 'error', message: 'x', hint: 'y' }],
        });
        expect(v?.status).toBe('error');
        expect(v?.diagnostics).toHaveLength(1);
        expect(v?.diagnostics[0].code).toBe('assembly.part.floating');
    });

    it('ok:false + only warnings → warning', () => {
        const v = reviewToValidity({
            ok: false,
            diagnostics: [{ severity: 'warning', message: 'x', hint: 'y' }],
        });
        expect(v?.status).toBe('warning');
    });

    it('missing severity defaults to error', () => {
        const v = reviewToValidity({ ok: false, diagnostics: [{ message: 'x' }] });
        expect(v?.diagnostics[0].severity).toBe('error');
    });
});
