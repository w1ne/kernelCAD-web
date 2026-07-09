// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { StagedEditSlot } from '../StagedEditSlot';
import { shellStore } from '../store/shellStore';

const setCodeMock = vi.fn();
let workbenchCode = '';

vi.mock('../context/WorkbenchContext', () => ({
    useWorkbench: () => ({ code: workbenchCode, setCode: setCodeMock }),
}));

beforeEach(() => {
    shellStore.reset();
    setCodeMock.mockReset();
    workbenchCode = '';
});

afterEach(() => {
    cleanup();
});

describe('StagedEditSlot', () => {
    it('renders the auto-apply placeholder when no staged edit', () => {
        const { getByText, getByRole } = render(<StagedEditSlot />);
        expect(getByText(/Auto-apply mode · toggle off to enable review/i)).toBeDefined();
        const button = getByRole('button', { name: /review edits/i }) as HTMLButtonElement;
        expect(button.disabled).toBe(true);
    });

    it('renders intent + diff + approve/reject when stagedEdit is populated', () => {
        shellStore.proposeStagedEdit({
            id: 'e1',
            intent: 'Wire output-horn to gripper-coupling.',
            fromCode: 'const a = box(10, 10, 10);\nreturn a;',
            toCode: 'const a = box(10, 10, 10);\nconst b = a.fillet(2);\nreturn b;',
        });
        const { getByTestId } = render(<StagedEditSlot />);
        expect(getByTestId('staged-edit-intent').textContent).toContain('output-horn');
        expect(getByTestId('staged-edit-diff')).toBeDefined();
        expect(getByTestId('staged-edit-approve')).toBeDefined();
        expect(getByTestId('staged-edit-reject')).toBeDefined();
    });

    it('Approve calls workbench.setCode(toCode) and clears the slot', () => {
        const toCode = 'const a = box(10);\nreturn a;';
        const fromCode = 'return box(10);';
        workbenchCode = fromCode;
        shellStore.proposeStagedEdit({
            id: 'e2',
            intent: 'demo',
            fromCode,
            toCode,
            source: { kind: 'agent', label: 'Studio Generate' },
        });
        const { getByTestId } = render(<StagedEditSlot />);
        fireEvent.click(getByTestId('staged-edit-approve'));
        expect(setCodeMock).toHaveBeenCalledTimes(1);
        expect(setCodeMock).toHaveBeenCalledWith(toCode);
        expect(shellStore.getSnapshot().stagedEdit).toBeNull();
        expect(getByTestId('applied-edit-history').textContent).toContain('Approved');
        expect(getByTestId('applied-edit-history').textContent).toContain('demo');
        expect(getByTestId('applied-edit-history').textContent).toContain('Studio Generate');
        expect(getByTestId('applied-edit-history').textContent).toContain('+2 / -1');
    });

    it('Approve blocks stale staged edits when the editor changed since proposal', () => {
        shellStore.proposeStagedEdit({
            id: 'e-stale',
            intent: 'demo',
            fromCode: 'return box(10);',
            toCode: 'return box(20);',
        });
        workbenchCode = 'return box(15);';

        const { getByTestId, queryByTestId } = render(<StagedEditSlot />);
        fireEvent.click(getByTestId('staged-edit-approve'));

        expect(setCodeMock).not.toHaveBeenCalled();
        expect(shellStore.getSnapshot().stagedEdit?.id).toBe('e-stale');
        expect(queryByTestId('applied-edit-history')).toBeNull();
        expect(getByTestId('staged-edit-stale-warning').textContent).toContain('changed since this edit was staged');
    });

    it('Reject leaves the script unchanged and clears the slot', () => {
        shellStore.proposeStagedEdit({
            id: 'e3',
            intent: 'demo',
            fromCode: 'from',
            toCode: 'to',
        });
        const { getByTestId } = render(<StagedEditSlot />);
        fireEvent.click(getByTestId('staged-edit-reject'));
        expect(setCodeMock).not.toHaveBeenCalled();
        expect(shellStore.getSnapshot().stagedEdit).toBeNull();
        expect(getByTestId('applied-edit-history').textContent).toContain('Rejected');
        expect(getByTestId('applied-edit-history').textContent).toContain('demo');
    });

    it('source label renders when provided', () => {
        shellStore.proposeStagedEdit({
            id: 'e4',
            intent: 'demo',
            fromCode: 'a',
            toCode: 'b',
            source: { kind: 'agent', label: 'set_param_value(Wall, 12)' },
        });
        const { getByText } = render(<StagedEditSlot />);
        expect(getByText(/agent.*set_param_value/i)).toBeDefined();
    });

    it('renders captured generation context for staged agent edits', () => {
        shellStore.proposeStagedEdit({
            id: 'e-context',
            intent: 'Repair output horn',
            fromCode: 'return box(10);',
            toCode: 'return box(20);',
            source: { kind: 'agent', label: 'Studio Generate' },
            context: {
                promptText: 'Fix assembly.part.floating: output-horn floats Action: add a mate',
                selectedFeatureId: 'output-horn',
                repairWorkflow: {
                    cardId: 'diagnostic:assembly.part.floating:output-horn:0',
                    code: 'assembly.part.floating',
                    promptText: 'Fix assembly.part.floating: output-horn floats Action: add a mate',
                    targetId: 'output-horn',
                    promptSource: 'review',
                    validityFingerprint: 'before',
                    state: 'running',
                },
                generationId: 'gen-context',
            },
        });

        const { getByTestId } = render(<StagedEditSlot />);
        const context = getByTestId('staged-edit-context');

        expect(context.textContent).toContain('Studio Generate');
        expect(context.textContent).toContain('output-horn');
        expect(context.textContent).toContain('review repair');
        expect(context.textContent).toContain('gen-context');
        expect(context.textContent).toContain('Fix assembly.part.floating');
    });

    it('stale conflicts can rerun the captured prompt without applying code', () => {
        shellStore.setSelectedFeatureId('old-target');
        shellStore.setAgentRailOpen(false);
        shellStore.setAgentRepairWorkflow({
            cardId: 'diagnostic:old',
            code: 'assembly.part.floating',
            promptText: 'Old diagnostic prompt',
            targetId: 'old-target',
            promptSource: 'review',
            validityFingerprint: 'old',
            state: 'running',
        });
        shellStore.proposeStagedEdit({
            id: 'e-rerun',
            intent: 'Repair output horn',
            fromCode: 'return box(10);',
            toCode: 'return box(20);',
            context: {
                promptText: 'Fix output-horn floating mate',
                selectedFeatureId: 'output-horn',
                repairWorkflow: null,
                generationId: 'gen-rerun',
            },
        });
        workbenchCode = 'return box(15);';

        const { getByTestId } = render(<StagedEditSlot />);
        fireEvent.click(getByTestId('staged-edit-approve'));
        fireEvent.click(getByTestId('staged-edit-rerun-prompt'));

        const snapshot = shellStore.getSnapshot();
        expect(setCodeMock).not.toHaveBeenCalled();
        expect(snapshot.stagedEdit).toBeNull();
        expect(snapshot.agentRailOpen).toBe(true);
        expect(snapshot.agentDraftPrompt).toBe('Fix output-horn floating mate');
        expect(snapshot.selectedFeatureId).toBe('output-horn');
        expect(snapshot.agentRepairWorkflow).toBeNull();
        expect(getByTestId('applied-edit-history').textContent).toContain('Rerun');
        expect(getByTestId('applied-edit-history').textContent).toContain('Fix output-horn floating mate');
        expect(getByTestId('applied-edit-history').textContent).toContain('gen-rerun');
    });

    it('stale conflicts omit rerun prompt when no prompt context exists', () => {
        shellStore.proposeStagedEdit({
            id: 'e-no-rerun',
            intent: 'Manual edit',
            fromCode: 'return box(10);',
            toCode: 'return box(20);',
        });
        workbenchCode = 'return box(15);';

        const { getByRole, getByTestId, queryByTestId } = render(<StagedEditSlot />);
        fireEvent.click(getByTestId('staged-edit-approve'));

        expect(getByTestId('staged-edit-stale-warning').textContent).toContain('changed since this edit was staged');
        expect(getByRole('alert')).toBe(getByTestId('staged-edit-stale-warning'));
        expect(queryByTestId('staged-edit-rerun-prompt')).toBeNull();
    });
});
