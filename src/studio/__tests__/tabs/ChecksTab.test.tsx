// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StudioRecomputeResult, StudioValidity } from '../../types';
import type { ValidatorDiagnostic } from '../../../modeling/mates/validator';

const mockUseRecomputeResult = vi.fn<() => StudioRecomputeResult>();
const mockSelectFeature = vi.fn();

vi.mock('../../hooks/useRecomputeResult', () => ({
    useRecomputeResult: () => mockUseRecomputeResult(),
}));

vi.mock('../../hooks/useFeatureSelection', () => ({
    useFeatureSelection: () => ({ selectedFeatureId: null, selectFeature: mockSelectFeature }),
}));

import { ValidityTab } from '../../tabs/ValidityTab';
import { WorkbenchContext, type WorkbenchContextType } from '../../context/WorkbenchContext';
import { shellStore } from '../../store/shellStore';

function result(validity: StudioValidity | null, extra: Partial<StudioRecomputeResult> = {}): StudioRecomputeResult {
    return {
        features: [],
        geometries: [],
        validity,
        paramTable: null,
        diagnostics: [],
        recomputeMs: 0,
        rawInterferencePairs: [],
        interferenceSummary: null,
        joints: [],
        mechanismBanner: null,
        suggestedRepairPrompt: null,
        repairEvidence: null,
        ...extra,
    };
}

function validity(diagnostics: ValidatorDiagnostic[], validated = true): StudioValidity {
    return {
        status: diagnostics.some((d) => d.severity === 'error') ? 'error' : 'solved',
        diagnostics,
        partCount: 3,
        jointCount: 1,
        validated,
    };
}

const floating: ValidatorDiagnostic = {
    code: 'assembly.part.floating',
    severity: 'error',
    message: 'output-horn floats',
    hint: 'add a mate to output-horn',
    partName: 'output-horn',
};

const orphan: ValidatorDiagnostic = {
    code: 'assembly.part.orphan',
    severity: 'info',
    message: 'spacer is not referenced',
    hint: '',
    partName: 'spacer',
};

const overhang = {
    code: 'dfm.fdm.overhang-unsupported',
    severity: 'warning',
    message: 'overhang of 62° on lid',
    hint: 'add a 45° chamfer under the lip',
    partName: 'lid',
} as unknown as ValidatorDiagnostic;

afterEach(() => {
    cleanup();
    shellStore.reset();
});

beforeEach(() => {
    mockUseRecomputeResult.mockReset();
    mockSelectFeature.mockReset();
    shellStore.reset();
});

describe('Checks tab', () => {
    it('says all checks passed for a validated model with no findings', () => {
        mockUseRecomputeResult.mockReturnValue(result(validity([])));
        render(<ValidityTab />);
        expect(screen.getByTestId('checks-headline').textContent).toBe('All checks passed');
    });

    it('summarises findings by severity and groups them by category, worst first', () => {
        mockUseRecomputeResult.mockReturnValue(result(validity([overhang, orphan, floating])));
        render(<ValidityTab />);

        expect(screen.getByTestId('checks-headline').textContent).toBe('1 error · 1 warning · 1 note');
        const groups = screen.getAllByTestId('checks-group');
        expect(groups.map((g) => g.getAttribute('data-category'))).toEqual(['assembly', 'manufacturing']);
        const assemblyRows = within(groups[0]!).getAllByTestId('diagnostic-row');
        expect(assemblyRows.map((r) => r.getAttribute('data-code'))).toEqual([
            'assembly.part.floating',
            'assembly.part.orphan',
        ]);
        // Severity is announced as text, not only colour.
        expect(within(assemblyRows[0]!).getByRole('img', { name: 'Error' })).toBeTruthy();
        expect(within(groups[1]!).getByRole('img', { name: 'Warning' })).toBeTruthy();
    });

    it('shows the fix hint and a Fix with agent action only where a diagnostic has a hint', () => {
        mockUseRecomputeResult.mockReturnValue(result(validity([floating, orphan])));
        render(<ValidityTab />);

        const hints = screen.getAllByTestId('diagnostic-hint');
        expect(hints).toHaveLength(1);
        expect(hints[0]!.textContent).toBe('Fix: add a mate to output-horn');
        expect(screen.getByRole('button', { name: 'Fix assembly.part.floating with agent' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Fix assembly.part.orphan with agent' })).toBeNull();
    });

    it('Fix with agent on a finding drafts its repair prompt, selects the part and opens the agent rail', () => {
        // Four findings: the fourth has no suggestion card above the list, but its row can still be fixed.
        const extra = [1, 2, 3].map(
            (i): ValidatorDiagnostic => ({
                code: 'assembly.part.floating',
                severity: 'error',
                message: `p${i} floats`,
                hint: `mate p${i}`,
                partName: `p${i}`,
            }),
        );
        mockUseRecomputeResult.mockReturnValue(result(validity([...extra, overhang])));
        render(<ValidityTab />);

        expect(screen.getAllByTestId('validity-suggestion-card')).toHaveLength(3);
        fireEvent.click(screen.getByRole('button', { name: 'Fix dfm.fdm.overhang-unsupported with agent' }));

        const state = shellStore.getSnapshot();
        expect(state.agentDraftPrompt).toContain('dfm.fdm.overhang-unsupported');
        expect(state.agentDraftPrompt).toContain('add a 45° chamfer under the lip');
        expect(state.agentRailOpen).toBe(true);
        expect(state.agentRepairWorkflow?.code).toBe('dfm.fdm.overhang-unsupported');
        expect(state.agentRepairWorkflow?.state).toBe('drafted');
        expect(mockSelectFeature).toHaveBeenCalledWith('lid');
    });

    it('lists interferences the validator did not report and focuses both parts on click', () => {
        mockUseRecomputeResult.mockReturnValue(
            result(validity([]), {
                rawInterferencePairs: [
                    { a: 'gear', b: 'shaft', volumeMm3: 312.4 },
                    { a: 'pin', b: 'arm', volumeMm3: 2 },
                ],
                interferenceSummary: { rawCount: 2, contactNoiseCount: 1, actionableCount: 1, capMm3: 20 },
            }),
        );
        render(<ValidityTab />);

        const rows = screen.getAllByTestId('checks-interference-row');
        expect(rows).toHaveLength(1);
        expect(rows[0]!.textContent).toContain('gear ↔ shaft');
        expect(rows[0]!.textContent).toContain('312 mm³');
        fireEvent.click(rows[0]!);
        expect(mockSelectFeature).toHaveBeenCalledWith('gear');
        expect(shellStore.getSnapshot().viewportFocusTarget?.ids).toEqual(['gear', 'shaft']);
    });

    it('Run checks re-runs the geometry pipeline when there is no result yet', () => {
        const executeGeometry = vi.fn(async () => {});
        mockUseRecomputeResult.mockReturnValue(result(null));
        render(
            <WorkbenchContext.Provider
                value={{ code: 'return box(1,1,1);', executeGeometry, isComputing: false } as unknown as WorkbenchContextType}
            >
                <ValidityTab />
            </WorkbenchContext.Provider>,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Run checks' }));
        expect(executeGeometry).toHaveBeenCalledWith('return box(1,1,1);');
    });

    it('offers Run checks as the main action when nothing validated yet', () => {
        const executeGeometry = vi.fn(async () => {});
        mockUseRecomputeResult.mockReturnValue(result(validity([], false)));
        render(
            <WorkbenchContext.Provider
                value={{ code: 'x', executeGeometry, isComputing: false } as unknown as WorkbenchContextType}
            >
                <ValidityTab />
            </WorkbenchContext.Provider>,
        );

        expect(screen.getByTestId('checks-headline').textContent).toBe('Not checked yet');
        const run = screen.getByTestId('checks-run');
        expect(run.getAttribute('data-variant')).toBe('primary');
        fireEvent.click(run);
        expect(executeGeometry).toHaveBeenCalledTimes(1);
    });
});
