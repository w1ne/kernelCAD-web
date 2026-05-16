/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StudioRecomputeResult } from '../../types';
import type { ValidatorDiagnostic, ValidatorResult } from '../../../modeling/mates/validator';

const mockUseRecomputeResult = vi.fn<() => StudioRecomputeResult>();
const mockSelectFeature = vi.fn();

vi.mock('../../hooks/useRecomputeResult', () => ({
    useRecomputeResult: () => mockUseRecomputeResult(),
}));

vi.mock('../../hooks/useFeatureSelection', () => ({
    useFeatureSelection: () => ({
        selectedFeatureId: null,
        selectFeature: mockSelectFeature,
    }),
}));

import { ValidityTab } from '../../tabs/ValidityTab';

function emptyResult(): StudioRecomputeResult {
    return {
        features: [],
        geometries: [],
        validity: null,
        paramTable: null,
        diagnostics: [],
        recomputeMs: 0,
    };
}

function withValidity(v: ValidatorResult): StudioRecomputeResult {
    return { ...emptyResult(), validity: v };
}

function makeValidity(
    status: ValidatorResult['status'],
    diagnostics: ValidatorDiagnostic[] = [],
    partCount = 0,
    jointCount = 0,
): ValidatorResult {
    return { status, diagnostics, partCount, jointCount };
}

afterEach(() => {
    cleanup();
});

beforeEach(() => {
    mockUseRecomputeResult.mockReset();
    mockSelectFeature.mockReset();
});

describe('ValidityTab', () => {
    it('renders the empty state when validity is null', () => {
        mockUseRecomputeResult.mockReturnValue(emptyResult());

        render(<ValidityTab />);

        expect(screen.getByTestId('validity-empty-state').textContent).toContain(
            'No assembly to validate',
        );
        expect(screen.queryByTestId('validity-tab')).toBeNull();
    });

    it('renders a green chip and no rows for status=solved, 0 diagnostics', () => {
        mockUseRecomputeResult.mockReturnValue(
            withValidity(makeValidity('solved', [], 3, 2)),
        );

        render(<ValidityTab />);

        const chip = screen.getByTestId('validity-chip');
        expect(chip.getAttribute('data-color')).toBe('green');
        expect(chip.getAttribute('data-status')).toBe('solved');
        expect(chip.textContent).toBe('solved');

        expect(screen.getByTestId('validity-counts').textContent).toBe(
            '3 parts · 2 joints · 0 diagnostics',
        );

        expect(screen.queryByTestId('validity-diagnostics')).toBeNull();
        expect(screen.queryAllByTestId('diagnostic-row')).toHaveLength(0);
    });

    it('renders a red chip and 2 rows for status=error with 2 diagnostics', () => {
        const diag1: ValidatorDiagnostic = {
            code: 'assembly.part.floating',
            severity: 'error',
            message: 'output-horn floats',
            hint: 'add a mate to output-horn',
            partName: 'output-horn',
        };
        const diag2: ValidatorDiagnostic = {
            code: 'assembly.mate.over-constrained',
            severity: 'error',
            message: 'jaw over-constrained',
            hint: 'remove one mate',
            mateName: 'jaw-coupling',
        };

        mockUseRecomputeResult.mockReturnValue(
            withValidity(makeValidity('error', [diag1, diag2], 5, 3)),
        );

        render(<ValidityTab />);

        const chip = screen.getByTestId('validity-chip');
        expect(chip.getAttribute('data-color')).toBe('red');

        expect(screen.getByTestId('validity-counts').textContent).toBe(
            '5 parts · 3 joints · 2 diagnostics',
        );

        const rows = screen.getAllByTestId('diagnostic-row');
        expect(rows).toHaveLength(2);
        expect(rows[0].textContent).toContain('assembly.part.floating');
        expect(rows[0].textContent).toContain('output-horn');
        expect(rows[1].textContent).toContain('assembly.mate.over-constrained');
        expect(rows[1].textContent).toContain('jaw-coupling');
    });

    it('clicking a diagnostic row calls selectFeature with the routed partName', () => {
        const diag: ValidatorDiagnostic = {
            code: 'assembly.part.floating',
            severity: 'error',
            message: 'output-horn floats',
            hint: 'add a mate to output-horn',
            partName: 'output-horn',
        };

        mockUseRecomputeResult.mockReturnValue(
            withValidity(makeValidity('error', [diag], 1, 0)),
        );

        render(<ValidityTab />);

        fireEvent.click(screen.getByTestId('diagnostic-row'));

        expect(mockSelectFeature).toHaveBeenCalledTimes(1);
        expect(mockSelectFeature).toHaveBeenCalledWith('output-horn');
    });
});
