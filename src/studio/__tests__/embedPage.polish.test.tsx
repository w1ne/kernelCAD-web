// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
//
// /embed/<slug> as a visitor on a product page sees it: one status line, the
// stored render as a poster while the model builds, attribution under the
// canvas (not over the model), and a theme from `?theme=` or the host.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import type { ComponentType, ReactNode } from 'react';

const harness = vi.hoisted(() => ({
  params: { slug: 'demo' },
  search: {
    mode: 'viewer' as 'viewer' | 'studio',
    revision: undefined as number | null | undefined,
    meshUrl: undefined as string | undefined,
    theme: undefined as 'light' | 'dark' | undefined,
  },
  routeComponent: null as ComponentType | null,
  fetchProjectBySlug: vi.fn(),
  fetchProjectRevisionBySlug: vi.fn(),
  viewerProps: null as null | {
    onPhaseChange: (phase: string, detail?: string | null) => void;
    statusOverlay?: boolean;
    background?: string;
  },
}));

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (opts: { component: ComponentType }) => {
    harness.routeComponent = opts.component;
    return { ...opts, useParams: () => harness.params, useSearch: () => harness.search };
  },
}));

vi.mock('../../funnel/lib/apiClient', () => ({
  fetchProjectBySlug: harness.fetchProjectBySlug,
  fetchProjectRevisionBySlug: harness.fetchProjectRevisionBySlug,
}));

vi.mock('../../funnel/components/FunnelViewer', () => ({
  FunnelViewer: (props: NonNullable<typeof harness.viewerProps>) => {
    harness.viewerProps = props;
    return <div data-testid="funnel-viewer" />;
  },
}));

vi.mock('../App', () => ({ default: () => <div data-testid="studio-app" /> }));
vi.mock('../config/StudioConfigContext', () => ({
  StudioConfigProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

import '../routes/embed.$slug';

const RENDER = 'https://api.kernelcad.com/api/v1/projects/demo/og.png?v=1';

function renderEmbed() {
  if (!harness.routeComponent) throw new Error('embed route component was not registered');
  return render(<harness.routeComponent />);
}

function setOgImage(content: string | null) {
  document.head.querySelectorAll('meta[property="og:image"]').forEach((m) => m.remove());
  if (content === null) return;
  const meta = document.createElement('meta');
  meta.setAttribute('property', 'og:image');
  meta.setAttribute('content', content);
  document.head.appendChild(meta);
}

function stubPrefersDark(dark: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query === '(prefers-color-scheme: dark)' ? dark : false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

const frame = () => document.querySelector('main[data-embed-phase]') as HTMLElement;

beforeEach(() => {
  cleanup();
  harness.search = { mode: 'viewer', revision: undefined, meshUrl: undefined, theme: undefined };
  harness.fetchProjectBySlug.mockReset();
  harness.fetchProjectRevisionBySlug.mockReset();
  harness.viewerProps = null;
  setOgImage(null);
  stubPrefersDark(true);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  setOgImage(null);
});

describe('embed: one honest status line', () => {
  it('turns off the viewer status so only the embed line shows', async () => {
    harness.fetchProjectBySlug.mockResolvedValue({ current_code: 'box(1);' });
    renderEmbed();
    await waitFor(() => expect(harness.viewerProps).not.toBeNull());
    expect(harness.viewerProps?.statusOverlay).toBe(false);
    act(() => harness.viewerProps?.onPhaseChange('building_geometry'));
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByTestId('embed-status').textContent).toContain('Building geometry…');
  });

  it('says "Building geometry…" before the viewer reports, not "Project saved"', async () => {
    harness.fetchProjectBySlug.mockResolvedValue({ current_code: 'box(1);' });
    renderEmbed();
    await waitFor(() => expect(frame().getAttribute('data-embed-phase')).toBe('project_saved'));
    expect(screen.getByTestId('embed-status').textContent).not.toContain('Project saved');
    expect(screen.getByTestId('embed-status').textContent).toContain('Building geometry…');
  });

  it('shows the elapsed time once the wait passes 3 s', async () => {
    vi.useFakeTimers();
    harness.fetchProjectBySlug.mockReturnValue(new Promise(() => {}));
    renderEmbed();
    expect(screen.queryByTestId('embed-elapsed')).toBeNull();
    act(() => { vi.advanceTimersByTime(4_000); });
    expect(screen.getByTestId('embed-elapsed').textContent).toBe('4 s');
  });
});

describe('embed: poster', () => {
  it('shows the stored render from first paint, before the source loads', () => {
    setOgImage(RENDER);
    harness.fetchProjectBySlug.mockReturnValue(new Promise(() => {}));
    renderEmbed();
    const poster = screen.getByTestId('embed-poster');
    expect(poster.getAttribute('src')).toBe(RENDER);
    expect(screen.getByTestId('embed-cover').getAttribute('data-visible')).toBe('true');
  });

  it('moves the status to the bottom once the poster has loaded', () => {
    setOgImage(RENDER);
    harness.fetchProjectBySlug.mockReturnValue(new Promise(() => {}));
    renderEmbed();
    expect(screen.getByTestId('embed-status').getAttribute('data-placement')).toBe('centre');
    act(() => { screen.getByTestId('embed-poster').dispatchEvent(new Event('load')); });
    expect(screen.getByTestId('embed-status').getAttribute('data-placement')).toBe('bottom');
  });

  it('fades the poster out when the model is displayed and keeps it out on a later rebuild error', async () => {
    setOgImage(RENDER);
    harness.fetchProjectBySlug.mockResolvedValue({ current_code: 'box(1);' });
    renderEmbed();
    await waitFor(() => expect(harness.viewerProps).not.toBeNull());
    act(() => harness.viewerProps?.onPhaseChange('model_displayed'));
    expect(screen.getByTestId('embed-cover').getAttribute('data-visible')).toBe('false');
    expect(screen.queryByTestId('embed-status')).toBeNull();
    // A customizer rebuild fails over the displayed model: the model stays in view.
    act(() => harness.viewerProps?.onPhaseChange('build_failed', 'bad value'));
    expect(screen.getByTestId('embed-cover').getAttribute('data-visible')).toBe('false');
    expect(screen.getByTestId('embed-status').getAttribute('data-placement')).toBe('bottom');
  });

  it('drops a poster that fails to load', () => {
    setOgImage(RENDER);
    harness.fetchProjectBySlug.mockReturnValue(new Promise(() => {}));
    renderEmbed();
    act(() => { screen.getByTestId('embed-poster').dispatchEvent(new Event('error')); });
    expect(screen.queryByTestId('embed-poster')).toBeNull();
  });

  it('hides the poster when the build fails before any model showed', async () => {
    setOgImage(RENDER);
    harness.fetchProjectBySlug.mockResolvedValue({ current_code: 'box(1);' });
    renderEmbed();
    await waitFor(() => expect(harness.viewerProps).not.toBeNull());
    act(() => harness.viewerProps?.onPhaseChange('build_failed', 'nope'));
    expect(screen.queryByTestId('embed-poster')).toBeNull();
    expect(screen.getByTestId('embed-status').getAttribute('data-placement')).toBe('centre');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
  });

  it('uses no poster for the generic site image or a pinned revision', () => {
    setOgImage('https://kernelcad.com/og-image.png');
    harness.fetchProjectBySlug.mockReturnValue(new Promise(() => {}));
    renderEmbed();
    expect(screen.queryByTestId('embed-poster')).toBeNull();
    cleanup();
    setOgImage(RENDER);
    harness.search.revision = 4;
    harness.fetchProjectRevisionBySlug.mockReturnValue(new Promise(() => {}));
    renderEmbed();
    expect(screen.queryByTestId('embed-poster')).toBeNull();
  });
});

describe('embed: attribution', () => {
  it('puts Made-with and Remix in a footer under the canvas, not over it', async () => {
    harness.fetchProjectBySlug.mockResolvedValue({ current_code: 'box(1);' });
    renderEmbed();
    await waitFor(() => expect(screen.getByTestId('funnel-viewer')).toBeTruthy());
    const bar = screen.getByTestId('embed-attribution-bar');
    const viewerArea = screen.getByTestId('funnel-viewer').parentElement!;
    expect(bar.parentElement).toBe(frame());
    expect(viewerArea.contains(bar)).toBe(false);
    expect(bar.contains(screen.getByTestId('remix-in-kernelcad'))).toBe(true);
    expect(bar.contains(screen.getByTestId('made-with-kernelcad'))).toBe(true);
  });

  it('offers no Remix for a missing model', async () => {
    harness.fetchProjectBySlug.mockResolvedValue(null);
    renderEmbed();
    await waitFor(() => expect(frame().getAttribute('data-embed-phase')).toBe('missing'));
    expect(screen.queryByTestId('remix-in-kernelcad')).toBeNull();
    expect(screen.getByTestId('made-with-kernelcad')).toBeTruthy();
  });
});

describe('embed: theme', () => {
  it('follows the host preference without ?theme=', async () => {
    stubPrefersDark(false);
    harness.fetchProjectBySlug.mockResolvedValue({ current_code: 'box(1);' });
    renderEmbed();
    await waitFor(() => expect(harness.viewerProps).not.toBeNull());
    expect(frame().getAttribute('data-embed-theme')).toBe('light');
    expect(harness.viewerProps?.background).toBe('light');
    expect(frame().style.getPropertyValue('--embed-canvas')).toBe('#f0f0f0');
    expect(frame().getAttribute('data-theme')).toBe('light');
  });

  it('?theme=dark wins over a light host', async () => {
    stubPrefersDark(false);
    harness.search.theme = 'dark';
    harness.fetchProjectBySlug.mockResolvedValue({ current_code: 'box(1);' });
    renderEmbed();
    await waitFor(() => expect(harness.viewerProps).not.toBeNull());
    expect(frame().getAttribute('data-embed-theme')).toBe('dark');
    expect(harness.viewerProps?.background).toBe('dark');
  });

  it('?theme=light wins over a dark host', () => {
    harness.search.theme = 'light';
    harness.fetchProjectBySlug.mockReturnValue(new Promise(() => {}));
    renderEmbed();
    expect(frame().getAttribute('data-embed-theme')).toBe('light');
  });
});
