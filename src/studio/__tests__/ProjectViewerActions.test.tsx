// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Session } from '@supabase/supabase-js';
import type { ProjectRow } from '../../funnel/lib/apiClient';

const cloneProjectMock = vi.fn();

vi.mock('../../funnel/lib/apiClient', () => ({
  cloneProject: (slug: string) => cloneProjectMock(slug),
}));

// SignInButton pulls in the Supabase client; stub it to a plain button so the
// anonymous affordance is renderable without auth wiring.
vi.mock('../../funnel/components/SignInButton', () => ({
  SignInButton: ({ children }: { children?: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
}));

import { ProjectViewerActions } from '../../studio/routes/-ProjectViewerActions';

const fakeSession = { user: { id: 'u-1' } } as unknown as Session;

function makeProject(overrides: Partial<ProjectRow> = {}): ProjectRow {
  return {
    id: 'p-1',
    slug: 'demo',
    title: 'Demo',
    privacy: 'public_unlisted',
    current_code: '',
    parameters: {},
    version: 1,
    updated_at: '2026-06-13T00:00:00Z',
    owner_id: null,
    ...overrides,
  } as ProjectRow;
}

const writeText = vi.fn();

beforeEach(() => {
  cloneProjectMock.mockReset();
  writeText.mockReset();
  writeText.mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
});

afterEach(() => cleanup());

describe('ProjectViewerActions', () => {
  it('writes the public /p/<slug> URL to the clipboard when Share is clicked', async () => {
    render(
      <ProjectViewerActions
        slug="demo"
        project={makeProject()}
        session={null}
        onNavigateToSlug={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/p/demo`);
    await waitFor(() => expect(screen.getByText('Link copied')).toBeTruthy());
  });

  it('disables Share for private projects with a make-public hint', () => {
    render(
      <ProjectViewerActions
        slug="demo"
        project={makeProject({ privacy: 'private' })}
        session={fakeSession}
        onNavigateToSlug={vi.fn()}
      />,
    );
    const share = screen.getByRole('button', { name: 'Share' }) as HTMLButtonElement;
    expect(share.disabled).toBe(true);
    expect(share.title).toBe('Make this project public to share a link');
  });

  it('clones and navigates to the new slug when logged in', async () => {
    cloneProjectMock.mockResolvedValue({ slug: 'demo-copy', projectId: 'p-2' });
    const onNavigate = vi.fn();
    render(
      <ProjectViewerActions
        slug="demo"
        project={makeProject()}
        session={fakeSession}
        onNavigateToSlug={onNavigate}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Clone to my projects' }));
    await waitFor(() => expect(cloneProjectMock).toHaveBeenCalledWith('demo'));
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith('demo-copy'));
  });

  it('shows "Sign in to clone" and does not clone when anonymous', () => {
    render(
      <ProjectViewerActions
        slug="demo"
        project={makeProject()}
        session={null}
        onNavigateToSlug={vi.fn()}
      />,
    );
    expect(screen.getByText('Sign in to clone')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Clone to my projects' })).toBeNull();
    expect(cloneProjectMock).not.toHaveBeenCalled();
  });

  it('surfaces an inline error when the clone call fails', async () => {
    cloneProjectMock.mockRejectedValue(new Error('nope'));
    render(
      <ProjectViewerActions
        slug="demo"
        project={makeProject()}
        session={fakeSession}
        onNavigateToSlug={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Clone to my projects' }));
    await waitFor(() => expect(screen.getByText('Clone failed')).toBeTruthy());
  });
});
