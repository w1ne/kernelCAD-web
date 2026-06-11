// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

const mocks = vi.hoisted(() => ({
    currentCode: '// DEFAULT_WORKBENCH_CODE',
    localProjectCode: '// LOCAL_PROJECT_CODE',
    saveActiveProject: vi.fn(),
    setCode: vi.fn((nextCode: string) => {
        mocks.currentCode = nextCode;
    }),
    setViewMode: vi.fn(),
    setViewMode3D: vi.fn(),
}));

vi.mock('./context/WorkbenchContext', async () => {
    const React = await import('react');

    return {
        WorkbenchProvider: ({ children, initialCode }: { children: ReactNode; initialCode?: string }) => {
            const [code, setCode] = React.useState(initialCode ?? '// DEFAULT_WORKBENCH_CODE');
            mocks.currentCode = code;

            return (
                <div data-testid="workbench-provider">
                    {children}
                </div>
            );
        },
        useWorkbench: () => ({
            code: mocks.currentCode,
            setCode: mocks.setCode,
            viewMode: 'code',
            setViewMode: mocks.setViewMode,
            viewMode3D: 'shadedWithEdges',
            setViewMode3D: mocks.setViewMode3D,
            sidePanelVisible: true,
            showSketches: true,
        }),
    };
});

vi.mock('./context/ProjectContext', () => ({
    useProject: () => ({
        activeProject: {
            code: mocks.localProjectCode,
            viewState: {
                viewMode: 'code',
                viewMode3D: 'shadedWithEdges',
                agentRailOpen: false,
            },
        },
        // Non-ephemeral id: must NOT trigger the ephemeral guard so that
        // viewerMode and real-project sync paths behave exactly as before.
        activeProjectId: 'local-project-id',
        saveActiveProject: mocks.saveActiveProject,
    }),
    isEphemeralProjectId: (id: string | null) => id === '__funnel_ephemeral__',
}));

vi.mock('./store/useShellStore', () => ({
    useShellStore: () => ({ agentRailOpen: false }),
}));

vi.mock('./store/shellStore', () => ({
    shellStore: {
        setAgentRailOpen: vi.fn(),
    },
}));

// StudioShell mock reads viewerMode from StudioChromeContext so the agent-rail
// toggle visibility test can verify context propagation without pulling in all
// of StudioShell's heavy dependencies.
vi.mock('./StudioShell', async () => {
    const React = await import('react');
    const { useStudioChrome } = await import('./context/StudioChromeContext');

    return {
        StudioShell: () => {
            const { viewerMode } = useStudioChrome();
            return (
                <main data-testid="studio-shell">
                    <span data-testid="workbench-code">{mocks.currentCode}</span>
                    {!viewerMode && (
                        <button aria-label="Open agent rail" data-testid="agent-rail-toggle">
                            Agent
                        </button>
                    )}
                </main>
            );
        },
    };
});

import App from './App';

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
    mocks.currentCode = '// DEFAULT_WORKBENCH_CODE';
    mocks.localProjectCode = '// LOCAL_PROJECT_CODE';
    mocks.saveActiveProject.mockClear();
    mocks.setCode.mockClear();
    mocks.setViewMode.mockClear();
    mocks.setViewMode3D.mockClear();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    window.history.pushState(null, '', '/studio');
});

afterEach(() => {
    cleanup();
    consoleErrorSpy.mockRestore();
    vi.unstubAllGlobals();
});

describe('App live viewer', () => {
    it('applies liveCode updates to the workbench code', async () => {
        const { rerender } = render(<App initialCode="cube();" viewerMode />);

        rerender(<App initialCode="cube();" viewerMode liveCode="sphere();" />);

        await act(async () => {
            await Promise.resolve();
        });

        expect(mocks.setCode).toHaveBeenCalledWith('sphere();');
    });

    it('hides the agent rail toggle in viewer mode', () => {
        // Positive control: agent toggle IS present without viewerMode
        render(<App initialCode="cube();" />);
        expect(screen.getByTestId('agent-rail-toggle')).toBeTruthy();
        cleanup();

        // Negative assertion: toggle is ABSENT in viewerMode
        render(<App initialCode="cube();" viewerMode />);
        expect(screen.queryByTestId('agent-rail-toggle')).toBeNull();
    });
});
