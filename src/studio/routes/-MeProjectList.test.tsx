// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ToastProvider } from '../../ui';
import type { MyProjectRow } from '../../funnel/lib/apiClient';
import { MeProjectList } from './-MeProjectList';
import type { ProjectActions } from './-useMePageData';

const row = (id: string, title: string, minutesAgo: number, privacy: MyProjectRow['privacy'] = 'public_unlisted'): MyProjectRow => ({
    id, slug: `s-${id}`, title, privacy, featured_at: null, version: 3,
    updated_at: new Date(Date.now() - minutesAgo * 60_000).toISOString(), owner_id: 'u',
});
const projects = [row('a', 'Pipe clamp', 5), row('b', 'Spur gear', 60), row('c', 'Desk lamp', 600, 'private'), row('d', 'Hinge', 6000)];

let actions: ProjectActions;
const writeText = vi.fn(async (text: string) => { void text; });

beforeEach(() => {
    actions = {
        rename: vi.fn(async () => {}),
        remove: vi.fn(async () => {}),
        setPrivacy: vi.fn(async () => {}),
        busyId: null,
    };
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
});
afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

function renderList(list = projects) {
    return render(<ToastProvider><MeProjectList projects={list} actions={actions} /></ToastProvider>);
}
const grid = () => screen.getByTestId('me-project-grid');
const cards = () => within(grid()).getAllByTestId('me-project-card');
const openMenu = (i: number) => fireEvent.click(within(cards()[i]).getByRole('button', { name: 'More actions' }));

describe('/me project list', () => {
    it('shows a card per project with its link, privacy, revisions and a Continue row', () => {
        renderList();
        expect(cards().map(c => c.getAttribute('data-slug'))).toEqual(['s-a', 's-b', 's-c', 's-d']);
        const first = cards()[0];
        expect(within(first).getByRole('link', { name: 'Pipe clamp' }).getAttribute('href')).toBe('/p/s-a');
        expect(within(first).getByText('Public by link')).toBeTruthy();
        expect(within(first).getByText(/3 revisions/)).toBeTruthy();
        expect(within(cards()[2]).getByText('Private')).toBeTruthy();
        expect(within(screen.getByTestId('me-continue')).getAllByRole('listitem')).toHaveLength(3);
    });

    it('searches and sorts', () => {
        renderList();
        fireEvent.change(screen.getByRole('searchbox', { name: 'Search projects' }), { target: { value: 'GEAR' } });
        expect(cards().map(c => c.getAttribute('data-slug'))).toEqual(['s-b']);
        expect(screen.queryByTestId('me-continue')).toBeNull();
        expect(screen.getByText('1 of 4')).toBeTruthy();

        fireEvent.change(screen.getByRole('searchbox', { name: 'Search projects' }), { target: { value: 'zzz' } });
        expect(screen.getByText(/No projects match/)).toBeTruthy();
        fireEvent.click(screen.getAllByRole('button', { name: 'Clear search' }).at(-1)!);
        expect(cards()).toHaveLength(4);

        fireEvent.change(screen.getByRole('combobox', { name: 'Sort' }), { target: { value: 'name' } });
        expect(cards().map(c => c.getAttribute('data-slug'))).toEqual(['s-c', 's-d', 's-a', 's-b']);
    });

    it('copies a resume prompt with the project slug', async () => {
        renderList();
        fireEvent.click(within(cards()[1]).getByTestId('copy-resume-prompt'));
        await waitFor(() => expect(writeText).toHaveBeenCalledWith(`Continue my kernelCAD project "Spur gear" (project: 's-b').`));
        expect(await within(cards()[1]).findByText('Copied')).toBeTruthy();
    });

    it('deletes only after the confirm dialog', async () => {
        renderList();
        openMenu(1);
        fireEvent.click(screen.getByRole('menuitem', { name: 'Delete…' }));
        const dialog = screen.getByRole('dialog', { name: 'Delete “Spur gear”?' });
        expect(actions.remove).not.toHaveBeenCalled();
        fireEvent.click(within(dialog).getByRole('button', { name: 'Delete project' }));
        await waitFor(() => expect(actions.remove).toHaveBeenCalledWith(projects[1]));
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });

    it('renames through the dialog', async () => {
        renderList();
        openMenu(0);
        fireEvent.click(screen.getByRole('menuitem', { name: 'Rename…' }));
        fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: 'Clamp v2' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save name' }));
        await waitFor(() => expect(actions.rename).toHaveBeenCalledWith(projects[0], 'Clamp v2'));
    });

    it('toggles privacy from the menu and explains the paid-plan error', async () => {
        actions.setPrivacy = vi.fn(async () => { throw new Error('{"error":"private_requires_paid_account"}'); });
        renderList();
        openMenu(0);
        fireEvent.click(screen.getByRole('menuitem', { name: 'Make private' }));
        expect(actions.setPrivacy).toHaveBeenCalledWith(projects[0], 'private');
        expect(await screen.findByText('Private projects need a paid plan')).toBeTruthy();

        openMenu(2);
        expect(screen.getByRole('menuitem', { name: 'Make public by link' })).toBeTruthy();
    });
});
