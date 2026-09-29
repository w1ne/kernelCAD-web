// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { GenerationPhase } from '../../funnel/hooks/useGeneration';

const mockGeneration = vi.hoisted(() => ({
    phase: { state: 'idle' } as GenerationPhase,
    events: [] as unknown[],
    submit: vi.fn(),
    cancel: vi.fn(),
}));

const mockStaged = vi.hoisted(() => ({
    stagedEdit: null as { id: string } | null,
    handleApprove: vi.fn(),
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
    selectFeature: vi.fn(),
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
    appliedEditHistory: [] as Array<{ editId: string; outcome: string }>,
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
        selectFeature: mockSelection.selectFeature,
    }),
}));

vi.mock('../store/useShellStore', () => ({
    useShellStore: () => ({
        agentDraftPrompt: mockShell.agentDraftPrompt,
        agentDraftPromptVersion: mockShell.agentDraftPromptVersion,
        agentRepairWorkflow: mockShell.agentRepairWorkflow,
        stagedEdit: mockShell.stagedEdit,
        appliedEditHistory: mockShell.appliedEditHistory,
    }),
    shellStore: {
        setAgentRepairWorkflow: mockShell.setAgentRepairWorkflow,
        proposeStagedEdit: mockShell.proposeStagedEdit,
    },
}));

vi.mock('../hooks/useStagedEditActions', () => ({
    useStagedEditActions: () => mockStaged,
}));

import { StudioGenerate } from '../StudioGenerate';

beforeEach(() => {
    mockGeneration.phase = { state: 'idle' };
    mockGeneration.events = [];
    mockGeneration.submit.mockReset();
    mockGeneration.cancel.mockReset();
    mockStaged.stagedEdit = null;
    mockStaged.handleApprove.mockReset();
    mockSelection.selectFeature.mockReset();
    mockShell.appliedEditHistory = [];
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
    it('forwards an attached photo through the active agent generation path without a dimension form', async () => {
        render(<StudioGenerate />);
        fireEvent.change(screen.getByLabelText('Choose files'), {
            target: { files: [new File(['photo-bytes'], 'e-reader.png', { type: 'image/png' })] },
        });
        await waitFor(() => expect(screen.getByText('e-reader.png')).toBeTruthy());

        const prompt = screen.getByLabelText('Generate prompt');
        fireEvent.change(prompt, { target: { value: 'model this e-reader enclosure' } });
        expect((screen.getByRole('button', { name: /^build/i }) as HTMLButtonElement).disabled).toBe(false);
        fireEvent.submit(prompt.closest('form')!);

        expect(mockGeneration.submit).toHaveBeenCalledWith(
            'model this e-reader enclosure',
            undefined,
            undefined,
            expect.objectContaining({
                dataUrl: expect.stringMatching(/^data:image\/png;base64,/),
                fileName: 'e-reader.png',
                mimeType: 'image/png',
            }),
        );
    });

    it('rejects unsupported photo types before they enter the generation request', async () => {
        render(<StudioGenerate />);
        const gif = new File(['gif-bytes'], 'e-reader.gif', { type: 'image/gif' });

        fireEvent.change(screen.getByLabelText('Choose files'), {
            target: { files: [gif] },
        });

        expect((await screen.findByRole('alert')).textContent).toMatch(/PNG\/JPEG\/WebP/i);
        expect(mockGeneration.submit).not.toHaveBeenCalled();
    });

    it('rejects photo files larger than four MiB before they enter the generation request', async () => {
        render(<StudioGenerate />);
        const oversized = new File([new Uint8Array(4 * 1024 * 1024 + 1)], 'e-reader.png', { type: 'image/png' });

        fireEvent.change(screen.getByLabelText('Choose files'), {
            target: { files: [oversized] },
        });

        expect((await screen.findByRole('alert')).textContent).toMatch(/4 MiB/i);
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

        // Sent: the box empties; the prompt shows in the conversation.
        expect((prompt as HTMLTextAreaElement).value).toBe('');
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

    it('marks a best-so-far (partial) result unverified and shows the server note', () => {
        mockGeneration.phase = {
            state: 'done',
            generationId: 'gen-partial',
            anonId: 'anon-partial',
            artifact: { title: 'Twisted vase', code: 'return box(1, 1, 1);', parameters: [], suggestions: [] },
            partial: {
                reason: 'timeout',
                stage: 'writing_code',
                unverified: ['interference'],
                note: 'The time limit was reached while writing the script. Not verified: interference.',
            },
        };

        render(<StudioGenerate />);

        expect(screen.getByText('Not verified')).toBeTruthy();
        expect(screen.queryByText('Verified')).toBeNull();
        expect(screen.getByRole('status').textContent).toMatch(/time limit/);
        // The user can still accept it and continue from it.
        expect(screen.getByRole('button', { name: /accept/i })).toBeTruthy();
    });

    it('keeps the verified badge for a normal result', () => {
        mockGeneration.phase = {
            state: 'done',
            generationId: 'gen-ok',
            anonId: 'anon-ok',
            artifact: { title: 'Plate', code: 'return box(1, 1, 1);', parameters: [], suggestions: [] },
        };
        render(<StudioGenerate />);
        expect(screen.getByText('Verified')).toBeTruthy();
    });

    it('shows server progress stages while the agent runs', () => {
        mockGeneration.phase = { state: 'running', lastEvent: { kind: 'status', phase: 'running' } };
        mockGeneration.events = [
            { kind: 'attached', message: 'already running' },
            { kind: 'progress', stage: 'evaluating', message: 'Evaluating the script', elapsedMs: 42_400 },
        ];
        render(<StudioGenerate />);
        const steps = within(screen.getByTestId('agent-run-progress'));
        const current = steps.getByText('Build and check the geometry').closest('li')!;
        expect(current.getAttribute('aria-current')).toBe('step');
        expect(current.textContent).toContain('Evaluating the script');
        expect(steps.getByText('Plan the part').closest('li')!.getAttribute('data-status')).toBe('done');
        expect(steps.getByText('Verify').closest('li')!.getAttribute('data-status')).toBe('pending');
        // Server time wins over the local clock: 42.4 s → 0:42.
        expect(steps.getByText('0:42')).toBeTruthy();
        expect(screen.getByText(/Joined your earlier run/)).toBeTruthy();
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

        fireEvent.click(screen.getByRole('button', { name: /accept/i }));

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

        fireEvent.click(screen.getByRole('button', { name: /accept/i }));

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

        expect(screen.queryByRole('button', { name: /accept/i })).toBeNull();
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

        fireEvent.click(screen.getByRole('button', { name: /accept/i }));

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

        fireEvent.click(screen.getByRole('button', { name: /accept/i }));

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

const DONE_PHASE = (generationId: string, code = 'return box(20, 20, 5);'): GenerationPhase => ({
    state: 'done',
    generationId,
    anonId: 'anon',
    artifact: { title: 'Bracket', code, parameters: [], suggestions: ['Add a fillet'] },
});

/** Send a prompt from the composer while the agent is idle. */
function send(text: string) {
    const prompt = screen.getByLabelText('Generate prompt');
    fireEvent.change(prompt, { target: { value: text } });
    fireEvent.submit(prompt.closest('form')!);
}

describe('StudioGenerate — agent pane v2', () => {
    it('shows the sent prompt and a stop button that cancels the run', () => {
        const { rerender } = render(<StudioGenerate />);
        send('a 60 mm bracket');
        mockGeneration.phase = { state: 'running', lastEvent: { kind: 'status', phase: 'running' } };
        rerender(<StudioGenerate />);

        expect(screen.getByTestId('agent-user-message').textContent).toContain('a 60 mm bracket');
        expect(within(screen.getByTestId('agent-run-progress')).getByText('Building')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Stop the run' }));
        expect(mockGeneration.cancel).toHaveBeenCalledOnce();
    });

    it('queues a follow-up while a run is busy and sends it when the agent is free', async () => {
        mockGeneration.phase = { state: 'running', lastEvent: { kind: 'status', phase: 'running' } };
        const { rerender } = render(<StudioGenerate />);

        expect(screen.getByRole('button', { name: 'Queue follow-up' })).toBeTruthy();
        send('then add a 2 mm fillet');
        expect(mockGeneration.submit).not.toHaveBeenCalled();
        expect(within(screen.getByTestId('agent-queue')).getByText('then add a 2 mm fillet')).toBeTruthy();
        expect((screen.getByLabelText('Generate prompt') as HTMLTextAreaElement).value).toBe('');

        mockGeneration.phase = { state: 'idle' };
        rerender(<StudioGenerate />);
        await waitFor(() => expect(mockGeneration.submit).toHaveBeenCalledWith('then add a 2 mm fillet'));
        expect(screen.queryByTestId('agent-queue')).toBeNull();
    });

    it('waits for the proposal review before it sends a queued follow-up', async () => {
        mockGeneration.phase = { state: 'running', lastEvent: { kind: 'status', phase: 'running' } };
        const { rerender } = render(<StudioGenerate />);
        send('make it thicker');

        mockGeneration.phase = DONE_PHASE('gen-q');
        rerender(<StudioGenerate />);
        await new Promise((r) => setTimeout(r, 10));
        expect(mockGeneration.submit).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: /discard/i }));
        await waitFor(() => expect(mockGeneration.submit).toHaveBeenCalledWith('make it thicker'));
    });

    it('pauses the queue after a failed run until the user sends it on', async () => {
        mockGeneration.phase = { state: 'running', lastEvent: { kind: 'status', phase: 'running' } };
        const { rerender } = render(<StudioGenerate />);
        send('and a chamfer');

        mockGeneration.phase = { state: 'error', code: 'timeout', message: 'too slow' };
        rerender(<StudioGenerate />);
        await new Promise((r) => setTimeout(r, 10));
        expect(mockGeneration.submit).not.toHaveBeenCalled();
        expect(screen.getByText(/paused because the last run did not finish/)).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Send now' }));
        expect(mockGeneration.submit).toHaveBeenCalledWith('and a chamfer');
    });

    it('shows the whole error under Details, not a 140-character cut', () => {
        const message = `The generation did not finish. ${'The last build failed at line 6. '.repeat(8)}END-OF-MESSAGE`;
        mockGeneration.phase = { state: 'error', code: 'timeout', message, generationId: 'gen-err' };
        render(<StudioGenerate />);

        const failure = screen.getByTestId('agent-failure');
        expect(within(failure).getByText('The run hit the time limit')).toBeTruthy();
        expect(screen.getByTestId('agent-failure-detail').textContent).toBe(message);
        expect(failure.textContent).toContain('gen-err');
    });

    it('Try again sends the last prompt again with its original target', () => {
        mockSelection.selectedFeatureId = 'hinge-pin';
        mockCode.code = 'return box(10);';
        const { rerender } = render(<StudioGenerate />);
        send('add 2 mm clearance');
        expect(mockGeneration.submit).toHaveBeenCalledTimes(1);

        mockSelection.selectedFeatureId = null;
        mockGeneration.phase = { state: 'error', code: 'stream_closed', message: 'Connection closed before generation finished.' };
        rerender(<StudioGenerate />);
        expect(screen.getByText('Lost the connection to the agent')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

        expect(mockGeneration.submit).toHaveBeenLastCalledWith('Edit selected target "hinge-pin": add 2 mm clearance', 'return box(10);');
    });

    it('Repair sends the prompt back with the error so the agent fixes its script', () => {
        const { rerender } = render(<StudioGenerate />);
        send('a hex nut');
        mockGeneration.phase = { state: 'error', code: 'gate_failed', message: 'cut() needs a solid tool body' };
        rerender(<StudioGenerate />);

        fireEvent.click(screen.getByRole('button', { name: 'Repair automatically' }));
        const repair = mockGeneration.submit.mock.calls.at(-1)![0] as string;
        expect(repair).toContain('a hex nut');
        expect(repair).toContain('cut() needs a solid tool body');
        expect(repair).toMatch(/Fix the cause/);
    });

    it('Copy to your agent copies the request, the target, the error and the script', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
        mockSelection.selectedFeatureId = 'lid';
        mockCode.code = 'return box(30, 20, 10);';
        const { rerender } = render(<StudioGenerate />);
        send('add a snap fit');
        mockGeneration.phase = { state: 'error', code: 'timeout', message: 'did not finish within 240 s' };
        rerender(<StudioGenerate />);

        fireEvent.click(screen.getByRole('button', { name: 'Copy to your agent' }));
        await waitFor(() => expect(writeText).toHaveBeenCalledOnce());
        const text = writeText.mock.calls[0][0] as string;
        expect(text).toContain('kernelCAD MCP');
        expect(text).toContain('add a snap fit');
        expect(text).toContain('"lid"');
        expect(text).toContain('did not finish within 240 s');
        expect(text).toContain('return box(30, 20, 10);');
        expect(await screen.findByText('Copied')).toBeTruthy();
    });

    it('Accept stages the proposal and approves it once it is in the review slot', () => {
        mockGeneration.phase = DONE_PHASE('gen-acc');
        const { rerender } = render(<StudioGenerate />);
        fireEvent.click(screen.getByRole('button', { name: /accept/i }));
        expect(mockShell.proposeStagedEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'agent:gen-acc' }));
        expect(mockStaged.handleApprove).not.toHaveBeenCalled();

        mockStaged.stagedEdit = { id: 'agent:gen-acc' };
        rerender(<StudioGenerate />);
        expect(mockStaged.handleApprove).toHaveBeenCalledOnce();

        mockStaged.stagedEdit = null;
        mockShell.appliedEditHistory = [{ editId: 'agent:gen-acc', outcome: 'approved' }];
        rerender(<StudioGenerate />);
        expect(screen.getByTestId('agent-resolution').textContent).toMatch(/Applied — Bracket/);
    });

    it('does not approve a staged edit that came from somewhere else', () => {
        mockGeneration.phase = DONE_PHASE('gen-own');
        mockStaged.stagedEdit = { id: 'human:drag-1' };
        render(<StudioGenerate />);
        expect(mockStaged.handleApprove).not.toHaveBeenCalled();
    });

    it('After shows the proposal in the viewer; leaving the review shows the editor model again', () => {
        mockCode.code = 'return box(10);';
        const { rerender } = render(<StudioGenerate />);
        send('make it twice as big');
        mockGeneration.phase = DONE_PHASE('gen-view', 'return box(20);');
        rerender(<StudioGenerate />);

        fireEvent.click(screen.getByRole('button', { name: 'After' }));
        expect(mockGeometry.executeGeometry).toHaveBeenLastCalledWith('return box(20);');
        expect(screen.getByText(/Your code has not changed/)).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Before' }));
        expect(mockGeometry.executeGeometry).toHaveBeenLastCalledWith('return box(10);');

        fireEvent.click(screen.getByRole('button', { name: 'After' }));
        fireEvent.click(screen.getByRole('button', { name: /discard/i }));
        expect(mockGeometry.executeGeometry).toHaveBeenLastCalledWith('return box(10);');
        expect(mockGeometry.executeGeometry).toHaveBeenCalledTimes(4);
    });

    it('shows the change size and opens the code diff on request', () => {
        mockGeneration.phase = DONE_PHASE('gen-size', 'const a = 1;\nreturn box(20);');
        render(<StudioGenerate />);
        expect(screen.getByTestId('agent-proposal-size').textContent).toMatch(/\+2\s*−0/);
        expect(screen.queryByTestId('studio-generate-diff')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'View diff' }));
        expect(screen.getByTestId('studio-generate-diff')).toBeTruthy();
    });

    it('the selection chip targets the whole model again on request', () => {
        mockSelection.selectedFeatureId = 'hinge-pin';
        render(<StudioGenerate />);
        fireEvent.click(screen.getByRole('button', { name: 'Target the whole model instead of hinge-pin' }));
        expect(mockSelection.selectFeature).toHaveBeenCalledWith(null);
    });

    it('offers starter prompts before the first run and suggestions after a result', () => {
        render(<StudioGenerate />);
        fireEvent.click(screen.getByRole('button', { name: /20-tooth spur gear/ }));
        expect((screen.getByLabelText('Generate prompt') as HTMLTextAreaElement).value).toMatch(/20-tooth spur gear/);
        cleanup();

        mockGeneration.phase = DONE_PHASE('gen-next');
        render(<StudioGenerate />);
        fireEvent.click(within(screen.getByTestId('agent-suggestions')).getByRole('button', { name: 'Add a fillet' }));
        expect((screen.getByLabelText('Generate prompt') as HTMLTextAreaElement).value).toBe('Add a fillet');
    });
});
