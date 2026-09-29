// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
/**
 * Regression guard: code typed on /studio must survive the project -> workbench
 * sync. The sync used to compare the saved project with the LIVE workbench
 * code, so every keystroke that was not yet auto-saved looked like a project
 * change and was reverted to the stored copy before auto-save could store it.
 *
 * Uses the real ProjectProvider (localStorage) and a stateful workbench.
 */
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

const STORED = 'const a = 1;\nreturn a;';
const TYPED = 'const a = 2;\nreturn a;';
const MORE = 'const a = 23;\nreturn a;';

const harness = vi.hoisted(() => ({
    code: '',
    setCode: (_code: string) => undefined as void,
    project: null as null | {
        activeProjectId: string | null;
        activeProject: { code: string } | null;
        saveActiveProject: (updates: { code: string }) => void;
        createProject: (name?: string, code?: string) => string;
        openProject: (id: string) => void;
    },
}));

vi.mock('./context/WorkbenchContext', async () => {
    const React = await import('react');
    const { ProjectProvider } = await import('./context/ProjectContext');
    const CodeState = React.createContext<{ code: string; setCode: (code: string) => void } | null>(null);
    function CodeStateProvider({ children }: { children: ReactNode }) {
        const [code, setCode] = React.useState('// DEFAULT');
        const value = React.useMemo(() => ({ code, setCode }), [code, setCode]);
        return <CodeState.Provider value={value}>{children}</CodeState.Provider>;
    }
    return {
        WorkbenchProvider: ({ children }: { children: ReactNode }) => (
            <ProjectProvider>
                <CodeStateProvider>{children}</CodeStateProvider>
            </ProjectProvider>
        ),
        useWorkbench: () => {
            const state = React.useContext(CodeState)!;
            return {
                code: state.code,
                setCode: state.setCode,
                viewMode: 'code',
                setViewMode: () => undefined,
                viewMode3D: 'shadedWithEdges',
                setViewMode3D: () => undefined,
                sidePanelVisible: true,
                showSketches: true,
                hasControlledCode: false,
            };
        },
    };
});

vi.mock('./store/useShellStore', () => ({
    useShellStore: () => ({ agentRailOpen: false }),
}));

vi.mock('./store/shellStore', () => ({
    shellStore: { setAgentRailOpen: vi.fn() },
}));

vi.mock('./StudioShell', async () => {
    const { useWorkbench } = await import('./context/WorkbenchContext');
    const { useProject } = await import('./context/ProjectContext');
    return {
        StudioShell: () => {
            const workbench = useWorkbench();
            harness.code = workbench.code;
            harness.setCode = workbench.setCode;
            harness.project = useProject();
            return null;
        },
    };
});

import App from './App';
import { projectService } from '../authoring/projectService';

function storedCode(): string | undefined {
    const id = harness.project?.activeProjectId;
    return id ? projectService.getProject(id)?.code : undefined;
}

async function flush(ms = 0): Promise<void> {
    await act(async () => {
        vi.advanceTimersByTime(ms);
        await Promise.resolve();
    });
}

beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    window.history.pushState(null, '', '/studio');
    const id = projectService.generateId();
    projectService.saveProject(id, projectService.createProject(STORED, {
        viewMode: 'code', viewMode3D: 'shadedWithEdges', sidePanelVisible: true, showSketches: true,
    }, 'Stored'));
    localStorage.setItem('kernelcad_last_project_id', id);
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    localStorage.clear();
});

describe('App project sync on /studio', () => {
    it('seeds the workbench from the stored project', async () => {
        render(<App />);
        await flush();
        expect(harness.code).toBe(STORED);
    });

    it('keeps typed code that is not auto-saved yet', async () => {
        render(<App />);
        await flush();

        act(() => harness.setCode(TYPED));
        await flush();
        expect(harness.code).toBe(TYPED);

        // Auto-save stores it; the save echo does not revert later typing.
        await flush(1500);
        expect(storedCode()).toBe(TYPED);
        act(() => harness.setCode(MORE));
        await flush();
        expect(harness.code).toBe(MORE);
        await flush(1500);
        expect(storedCode()).toBe(MORE);
    });

    it('takes project code changed outside the editor', async () => {
        render(<App />);
        await flush();

        act(() => harness.project!.saveActiveProject({ code: TYPED }));
        await flush();
        expect(harness.code).toBe(TYPED);
    });

    it('seeds the workbench on a project switch', async () => {
        render(<App />);
        await flush();
        const firstId = harness.project!.activeProjectId!;
        act(() => harness.setCode(TYPED));
        await flush(1500);

        act(() => {
            harness.project!.createProject('Other', MORE);
        });
        await flush();
        expect(harness.code).toBe(MORE);

        act(() => harness.project!.openProject(firstId));
        await flush();
        expect(harness.code).toBe(TYPED);
    });
});
