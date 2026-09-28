// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Session } from '@supabase/supabase-js';
import type { ProjectGalleryState, ProjectRow } from '../../funnel/lib/apiClient';

const api = vi.hoisted(() => ({
  fetchProjectGalleryState: vi.fn(),
  remixProject: vi.fn(),
  reportProject: vi.fn(),
  setProjectGalleryListed: vi.fn(),
}));
vi.mock('../../funnel/lib/apiClient', async importOriginal => ({
  ...(await importOriginal<typeof import('../../funnel/lib/apiClient')>()),
  ...api,
}));
// The real button starts an OAuth redirect; expose where it would come back to.
vi.mock('../../funnel/components/SignInButton', () => ({
  SignInButton: ({ redirectTo, children }: { redirectTo?: string; children?: React.ReactNode }) => (
    <button type="button" data-testid="sign-in" data-redirect={redirectTo}>{children}</button>
  ),
}));

import { ProjectGalleryControls } from './-ProjectGalleryControls';

/** Mirrors the component's one-time render re-check delay. */
const RENDER_RECHECK_MS = 15_000;

function makeProject(overrides: Partial<ProjectRow> = {}): ProjectRow {
  return {
    id: 'p-1',
    slug: 'demo',
    title: 'Demo',
    privacy: 'public_unlisted',
    current_code: '',
    parameters: {},
    version: 1,
    updated_at: '2026-09-20T00:00:00Z',
    owner_id: 'owner-1',
    ...overrides,
  } as ProjectRow;
}

function state(overrides: Partial<ProjectGalleryState> = {}): ProjectGalleryState {
  return {
    listed: false,
    listedAt: null,
    isOwner: false,
    hidden: false,
    hasRender: false,
    remixCount: 0,
    forkedFrom: null,
    ...overrides,
  };
}

const session = { user: { id: 'viewer-1' } } as Session;

function renderControls(opts: { project?: ProjectRow; session?: Session | null; sessionLoading?: boolean } = {}) {
  return render(
    <ProjectGalleryControls
      slug="demo"
      project={opts.project ?? makeProject()}
      session={opts.session === undefined ? session : opts.session}
      sessionLoading={opts.sessionLoading ?? false}
    />,
  );
}

let assignSpy: ReturnType<typeof vi.spyOn>;
let replaceSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  for (const fn of Object.values(api)) fn.mockReset();
  api.fetchProjectGalleryState.mockResolvedValue(state());
  window.history.replaceState(null, '', '/p/demo');
  assignSpy = vi.spyOn(window.location, 'assign').mockImplementation(() => {});
  replaceSpy = vi.spyOn(window.location, 'replace').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('Remix', () => {
  it('signed out: Remix is a sign-in that comes back to ?remix=1', async () => {
    renderControls({ session: null });
    const btn = await screen.findByTestId('sign-in');
    expect(btn.textContent).toBe('Remix');
    expect(btn.getAttribute('data-redirect')).toBe(`${window.location.origin}/p/demo?remix=1`);
    expect(api.remixProject).not.toHaveBeenCalled();
  });

  it('signed in: calls clone and navigates to the new project', async () => {
    api.remixProject.mockResolvedValue({ slug: 'new-1', projectId: 'id-1' });
    renderControls();
    fireEvent.click(screen.getByRole('button', { name: 'Remix' }));
    await waitFor(() => expect(assignSpy).toHaveBeenCalledWith('/p/new-1'));
    expect(api.remixProject).toHaveBeenCalledWith('demo');
  });

  it('shows a retry label when the remix fails', async () => {
    api.remixProject.mockRejectedValue(new Error('500'));
    renderControls();
    fireEvent.click(screen.getByRole('button', { name: 'Remix' }));
    expect(await screen.findByText('Remix failed, retry')).toBeDefined();
    expect(assignSpy).not.toHaveBeenCalled();
  });

  it('finishes a remix after the sign-in round trip, once, replacing history', async () => {
    window.history.replaceState(null, '', '/p/demo?remix=1');
    api.remixProject.mockResolvedValue({ slug: 'new-2', projectId: 'id-2' });
    const { rerender } = renderControls({ session: null, sessionLoading: true });
    expect(api.remixProject).not.toHaveBeenCalled();
    rerender(<ProjectGalleryControls slug="demo" project={makeProject()} session={session} sessionLoading={false} />);
    await waitFor(() => expect(replaceSpy).toHaveBeenCalledWith('/p/new-2'));
    rerender(<ProjectGalleryControls slug="demo" project={makeProject({ version: 2 })} session={session} sessionLoading={false} />);
    expect(api.remixProject).toHaveBeenCalledTimes(1);
  });

  it('does not auto-remix without the ?remix=1 flag', async () => {
    renderControls();
    await waitFor(() => expect(api.fetchProjectGalleryState).toHaveBeenCalled());
    expect(api.remixProject).not.toHaveBeenCalled();
  });
});

describe('credit link', () => {
  it('links to the public source it was remixed from', async () => {
    api.fetchProjectGalleryState.mockResolvedValue(state({ forkedFrom: { slug: 'orig', title: 'Original' } }));
    renderControls();
    const link = await screen.findByTestId('remixed-from');
    expect(link.textContent).toBe('Remixed from Original');
    expect(link.getAttribute('href')).toBe('/p/orig');
  });
});

describe('Publish toggle (owner)', () => {
  it('is not shown to non-owners', async () => {
    renderControls();
    await waitFor(() => expect(api.fetchProjectGalleryState).toHaveBeenCalled());
    expect(screen.queryByTestId('gallery-publish-toggle')).toBeNull();
  });

  it('publishes, then offers Unpublish', async () => {
    api.fetchProjectGalleryState.mockResolvedValue(state({ isOwner: true, hasRender: true }));
    api.setProjectGalleryListed.mockResolvedValueOnce({ listed: true, listedAt: '2026-09-28T00:00:00Z' });
    api.setProjectGalleryListed.mockResolvedValueOnce({ listed: false, listedAt: null });
    renderControls();
    const toggle = await screen.findByTestId('gallery-publish-toggle');
    expect(toggle.getAttribute('aria-label')).toBe('Publish to gallery');
    fireEvent.click(toggle);
    await waitFor(() => expect(toggle.getAttribute('aria-label')).toBe('Unpublish'));
    expect(api.setProjectGalleryListed).toHaveBeenLastCalledWith('demo', true);
    fireEvent.click(toggle);
    await waitFor(() => expect(toggle.getAttribute('aria-label')).toBe('Publish to gallery'));
    expect(api.setProjectGalleryListed).toHaveBeenLastCalledWith('demo', false);
  });

  it('is disabled with a hint until a render exists, and re-checks once', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    api.fetchProjectGalleryState.mockResolvedValueOnce(state({ isOwner: true, hasRender: false }));
    api.fetchProjectGalleryState.mockResolvedValueOnce(state({ isOwner: true, hasRender: true }));
    renderControls();
    const toggle = await screen.findByTestId('gallery-publish-toggle');
    expect((toggle as HTMLButtonElement).disabled).toBe(true);
    expect(toggle.getAttribute('title')).toContain('preview image');
    await act(async () => { await vi.advanceTimersByTimeAsync(RENDER_RECHECK_MS); });
    await waitFor(() => expect((toggle as HTMLButtonElement).disabled).toBe(false));
    expect(api.fetchProjectGalleryState).toHaveBeenCalledTimes(2);
  });

  it('is disabled for a private project and when hidden by moderation', async () => {
    api.fetchProjectGalleryState.mockResolvedValue(state({ isOwner: true, hasRender: true }));
    renderControls({ project: makeProject({ privacy: 'private' }) });
    const toggle = await screen.findByTestId('gallery-publish-toggle');
    expect((toggle as HTMLButtonElement).disabled).toBe(true);
    expect(toggle.getAttribute('title')).toContain('public');
    cleanup();

    api.fetchProjectGalleryState.mockResolvedValue(state({ isOwner: true, hasRender: true, hidden: true }));
    renderControls();
    const hidden = await screen.findByTestId('gallery-publish-toggle');
    expect((hidden as HTMLButtonElement).disabled).toBe(true);
    expect(hidden.getAttribute('title')).toContain('moderation');
  });

  it('turns a render_required failure into a hint', async () => {
    api.fetchProjectGalleryState.mockResolvedValue(state({ isOwner: true, hasRender: true }));
    api.setProjectGalleryListed.mockRejectedValue(new Error('{"error":"render_required"}'));
    renderControls();
    const toggle = await screen.findByTestId('gallery-publish-toggle');
    fireEvent.click(toggle);
    await waitFor(() => expect((toggle as HTMLButtonElement).disabled).toBe(true));
    expect(toggle.getAttribute('title')).toContain('preview image');
  });
});

describe('Report', () => {
  it('sends a reason and confirms', async () => {
    api.reportProject.mockResolvedValue({ ok: true });
    renderControls({ session: null });
    fireEvent.click(await screen.findByRole('button', { name: 'Report' }));
    const send = screen.getByRole('button', { name: 'Send report' }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('What is wrong with this model?'), { target: { value: ' spam ' } });
    fireEvent.click(send);
    expect(await screen.findByText('Reported')).toBeDefined();
    expect(api.reportProject).toHaveBeenCalledWith('demo', 'spam');
  });

  it('keeps the form open with an error when sending fails', async () => {
    api.reportProject.mockRejectedValue(new Error('429'));
    renderControls();
    fireEvent.click(await screen.findByRole('button', { name: 'Report' }));
    fireEvent.change(screen.getByLabelText('What is wrong with this model?'), { target: { value: 'bad' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send report' }));
    expect(await screen.findByText(/Could not send the report/)).toBeDefined();
  });

  it('is not offered to the owner', async () => {
    api.fetchProjectGalleryState.mockResolvedValue(state({ isOwner: true, hasRender: true }));
    renderControls();
    await screen.findByTestId('gallery-publish-toggle');
    expect(screen.queryByRole('button', { name: 'Report' })).toBeNull();
  });
});
