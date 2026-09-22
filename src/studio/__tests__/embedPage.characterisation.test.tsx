// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/__tests__/embedPage.characterisation.test.tsx
//
// @vitest-environment happy-dom
//
// Characterisation tests for the `/embed/$slug` route component, written
// before splitting `EmbedPage` by phase. Pins the rendered DOM, the per-phase
// status strings (including error messages), retry behaviour, and the
// revision/mode branches so the refactor can prove output is unchanged.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import type { ComponentType, ReactNode } from 'react';

const harness = vi.hoisted(() => ({
  params: { slug: 'demo' },
  search: {
    mode: 'viewer' as 'viewer' | 'studio',
    revision: undefined as number | null | undefined,
    meshUrl: undefined as string | undefined,
  },
  routeComponent: null as ComponentType | null,
  fetchProjectBySlug: vi.fn(),
  fetchProjectRevisionBySlug: vi.fn(),
  onPhaseChange: null as ((phase: string, detail?: string | null) => void) | null,
}));

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (opts: { component: ComponentType }) => {
    harness.routeComponent = opts.component;
    return {
      ...opts,
      useParams: () => harness.params,
      useSearch: () => harness.search,
    };
  },
}));

vi.mock('../../funnel/lib/apiClient', () => ({
  fetchProjectBySlug: harness.fetchProjectBySlug,
  fetchProjectRevisionBySlug: harness.fetchProjectRevisionBySlug,
}));

vi.mock('../../funnel/components/FunnelViewer', () => ({
  FunnelViewer: (props: {
    code: string;
    meshUrl?: string;
    onPhaseChange: (phase: string, detail?: string | null) => void;
  }) => {
    harness.onPhaseChange = props.onPhaseChange;
    return (
      <div data-testid="funnel-viewer" data-mesh-url={props.meshUrl ?? ''}>
        {props.code}
      </div>
    );
  },
}));

vi.mock('../App', () => ({
  default: (props: { initialCode: string }) => (
    <div data-testid="studio-app">{props.initialCode}</div>
  ),
}));

vi.mock('../config/StudioConfigContext', () => ({
  StudioConfigProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

import '../routes/embed.$slug';

function renderEmbed() {
  if (!harness.routeComponent) throw new Error('embed route component was not registered');
  return render(<harness.routeComponent />);
}

function statusText(): string | null {
  const el = screen.queryByTestId('embed-status');
  if (!el) return null;
  return el.tagName === 'P' ? el.textContent : el.querySelector('p')?.textContent ?? null;
}

const postMessageSpy = vi.fn();

beforeEach(() => {
  cleanup();
  harness.params.slug = 'demo';
  harness.search.mode = 'viewer';
  harness.search.revision = undefined;
  harness.search.meshUrl = undefined;
  harness.fetchProjectBySlug.mockReset();
  harness.fetchProjectRevisionBySlug.mockReset();
  harness.onPhaseChange = null;
  postMessageSpy.mockReset();
  vi.stubGlobal('parent', { postMessage: postMessageSpy });
  // happy-dom: window.parent === window by default; force a distinct parent.
  Object.defineProperty(window, 'parent', { configurable: true, value: { postMessage: postMessageSpy } });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('EmbedPage characterisation', () => {
  it('renders the loading status while the source fetch is pending', () => {
    harness.fetchProjectBySlug.mockReturnValue(new Promise(() => {}));
    renderEmbed();
    expect(statusText()).toBe('Loading…');
    expect(document.querySelector('[data-embed-phase]')?.getAttribute('data-embed-phase')).toBe(
      'loading_source',
    );
  });

  it('renders "Model not available." when the project is missing', async () => {
    harness.fetchProjectBySlug.mockResolvedValue(null);
    renderEmbed();
    await waitFor(() => expect(statusText()).toBe('Model not available.'));
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  });

  it('renders the source error text and retries the fetch', async () => {
    harness.fetchProjectBySlug.mockRejectedValue(new Error('boom'));
    renderEmbed();
    await waitFor(() => expect(statusText()).toBe('Failed to load: Error: boom'));
    const retry = screen.getByRole('button', { name: 'Retry' });
    harness.fetchProjectBySlug.mockResolvedValue({ current_code: 'box(1);' });
    act(() => {
      retry.click();
    });
    await waitFor(() => expect(screen.getByTestId('funnel-viewer').textContent).toBe('box(1);'));
  });

  it('renders FunnelViewer and each viewer phase status string', async () => {
    harness.fetchProjectBySlug.mockResolvedValue({ current_code: 'box(1);' });
    harness.search.meshUrl = 'https://cdn.example/mesh.glb';
    renderEmbed();
    await waitFor(() => expect(screen.getByTestId('funnel-viewer')).toBeTruthy());
    expect(screen.getByTestId('funnel-viewer').getAttribute('data-mesh-url')).toBe(
      'https://cdn.example/mesh.glb',
    );
    expect(statusText()).toBe('Loading mesh…');

    act(() => harness.onPhaseChange?.('building_geometry'));
    expect(statusText()).toBe('Building geometry…');

    act(() => harness.onPhaseChange?.('loading_mesh'));
    expect(statusText()).toBe('Loading mesh…');

    act(() => harness.onPhaseChange?.('model_displayed'));
    expect(statusText()).toBeNull();

    act(() => harness.onPhaseChange?.('build_failed', 'nope'));
    expect(statusText()).toBe('Build failed: nope');
    const retry = screen.getByRole('button', { name: 'Retry' });
    act(() => {
      retry.click();
    });
    expect(statusText()).toBe('Loading mesh…');
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();

    act(() => harness.onPhaseChange?.('viewer_failed'));
    expect(statusText()).toBe('Viewer failed: unknown error');
  });

  it('renders the studio shell when mode=studio', async () => {
    harness.search.mode = 'studio';
    harness.fetchProjectBySlug.mockResolvedValue({ current_code: 'box(1);' });
    renderEmbed();
    await waitFor(() => expect(screen.getByTestId('studio-app').textContent).toBe('box(1);'));
    expect(screen.queryByTestId('funnel-viewer')).toBeNull();
  });

  it('fails closed for an invalid revision without fetching', async () => {
    harness.search.revision = null;
    renderEmbed();
    await waitFor(() => expect(statusText()).toBe('Model not available.'));
    expect(harness.fetchProjectBySlug).not.toHaveBeenCalled();
    expect(harness.fetchProjectRevisionBySlug).not.toHaveBeenCalled();
  });

  it('loads a pinned revision without consulting the live project', async () => {
    harness.search.revision = 7;
    harness.fetchProjectRevisionBySlug.mockResolvedValue({ code: 'pinned();' });
    renderEmbed();
    await waitFor(() => expect(screen.getByTestId('funnel-viewer').textContent).toBe('pinned();'));
    expect(harness.fetchProjectRevisionBySlug).toHaveBeenCalledWith('demo', 7);
    expect(harness.fetchProjectBySlug).not.toHaveBeenCalled();
  });

  it('fails closed when a pinned revision read fails', async () => {
    harness.search.revision = 7;
    harness.fetchProjectRevisionBySlug.mockRejectedValue(new Error('not_found'));
    renderEmbed();
    await waitFor(() => expect(statusText()).toBe('Model not available.'));
    expect(harness.fetchProjectBySlug).not.toHaveBeenCalled();
  });
  it('posts failed status to the parent when the project is missing', async () => {
    harness.fetchProjectBySlug.mockResolvedValue(null);
    renderEmbed();
    await waitFor(() => expect(statusText()).toBe('Model not available.'));
    await waitFor(() => {
      const payload = postMessageSpy.mock.calls.map((c) => c[0]).find((d) => d?.status === 'error');
      expect(payload).toMatchObject({ source: 'kernelcad-embed', status: 'error' });
    });
  });

  it('posts failed status to the parent when source loading fails', async () => {
    harness.fetchProjectBySlug.mockRejectedValue(new Error('boom'));
    renderEmbed();
    await waitFor(() => expect(statusText()).toBe('Failed to load: Error: boom'));
    await waitFor(() => {
      const payload = postMessageSpy.mock.calls.map((c) => c[0]).find((d) => d?.status === 'error');
      expect(payload).toMatchObject({ source: 'kernelcad-embed', status: 'error' });
    });
  });

  it('posts failed status when the viewer reports mesh/build failure', async () => {
    harness.fetchProjectBySlug.mockResolvedValue({ current_code: 'box(1);' });
    renderEmbed();
    await waitFor(() => expect(screen.getByTestId('funnel-viewer')).toBeTruthy());
    act(() => harness.onPhaseChange?.('viewer_failed', 'mesh explode'));
    await waitFor(() => {
      const payload = postMessageSpy.mock.calls.map((c) => c[0]).find((d) => d?.status === 'error' && String(d?.detail ?? '').includes('mesh explode'));
      expect(payload).toBeTruthy();
    });
  });

});
