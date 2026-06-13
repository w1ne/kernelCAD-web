// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { ProjectProvider, useProject } from './ProjectContext';

vi.mock('../../shared/worker/geometryEngine', () => ({
  defaultCode: '// DEFAULT_PLACEHOLDER_CODE — must never reach funnel routes',
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const Probe = () => {
  const { activeProject, activeProjectId } = useProject();
  return (
    <>
      <span data-testid="id">{activeProjectId ?? 'null'}</span>
      <span data-testid="code">{activeProject?.code ?? 'null'}</span>
      <span data-testid="name">{activeProject?.name ?? 'null'}</span>
    </>
  );
};

/**
 * Funnel-route contract (regression guard for the 2026-05-17 prod loop bug):
 *
 * When ProjectProvider is mounted with `initialCode` (i.e. /g/$genId or
 * /p/$slug), it MUST:
 *   1. expose that code as activeProject.code immediately (no localStorage hop)
 *   2. NEVER fall back to defaultCode from geometryEngine
 *   3. NEVER read kernelcad_last_project_id from localStorage
 *   4. NEVER write the funnel project into kernelcad_project_index
 *
 * If this test fails, share links like https://kernelcad.com/g/<id> will once
 * again display the visitor's last local Studio project instead of the
 * generation they followed the link to see.
 */
describe('ProjectProvider — funnel route (initialCode)', () => {
  const funnelCode = 'const cube = box(20, 20, 20);\nreturn cube;';

  beforeEach(() => {
    // Seed localStorage with a stale "last project" that the old code path
    // would have hydrated and displayed instead of funnelCode.
    localStorage.setItem('kernelcad_last_project_id', 'stale-1');
    localStorage.setItem(
      'kernelcad_project_index',
      JSON.stringify([{ id: 'stale-1', name: 'Stale Local', lastUpdated: '2020-01-01' }]),
    );
    localStorage.setItem(
      'kernelcad_project_stale-1',
      JSON.stringify({
        version: 1,
        name: 'Stale Local',
        code: '// STALE_LOCALSTORAGE_CODE',
        viewState: { viewMode: 'code', viewMode3D: 'shadedWithEdges', sidePanelVisible: true, showSketches: true },
        lastUpdated: '2020-01-01',
      }),
    );
  });

  it('exposes initialCode as activeProject.code, ignoring localStorage', async () => {
    render(
      <ProjectProvider initialCode={funnelCode} projectName="Generated">
        <Probe />
      </ProjectProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('code').textContent).toBe(funnelCode);
    });

    expect(screen.getByTestId('code').textContent).not.toContain('STALE_LOCALSTORAGE_CODE');
    expect(screen.getByTestId('code').textContent).not.toContain('DEFAULT_PLACEHOLDER_CODE');
    expect(screen.getByTestId('name').textContent).toBe('Generated');
  });

  it('uses ephemeral id so funnel project is not persisted', async () => {
    render(
      <ProjectProvider initialCode={funnelCode}>
        <Probe />
      </ProjectProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('id').textContent).toBe('__funnel_ephemeral__');
    });

    // The funnel project must not leak into the persisted project index.
    const index = JSON.parse(localStorage.getItem('kernelcad_project_index') ?? '[]');
    expect(index.find((p: { id: string }) => p.id === '__funnel_ephemeral__')).toBeUndefined();
  });

  it('falls back to localStorage hydration when initialCode is absent', async () => {
    render(
      <ProjectProvider>
        <Probe />
      </ProjectProvider>,
    );

    // The non-funnel path must NOT pick the ephemeral id — it has to hydrate
    // from localStorage like before. We don't assert the exact code here
    // (projectService schema-validation is its own concern); just that the
    // funnel sentinel was not used.
    await waitFor(() => {
      expect(screen.getByTestId('id').textContent).not.toBe('__funnel_ephemeral__');
    });
  });
});
