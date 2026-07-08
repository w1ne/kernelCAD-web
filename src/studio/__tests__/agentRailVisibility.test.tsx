// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

// Mutable state closed over by the mocks so each test can control them.
let agentRailOpen = true; // open so rail renders when agentEnabled is true
let sessionState: { session: null | { user: { id: string } }; loading: boolean } = {
    session: null,
    loading: false,
};

vi.mock('../context/WorkbenchContext', () => ({
    useWorkbench: () => ({
        code: '',
        isReady: true,
        isComputing: false,
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
        pruneSectionKeepWhole: vi.fn(),
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
        rawInterferencePairs: [],
    }),
}));

vi.mock('../context/ProjectContext', () => ({
    useProject: () => ({ activeProject: null }),
}));

vi.mock('../../funnel/hooks/useSession', () => ({
    useOptionalSession: () => sessionState,
}));

vi.mock('../../funnel/lib/supabaseClient', () => ({
    isAuthConfigured: vi.fn(() => true),
}));

vi.mock('../components/Layout/Header', () => ({ Header: () => <div data-testid="header" /> }));
vi.mock('../Toolbar', () => ({ Toolbar: () => <div data-testid="toolbar" /> }));
vi.mock('../Viewport', () => ({ Viewport: () => <div data-testid="viewport" /> }));
vi.mock('../Inspector', () => ({ Inspector: () => <div data-testid="inspector" /> }));
// Mock AgentRail with the real aria-label so queryByLabelText can find it.
vi.mock('../AgentRail', () => ({ AgentRail: () => <aside aria-label="Agent rail" /> }));
vi.mock('../BottomDrawer', () => ({ BottomDrawer: () => <div data-testid="bottom-drawer" /> }));
vi.mock('../components/Dialogs/ProjectManagerDialog', () => ({ default: () => null }));
vi.mock('../components/Layout/StatusBar', () => ({
    StatusBar: () => <div data-testid="status-bar" />,
}));

import { StudioShell } from '../StudioShell';
import { isAuthConfigured } from '../../funnel/lib/supabaseClient';

const mockIsAuthConfigured = vi.mocked(isAuthConfigured);

afterEach(() => cleanup());

beforeEach(() => {
    agentRailOpen = true;
    sessionState = { session: null, loading: false };
    mockIsAuthConfigured.mockReturnValue(true);
});

describe('agent rail visibility by session state', () => {
    // agentEnabled = enableAgentRail && authConfigured && !!session
    it('hides the agent rail when auth is configured but no session exists', () => {
        sessionState = { session: null, loading: false };

        render(<StudioShell />);

        expect(screen.queryByLabelText('Agent rail')).toBeNull();
    });

    it('shows the agent rail when auth is configured and a session exists', () => {
        sessionState = { session: { user: { id: 'u1' } }, loading: false };

        render(<StudioShell />);

        expect(screen.queryByLabelText('Agent rail')).not.toBeNull();
    });

    it('hides the agent rail in local dev (auth not configured), even with a session', () => {
        // Local run: no Supabase env → isAuthConfigured() false. The in-Studio
        // agent has no hosted/metered backend locally, so the rail stays hidden.
        mockIsAuthConfigured.mockReturnValue(false);
        sessionState = { session: { user: { id: 'u1' } }, loading: false };

        render(<StudioShell />);

        expect(screen.queryByLabelText('Agent rail')).toBeNull();
    });
});
