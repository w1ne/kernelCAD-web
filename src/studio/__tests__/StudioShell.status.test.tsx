/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let workbenchComputing = false;
let agentRailOpen = false;

vi.mock('../context/WorkbenchContext', () => ({
    useWorkbench: () => ({
        code: '',
        isReady: true,
        isComputing: workbenchComputing,
        error: null,
        geometries: [],
        selectedItemIds: [],
        viewMode3D: 'shadedWithEdges',
        layoutMode: 'split',
        activeDialog: null,
        executeGeometry: vi.fn(),
        mutateCode: vi.fn(),
        setSelectedItemId: vi.fn(),
        codeContext: { returnedVariables: [] },
        setActiveDialog: vi.fn(),
    }),
}));

vi.mock('../store/useShellStore', () => ({
    useShellStore: () => ({ agentRailOpen, selectedFeatureId: null }),
    shellStore: {
        setAgentRailOpen: vi.fn(),
        proposeStagedEdit: vi.fn(),
    },
}));

vi.mock('../hooks/useRecomputeResult', () => ({
    useRecomputeResult: () => ({
        features: [],
        geometries: [],
        validity: null,
        paramTable: null,
        diagnostics: [],
        recomputeMs: 0,
        joints: [],
    }),
}));

vi.mock('../context/ProjectContext', () => ({
    useProject: () => ({ activeProject: null }),
}));

vi.mock('../components/Layout/Header', () => ({ Header: () => <div data-testid="header" /> }));
vi.mock('../Toolbar', () => ({ Toolbar: () => <div data-testid="toolbar" /> }));
vi.mock('../Viewport', () => ({ Viewport: () => <div data-testid="viewport" /> }));
vi.mock('../Inspector', () => ({ Inspector: () => <div data-testid="inspector" /> }));
vi.mock('../AgentRail', () => ({ AgentRail: () => <div data-testid="agent-rail" /> }));
vi.mock('../BottomDrawer', () => ({ BottomDrawer: () => <div data-testid="bottom-drawer" /> }));
vi.mock('../components/Dialogs/ProjectManagerDialog', () => ({ default: () => null }));
vi.mock('../components/Layout/StatusBar', () => ({
    StatusBar: ({ isComputing }: { isComputing: boolean }) => (
        <div data-testid="status-is-computing">{String(isComputing)}</div>
    ),
}));

import { StudioShell } from '../StudioShell';

afterEach(() => cleanup());

beforeEach(() => {
    workbenchComputing = false;
    agentRailOpen = false;
});

describe('StudioShell status plumbing', () => {
    it('passes workbench computing state to the status bar', () => {
        workbenchComputing = true;

        render(<StudioShell />);

        expect(screen.getByTestId('status-is-computing').textContent).toBe('true');
    });

    it('places the open agent rail before the viewport', () => {
        agentRailOpen = true;

        render(<StudioShell />);

        const rail = screen.getByTestId('agent-rail');
        const viewport = screen.getByTestId('viewport');
        expect(rail.compareDocumentPosition(viewport) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
});
