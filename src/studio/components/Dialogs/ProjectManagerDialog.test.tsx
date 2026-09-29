// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import ProjectManagerDialog, { SWITCHER_RECENT_LIMIT } from './ProjectManagerDialog';

const createProject = vi.fn(() => 'new-id');
const openProject = vi.fn();
const deleteProject = vi.fn();
const listMyProjects = vi.fn();
let session: unknown = null;

vi.mock('../../context/ProjectContext', () => ({
    useProject: () => ({
        projects: [
            { id: 'old-1', name: 'Old Project', lastUpdated: '2026-06-01T00:00:00.000Z' },
            { id: 'old-2', name: 'Second', lastUpdated: '2026-05-01T00:00:00.000Z' },
        ],
        activeProjectId: 'old-1',
        openProject,
        createProject,
        deleteProject,
        renameActiveProject: vi.fn(),
    }),
}));
vi.mock('../../../funnel/hooks/useSession', () => ({
    useOptionalSession: () => ({ session, loading: false }),
}));
vi.mock('../../../funnel/lib/supabaseClient', () => ({ isAuthConfigured: () => true }));
vi.mock('../../../funnel/lib/apiClient', () => ({
    listMyProjects: (...a: unknown[]) => listMyProjects(...a),
}));

const saved = (slug: string, title: string) => ({
    id: `id-${slug}`, slug, title, privacy: 'public_unlisted', featured_at: null, version: 4,
    updated_at: '2026-09-29T00:00:00Z', owner_id: 'u',
});

beforeEach(() => {
    session = null;
    listMyProjects.mockResolvedValue([saved('bracket', 'Pipe clamp bracket'), saved('gear', 'Spur gear')]);
    window.history.replaceState(null, '', '/p/bracket');
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('ProjectManagerDialog (project switcher)', () => {
    it('closes the dialog after creating a new project', () => {
        const onClose = vi.fn();
        render(<ProjectManagerDialog isOpen={true} onClose={onClose} />);

        fireEvent.click(screen.getByRole('button', { name: 'New project' }));

        expect(createProject).toHaveBeenCalled();
        // Creating a project makes it active and should reveal the canvas,
        // exactly like opening one does.
        expect(onClose).toHaveBeenCalled();
    });

    it('closes the dialog when switching browser projects', () => {
        const onClose = vi.fn();
        render(<ProjectManagerDialog isOpen={true} onClose={onClose} />);

        fireEvent.click(screen.getByText('Old Project'));

        expect(openProject).toHaveBeenCalledWith('old-1');
        expect(onClose).toHaveBeenCalled();
    });

    it('lists the signed-in user\'s recent saved projects and marks the open one', async () => {
        session = { user: { id: 'u' } };
        render(<ProjectManagerDialog isOpen={true} onClose={vi.fn()} />);

        const rows = await screen.findAllByTestId('switcher-saved-project');
        expect(listMyProjects).toHaveBeenCalledWith({ limit: SWITCHER_RECENT_LIMIT });
        expect(rows.map(r => r.getAttribute('href'))).toEqual(['/p/bracket', '/p/gear']);
        expect(rows[0].getAttribute('aria-current')).toBe('page');
        expect(within(rows[0]).getByText('Open now')).toBeTruthy();
        expect(screen.getByRole('link', { name: /All projects/ }).getAttribute('href')).toBe('/me');
    });

    it('filters saved and browser projects with the search box', async () => {
        session = { user: { id: 'u' } };
        render(<ProjectManagerDialog isOpen={true} onClose={vi.fn()} />);
        await screen.findAllByTestId('switcher-saved-project');

        fireEvent.change(screen.getByRole('searchbox', { name: 'Search projects' }), { target: { value: 'gear' } });

        expect(screen.getAllByTestId('switcher-saved-project')).toHaveLength(1);
        expect(screen.queryByText('Old Project')).toBeNull();
    });

    it('asks a signed-out user to sign in instead of listing saved projects', () => {
        render(<ProjectManagerDialog isOpen={true} onClose={vi.fn()} />);
        expect(listMyProjects).not.toHaveBeenCalled();
        expect(screen.getByRole('link', { name: 'Sign in' }).getAttribute('href')).toBe('/signin?next=%2Fp%2Fbracket');
    });

    it('deletes a browser project only after confirming', () => {
        render(<ProjectManagerDialog isOpen={true} onClose={vi.fn()} />);
        fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[1]);
        expect(deleteProject).not.toHaveBeenCalled();
        const confirm = screen.getByRole('group', { name: 'Delete Second?' });
        fireEvent.click(within(confirm).getByRole('button', { name: 'Delete' }));
        expect(deleteProject).toHaveBeenCalledWith('old-2');
    });

    it('renders nothing when closed', () => {
        render(<ProjectManagerDialog isOpen={false} onClose={vi.fn()} />);
        expect(screen.queryByRole('dialog')).toBeNull();
    });
});
