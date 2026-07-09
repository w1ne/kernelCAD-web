// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
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
import { shellStore } from '../../store/shellStore';

function emptyResult(): StudioRecomputeResult {
    return {
        features: [],
        geometries: [],
        validity: null,
        paramTable: null,
        diagnostics: [],
        recomputeMs: 0,
        rawInterferencePairs: [],
        joints: [],
        mechanismBanner: null,
        suggestedRepairPrompt: null,
        repairEvidence: null,
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
    shellStore.reset();
});

beforeEach(() => {
    mockUseRecomputeResult.mockReset();
    mockSelectFeature.mockReset();
    shellStore.reset();
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

    it('renders a suggestion card above diagnostic rows for an error diagnostic', () => {
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

        const card = screen.getByTestId('validity-suggestion-card');
        const row = screen.getByTestId('diagnostic-row');
        expect(card.textContent).toContain('assembly.part.floating');
        expect(card.textContent).toContain('output-horn');
        expect(card.textContent).toContain('output-horn floats');
        expect(card.textContent).toContain('add a mate to output-horn');
        expect(card.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('clicking a suggestion card Jump button calls selectFeature with the target id', () => {
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

        fireEvent.click(screen.getByRole('button', { name: 'Jump' }));

        expect(mockSelectFeature).toHaveBeenCalledTimes(1);
        expect(mockSelectFeature).toHaveBeenCalledWith('output-horn');
    });

    it('clicking Use prompt drafts a repair prompt, selects the target, and opens the agent rail', () => {
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

        fireEvent.click(screen.getByRole('button', { name: 'Use prompt' }));

        expect(shellStore.getSnapshot().agentDraftPrompt).toBe(
            'Fix assembly.part.floating: output-horn floats Action: add a mate to output-horn',
        );
        expect(shellStore.getSnapshot().agentRailOpen).toBe(true);
        expect(shellStore.getSnapshot().agentRepairWorkflow).toMatchObject({
            cardId: 'diagnostic:assembly.part.floating:output-horn:0',
            code: 'assembly.part.floating',
            promptText: 'Fix assembly.part.floating: output-horn floats Action: add a mate to output-horn',
            targetId: 'output-horn',
            state: 'drafted',
        });
        expect(mockSelectFeature).toHaveBeenCalledTimes(1);
        expect(mockSelectFeature).toHaveBeenCalledWith('output-horn');
    });

    it('labels the active suggestion card as drafted after Use prompt', () => {
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

        fireEvent.click(screen.getByRole('button', { name: 'Use prompt' }));

        const card = screen.getByTestId('validity-suggestion-card');
        expect(card.getAttribute('data-workflow-state')).toBe('drafted');
        expect(card.textContent).toContain('Drafted');
    });

    it('labels the active suggestion card as running when Studio Generate submits the drafted prompt', () => {
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

        const { rerender } = render(<ValidityTab />);

        fireEvent.click(screen.getByRole('button', { name: 'Use prompt' }));
        const workflow = shellStore.getSnapshot().agentRepairWorkflow;
        shellStore.setAgentRepairWorkflow(workflow == null ? null : { ...workflow, state: 'running' });
        rerender(<ValidityTab />);

        const card = screen.getByTestId('validity-suggestion-card');
        expect(card.getAttribute('data-workflow-state')).toBe('running');
        expect(card.textContent).toContain('Running');
    });

    it('marks the drafted card still failing after a recheck with the same diagnostic', () => {
        const diag: ValidatorDiagnostic = {
            code: 'assembly.part.floating',
            severity: 'error',
            message: 'output-horn floats',
            hint: 'add a mate to output-horn',
            partName: 'output-horn',
        };
        const firstResult = withValidity(makeValidity('error', [diag], 1, 0));
        const secondResult = withValidity(makeValidity('error', [
            { ...diag, message: 'output-horn still floats' },
        ], 1, 0));
        mockUseRecomputeResult.mockReturnValue(firstResult);
        const { rerender } = render(<ValidityTab />);

        fireEvent.click(screen.getByRole('button', { name: 'Use prompt' }));
        const workflow = shellStore.getSnapshot().agentRepairWorkflow;
        shellStore.setAgentRepairWorkflow(workflow == null ? null : { ...workflow, state: 'running' });
        mockUseRecomputeResult.mockReturnValue(secondResult);
        rerender(<ValidityTab />);

        const card = screen.getByTestId('validity-suggestion-card');
        expect(card.getAttribute('data-workflow-state')).toBe('still-failing');
        expect(card.textContent).toContain('Rechecked');
        expect(card.textContent).toContain('Still failing');
    });

    it('does not mark drafted cards rechecked before the repair has been submitted', () => {
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
        const { rerender } = render(<ValidityTab />);

        fireEvent.click(screen.getByRole('button', { name: 'Use prompt' }));
        mockUseRecomputeResult.mockReturnValue(
            withValidity(makeValidity('error', [
                { ...diag, message: 'output-horn wording changed' },
            ], 1, 0)),
        );
        rerender(<ValidityTab />);

        const card = screen.getByTestId('validity-suggestion-card');
        expect(card.getAttribute('data-workflow-state')).toBe('drafted');
        expect(card.textContent).toContain('Drafted');
        expect(card.textContent).not.toContain('Still failing');
        expect(screen.queryByTestId('validity-suggestion-workflow-summary')).toBeNull();
    });

    it('keeps a compact fixed recheck summary when the drafted card disappears', () => {
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
        const { rerender } = render(<ValidityTab />);

        fireEvent.click(screen.getByRole('button', { name: 'Use prompt' }));
        const workflow = shellStore.getSnapshot().agentRepairWorkflow;
        shellStore.setAgentRepairWorkflow(workflow == null ? null : { ...workflow, state: 'running' });
        mockUseRecomputeResult.mockReturnValue(
            withValidity(makeValidity('solved', [], 1, 1)),
        );
        rerender(<ValidityTab />);

        const summary = screen.getByTestId('validity-suggestion-workflow-summary');
        expect(summary.getAttribute('data-workflow-state')).toBe('fixed');
        expect(summary.textContent).toContain('Rechecked');
        expect(summary.textContent).toContain('Fixed');
    });

    it('does not report fixed when the same failure remains outside the visible card limit', () => {
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
        const { rerender } = render(<ValidityTab />);

        fireEvent.click(screen.getByRole('button', { name: 'Use prompt' }));
        const workflow = shellStore.getSnapshot().agentRepairWorkflow;
        shellStore.setAgentRepairWorkflow(workflow == null ? null : { ...workflow, state: 'running' });
        mockUseRecomputeResult.mockReturnValue({
            ...withValidity(makeValidity('error', [
                { ...diag, message: 'output-horn still floats' },
            ], 1, 0)),
            mechanismBanner: {
                entries: [
                    { code: 'mechanism.disconnect', message: 'drive chain disconnected', hint: 'connect drive' },
                    { code: 'mechanism.orphan-part', message: 'orphan part', hint: 'add mate' },
                    { code: 'mechanism.no-actuator', message: 'no actuator', hint: 'add actuator' },
                ],
            },
        });
        rerender(<ValidityTab />);

        const summary = screen.getByTestId('validity-suggestion-workflow-summary');
        expect(summary.getAttribute('data-workflow-state')).toBe('still-failing');
        expect(summary.textContent).toContain('Rechecked');
        expect(summary.textContent).toContain('Still failing');
        expect(summary.textContent).not.toContain('Fixed');
    });

    it('renders fallback prompt preview and source on a suggestion card', () => {
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

        const card = screen.getByTestId('validity-suggestion-card');
        const preview = screen.getByTestId('validity-suggestion-prompt-preview');
        expect(card.getAttribute('data-prompt-source')).toBe('fallback');
        expect(preview.textContent).toContain('Fallback prompt');
        expect(preview.textContent).toContain(
            'Fix assembly.part.floating: output-horn floats Action: add a mate to output-horn',
        );
    });

    it('clicking Use prompt drafts the backend suggested prompt and still selects the target', () => {
        const diag: ValidatorDiagnostic = {
            code: 'assembly.part.floating',
            severity: 'error',
            message: 'output-horn floats',
            hint: 'add a mate to output-horn',
            partName: 'output-horn',
        };

        mockUseRecomputeResult.mockReturnValue({
            ...withValidity(makeValidity('error', [diag], 1, 0)),
            suggestedRepairPrompt: 'Rebuild the horn support from deterministic review evidence.',
        });

        render(<ValidityTab />);

        fireEvent.click(screen.getByRole('button', { name: 'Use prompt' }));

        expect(shellStore.getSnapshot().agentDraftPrompt).toBe(
            'Rebuild the horn support from deterministic review evidence.',
        );
        expect(shellStore.getSnapshot().agentRailOpen).toBe(true);
        expect(mockSelectFeature).toHaveBeenCalledTimes(1);
        expect(mockSelectFeature).toHaveBeenCalledWith('output-horn');
    });

    it('renders review prompt preview and source on a suggestion card', () => {
        const diag: ValidatorDiagnostic = {
            code: 'assembly.part.floating',
            severity: 'error',
            message: 'output-horn floats',
            hint: 'add a mate to output-horn',
            partName: 'output-horn',
        };

        mockUseRecomputeResult.mockReturnValue({
            ...withValidity(makeValidity('error', [diag], 1, 0)),
            suggestedRepairPrompt: 'Rebuild the horn support from deterministic review evidence.',
        });

        render(<ValidityTab />);

        const card = screen.getByTestId('validity-suggestion-card');
        const preview = screen.getByTestId('validity-suggestion-prompt-preview');
        expect(card.getAttribute('data-prompt-source')).toBe('review');
        expect(preview.textContent).toContain('Review prompt');
        expect(preview.textContent).toContain(
            'Rebuild the horn support from deterministic review evidence.',
        );
    });

    it('renders compact repair evidence only on the card with matching blocker content', () => {
        const diag: ValidatorDiagnostic = {
            code: 'assembly.part.floating',
            severity: 'error',
            message: 'output-horn floats',
            hint: 'add a mate to output-horn',
            partName: 'output-horn',
        };

        mockUseRecomputeResult.mockReturnValue({
            ...withValidity(makeValidity('error', [diag], 1, 0)),
            mechanismBanner: {
                entries: [
                    {
                        code: 'mechanism.disconnect',
                        message: 'drive chain is disconnected',
                        hint: 'connect the actuator to the output link',
                    },
                ],
            },
            repairEvidence: {
                repairMode: 'topology-redesign',
                blockingReasons: [
                    {
                        code: 'mechanism.disconnect',
                        message: 'drive chain is disconnected',
                        repairHint: 'connect the actuator to the output link',
                    },
                    {
                        code: 'unrelated.blocker',
                        message: 'unrelated blocker should stay hidden',
                        repairHint: 'do not render unrelated rows',
                    },
                ],
            },
        });

        render(<ValidityTab />);

        const cards = screen.getAllByTestId('validity-suggestion-card');
        const evidenceBlocks = screen.getAllByTestId('validity-suggestion-repair-evidence');
        expect(cards).toHaveLength(2);
        expect(evidenceBlocks).toHaveLength(1);
        expect(cards[0].textContent).toContain('mechanism.disconnect');
        expect(cards[0].contains(evidenceBlocks[0])).toBe(true);
        expect(cards[1].textContent).toContain('assembly.part.floating');
        expect(cards[1].textContent).not.toContain('Repair mode: topology-redesign');

        const evidence = evidenceBlocks[0];
        expect(evidence.textContent).toContain('Repair mode: topology-redesign');
        expect(evidence.textContent).toContain('mechanism.disconnect');
        expect(evidence.textContent).toContain('drive chain is disconnected');
        expect(evidence.textContent).toContain('connect the actuator to the output link');
        expect(evidence.textContent).not.toContain('unrelated.blocker');
        expect(evidence.textContent).not.toContain('unrelated blocker should stay hidden');
    });

    it('omits compact repair evidence when repairEvidence is null', () => {
        const diag: ValidatorDiagnostic = {
            code: 'assembly.part.floating',
            severity: 'error',
            message: 'output-horn floats',
            hint: 'add a mate to output-horn',
            partName: 'output-horn',
        };

        mockUseRecomputeResult.mockReturnValue({
            ...withValidity(makeValidity('error', [diag], 1, 0)),
            repairEvidence: null,
        });

        render(<ValidityTab />);

        expect(screen.queryByTestId('validity-suggestion-repair-evidence')).toBeNull();
    });

    it('preserves and bounds multi-line review prompt previews', () => {
        const diag: ValidatorDiagnostic = {
            code: 'assembly.part.floating',
            severity: 'error',
            message: 'output-horn floats',
            hint: 'add a mate to output-horn',
            partName: 'output-horn',
        };
        const prompt = [
            'Repair deterministic review findings:',
            '- Rebuild output-horn as a connected support.',
            '- Preserve the driven linkage path.',
            'Verification: rerun review and keep all prompt text available.',
        ].join('\n');

        mockUseRecomputeResult.mockReturnValue({
            ...withValidity(makeValidity('error', [diag], 1, 0)),
            suggestedRepairPrompt: prompt,
        });

        render(<ValidityTab />);

        const preview = screen.getByTestId('validity-suggestion-prompt-preview');
        expect(preview.textContent).toContain(prompt);
        expect(preview.className).toContain('whitespace-pre-wrap');
        expect(preview.className).toContain('max-h-24');
        expect(preview.className).toContain('overflow-y-auto');
    });

    it('renders mechanism suggestion cards before diagnostic cards', () => {
        const diag: ValidatorDiagnostic = {
            code: 'assembly.part.floating',
            severity: 'error',
            message: 'output-horn floats',
            hint: 'add a mate to output-horn',
            partName: 'output-horn',
        };

        mockUseRecomputeResult.mockReturnValue({
            ...withValidity(makeValidity('error', [diag], 1, 0)),
            mechanismBanner: {
                entries: [
                    {
                        code: 'mechanism.disconnect',
                        message: 'drive chain is disconnected',
                        hint: 'connect the actuator to the output link',
                    },
                ],
            },
        });

        render(<ValidityTab />);

        const cards = screen.getAllByTestId('validity-suggestion-card');
        expect(cards).toHaveLength(2);
        expect(cards[0].textContent).toContain('mechanism.disconnect');
        expect(cards[0].textContent).toContain('Fix broken mechanism');
        expect(cards[1].textContent).toContain('assembly.part.floating');
        expect(cards[1].textContent).toContain('Fix output-horn');
    });

    it('renders mechanism suggestion cards as informational, non-button cards', () => {
        mockUseRecomputeResult.mockReturnValue({
            ...withValidity(makeValidity('error', [], 1, 0)),
            mechanismBanner: {
                entries: [
                    {
                        code: 'mechanism.disconnect',
                        message: 'drive chain is disconnected',
                        hint: 'connect the actuator to the output link',
                    },
                ],
            },
        });

        render(<ValidityTab />);

        const card = screen.getByTestId('validity-suggestion-card');
        expect(card.tagName).toBe('DIV');

        expect(mockSelectFeature).not.toHaveBeenCalled();
    });

    it('renders mechanism suggestion evidence and action text', () => {
        mockUseRecomputeResult.mockReturnValue({
            ...withValidity(makeValidity('error', [], 1, 0)),
            mechanismBanner: {
                entries: [
                    {
                        code: 'mechanism.disconnect',
                        message: 'drive chain is disconnected',
                        hint: 'connect the actuator to the output link',
                    },
                ],
            },
        });

        render(<ValidityTab />);

        const card = screen.getByTestId('validity-suggestion-card');
        expect(card.textContent).toContain('mechanism.disconnect');
        expect(card.textContent).toContain('drive chain is disconnected');
        expect(card.textContent).toContain('connect the actuator to the output link');
    });

    it('renders the MECHANISM BROKEN banner with one entry per failure', () => {
        // P1 surface convergence — when the recompute's mechanism
        // verdict is broken, the Validity tab surfaces the failure
        // list above the legacy diagnostic rows.
        mockUseRecomputeResult.mockReturnValue({
            ...withValidity(makeValidity('error', [], 3, 1)),
            mechanismBanner: {
                entries: [
                    {
                        code: 'mechanism.disconnect',
                        message: 'spring drifts',
                        hint: 'bind to a topology connector',
                    },
                    {
                        code: 'mechanism.orphan-part',
                        message: 'floating part',
                        hint: 'add a mate edge',
                    },
                ],
            },
        });

        render(<ValidityTab />);

        const banner = screen.getByTestId('mechanism-banner');
        expect(banner.textContent).toContain('MECHANISM BROKEN');
        const entries = screen.getAllByTestId('mechanism-banner-entry');
        expect(entries).toHaveLength(2);
        expect(entries[0].getAttribute('data-code')).toBe('mechanism.disconnect');
        expect(entries[0].textContent).toContain('spring drifts');
        expect(entries[0].textContent).toContain('bind to a topology connector');
        expect(entries[1].getAttribute('data-code')).toBe('mechanism.orphan-part');
    });

    it('omits the MECHANISM BROKEN banner when mechanismBanner is null', () => {
        mockUseRecomputeResult.mockReturnValue({
            ...withValidity(makeValidity('solved', [], 0, 0)),
            mechanismBanner: null,
        });
        render(<ValidityTab />);
        expect(screen.queryByTestId('mechanism-banner')).toBeNull();
    });
});
