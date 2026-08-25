// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment jsdom */
//
// KC-06 regression, end to end through the real adapters.
//
// Observed on app.kernelcad.com: opening a saved project whose model has 2
// parts and 1 revolute joint rendered `solved · 0 parts · 0 joints · 0
// diagnostics` in the Validity tab while the Scene tab listed both parts. Two
// defects stacked:
//
//   1. `reviewToValidity` hardcoded `partCount: 0, jointCount: 0`, so EVERY
//      model reported zero regardless of what it declared.
//   2. When a mesh response carries no `review` block (every session-backed
//      load), `GeometryContext` substitutes `{ ok: true, diagnostics: [] }`
//      and `deriveStatus` turned that `ok` into a green `solved` — a passing
//      verdict computed over nothing.
//
// This test drives the real `countModelTopology` + `reviewToValidity` pair so
// a regression in either one fails here, not just in an adapter unit test.
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StudioRecomputeResult } from '../../types';

const mockUseRecomputeResult = vi.fn<() => StudioRecomputeResult>();

vi.mock('../../hooks/useRecomputeResult', () => ({
    useRecomputeResult: () => mockUseRecomputeResult(),
}));

vi.mock('../../hooks/useFeatureSelection', () => ({
    useFeatureSelection: () => ({ selectedFeatureId: null, selectFeature: vi.fn() }),
}));

import { ValidityTab } from '../../tabs/ValidityTab';
import { shellStore } from '../../store/shellStore';
import { countModelTopology } from '../../adapters/featureRecordsToCounts';
import { reviewToValidity } from '../../adapters/reviewToValidity';
import { extractJointSnapshots } from '../../adapters/featureRecordsToMates';
import { getVisibleTabs } from '../../logic/adaptiveTabs';
import type { ScriptReviewSummary } from '../../context/GeometryContext';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import {
    jointPrimitiveModelRecords,
    mateModelRecords,
} from '../fixtures/assemblyFeatureRecordFixtures';

/** Build the shell snapshot the way `useRecomputeResult` does for a given
 *  set of loaded feature records + review payload. */
function resultFor(
    records: FeatureRecord[],
    review: ScriptReviewSummary | null,
): StudioRecomputeResult {
    return {
        features: records,
        geometries: [],
        validity: reviewToValidity(review, countModelTopology(records)),
        paramTable: null,
        diagnostics: [],
        recomputeMs: 0,
        rawInterferencePairs: [],
        joints: extractJointSnapshots(records, null),
        mechanismBanner: null,
        suggestedRepairPrompt: null,
        repairEvidence: null,
    };
}

/** What the hosted mesh path substitutes when the payload carries no
 *  `review` block. `ok: true` with nothing behind it. */
const PLACEHOLDER_REVIEW: ScriptReviewSummary = { ok: true, diagnostics: [] };

/** A review that really ran: `reviewPipeline` always returns the validator
 *  block, a fitness summary and a mechanism verdict. */
const VALIDATED_REVIEW: ScriptReviewSummary = {
    ok: true,
    diagnostics: [],
    fitness: { functional: true, repairMode: 'none' },
    mechanism: 'real',
    validator: { status: 'solved', partCount: 2, jointCount: 1 },
};

afterEach(() => {
    cleanup();
    shellStore.reset();
});

beforeEach(() => {
    mockUseRecomputeResult.mockReset();
    shellStore.reset();
});

describe('ValidityTab reflects the model actually loaded (KC-06)', () => {
    it('joint-primitive model with 2 parts + 1 joint reports 2 and 1, not 0', () => {
        mockUseRecomputeResult.mockReturnValue(
            resultFor(jointPrimitiveModelRecords(), PLACEHOLDER_REVIEW),
        );

        render(<ValidityTab />);

        expect(screen.getByTestId('validity-counts').textContent).toBe(
            '2 parts · 1 joints · 0 diagnostics',
        );
    });

    it('mate-built model with 2 parts + 1 mate reports 2 and 1, not 0', () => {
        mockUseRecomputeResult.mockReturnValue(
            resultFor(mateModelRecords(), PLACEHOLDER_REVIEW),
        );

        render(<ValidityTab />);

        expect(screen.getByTestId('validity-counts').textContent).toBe(
            '2 parts · 1 joints · 0 diagnostics',
        );
    });

    it('a model no validation has run for does NOT render a green "solved"', () => {
        mockUseRecomputeResult.mockReturnValue(
            resultFor(jointPrimitiveModelRecords(), PLACEHOLDER_REVIEW),
        );

        render(<ValidityTab />);

        const chip = screen.getByTestId('validity-chip');
        expect(chip.textContent).toBe('not run');
        expect(chip.getAttribute('data-color')).not.toBe('green');
        expect(chip.getAttribute('data-status')).not.toBe('solved');
        expect(chip.getAttribute('data-validated')).toBe('false');
        expect(screen.getByTestId('validity-not-run-notice')).toBeTruthy();
    });

    it('a review that really ran still renders the green passing verdict', () => {
        mockUseRecomputeResult.mockReturnValue(
            resultFor(jointPrimitiveModelRecords(), VALIDATED_REVIEW),
        );

        render(<ValidityTab />);

        const chip = screen.getByTestId('validity-chip');
        expect(chip.textContent).toBe('solved');
        expect(chip.getAttribute('data-color')).toBe('green');
        expect(chip.getAttribute('data-validated')).toBe('true');
        expect(screen.queryByTestId('validity-not-run-notice')).toBeNull();
        expect(screen.getByTestId('validity-counts').textContent).toBe(
            '2 parts · 1 joints · 0 diagnostics',
        );
    });

    it('a real failure is still reported as itself when unvalidated evidence is absent', () => {
        // Guard against over-correcting: only the PASSING verdict may be
        // suppressed. An `ok: false` review with an error diagnostic carries
        // its own evidence and must keep reading `error`.
        mockUseRecomputeResult.mockReturnValue(
            resultFor(jointPrimitiveModelRecords(), {
                ok: false,
                diagnostics: [
                    { code: 'assembly.part.floating', severity: 'error', message: 'x', hint: 'y' },
                ],
            }),
        );

        render(<ValidityTab />);

        const chip = screen.getByTestId('validity-chip');
        expect(chip.textContent).toBe('error');
        expect(chip.getAttribute('data-color')).toBe('red');
    });
});

describe('Joints tab enablement (KC-06)', () => {
    it('a joint-primitive model surfaces its joint and enables the Joints tab', () => {
        const records = jointPrimitiveModelRecords();
        const snapshots = extractJointSnapshots(records, null);

        expect(snapshots).toHaveLength(1);
        expect(snapshots[0].mate.name).toBe('elbow');
        expect(snapshots[0].mate.type).toBe('revolute');
        expect(snapshots[0].mate.a.split('.')[0]).toBe('base');
        expect(snapshots[0].mate.b.split('.')[0]).toBe('arm');
        expect(snapshots[0].poseParamNames).toEqual(['elbowDeg']);

        expect(getVisibleTabs(resultFor(records, PLACEHOLDER_REVIEW))).toContain('joints');
    });

    it('a mate-built model still surfaces its mate', () => {
        expect(getVisibleTabs(resultFor(mateModelRecords(), PLACEHOLDER_REVIEW))).toContain(
            'joints',
        );
    });
});
