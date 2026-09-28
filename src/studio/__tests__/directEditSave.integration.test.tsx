// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
//
// Direct-edit save path — integration over the REAL workbench + project
// stack (CodeProvider command stack, ProjectProvider over localStorage
// projectService). Only the dev file endpoint is mocked, so a call to it is
// observable. Proves:
// - Approve on a project route saves through the project store (a revision),
//   never the dev endpoint;
// - Approve on a dev `?script=` route still uses the dev endpoint;
// - a read-only viewer cannot save;
// - the applied edit is ONE undo step (header stack and Ctrl/Cmd+Z) that
//   restores the exact previous source in the editor AND the project;
// - a burst of approved edits coalesces into one project revision.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { useEffect, type ReactNode } from 'react';

const { saveSourceToScriptMock } = vi.hoisted(() => ({ saveSourceToScriptMock: vi.fn() }));

vi.mock('../directEdit/saveSource', () => ({
    saveSourceToScript: saveSourceToScriptMock,
}));

import { WorkbenchProvider, useWorkbench, type WorkbenchContextType } from '../context/WorkbenchContext';
import { StudioChromeProvider } from '../context/StudioChromeContext';
import { useProject } from '../context/ProjectContext';
import { StagedEditSlot } from '../StagedEditSlot';
import { shellStore, type StagedEdit } from '../store/shellStore';
import { projectService } from '../../authoring/projectService';
import { useUndoRedoShortcuts } from '../hooks/useUndoRedoShortcuts';

// No network in this suite: record every request (the kernel-init/review
// fetches of the provider stack) and fail it fast.
const fetchMock = vi.fn((input: RequestInfo | URL) => Promise.reject(new Error(`offline: ${String(input)}`)));

// Latest workbench/project values, published after each commit.
const probe: { workbench: WorkbenchContextType | null; activeProjectId: string | null } = {
    workbench: null,
    activeProjectId: null,
};

function Probe() {
    const wb = useWorkbench();
    const { activeProjectId: id } = useProject();
    useUndoRedoShortcuts(wb.commandManager);
    useEffect(() => {
        probe.workbench = wb;
        probe.activeProjectId = id;
    });
    return null;
}

function Studio({ viewerMode = false, children }: { viewerMode?: boolean; children?: ReactNode }) {
    return (
        <WorkbenchProvider suspendSourceExecution>
            <StudioChromeProvider value={{ viewerMode }}>
                <Probe />
                <StagedEditSlot />
                {children}
            </StudioChromeProvider>
        </WorkbenchProvider>
    );
}

function currentCode(): string {
    return probe.workbench!.code;
}

function savedProjectCode(): string | undefined {
    return projectService.getProject(probe.activeProjectId!)?.code;
}

function stage(toCode: string, extra: Partial<StagedEdit> = {}): StagedEdit {
    const edit: StagedEdit = {
        id: `e-${Math.random().toString(36).slice(2, 8)}`,
        intent: "Translate part 'base' by (5, 0, 0) mm",
        fromCode: currentCode(),
        toCode,
        evaluation: { ok: true },
        source: { kind: 'human', label: 'drag' },
        ...extra,
    };
    act(() => shellStore.proposeStagedEdit(edit));
    return edit;
}

async function approve(getByTestId: (id: string) => HTMLElement): Promise<void> {
    await act(async () => {
        fireEvent.click(getByTestId('staged-edit-approve'));
    });
}

beforeEach(() => {
    localStorage.clear();
    shellStore.reset();
    fetchMock.mockClear();
    vi.stubGlobal('fetch', fetchMock);
    saveSourceToScriptMock.mockReset();
    saveSourceToScriptMock.mockResolvedValue(undefined);
    window.history.replaceState(null, '', '/');
    probe.workbench = null;
    probe.activeProjectId = null;
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    window.history.replaceState(null, '', '/');
    localStorage.clear();
});

describe('approved direct edit — save path', () => {
    it('project route: saves the rewritten source through the project store, not the dev endpoint', async () => {
        const { getByTestId } = render(<Studio />);
        expect(probe.activeProjectId).not.toBeNull();
        const fromCode = currentCode();
        const toCode = `${fromCode}\n// moved base +5 mm`;
        stage(toCode);
        await approve(getByTestId);

        expect(currentCode()).toBe(toCode);
        expect(savedProjectCode()).toBe(toCode);
        expect(projectService.listRevisions(probe.activeProjectId!).at(-1)?.code).toBe(toCode);
        expect(saveSourceToScriptMock).not.toHaveBeenCalled();
        expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/__kernelcad/source'))).toBe(false);
        expect(shellStore.getSnapshot().stagedEdit).toBeNull();
    });

    it('dev ?script= route: still saves through the dev file endpoint', async () => {
        window.history.replaceState(null, '', '/?script=examples/horn.kcad.ts');
        const { getByTestId } = render(<Studio />);
        const projectCodeBefore = savedProjectCode();
        const toCode = `${currentCode()}\n// moved`;

        stage(toCode, { targetScript: 'examples/horn.kcad.ts' });
        await approve(getByTestId);

        expect(saveSourceToScriptMock).toHaveBeenCalledWith('examples/horn.kcad.ts', toCode);
        expect(currentCode()).toBe(toCode);
        // The local project is not the target of a script route.
        expect(savedProjectCode()).toBe(projectCodeBefore);
    });

    it('read-only viewer: Approve is disabled with a hint and nothing saves', async () => {
        const { getByTestId } = render(<Studio viewerMode />);
        const fromCode = currentCode();
        const projectCodeBefore = savedProjectCode();

        stage(`${fromCode}\n// moved`);
        const approveButton = getByTestId('staged-edit-approve') as HTMLButtonElement;
        expect(approveButton.disabled).toBe(true);
        expect(getByTestId('staged-edit-read-only').textContent).toContain('read-only');
        await approve(getByTestId);

        expect(currentCode()).toBe(fromCode);
        expect(savedProjectCode()).toBe(projectCodeBefore);
        expect(saveSourceToScriptMock).not.toHaveBeenCalled();
        expect(shellStore.getSnapshot().stagedEdit).not.toBeNull();
    });

    it('one undo restores the exact previous source in the editor and the project', async () => {
        const { getByTestId } = render(<Studio />);
        const fromCode = currentCode();
        stage(`${fromCode}\n// moved`);
        await approve(getByTestId);

        act(() => probe.workbench!.commandManager.undo());

        expect(currentCode()).toBe(fromCode);
        expect(savedProjectCode()).toBe(fromCode);
        expect(probe.workbench!.commandManager.canUndo).toBe(false);

        act(() => probe.workbench!.commandManager.redo());
        expect(currentCode()).toBe(`${fromCode}\n// moved`);
        expect(savedProjectCode()).toBe(`${fromCode}\n// moved`);
    });

    it('Ctrl/Cmd+Z outside the editor undoes the applied edit', async () => {
        const { getByTestId } = render(<Studio />);
        const fromCode = currentCode();
        stage(`${fromCode}\n// moved`);
        await approve(getByTestId);

        act(() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }));
        });
        expect(currentCode()).toBe(fromCode);

        act(() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Z', ctrlKey: true, shiftKey: true, bubbles: true }));
        });
        expect(currentCode()).toBe(`${fromCode}\n// moved`);
    });

    it('a burst of approved edits coalesces into one project revision', async () => {
        const { getByTestId } = render(<Studio />);
        const base = currentCode();
        // Settle the project's creation revision outside the burst window.
        const revs = projectService.listRevisions(probe.activeProjectId!);
        revs.forEach((rev) => { rev.ts = new Date(Date.now() - 60_000).toISOString(); });
        localStorage.setItem(`kernelcad_project_revisions_${probe.activeProjectId}`, JSON.stringify(revs));
        const revisionsBefore = revs.length;

        for (let i = 1; i <= 3; i++) {
            stage(`${base}\n// drag ${i}`);
            await approve(getByTestId);
        }

        const after = projectService.listRevisions(probe.activeProjectId!);
        expect(after).toHaveLength(revisionsBefore + 1);
        expect(after.at(-1)?.code).toBe(`${base}\n// drag 3`);
        expect(savedProjectCode()).toBe(`${base}\n// drag 3`);
    });
});
