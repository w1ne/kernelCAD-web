// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { afterEach, describe, expect, it, vi } from 'vitest';
import { privacyKind, projectRenderUrl, relativeTime, resumePrompt, revisionsText } from './projectCardModel';

afterEach(() => vi.unstubAllEnvs());

describe('resumePrompt', () => {
    it('names the project and passes its slug as the open_in_studio project argument', () => {
        expect(resumePrompt({ slug: 'ab12cd', title: 'Pipe clamp' }))
            .toBe(`Continue my kernelCAD project "Pipe clamp" (project: 'ab12cd').`);
    });
    it('falls back to Untitled for a blank title', () => {
        expect(resumePrompt({ slug: 's', title: '  ' })).toContain('"Untitled"');
    });
});

describe('projectRenderUrl', () => {
    it('points at the server render and busts the cache per revision', () => {
        vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');
        expect(projectRenderUrl('a b', '2026-09-29T10:00:00Z'))
            .toBe('https://api.example.com/api/v1/projects/a%20b/og.png?v=2026-09-29T10%3A00%3A00Z');
    });
});

describe('relativeTime', () => {
    const now = Date.parse('2026-09-29T12:00:00Z');
    const ago = (ms: number) => new Date(now - ms).toISOString();
    it.each([
        [10_000, 'just now'],
        [5 * 60_000, '5 min ago'],
        [3 * 3_600_000, '3 h ago'],
        [30 * 3_600_000, 'yesterday'],
        [4 * 86_400_000, '4 days ago'],
    ])('%i ms ago reads "%s"', (ms, text) => {
        expect(relativeTime(ago(ms), now)).toBe(text);
    });
    it('shows a date after a week and nothing for a bad value', () => {
        expect(relativeTime(ago(40 * 86_400_000), now)).toMatch(/Aug/);
        expect(relativeTime('nope', now)).toBe('');
    });
});

describe('labels', () => {
    it('counts revisions and maps privacy', () => {
        expect(revisionsText(1)).toBe('1 revision');
        expect(revisionsText(14)).toBe('14 revisions');
        expect(privacyKind('private')).toBe('private');
        expect(privacyKind('public_unlisted')).toBe('link');
        expect(privacyKind('public')).toBe('link');
        expect(privacyKind('public_featured')).toBe('featured');
    });
});
