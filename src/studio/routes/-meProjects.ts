// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Search and sort for "Your projects" (/me).
import {
    GALLERY_HIDDEN,
    GALLERY_NOT_PUBLIC,
    GALLERY_RENDER_REQUIRED,
    type MyProjectRow,
    type ProjectGalleryState,
} from '../../funnel/lib/apiClient';
import { privacyKind } from '../components/projectCardModel';

export type ProjectSort = 'recent' | 'name' | 'revisions';

export const PROJECT_SORTS: readonly { readonly id: ProjectSort; readonly label: string }[] = [
    { id: 'recent', label: 'Last edited' },
    { id: 'name', label: 'Name' },
    { id: 'revisions', label: 'Most revisions' },
];

export function parseSort(value: unknown): ProjectSort | undefined {
    return PROJECT_SORTS.some((s) => s.id === value) ? (value as ProjectSort) : undefined;
}

/** How many recent projects the "Continue" row shows. */
export const CONTINUE_COUNT = 3;

/** The row shows only when the grid has more than it, so it never repeats the whole list. */
export function continueProjects(projects: readonly MyProjectRow[]): MyProjectRow[] {
    if (projects.length <= CONTINUE_COUNT) return [];
    return sortProjects(projects, 'recent').slice(0, CONTINUE_COUNT);
}

/** Case-insensitive match on the title or the slug; every word must match. */
export function filterProjects(projects: readonly MyProjectRow[], query: string): MyProjectRow[] {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) return [...projects];
    return projects.filter((p) => {
        const hay = `${p.title} ${p.slug}`.toLowerCase();
        return words.every((w) => hay.includes(w));
    });
}

const byRecent = (a: MyProjectRow, b: MyProjectRow): number => Date.parse(b.updated_at) - Date.parse(a.updated_at);

export function sortProjects(projects: readonly MyProjectRow[], sort: ProjectSort): MyProjectRow[] {
    const list = [...projects];
    if (sort === 'name') {
        return list.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base', numeric: true }) || byRecent(a, b));
    }
    if (sort === 'revisions') return list.sort((a, b) => b.version - a.version || byRecent(a, b));
    return list.sort(byRecent);
}

/** Replace one project (matched by id) with a patched copy. */
export function patchProject(
    projects: readonly MyProjectRow[],
    id: string,
    patch: Partial<MyProjectRow>,
): MyProjectRow[] {
    return projects.map((p) => (p.id === id ? { ...p, ...patch } : p));
}

export function removeProject(projects: readonly MyProjectRow[], id: string): MyProjectRow[] {
    return projects.filter((p) => p.id !== id);
}

/** Why the project cannot go to the gallery now, or null when it can. */
export function galleryBlocker(project: Pick<MyProjectRow, 'privacy'>, state: ProjectGalleryState): string | null {
    if (state.listed) return null;
    if (state.hidden) return 'Moderation hid this project from the gallery.';
    if (privacyKind(project.privacy) === 'private') return 'Private projects cannot go to the gallery. Make it public by link first.';
    if (!state.hasRender) return 'It needs a preview image first. Open the project once; Studio captures one in a few seconds.';
    return null;
}

/** What to tell the user when publishing or unpublishing fails. */
export function galleryErrorText(message: string): string {
    if (message.includes(GALLERY_RENDER_REQUIRED)) return 'It needs a preview image first. Open the project once, then try again.';
    if (message.includes(GALLERY_NOT_PUBLIC)) return 'Make it public by link first.';
    if (message.includes(GALLERY_HIDDEN)) return 'Moderation hid this project from the gallery.';
    return 'Could not update the gallery. Try again later.';
}
