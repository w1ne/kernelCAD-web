// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { StagedEditSlot } from '../StagedEditSlot';
import { fingerprintStudioScript, shellStore } from '../store/shellStore';

const setCodeMock = vi.fn();
let workbenchCode = '';

const { saveSourceToScriptMock } = vi.hoisted(() => ({
    saveSourceToScriptMock: vi.fn(),
}));

vi.mock('../context/WorkbenchContext', () => ({
    useWorkbench: () => ({ code: workbenchCode, setCode: setCodeMock }),
}));

vi.mock('../directEdit/saveSource', () => ({
    saveSourceToScript: saveSourceToScriptMock,
}));

beforeEach(() => {
    shellStore.reset();
    setCodeMock.mockReset();
    saveSourceToScriptMock.mockReset();
    saveSourceToScriptMock.mockResolvedValue(undefined);
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

    it('renders the motion-spec badge and validity delta', () => {
        shellStore.proposeStagedEdit({
            id: 'e-spec',
            intent: 'Nudge output horn +10 mm on X',
            fromCode: 'return box(10);',
            toCode: 'return box(20);',
            specLabel: 'translate X +10 mm',
            validityDelta: {
                fromInterferences: 1,
                toInterferences: 0,
                fromVolumeMm3: 1234.5,
                toVolumeMm3: 1240.25,
                fromOk: false,
                toOk: true,
            },
            evaluation: { ok: true },
        });

        const { getByTestId } = render(<StagedEditSlot />);
        expect(getByTestId('staged-edit-spec').textContent).toContain('translate X +10 mm');
        const validity = getByTestId('staged-edit-validity').textContent ?? '';
        expect(validity).toContain('1 → 0');
        expect(validity).toContain('1234.5 → 1240.3 mm³');

        shellStore.clearStagedEdit();
    });

    it('disables approve when candidate evaluation failed', () => {
        shellStore.proposeStagedEdit({
            id: 'e-eval-failed',
            intent: 'demo',
            fromCode: 'return box(10);',
            toCode: 'return box(20);',
            evaluation: { ok: false, error: 'kernel threw' },
        });

        const { getByTestId, getByText } = render(<StagedEditSlot />);
        const approve = getByTestId('staged-edit-approve') as HTMLButtonElement;
        expect(approve.disabled).toBe(true);
        expect(getByText(/kernel threw/)).toBeDefined();

        shellStore.clearStagedEdit();
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
        expect(shellStore.getSnapshot().appliedEditHistory[0]).toMatchObject({
            approvedScriptFingerprint: fingerprintStudioScript(toCode),
        });
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

    it('Approve saves the target script before applying the code', async () => {
        const toCode = 'const a = box(30);\nreturn a;';
        const fromCode = 'return box(10);';
        workbenchCode = fromCode;
        shellStore.proposeStagedEdit({
            id: 'e-target-script',
            intent: 'demo',
            fromCode,
            toCode,
            targetScript: 'examples/horn.kcad.ts',
            source: { kind: 'agent', label: 'Studio Generate' },
        });

        const { getByTestId } = render(<StagedEditSlot />);
        await act(async () => {
            fireEvent.click(getByTestId('staged-edit-approve'));
        });

        expect(saveSourceToScriptMock).toHaveBeenCalledWith('examples/horn.kcad.ts', toCode);
        expect(saveSourceToScriptMock.mock.invocationCallOrder[0]).toBeLessThan(
            setCodeMock.mock.invocationCallOrder[0],
        );
        expect(setCodeMock).toHaveBeenCalledWith(toCode);
        expect(shellStore.getSnapshot().stagedEdit).toBeNull();
    });

    it('Approve leaves the edit staged when the target script save fails', async () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        saveSourceToScriptMock.mockRejectedValueOnce(new Error('save failed (500)'));
        const fromCode = 'return box(10);';
        workbenchCode = fromCode;
        shellStore.proposeStagedEdit({
            id: 'e-save-fail',
            intent: 'demo',
            fromCode,
            toCode: 'return box(20);',
            targetScript: 'examples/horn.kcad.ts',
        });

        const { getByTestId } = render(<StagedEditSlot />);
        await act(async () => {
            fireEvent.click(getByTestId('staged-edit-approve'));
        });

        expect(setCodeMock).not.toHaveBeenCalled();
        expect(shellStore.getSnapshot().stagedEdit?.id).toBe('e-save-fail');
        expect(shellStore.getSnapshot().directEditNotice).toBe(
            'Save failed; the edit is still staged.',
        );
        expect(errorSpy).toHaveBeenCalled();
        errorSpy.mockRestore();
    });

    it('Approve clears a prior save-failure notice on success', async () => {
        const fromCode = 'return box(10);';
        const toCode = 'return box(20);';
        workbenchCode = fromCode;
        shellStore.setDirectEditNotice('Save failed; the edit is still staged.');
        shellStore.proposeStagedEdit({
            id: 'e-retry',
            intent: 'demo',
            fromCode,
            toCode,
            targetScript: 'examples/horn.kcad.ts',
        });

        const { getByTestId } = render(<StagedEditSlot />);
        await act(async () => {
            fireEvent.click(getByTestId('staged-edit-approve'));
        });

        expect(shellStore.getSnapshot().directEditNotice).toBeNull();
        expect(shellStore.getSnapshot().stagedEdit).toBeNull();
    });

    it('Approve treats the watcher echo of the saved bytes as success', async () => {
        let resolveSave: () => void = () => {};
        saveSourceToScriptMock.mockImplementationOnce(
            () =>
                new Promise<void>((resolve) => {
                    resolveSave = resolve;
                }),
        );
        const fromCode = 'return box(10);';
        const toCode = 'return box(20);';
        workbenchCode = fromCode;
        shellStore.proposeStagedEdit({
            id: 'e-echo',
            intent: 'demo',
            fromCode,
            toCode,
            targetScript: 'examples/horn.kcad.ts',
        });

        const { getByTestId, queryByTestId } = render(<StagedEditSlot />);
        fireEvent.click(getByTestId('staged-edit-approve'));

        // The watcher bridge echoes the just-saved bytes back into the editor.
        await act(async () => {
            workbenchCode = toCode;
            shellStore.setSelectedFeatureId('force-rerender');
        });

        await act(async () => {
            resolveSave();
        });

        expect(setCodeMock).toHaveBeenCalledWith(toCode);
        expect(shellStore.getSnapshot().stagedEdit).toBeNull();
        expect(shellStore.getSnapshot().appliedEditHistory).toHaveLength(1);
        expect(queryByTestId('staged-edit-stale-warning')).toBeNull();
    });

    it('Approve double-click sends one PUT and applies once', async () => {
        let resolveSave: () => void = () => {};
        saveSourceToScriptMock.mockImplementationOnce(
            () =>
                new Promise<void>((resolve) => {
                    resolveSave = resolve;
                }),
        );
        const fromCode = 'return box(10);';
        const toCode = 'return box(20);';
        workbenchCode = fromCode;
        shellStore.proposeStagedEdit({
            id: 'e-double-click',
            intent: 'demo',
            fromCode,
            toCode,
            targetScript: 'examples/horn.kcad.ts',
        });

        const { getByTestId } = render(<StagedEditSlot />);
        const approve = getByTestId('staged-edit-approve');
        fireEvent.click(approve);
        fireEvent.click(approve);

        expect(saveSourceToScriptMock).toHaveBeenCalledTimes(1);
        expect((approve as HTMLButtonElement).disabled).toBe(true);

        await act(async () => {
            resolveSave();
        });

        expect(saveSourceToScriptMock).toHaveBeenCalledTimes(1);
        expect(setCodeMock).toHaveBeenCalledTimes(1);
        expect(shellStore.getSnapshot().stagedEdit).toBeNull();
        expect(shellStore.getSnapshot().appliedEditHistory).toHaveLength(1);
    });

    it('Approve aborts when the staged edit is replaced while saving', async () => {
        let resolveSave: () => void = () => {};
        saveSourceToScriptMock.mockImplementationOnce(
            () =>
                new Promise<void>((resolve) => {
                    resolveSave = resolve;
                }),
        );
        const fromCode = 'return box(10);';
        workbenchCode = fromCode;
        shellStore.proposeStagedEdit({
            id: 'e-old',
            intent: 'old edit',
            fromCode,
            toCode: 'return box(20);',
            targetScript: 'examples/horn.kcad.ts',
        });

        const { getByTestId } = render(<StagedEditSlot />);
        fireEvent.click(getByTestId('staged-edit-approve'));

        act(() => {
            shellStore.proposeStagedEdit({
                id: 'e-new',
                intent: 'new edit',
                fromCode,
                toCode: 'return box(99);',
            });
        });

        await act(async () => {
            resolveSave();
        });

        expect(setCodeMock).not.toHaveBeenCalled();
        expect(shellStore.getSnapshot().stagedEdit?.id).toBe('e-new');
        expect(shellStore.getSnapshot().appliedEditHistory).toHaveLength(0);
    });

    it('Approve re-checks editor staleness after the target save resolves', async () => {
        let resolveSave: () => void = () => {};
        saveSourceToScriptMock.mockImplementationOnce(
            () =>
                new Promise<void>((resolve) => {
                    resolveSave = resolve;
                }),
        );
        const fromCode = 'return box(10);';
        workbenchCode = fromCode;
        shellStore.proposeStagedEdit({
            id: 'e-toctou',
            intent: 'demo',
            fromCode,
            toCode: 'return box(20);',
            targetScript: 'examples/horn.kcad.ts',
        });

        const { getByTestId } = render(<StagedEditSlot />);
        fireEvent.click(getByTestId('staged-edit-approve'));

        await act(async () => {
            workbenchCode = 'return box(15);';
            shellStore.setSelectedFeatureId('force-rerender');
        });

        await act(async () => {
            resolveSave();
        });

        expect(setCodeMock).not.toHaveBeenCalled();
        expect(shellStore.getSnapshot().stagedEdit?.id).toBe('e-toctou');
        expect(shellStore.getSnapshot().appliedEditHistory).toHaveLength(0);
        expect(getByTestId('staged-edit-stale-warning').textContent).toContain(
            'changed since this edit was staged',
        );
    });

    it('Reject leaves the script unchanged and clears the slot', () => {
        shellStore.setDirectEditNotice('Save failed; the edit is still staged.');
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
        expect(shellStore.getSnapshot().directEditNotice).toBeNull();
        expect(getByTestId('applied-edit-history').textContent).toContain('Rejected');
        expect(getByTestId('applied-edit-history').textContent).toContain('demo');
    });

    it('Reject rolls a running staged repair workflow back to drafted', () => {
        const repairWorkflow = {
            cardId: 'diagnostic:assembly.part.floating:output-horn:0',
            code: 'assembly.part.floating',
            promptText: 'Fix output horn',
            targetId: 'output-horn',
            promptSource: 'fallback' as const,
            validityFingerprint: 'before',
            state: 'running' as const,
        };
        shellStore.setAgentRepairWorkflow(repairWorkflow);
        shellStore.proposeStagedEdit({
            id: 'e-reject-workflow',
            intent: 'Reject repair',
            fromCode: 'return box(10);',
            toCode: 'return box(20);',
            context: {
                promptText: 'Fix output horn',
                selectedFeatureId: 'output-horn',
                repairWorkflow,
                generationId: 'gen-reject',
            },
        });

        const { getByTestId } = render(<StagedEditSlot />);
        fireEvent.click(getByTestId('staged-edit-reject'));

        expect(shellStore.getSnapshot().agentRepairWorkflow).toEqual({
            ...repairWorkflow,
            state: 'drafted',
        });
        expect(getByTestId('applied-edit-history').textContent).toContain('Rejected');
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
