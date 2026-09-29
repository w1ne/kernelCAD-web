// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Pure helpers behind ProjectCard: the render URL, the resume prompt, the
// privacy label and the "updated … ago" text.
import type { ProjectPrivacy } from '../../funnel/lib/apiClient';

export interface ProjectRef {
    readonly slug: string;
    readonly title: string;
}

/** Studio link of a project. */
export function projectHref(slug: string): string {
    return `/p/${encodeURIComponent(slug)}`;
}

/**
 * The project's latest captured render. The server serves it for public
 * projects only (private ones answer 404, so the card shows its placeholder).
 * `version` changes the URL per revision, so a browser cache never shows an
 * older render; the server ignores it.
 */
export function projectRenderUrl(slug: string, version?: string | number): string {
    const base = import.meta.env.VITE_API_BASE_URL ?? '';
    const v = version === undefined ? '' : `?v=${encodeURIComponent(String(version))}`;
    return `${base}/api/v1/projects/${encodeURIComponent(slug)}/og.png${v}`;
}

/**
 * The text a user pastes into their chat agent to continue a project there.
 * `project: '<slug>'` is the argument the agent passes to open_in_studio and
 * get_project, so the agent adds a revision to this project instead of
 * starting a new one.
 */
export function resumePrompt({ slug, title }: ProjectRef): string {
    const name = title.trim() || 'Untitled';
    return `Continue my kernelCAD project "${name}" (project: '${slug}').`;
}

export type PrivacyKind = 'private' | 'link' | 'featured';

export function privacyKind(privacy: ProjectPrivacy | 'public'): PrivacyKind {
    if (privacy === 'private') return 'private';
    if (privacy === 'public_featured') return 'featured';
    return 'link';
}

export const PRIVACY_LABEL: Record<PrivacyKind, string> = {
    private: 'Private',
    link: 'Public by link',
    featured: 'Featured',
};

/** "3 revisions" / "1 revision". The row's version counts saved revisions. */
export function revisionsText(version: number): string {
    const n = Math.max(1, Math.floor(version));
    return `${n} ${n === 1 ? 'revision' : 'revisions'}`;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "just now", "5 min ago", "3 h ago", "yesterday", "4 days ago", then a date. */
export function relativeTime(iso: string, now: number = Date.now()): string {
    const t = Date.parse(iso);
    if (Number.isNaN(t)) return '';
    const d = Math.max(0, now - t);
    if (d < MINUTE) return 'just now';
    if (d < HOUR) return `${Math.floor(d / MINUTE)} min ago`;
    if (d < DAY) return `${Math.floor(d / HOUR)} h ago`;
    if (d < 2 * DAY) return 'yesterday';
    if (d < 7 * DAY) return `${Math.floor(d / DAY)} days ago`;
    const date = new Date(t);
    const sameYear = date.getFullYear() === new Date(now).getFullYear();
    return date.toLocaleDateString(undefined, sameYear
        ? { month: 'short', day: 'numeric' }
        : { year: 'numeric', month: 'short', day: 'numeric' });
}
