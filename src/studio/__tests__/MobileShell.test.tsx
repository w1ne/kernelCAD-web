// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment jsdom */
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The Studio on a phone: a bottom tab bar instead of the activity bar and
// the status bar, and one docked sheet per tab. The shell store stays real,
// so the sheet ↔ inspectorOpen / agentRailOpen sync is exercised.

let narrow = true;
let params = 3;
let workbenchError: string | null = null;

vi.mock('../context/WorkbenchContext', () => ({
    useWorkbench: () => ({
        code: '',
        isReady: true,
        isComputing: false,
        error: workbenchError,
        geometries: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
        selectedItemIds: [],
        viewMode3D: 'shadedWithEdges',
        layoutMode: 'split',
        activeDialog: null,
        recomputeMs: 42,
        executeGeometry: vi.fn(),
        mutateCode: vi.fn(),
        setSelectedItemId: vi.fn(),
        codeContext: { returnedVariables: [] },
        setActiveDialog: vi.fn(),
    }),
}));

vi.mock('../hooks/useRecomputeResult', () => ({
    useRecomputeResult: () => ({
        features: [],
        geometries: [{ id: 'a' }],
        validity: null,
        paramTable: { size: () => params, list: () => [] },
        diagnostics: [],
        recomputeMs: 42,
        joints: [],
        rawInterferencePairs: [],
        interferenceSummary: null,
    }),
}));

vi.mock('../context/ProjectContext', () => ({
    useProject: () => ({
        activeProject: null, projects: [], activeProjectId: null,
        openProject: vi.fn(), createProject: vi.fn(), saveActiveProject: vi.fn(),
    }),
}));
vi.mock('../../funnel/hooks/useSession', () => ({
    useOptionalSession: () => ({ session: null, loading: false }),
}));
vi.mock('../context/UIContext', () => ({
    useUI: () => ({ viewportBackground: 'dark', setViewportBackground: vi.fn(), gridVisible: true, setGridVisible: vi.fn() }),
}));
vi.mock('../components/Layout/Header', () => ({ Header: () => <div data-testid="header" /> }));
vi.mock('../ViewportToolbar', () => ({ ViewportToolbar: () => <div data-testid="toolbar" /> }));
vi.mock('../Viewport', () => ({ Viewport: () => <div data-testid="viewport" /> }));
vi.mock('../AgentRail', () => ({ AgentRail: () => <div data-testid="agent-rail" /> }));
vi.mock('../components/Dialogs/ProjectManagerDialog', () => ({ default: () => null }));
vi.mock('../components/Layout/StatusBar', () => ({ StatusBar: () => <footer data-testid="status-bar" /> }));
vi.mock('../tabs/SceneTab', () => ({ SceneTab: () => <div data-testid="slot-scene" /> }));
vi.mock('../tabs/CodeTab', () => ({ CodeTab: () => <div data-testid="slot-code" /> }));
vi.mock('../tabs/ParamsTab', () => ({ ParamsTab: () => <div data-testid="slot-params" /> }));
vi.mock('../tabs/JointsTab', () => ({ JointsTab: () => <div data-testid="slot-joints" /> }));
vi.mock('../tabs/ValidityTab', () => ({ ValidityTab: () => <div data-testid="slot-validity" /> }));
vi.mock('../tabs/ExportTab', () => ({ ExportTab: () => <div data-testid="slot-export" /> }));
vi.mock('../components/animation/AnimationTab', () => ({ AnimationTab: () => <div data-testid="slot-animation" /> }));
vi.mock('../components/viewer/overlays/MarkingOverlay', () => ({ MarkingOverlay: () => null }));
vi.mock('../components/viewer/overlays/SectionPanel', () => ({ SectionPanel: () => null }));
vi.mock('../components/viewer/overlays/DirectEditPanel', () => ({ DirectEditPanel: () => null }));

import { StudioShell } from '../StudioShell';
import { shellStore } from '../store/useShellStore';
import { inspectorTabRequests } from '../hooks/studioNavigation';

function tab(name: string): HTMLElement {
    return within(screen.getByTestId('mobile-tabbar')).getByRole('tab', { name });
}

beforeEach(() => {
    narrow = true;
    params = 3;
    workbenchError = null;
    vi.stubGlobal('matchMedia', (query: string) => ({
        matches: narrow && query === '(max-width: 767px)' ? true : narrow && query === '(max-width: 1023px)',
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
    }));
    shellStore.setInspectorOpen(false);
    shellStore.setAgentRailOpen(false);
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe('Studio on a phone', () => {
    it('shows the model with a bottom tab bar, not the activity bar, inspector or status bar', () => {
        render(<StudioShell />);

        expect(screen.getByTestId('viewport')).toBeTruthy();
        expect(screen.getByTestId('workbench-ready').getAttribute('data-shell')).toBe('mobile');
        const names = within(screen.getByTestId('mobile-tabbar')).getAllByRole('tab').map((t) => t.textContent);
        expect(names).toEqual(['Model', 'Agent', 'Params', 'Code', 'More']);
        expect(tab('Model').getAttribute('aria-selected')).toBe('true');
        expect(screen.queryByTestId('activity-bar')).toBeNull();
        expect(screen.queryByTestId('inspector')).toBeNull();
        expect(screen.queryByTestId('status-bar')).toBeNull();
        expect(screen.queryByTestId('mobile-drawer')).toBeNull();
    });

    it('opens a docked sheet per tab; the same tab or Model closes it', () => {
        render(<StudioShell />);

        fireEvent.click(tab('Params'));
        const sheet = screen.getByTestId('mobile-drawer');
        expect(within(sheet).getByTestId('slot-params')).toBeTruthy();
        expect(sheet.getAttribute('role')).toBe('tabpanel');
        expect(tab('Params').getAttribute('aria-controls')).toBe(sheet.id);
        expect(shellStore.getSnapshot().inspectorOpen).toBe(true);
        // The model stays on screen above the sheet.
        expect(screen.getByTestId('viewport')).toBeTruthy();

        fireEvent.click(tab('Params'));
        expect(screen.queryByTestId('mobile-drawer')).toBeNull();
        expect(shellStore.getSnapshot().inspectorOpen).toBe(false);

        fireEvent.click(tab('Code'));
        expect(within(screen.getByTestId('mobile-drawer')).getByTestId('slot-code')).toBeTruthy();
        fireEvent.click(tab('Model'));
        expect(screen.queryByTestId('mobile-drawer')).toBeNull();
    });

    it('closes the sheet with Esc and the close button', () => {
        render(<StudioShell />);
        fireEvent.click(tab('Code'));
        fireEvent.keyDown(screen.getByTestId('mobile-drawer'), { key: 'Escape' });
        expect(screen.queryByTestId('mobile-drawer')).toBeNull();

        fireEvent.click(tab('More'));
        fireEvent.click(screen.getByTestId('mobile-drawer-close'));
        expect(screen.queryByTestId('mobile-drawer')).toBeNull();
    });

    it('says how to get sliders when the model has no params', () => {
        params = 0;
        render(<StudioShell />);
        fireEvent.click(tab('Params'));

        expect(screen.getByText('No sizes to change yet')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Open the code' }));
        expect(within(screen.getByTestId('mobile-drawer')).getByTestId('slot-code')).toBeTruthy();
        expect(tab('Code').getAttribute('aria-selected')).toBe('true');
    });

    it('folds the status bar into More → Status', () => {
        render(<StudioShell />);
        fireEvent.click(tab('More'));
        fireEvent.click(screen.getByTestId('mobile-more-status'));

        const status = screen.getByTestId('mobile-status');
        expect(status.textContent).toContain('Ready');
        expect(status.textContent).toContain('3 bodies');
        expect(status.textContent).toContain('42 ms');
        expect(tab('More').getAttribute('aria-selected')).toBe('true');

        fireEvent.click(screen.getByTestId('mobile-drawer-back'));
        expect(screen.getByTestId('mobile-more')).toBeTruthy();
    });

    it('marks a script error on the Code tab and in the live status', () => {
        workbenchError = 'ReferenceError: w is not defined\n  at line 3';
        render(<StudioShell />);

        expect(screen.getByTestId('mobile-tab-code-error')).toBeTruthy();
        expect(screen.getByRole('status').textContent).toBe('Error: ReferenceError: w is not defined');
    });

    it('opens the sheet a palette command asks for, and follows the inspector toggle', () => {
        render(<StudioShell />);

        act(() => inspectorTabRequests.request('validity'));
        expect(within(screen.getByTestId('mobile-drawer')).getByTestId('slot-validity')).toBeTruthy();
        expect(screen.getByTestId('mobile-drawer-back')).toBeTruthy();

        act(() => shellStore.setInspectorOpen(false));
        expect(screen.queryByTestId('mobile-drawer')).toBeNull();

        act(() => shellStore.setInspectorOpen(true));
        expect(within(screen.getByTestId('mobile-drawer')).getByTestId('slot-code')).toBeTruthy();
    });

    it('shows the sizes after a starter is picked in Projects', () => {
        render(<StudioShell />);
        fireEvent.click(tab('More'));
        fireEvent.click(screen.getByTestId('mobile-more-projects'));
        fireEvent.click(within(screen.getByTestId('projects-pane')).getByRole('button', { name: 'Bracket' }));

        expect(tab('Params').getAttribute('aria-selected')).toBe('true');
        expect(within(screen.getByTestId('mobile-drawer')).getByTestId('slot-params')).toBeTruthy();
    });

    it('opens the agent from its tab; a saved open agent rail alone does not cover the model', () => {
        render(<StudioShell />);
        act(() => shellStore.setAgentRailOpen(true));
        expect(screen.queryByTestId('mobile-drawer')).toBeNull();
        act(() => shellStore.setAgentRailOpen(false));

        fireEvent.click(tab('Agent'));
        expect(screen.getByTestId('mobile-sheet-agent')).toBeTruthy();
        expect(shellStore.getSnapshot().agentRailOpen).toBe(true);

        fireEvent.click(tab('Params'));
        expect(shellStore.getSnapshot().agentRailOpen).toBe(false);
    });

    it('moves focus along the tab bar with the arrow keys', () => {
        render(<StudioShell />);
        tab('Model').focus();
        fireEvent.keyDown(tab('Model'), { key: 'ArrowRight' });
        expect(document.activeElement).toBe(tab('Agent'));
        fireEvent.keyDown(tab('Agent'), { key: 'End' });
        expect(document.activeElement).toBe(tab('More'));
        expect(tab('More').tabIndex).toBe(0);
        expect(tab('Model').tabIndex).toBe(-1);
    });

    it('keeps the desktop layout on a wide screen', () => {
        narrow = false;
        render(<StudioShell />);

        expect(screen.queryByTestId('mobile-tabbar')).toBeNull();
        expect(screen.getByTestId('activity-bar')).toBeTruthy();
        expect(screen.getByTestId('status-bar')).toBeTruthy();
        expect(screen.getByTestId('inspector')).toBeTruthy();
    });
});
