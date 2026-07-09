// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { GenerationPhase } from '../../funnel/hooks/useGeneration';

const mockGeneration = vi.hoisted(() => ({
    phase: { state: 'idle' } as GenerationPhase,
    events: [] as unknown[],
    submit: vi.fn(),
}));

const mockCode = vi.hoisted(() => ({
    setCode: vi.fn(),
}));

const mockGeometry = vi.hoisted(() => ({
    executeGeometry: vi.fn(),
}));

const mockSelection = vi.hoisted(() => ({
    selectedFeatureId: null as string | null,
}));

const mockShell = vi.hoisted(() => ({
    agentDraftPrompt: null as string | null,
    agentDraftPromptVersion: 0,
    agentRepairWorkflow: null as {
        cardId: string;
        code: string;
        promptText: string;
        targetId: string | null;
        promptSource: 'review' | 'fallback';
        validityFingerprint: string;
        state: 'drafted' | 'running';
    } | null,
    setAgentRepairWorkflow: vi.fn(),
}));

vi.mock('../agentAvailability', () => ({
    inAppAgentEnabled: () => true,
}));

vi.mock('../../funnel/hooks/useGeneration', () => ({
    useGeneration: () => mockGeneration,
}));

vi.mock('../context/CodeContext', () => ({
    useCode: () => mockCode,
}));

vi.mock('../context/GeometryContext', () => ({
    useGeometry: () => mockGeometry,
}));

vi.mock('../hooks/useFeatureSelection', () => ({
    useFeatureSelection: () => ({
        selectedFeatureId: mockSelection.selectedFeatureId,
        selectFeature: vi.fn(),
    }),
}));

vi.mock('../store/useShellStore', () => ({
    useShellStore: () => ({
        agentDraftPrompt: mockShell.agentDraftPrompt,
        agentDraftPromptVersion: mockShell.agentDraftPromptVersion,
        agentRepairWorkflow: mockShell.agentRepairWorkflow,
    }),
    shellStore: {
        setAgentRepairWorkflow: mockShell.setAgentRepairWorkflow,
    },
}));

import { StudioGenerate } from '../StudioGenerate';

beforeEach(() => {
    mockGeneration.phase = { state: 'idle' };
    mockGeneration.events = [];
    mockGeneration.submit.mockReset();
    mockCode.setCode.mockReset();
    mockGeometry.executeGeometry.mockReset();
    mockSelection.selectedFeatureId = null;
    mockShell.agentDraftPrompt = null;
    mockShell.agentDraftPromptVersion = 0;
    mockShell.agentRepairWorkflow = null;
    mockShell.setAgentRepairWorkflow.mockReset();
});

afterEach(() => cleanup());

describe('StudioGenerate', () => {
    it('renders whole-model target when no feature is selected', () => {
        render(<StudioGenerate />);
        expect(screen.getByTestId('studio-generate-target').textContent).toBe('Target: whole model');
    });

    it('renders selected feature target', () => {
        mockSelection.selectedFeatureId = 'hinge-pin';
        render(<StudioGenerate />);
        expect(screen.getByTestId('studio-generate-target').textContent).toBe('Target: hinge-pin');
    });

    it('submits the raw trimmed prompt when no feature is selected', () => {
        render(<StudioGenerate />);
        const prompt = screen.getByLabelText('Generate prompt');
        fireEvent.change(prompt, { target: { value: '  make a bracket  ' } });
        fireEvent.submit(prompt.closest('form')!);
        expect(mockGeneration.submit).toHaveBeenCalledWith('make a bracket');
    });

    it('prefixes the prompt with selected target context when a feature is selected', () => {
        mockSelection.selectedFeatureId = 'hinge-pin';
        render(<StudioGenerate />);
        const prompt = screen.getByLabelText('Generate prompt');
        fireEvent.change(prompt, {
            target: { value: '  add 2 mm clearance  ' },
        });
        fireEvent.submit(prompt.closest('form')!);
        expect(mockGeneration.submit).toHaveBeenCalledWith(
            'Edit selected target "hinge-pin": add 2 mm clearance',
        );
    });

    it('marks the active repair workflow running when the drafted prompt is submitted', () => {
        mockSelection.selectedFeatureId = 'output-horn';
        mockShell.agentDraftPrompt = 'Fix assembly.part.floating: output-horn floats Action: add a mate';
        mockShell.agentDraftPromptVersion = 1;
        mockShell.agentRepairWorkflow = {
            cardId: 'diagnostic:assembly.part.floating:output-horn:0',
            code: 'assembly.part.floating',
            promptText: 'Fix assembly.part.floating: output-horn floats Action: add a mate',
            targetId: 'output-horn',
            promptSource: 'fallback',
            validityFingerprint: 'before',
            state: 'drafted',
        };
        render(<StudioGenerate />);

        const prompt = screen.getByLabelText('Generate prompt');
        fireEvent.submit(prompt.closest('form')!);

        expect(mockShell.setAgentRepairWorkflow).toHaveBeenCalledWith({
            ...mockShell.agentRepairWorkflow,
            state: 'running',
        });
        expect(mockGeneration.submit).toHaveBeenCalledWith(
            'Edit selected target "output-horn": Fix assembly.part.floating: output-horn floats Action: add a mate',
        );
    });

    it('does not mark a drafted repair running when the selected target changed', () => {
        mockSelection.selectedFeatureId = 'hinge-pin';
        mockShell.agentDraftPrompt = 'Fix assembly.part.floating: output-horn floats Action: add a mate';
        mockShell.agentDraftPromptVersion = 1;
        mockShell.agentRepairWorkflow = {
            cardId: 'diagnostic:assembly.part.floating:output-horn:0',
            code: 'assembly.part.floating',
            promptText: 'Fix assembly.part.floating: output-horn floats Action: add a mate',
            targetId: 'output-horn',
            promptSource: 'fallback',
            validityFingerprint: 'before',
            state: 'drafted',
        };
        render(<StudioGenerate />);

        const prompt = screen.getByLabelText('Generate prompt');
        fireEvent.submit(prompt.closest('form')!);

        expect(mockShell.setAgentRepairWorkflow).not.toHaveBeenCalled();
        expect(mockGeneration.submit).toHaveBeenCalledWith(
            'Edit selected target "hinge-pin": Fix assembly.part.floating: output-horn floats Action: add a mate',
        );
    });

    it('rolls a running repair workflow back to drafted when generation errors', () => {
        mockGeneration.phase = {
            state: 'error',
            code: 'network',
            message: 'stream failed',
        };
        mockShell.agentRepairWorkflow = {
            cardId: 'diagnostic:assembly.part.floating:output-horn:0',
            code: 'assembly.part.floating',
            promptText: 'Fix assembly.part.floating: output-horn floats Action: add a mate',
            targetId: 'output-horn',
            promptSource: 'fallback',
            validityFingerprint: 'before',
            state: 'running',
        };

        render(<StudioGenerate />);

        expect(mockShell.setAgentRepairWorkflow).toHaveBeenCalledWith({
            ...mockShell.agentRepairWorkflow,
            state: 'drafted',
        });
    });

    it('loads the agent draft prompt into the textarea', () => {
        mockShell.agentDraftPrompt = 'Fix assembly.part.floating: output-horn floats Action: add a mate';

        render(<StudioGenerate />);

        expect((screen.getByLabelText('Generate prompt') as HTMLTextAreaElement).value).toBe(
            'Fix assembly.part.floating: output-horn floats Action: add a mate',
        );
    });

    it('allows editing an inserted draft and submits the edited prompt', () => {
        mockShell.agentDraftPrompt = 'Fix assembly.part.floating: output-horn floats Action: add a mate';
        mockShell.agentDraftPromptVersion = 1;
        render(<StudioGenerate />);
        const prompt = screen.getByLabelText('Generate prompt');

        fireEvent.change(prompt, {
            target: { value: 'Fix assembly.part.floating: output-horn floats Action: add two mates' },
        });
        fireEvent.submit(prompt.closest('form')!);

        expect((prompt as HTMLTextAreaElement).value).toBe(
            'Fix assembly.part.floating: output-horn floats Action: add two mates',
        );
        expect(mockGeneration.submit).toHaveBeenCalledWith(
            'Fix assembly.part.floating: output-horn floats Action: add two mates',
        );
    });

    it('re-applies the same draft text when the draft version changes', () => {
        mockShell.agentDraftPrompt = 'Fix assembly.part.floating: output-horn floats Action: add a mate';
        mockShell.agentDraftPromptVersion = 1;
        const { rerender } = render(<StudioGenerate />);
        const prompt = screen.getByLabelText('Generate prompt');

        fireEvent.change(prompt, { target: { value: '' } });
        expect((prompt as HTMLTextAreaElement).value).toBe('');

        mockShell.agentDraftPromptVersion = 2;
        rerender(<StudioGenerate />);

        expect((screen.getByLabelText('Generate prompt') as HTMLTextAreaElement).value).toBe(
            'Fix assembly.part.floating: output-horn floats Action: add a mate',
        );
    });
});
