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
    }),
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
