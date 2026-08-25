// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { reviewToValidity, reviewToMechanismBanner } from '../../adapters/reviewToValidity';

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

    // KC-06: counts and provenance.
    it('a bare ok:true placeholder is NOT marked validated', () => {
        // `{ ok: true, diagnostics: [] }` is what GeometryContext substitutes
        // for a missing `review` block and what the dev endpoint's `live=1`
        // short-circuit returns. Nothing validated; the flag must say so.
        expect(reviewToValidity({ ok: true })?.validated).toBe(false);
        expect(reviewToValidity({ ok: true, diagnostics: [], live: true })?.validated).toBe(false);
    });

    it('a review carrying validator / fitness / mechanism evidence IS validated', () => {
        expect(
            reviewToValidity({ ok: true, validator: { partCount: 2, jointCount: 1 } })?.validated,
        ).toBe(true);
        expect(reviewToValidity({ ok: true, fitness: { functional: true } })?.validated).toBe(true);
        expect(reviewToValidity({ ok: true, mechanism: 'real' })?.validated).toBe(true);
        expect(reviewToValidity({ ok: true, mechanism: 'unverified' })?.validated).toBe(false);
        expect(
            reviewToValidity({ ok: false, diagnostics: [{ message: 'x' }] })?.validated,
        ).toBe(true);
    });

    it('counts come from the loaded model when the payload has no validator block', () => {
        const v = reviewToValidity({ ok: true }, { partCount: 2, jointCount: 1 });
        expect(v?.partCount).toBe(2);
        expect(v?.jointCount).toBe(1);
    });

    it("the server's validator counts win over the local model counts", () => {
        const v = reviewToValidity(
            { ok: true, validator: { partCount: 5, jointCount: 4 } },
            { partCount: 2, jointCount: 1 },
        );
        expect(v?.partCount).toBe(5);
        expect(v?.jointCount).toBe(4);
    });

    it('mechanism: broken overrides ok:true → status=error', () => {
        // P1 surface convergence: the loop's mechanism verdict is the
        // merge gate, so a broken mechanism flips status to error even
        // when the legacy fitness summary is still reporting ok:true.
        const v = reviewToValidity({
            ok: true,
            mechanism: 'broken',
            mechanismFailures: [
                { code: 'mechanism.disconnect', severity: 'error', message: 'x', hint: 'y' },
            ],
        });
        expect(v?.status).toBe('error');
    });
});

describe('reviewToMechanismBanner', () => {
    it('null review → null banner', () => {
        expect(reviewToMechanismBanner(null)).toBeNull();
    });

    it('mechanism missing → null banner (unverified default)', () => {
        expect(reviewToMechanismBanner({ ok: true })).toBeNull();
    });

    it('mechanism: real → null banner', () => {
        expect(reviewToMechanismBanner({ ok: true, mechanism: 'real' })).toBeNull();
    });

    it('mechanism: unverified → null banner', () => {
        expect(
            reviewToMechanismBanner({ ok: true, mechanism: 'unverified' }),
        ).toBeNull();
    });

    it('mechanism: broken with no failures → null banner (defensive)', () => {
        // The recompute should never return broken + empty failures,
        // but defend against it so we don't render a banner that says
        // "broken" with no rows to explain why.
        expect(
            reviewToMechanismBanner({
                ok: false,
                mechanism: 'broken',
                mechanismFailures: [],
            }),
        ).toBeNull();
    });

    it('mechanism: broken with failures → entries[] with code+message+hint', () => {
        const banner = reviewToMechanismBanner({
            ok: false,
            mechanism: 'broken',
            mechanismFailures: [
                {
                    code: 'mechanism.disconnect',
                    severity: 'error',
                    message: 'spring drifts',
                    hint: 'bind to a topology connector',
                },
                {
                    code: 'mechanism.interpenetration',
                    severity: 'error',
                    message: 'parts overlap',
                    hint: 'add clearance',
                },
            ],
        });
        expect(banner).not.toBeNull();
        expect(banner?.entries).toHaveLength(2);
        expect(banner?.entries[0]).toEqual({
            code: 'mechanism.disconnect',
            message: 'spring drifts',
            hint: 'bind to a topology connector',
        });
        expect(banner?.entries[1].code).toBe('mechanism.interpenetration');
    });

    it('entries default missing fields to safe strings', () => {
        const banner = reviewToMechanismBanner({
            ok: false,
            mechanism: 'broken',
            mechanismFailures: [{ severity: 'error' }],
        });
        expect(banner?.entries[0]).toEqual({
            code: 'mechanism.unknown',
            message: '',
            hint: '',
        });
    });
});
