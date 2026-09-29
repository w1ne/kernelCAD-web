// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import type { MyProjectRow, ProjectGalleryState } from '../../funnel/lib/apiClient';
import {
    continueProjects,
    filterProjects,
    galleryBlocker,
    galleryErrorText,
    patchProject,
    removeProject,
    sortProjects,
} from './-meProjects';

const row = (id: string, title: string, version: number, updated: string, privacy: MyProjectRow['privacy'] = 'public_unlisted'): MyProjectRow => ({
    id, slug: `slug-${id}`, title, privacy, featured_at: null, version, updated_at: updated, owner_id: 'u',
});
const list = [
    row('a', 'Bracket 10', 3, '2026-09-20T00:00:00Z'),
    row('b', 'bracket 2', 9, '2026-09-28T00:00:00Z'),
    row('c', 'Gear pair', 1, '2026-09-29T00:00:00Z', 'private'),
    row('d', 'Lamp', 5, '2026-09-01T00:00:00Z'),
];

describe('/me search and sort', () => {
    it('matches every word in the title or slug, ignoring case', () => {
        expect(filterProjects(list, 'BRACKET').map(p => p.id)).toEqual(['a', 'b']);
        expect(filterProjects(list, 'bracket 10').map(p => p.id)).toEqual(['a']);
        expect(filterProjects(list, 'slug-d').map(p => p.id)).toEqual(['d']);
        expect(filterProjects(list, '  ')).toHaveLength(4);
    });
    it('sorts by last edit, by name (natural) and by revisions', () => {
        expect(sortProjects(list, 'recent').map(p => p.id)).toEqual(['c', 'b', 'a', 'd']);
        expect(sortProjects(list, 'name').map(p => p.id)).toEqual(['b', 'a', 'c', 'd']);
        expect(sortProjects(list, 'revisions').map(p => p.id)).toEqual(['b', 'd', 'a', 'c']);
    });
    it('shows the Continue row only when the grid has more than three projects', () => {
        expect(continueProjects(list).map(p => p.id)).toEqual(['c', 'b', 'a']);
        expect(continueProjects(list.slice(0, 3))).toEqual([]);
    });
    it('patches and removes by id', () => {
        expect(patchProject(list, 'd', { title: 'Desk lamp' }).find(p => p.id === 'd')!.title).toBe('Desk lamp');
        expect(removeProject(list, 'a').map(p => p.id)).toEqual(['b', 'c', 'd']);
    });
});

describe('gallery eligibility', () => {
    const state: ProjectGalleryState = {
        listed: false, listedAt: null, isOwner: true, hidden: false, hasRender: true, remixCount: 0, forkedFrom: null,
    };
    it('allows a public project with a render, and always allows removal', () => {
        expect(galleryBlocker(list[0], state)).toBeNull();
        expect(galleryBlocker(list[2], { ...state, listed: true })).toBeNull();
    });
    it('explains what blocks publishing', () => {
        expect(galleryBlocker(list[2], state)).toMatch(/Private/);
        expect(galleryBlocker(list[0], { ...state, hasRender: false })).toMatch(/preview image/);
        expect(galleryBlocker(list[0], { ...state, hidden: true })).toMatch(/Moderation/);
    });
    it('maps server error codes to text', () => {
        expect(galleryErrorText('{"error":"render_required"}')).toMatch(/preview image/);
        expect(galleryErrorText('{"error":"not_public"}')).toMatch(/public by link/);
        expect(galleryErrorText('HTTP 500')).toMatch(/Try again/);
    });
});
