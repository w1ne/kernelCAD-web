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
        setAgentDraftPrompt: vi.fn(),
        setInspectorOpen: vi.fn(),
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
vi.mock('../ViewportToolbar', () => ({ ViewportToolbar: () => <div data-testid="toolbar" /> }));
vi.mock('../context/UIContext', () => ({
    useUI: () => ({
        viewportBackground: 'dark',
        setViewportBackground: vi.fn(),
        gridVisible: true,
        setGridVisible: vi.fn(),
    }),
}));
// The hosted-agent build flag; each test sets it.
let inAppAgent = true;
vi.mock('../agentAvailability', () => ({ inAppAgentEnabled: () => inAppAgent }));
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
    inAppAgent = true;
    sessionState = { session: null, loading: false };
    mockIsAuthConfigured.mockReturnValue(true);
});

describe('agent pane by session state', () => {
    // The Agent stays on the activity bar; its pane shows the rail only when
    // the agent can run, otherwise a card that says what to do.
    it('shows the Agent on the activity bar for everyone', () => {
        sessionState = { session: null, loading: false };
        render(<StudioShell />);
        expect(screen.getByTestId('activity-agent')).toBeInTheDocument();
    });

    it('shows a sign-in card with starter prompts, not the rail, when signed out', () => {
        sessionState = { session: null, loading: false };

        render(<StudioShell />);

        expect(screen.queryByLabelText('Agent rail')).toBeNull();
        expect(screen.getByTestId('agent-sign-in-card')).toBeInTheDocument();
        expect(screen.getByTestId('agent-sign-in').getAttribute('href')).toMatch(/^\/signin\?next=/);
    });

    it('shows the agent rail when auth is configured and a session exists', () => {
        sessionState = { session: { user: { id: 'u1' } }, loading: false };

        render(<StudioShell />);

        expect(screen.queryByLabelText('Agent rail')).not.toBeNull();
    });

    it('says the built-in agent is off in local dev (auth not configured), even with a session', () => {
        // Local run: no Supabase env → isAuthConfigured() false. The in-Studio
        // agent has no hosted/metered backend locally.
        mockIsAuthConfigured.mockReturnValue(false);
        sessionState = { session: { user: { id: 'u1' } }, loading: false };

        render(<StudioShell />);

        expect(screen.queryByLabelText('Agent rail')).toBeNull();
        expect(screen.getByTestId('agent-unavailable-card')).toBeInTheDocument();
    });

    it('does not mount an empty rail when the hosted agent is switched off', () => {
        inAppAgent = false;
        sessionState = { session: { user: { id: 'u1' } }, loading: false };

        render(<StudioShell />);

        expect(screen.queryByLabelText('Agent rail')).toBeNull();
        expect(screen.getByTestId('agent-unavailable-card')).toBeInTheDocument();
    });
});
