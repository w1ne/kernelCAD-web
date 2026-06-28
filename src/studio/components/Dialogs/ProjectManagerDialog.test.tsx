// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ProjectManagerDialog from './ProjectManagerDialog';

const createProject = vi.fn(() => 'new-id');
const openProject = vi.fn();

vi.mock('../../context/ProjectContext', () => ({
    useProject: () => ({
        projects: [
            { id: 'old-1', name: 'Old Project', lastUpdated: '2026-06-01T00:00:00.000Z' },
        ],
        activeProjectId: 'old-1',
        openProject,
        createProject,
        deleteProject: vi.fn(),
        renameActiveProject: vi.fn(),
    }),
}));

afterEach(() => {
    cleanup();
    createProject.mockClear();
    openProject.mockClear();
});

describe('ProjectManagerDialog', () => {
    it('closes the dialog after creating a new project', () => {
        const onClose = vi.fn();
        render(<ProjectManagerDialog isOpen={true} onClose={onClose} />);

        fireEvent.click(screen.getByText('Create New Project'));

        expect(createProject).toHaveBeenCalled();
        // Creating a project makes it active and should reveal the canvas,
        // exactly like Switch/Open do. Leaving the dialog open strands the
        // user on the project list so it looks like nothing happened.
        expect(onClose).toHaveBeenCalled();
    });

    it('closes the dialog when switching projects', () => {
        const onClose = vi.fn();
        render(<ProjectManagerDialog isOpen={true} onClose={onClose} />);

        // Sanity check that the sibling action already closes the dialog.
        fireEvent.click(screen.getByText('Old Project'));

        expect(openProject).toHaveBeenCalledWith('old-1');
        expect(onClose).toHaveBeenCalled();
    });
});
