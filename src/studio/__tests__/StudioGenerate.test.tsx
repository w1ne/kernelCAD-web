// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { GenerationPhase } from '../../funnel/hooks/useGeneration';

const mockGeneration = vi.hoisted(() => ({
    phase: { state: 'idle' } as GenerationPhase,
    events: [] as unknown[],
    submit: vi.fn(),
}));

const mockCode = vi.hoisted(() => ({
    code: '',
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
    stagedEdit: null as { id: string } | null,
    setAgentRepairWorkflow: vi.fn(),
    proposeStagedEdit: vi.fn(),
}));

vi.mock('../agentAvailability', () => ({
    inAppAgentEnabled: () => true,
}));

vi.mock('@monaco-editor/react', () => ({
    DiffEditor: () => <div data-testid="studio-generate-diff" />,
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
        stagedEdit: mockShell.stagedEdit,
    }),
    shellStore: {
        setAgentRepairWorkflow: mockShell.setAgentRepairWorkflow,
        proposeStagedEdit: mockShell.proposeStagedEdit,
    },
}));

import { StudioGenerate } from '../StudioGenerate';

beforeEach(() => {
    mockGeneration.phase = { state: 'idle' };
    mockGeneration.events = [];
    mockGeneration.submit.mockReset();
    mockCode.code = '';
    mockCode.setCode.mockReset();
    mockGeometry.executeGeometry.mockReset();
    mockSelection.selectedFeatureId = null;
    mockShell.agentDraftPrompt = null;
    mockShell.agentDraftPromptVersion = 0;
    mockShell.agentRepairWorkflow = null;
    mockShell.stagedEdit = null;
    mockShell.setAgentRepairWorkflow.mockReset();
    mockShell.proposeStagedEdit.mockReset();
});

afterEach(() => cleanup());

describe('StudioGenerate', () => {
    it('forwards a scaled reference photo through the active agent generation path', async () => {
        render(<StudioGenerate />);
        const photo = new File(['photo-bytes'], 'e-reader.png', { type: 'image/png' });

        fireEvent.change(screen.getByLabelText('Reference photo'), {
            target: { files: [photo] },
        });
        await waitFor(() => expect(screen.getByText('e-reader.png')).toBeTruthy());

        fireEvent.change(screen.getByLabelText('Known dimension label'), {
            target: { value: 'overall height' },
        });
        fireEvent.change(screen.getByLabelText('Known dimension (mm)'), {
            target: { value: '203' },
        });
        const prompt = screen.getByLabelText('Generate prompt');
        fireEvent.change(prompt, { target: { value: 'model this e-reader enclosure' } });
        fireEvent.submit(prompt.closest('form')!);

        expect(mockGeneration.submit).toHaveBeenCalledWith(
            'model this e-reader enclosure',
            undefined,
            undefined,
            expect.objectContaining({
                dataUrl: expect.stringMatching(/^data:image\/png;base64,/),
                fileName: 'e-reader.png',
                mimeType: 'image/png',
                knownDimension: { label: 'overall height', valueMm: 203 },
            }),
        );
    });

    it('requires a named positive millimetre dimension before generating from a selected photo', async () => {
        render(<StudioGenerate />);
        const photo = new File(['photo-bytes'], 'e-reader.png', { type: 'image/png' });
        fireEvent.change(screen.getByLabelText('Reference photo'), {
            target: { files: [photo] },
        });
        await waitFor(() => expect(screen.getByText('e-reader.png')).toBeTruthy());

        fireEvent.change(screen.getByLabelText('Generate prompt'), {
            target: { value: 'model this e-reader enclosure' },
        });

        expect((screen.getByRole('button', { name: /^build/i }) as HTMLButtonElement).disabled).toBe(true);
    });

    it('requires a new known dimension when the reference photo changes', async () => {
        render(<StudioGenerate />);
        fireEvent.change(screen.getByLabelText('Reference photo'), {
            target: { files: [new File(['first-photo'], 'first.png', { type: 'image/png' })] },
        });
        await waitFor(() => expect(screen.getByText('first.png')).toBeTruthy());
        fireEvent.change(screen.getByLabelText('Known dimension label'), {
            target: { value: 'overall height' },
        });
        fireEvent.change(screen.getByLabelText('Known dimension (mm)'), {
            target: { value: '203' },
        });

        fireEvent.change(screen.getByLabelText('Reference photo'), {
            target: { files: [new File(['second-photo'], 'second.png', { type: 'image/png' })] },
        });
        await waitFor(() => expect(screen.getByText('second.png')).toBeTruthy());
        fireEvent.change(screen.getByLabelText('Generate prompt'), {
            target: { value: 'model the second enclosure' },
        });

        expect((screen.getByRole('button', { name: /^build/i }) as HTMLButtonElement).disabled).toBe(true);
    });

    it('rejects unsupported photo types before they enter the generation request', () => {
        render(<StudioGenerate />);
        const gif = new File(['gif-bytes'], 'e-reader.gif', { type: 'image/gif' });

        fireEvent.change(screen.getByLabelText('Reference photo'), {
            target: { files: [gif] },
        });

        expect(screen.getByRole('alert').textContent).toMatch(/PNG, JPEG, or WebP/i);
        expect(mockGeneration.submit).not.toHaveBeenCalled();
    });

    it('rejects photo files larger than four MiB before they enter the generation request', () => {
        render(<StudioGenerate />);
        const oversized = new File([new Uint8Array(4 * 1024 * 1024 + 1)], 'e-reader.png', { type: 'image/png' });

        fireEvent.change(screen.getByLabelText('Reference photo'), {
            target: { files: [oversized] },
        });

        expect(screen.getByRole('alert').textContent).toMatch(/4 MiB/i);
        expect(mockGeneration.submit).not.toHaveBeenCalled();
    });

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

    it('submits a drafted whole-model repair without stale selected-feature prefix', () => {
        mockSelection.selectedFeatureId = 'hinge-pin';
        mockShell.agentDraftPrompt = 'Repair deterministic mechanism failures.';
        mockShell.agentDraftPromptVersion = 1;
        mockShell.agentRepairWorkflow = {
            cardId: 'mechanism:mechanism.disconnect:0',
            code: 'mechanism.disconnect',
            promptText: 'Repair deterministic mechanism failures.',
            targetId: null,
            promptSource: 'review',
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
            'Repair deterministic mechanism failures.',
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

    it('stages a generated artifact instead of applying it directly', () => {
        mockCode.code = 'const oldPart = box(10, 10, 10);\nreturn oldPart;';
        mockGeneration.phase = {
            state: 'done',
            generationId: 'gen-1',
            anonId: 'anon-1',
            artifact: {
                title: 'Add mounting holes',
                code: 'const newPart = box(10, 10, 10);\nreturn newPart;',
                parameters: [],
                suggestions: [],
            },
        };

        render(<StudioGenerate />);

        fireEvent.click(screen.getByRole('button', { name: /stage edit/i }));

        expect(mockShell.proposeStagedEdit).toHaveBeenCalledWith(expect.objectContaining({
            id: 'agent:gen-1',
            intent: 'Add mounting holes',
            fromCode: 'const oldPart = box(10, 10, 10);\nreturn oldPart;',
            toCode: 'const newPart = box(10, 10, 10);\nreturn newPart;',
            source: { kind: 'agent', label: 'Studio Generate' },
        }));
        expect(mockCode.setCode).not.toHaveBeenCalled();
        expect(mockGeometry.executeGeometry).not.toHaveBeenCalled();
    });

    it('preserves an empty submit baseline when staging after editor code changes', () => {
        const { rerender } = render(<StudioGenerate />);
        const prompt = screen.getByLabelText('Generate prompt');

        fireEvent.change(prompt, { target: { value: 'make a cube' } });
        fireEvent.submit(prompt.closest('form')!);

        mockCode.code = 'return box(99);';
        mockGeneration.phase = {
            state: 'done',
            generationId: 'gen-empty',
            anonId: 'anon-empty',
            artifact: {
                title: 'Make a cube',
                code: 'return box(10);',
                parameters: [],
                suggestions: [],
            },
        };
        rerender(<StudioGenerate />);

        fireEvent.click(screen.getByRole('button', { name: /stage edit/i }));

        expect(mockShell.proposeStagedEdit).toHaveBeenCalledWith(expect.objectContaining({
            id: 'agent:gen-empty',
            fromCode: '',
            toCode: 'return box(10);',
        }));
    });

    it('does not show staged status after discarding a generated artifact', () => {
        mockShell.agentRepairWorkflow = {
            cardId: 'diagnostic:assembly.part.floating:output-horn:0',
            code: 'assembly.part.floating',
            promptText: 'Fix output horn',
            targetId: 'output-horn',
            promptSource: 'fallback',
            validityFingerprint: 'before',
            state: 'running',
        };
        mockGeneration.phase = {
            state: 'done',
            generationId: 'gen-discard',
            anonId: 'anon-discard',
            artifact: {
                title: 'Throwaway proposal',
                code: 'return box(20);',
                parameters: [],
                suggestions: [],
            },
        };

        render(<StudioGenerate />);

        fireEvent.click(screen.getByRole('button', { name: /discard/i }));

        expect(mockShell.proposeStagedEdit).not.toHaveBeenCalled();
        expect(mockShell.setAgentRepairWorkflow).toHaveBeenCalledWith({
            ...mockShell.agentRepairWorkflow,
            state: 'drafted',
        });
        expect(screen.queryByText(/staged for review/i)).toBeNull();
        expect(screen.getByText(/discarded — Throwaway proposal/i)).toBeTruthy();
    });

    it('does not overwrite an existing staged edit with a new generated proposal', () => {
        mockShell.stagedEdit = { id: 'existing-edit' };
        mockCode.code = 'return box(10);';
        mockGeneration.phase = {
            state: 'done',
            generationId: 'gen-overwrite',
            anonId: 'anon-overwrite',
            artifact: {
                title: 'New proposal',
                code: 'return box(20);',
                parameters: [],
                suggestions: [],
            },
        };

        render(<StudioGenerate />);

        expect(screen.queryByRole('button', { name: /stage edit/i })).toBeNull();
        expect(screen.getByText(/review the current staged edit before staging another/i)).toBeTruthy();
        expect(mockShell.proposeStagedEdit).not.toHaveBeenCalled();
    });

    it('preserves prompt, target, and repair workflow context on staged generated edits', () => {
        mockCode.code = 'return box(10);';
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
            state: 'running',
        };
        mockGeneration.phase = {
            state: 'done',
            generationId: 'gen-2',
            anonId: 'anon-2',
            artifact: {
                title: 'Repair output-horn',
                code: 'return box(20);',
                parameters: [],
                suggestions: [],
            },
        };

        render(<StudioGenerate />);

        fireEvent.click(screen.getByRole('button', { name: /stage edit/i }));

        expect(mockShell.proposeStagedEdit).toHaveBeenCalledWith(expect.objectContaining({
            context: {
                promptText: 'Fix assembly.part.floating: output-horn floats Action: add a mate',
                selectedFeatureId: 'output-horn',
                repairWorkflow: mockShell.agentRepairWorkflow,
                generationId: 'gen-2',
            },
        }));
    });

    it('uses submit-time prompt, target, and workflow context when staging later', () => {
        mockCode.code = 'return box(10);';
        mockSelection.selectedFeatureId = 'output-horn';
        const draftedWorkflow = {
            cardId: 'diagnostic:assembly.part.floating:output-horn:0',
            code: 'assembly.part.floating',
            promptText: 'add a mate',
            targetId: 'output-horn',
            promptSource: 'fallback' as const,
            validityFingerprint: 'before',
            state: 'drafted' as const,
        };
        mockShell.agentRepairWorkflow = draftedWorkflow;

        const { rerender } = render(<StudioGenerate />);
        const prompt = screen.getByLabelText('Generate prompt');
        fireEvent.change(prompt, { target: { value: 'add a mate' } });
        fireEvent.submit(prompt.closest('form')!);

        fireEvent.change(prompt, { target: { value: 'wrong later prompt' } });
        mockSelection.selectedFeatureId = 'hinge-pin';
        mockShell.agentRepairWorkflow = {
            ...draftedWorkflow,
            promptText: 'wrong later prompt',
            targetId: 'hinge-pin',
            state: 'running',
        };
        mockGeneration.phase = {
            state: 'done',
            generationId: 'gen-context',
            anonId: 'anon-context',
            artifact: {
                title: 'Repair original target',
                code: 'return box(20);',
                parameters: [],
                suggestions: [],
            },
        };
        rerender(<StudioGenerate />);

        fireEvent.click(screen.getByRole('button', { name: /stage edit/i }));

        expect(mockShell.proposeStagedEdit).toHaveBeenCalledWith(expect.objectContaining({
            fromCode: 'return box(10);',
            context: {
                promptText: 'add a mate',
                selectedFeatureId: 'output-horn',
                repairWorkflow: {
                    ...draftedWorkflow,
                    state: 'running',
                },
                generationId: 'gen-context',
            },
        }));
    });
});
