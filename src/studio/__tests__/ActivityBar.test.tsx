// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const project = vi.hoisted(() => ({
    projects: [
        { id: 'a', name: 'Old clamp', lastUpdated: '2026-01-01T00:00:00Z' },
        { id: 'b', name: 'Fresh bracket', lastUpdated: '2026-09-01T00:00:00Z' },
    ],
    activeProjectId: 'b',
    openProject: vi.fn(),
    createProject: vi.fn(),
    saveActiveProject: vi.fn(),
}));
const workbench = vi.hoisted(() => ({ code: 'return box(1, 2, 3);', setActiveDialog: vi.fn() }));
let session: { user: { email: string } } | null = null;
let inAppAgent = true;
let authConfigured = true;

vi.mock('../context/ProjectContext', () => ({ useProject: () => project }));
vi.mock('../context/WorkbenchContext', () => ({ useWorkbench: () => workbench }));
vi.mock('../../funnel/hooks/useSession', () => ({ useOptionalSession: () => ({ session, loading: false }) }));
vi.mock('../../funnel/lib/supabaseClient', () => ({ isAuthConfigured: () => authConfigured }));
vi.mock('../agentAvailability', () => ({ inAppAgentEnabled: () => inAppAgent }));
vi.mock('../AgentRail', () => ({ AgentRail: () => <aside aria-label="Agent rail" /> }));
vi.mock('../tabs/SceneTab', () => ({ SceneTab: () => <div data-testid="scene-tab" /> }));

import { ActivityBar } from '../ActivityBar';
import { agentAccess, savePendingAgentPrompt, takePendingAgentPrompt } from '../activityBarModel';
import { shellStore } from '../store/shellStore';
import { globalCommandRegistry } from '../hooks/useCommandRegistry';

const assign = vi.fn();

beforeEach(() => {
    session = null;
    inAppAgent = true;
    authConfigured = true;
    localStorage.clear();
    shellStore.setAgentRailOpen(false);
    shellStore.setAgentDraftPrompt(null);
    Object.defineProperty(window, 'location', {
        configurable: true,
        value: { pathname: '/studio', search: '', hostname: 'app.kernelcad.com', assign },
    });
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

function renderBar(props: Partial<Parameters<typeof ActivityBar>[0]> = {}) {
    return render(<ActivityBar enableAgent enableConnect viewerMode={false} {...props} />);
}

describe('agentAccess', () => {
    it('runs for a signed-in user of the hosted app', () => {
        expect(agentAccess({ inAppAgent: true, authConfigured: true, sessionLoading: false, signedIn: true })).toBe('ready');
    });
    it('asks a signed-out visitor to sign in', () => {
        expect(agentAccess({ inAppAgent: true, authConfigured: true, sessionLoading: false, signedIn: false })).toBe('sign-in');
    });
    it('waits for the session before choosing', () => {
        expect(agentAccess({ inAppAgent: true, authConfigured: true, sessionLoading: true, signedIn: false })).toBe('loading');
    });
    it('is unavailable without the hosted agent or without accounts', () => {
        expect(agentAccess({ inAppAgent: false, authConfigured: true, sessionLoading: false, signedIn: true })).toBe('unavailable');
        expect(agentAccess({ inAppAgent: true, authConfigured: false, sessionLoading: false, signedIn: true })).toBe('unavailable');
    });
});

describe('ActivityBar', () => {
    it('always shows Agent, Model tree and Projects in the Studio', () => {
        renderBar();
        for (const id of ['agent', 'tree', 'projects']) expect(screen.getByTestId(`activity-${id}`)).toBeDefined();
        expect(screen.getByTestId('toolbar-connect-link').getAttribute('href')).toBe('/connect');
    });

    it('drops the Agent and Projects on a read-only review page', () => {
        renderBar({ viewerMode: true });
        expect(screen.queryByTestId('activity-agent')).toBeNull();
        expect(screen.queryByTestId('activity-projects')).toBeNull();
        expect(screen.getByTestId('activity-tree')).toBeDefined();
    });

    it('opens one pane at a time and closes it on a second press', () => {
        renderBar();
        fireEvent.click(screen.getByTestId('activity-tree'));
        expect(screen.getByTestId('scene-tab')).toBeDefined();
        expect(screen.getByTestId('activity-tree').getAttribute('aria-pressed')).toBe('true');

        fireEvent.click(screen.getByTestId('activity-agent'));
        expect(screen.queryByTestId('scene-tab')).toBeNull();
        expect(screen.getByTestId('left-pane-agent')).toBeDefined();
        expect(shellStore.getSnapshot().agentRailOpen).toBe(true);

        fireEvent.click(screen.getByTestId('activity-agent'));
        expect(screen.queryByTestId('left-pane-agent')).toBeNull();
        expect(shellStore.getSnapshot().agentRailOpen).toBe(false);
    });

    it('keeps a starter prompt through sign-in and puts it in the composer afterwards', () => {
        renderBar();
        fireEvent.click(screen.getByTestId('activity-agent'));
        const card = screen.getByTestId('agent-sign-in-card');
        fireEvent.click(card.querySelectorAll('button')[0]);
        expect(assign).toHaveBeenCalledWith('/signin?next=%2Fstudio');
        cleanup();

        session = { user: { email: 'a@b.c' } };
        shellStore.setAgentRailOpen(false);
        renderBar();
        expect(shellStore.getSnapshot().agentDraftPrompt).toMatch(/wall bracket/);
        expect(shellStore.getSnapshot().agentRailOpen).toBe(true);
        expect(screen.getByLabelText('Agent rail')).toBeDefined();
        expect(takePendingAgentPrompt()).toBeNull();
    });

    it('lists local projects newest first and opens another one', () => {
        renderBar();
        fireEvent.click(screen.getByTestId('activity-projects'));
        const names = [...screen.getByTestId('projects-pane').querySelectorAll('li button')]
            .slice(0, 2).map((b) => b.textContent);
        expect(names[0]).toContain('Fresh bracket');
        expect(names[1]).toContain('Old clamp');
        fireEvent.click(screen.getByRole('button', { name: /Old clamp/ }));
        expect(project.openProject).toHaveBeenCalledWith('a');
    });

    it('starts a new project from a starter after saving the current edits', () => {
        renderBar();
        fireEvent.click(screen.getByTestId('activity-projects'));
        fireEvent.click(screen.getByRole('button', { name: 'Bracket' }));
        expect(project.saveActiveProject).toHaveBeenCalledWith({ code: 'return box(1, 2, 3);' });
        expect(project.createProject).toHaveBeenCalledWith('Bracket', expect.stringContaining("param('width'"));
        expect(project.saveActiveProject.mock.invocationCallOrder[0])
            .toBeLessThan(project.createProject.mock.invocationCallOrder[0]);
    });

    it('registers palette commands for each pane', () => {
        renderBar();
        const ids = globalCommandRegistry.getAll().map((c) => c.id);
        expect(ids).toEqual(expect.arrayContaining(['panels.left.agent', 'panels.left.tree', 'panels.left.projects', 'nav.connect']));
        globalCommandRegistry.run('panels.left.projects');
        expect(shellStore.getSnapshot().agentRailOpen).toBe(false);
    });
});

describe('pending agent prompt', () => {
    it('is read once', () => {
        savePendingAgentPrompt('a gear');
        expect(takePendingAgentPrompt()).toBe('a gear');
        expect(takePendingAgentPrompt()).toBeNull();
    });
});
