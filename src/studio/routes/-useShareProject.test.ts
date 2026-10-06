// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook } from '@testing-library/react';
import type { ProjectRow } from '../../funnel/lib/apiClient';
import { isPinnedRevisionSource, currentHostedProject, setHostedRevisionHint } from '../scriptSource';
import { revisionHint, useShareProject } from './-useShareProject';

vi.mock('../../funnel/lib/apiClient', () => ({
  fetchProjectRevisionBySlug: vi.fn(),
  listProjectRevisions: vi.fn(async () => []),
}));
vi.mock('../../funnel/lib/supabaseClient', () => ({
  getSupabase: () => ({ auth: { getSession: async () => ({ data: { session: null } }) } }),
}));

function row(overrides: Partial<ProjectRow> = {}): ProjectRow {
  return {
    id: 'p1',
    slug: 'demo',
    title: 'Demo',
    privacy: 'public_unlisted',
    current_code: 'cube();',
    parameters: {},
    version: 4,
    updated_at: '2026-01-01T00:00:00.000Z',
    owner_id: null,
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  setHostedRevisionHint(null);
  window.history.replaceState(null, '', '/');
});

describe('revisionHint', () => {
  it('carries the shown revision and its exact code', () => {
    expect(revisionHint('demo', row(), false, undefined)).toEqual({ slug: 'demo', version: 4, code: 'cube();' });
  });

  it('drops the hint once a live update or restore replaces the code', () => {
    expect(revisionHint('demo', row(), false, 'sphere();')).toBeNull();
    expect(revisionHint('demo', row(), false, 'cube();')).not.toBeNull();
  });

  it('keeps a historical pin hint: live pushes do not replace it', () => {
    expect(revisionHint('demo', row({ version: 2 }), true, 'sphere();')).toEqual({ slug: 'demo', version: 2, code: 'cube();' });
  });

  it('is null until the row is in hand', () => {
    expect(revisionHint('demo', null, false, undefined)).toBeNull();
  });
});

describe('useShareProject hint', () => {
  it('sets the hint for the slug and clears it when live code diverges', () => {
    window.history.replaceState(null, '', '/p/demo');
    const { rerender } = renderHook(
      ({ live }: { live?: string }) => useShareProject('demo', row(), live),
      { initialProps: {} as { live?: string } },
    );
    expect(currentHostedProject()).toEqual({ slug: 'demo', version: 4 });
    expect(isPinnedRevisionSource('cube();')).toBe(true);

    rerender({ live: 'sphere();' });
    expect(currentHostedProject()).toEqual({ slug: 'demo' });
    expect(isPinnedRevisionSource('cube();')).toBe(false);
    expect(isPinnedRevisionSource('sphere();')).toBe(false);
  });

  it('does not carry one slug\'s hint to another', () => {
    window.history.replaceState(null, '', '/p/demo');
    renderHook(() => useShareProject('demo', row(), undefined));
    window.history.replaceState(null, '', '/p/other');
    expect(currentHostedProject()).toEqual({ slug: 'other' });
    expect(isPinnedRevisionSource('cube();')).toBe(false);
  });
});
