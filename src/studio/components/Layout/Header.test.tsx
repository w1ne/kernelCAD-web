// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { Header } from './Header';
import { WorkbenchProvider } from '../../context/WorkbenchContext';
import * as exportViaServerMod from '../../exportViaServer';

vi.mock('../../exportViaServer', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../exportViaServer')>(),
  exportViaServer: vi.fn().mockResolvedValue({
    blob: new Blob(['mock data']),
    downloadName: 'model.step',
  }),
  downloadBlob: vi.fn(),
}));

// Workbench/GeometryContext still boots the legacy worker on mount; stub it
// so happy-dom (no Worker) doesn't reject.
vi.mock('../../../shared/worker/geometryEngine', async () => {
  const actual = await vi.importActual<typeof import('../../../shared/worker/geometryEngine')>(
    '../../../shared/worker/geometryEngine',
  );
  const mockInstance = {
    initialize: vi.fn().mockResolvedValue(undefined),
    executeCode: vi.fn().mockResolvedValue({ geometries: [], sketches: [] }),
  };
  return {
    ...actual,
    init: vi.fn().mockResolvedValue(undefined),
    GeometryEngine: {
      getInstance: () => mockInstance,
    },
    geometryEngine: mockInstance,
  };
});

vi.mock('../../../funnel/lib/supabaseClient', () => ({
  isAuthConfigured: () => false,
  getSupabase: () => ({
    auth: { getSession: async () => ({ data: { session: null } }) },
  }),
}));

beforeEach(() => {
  vi.mocked(exportViaServerMod.exportViaServer).mockClear();
  vi.mocked(exportViaServerMod.downloadBlob).mockClear();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { pathname: '/', search: '', hostname: 'localhost' },
  });
});

afterEach(() => {
  cleanup();
});

describe('Header', () => {
  it('should render project name', () => {
    render(
      <WorkbenchProvider>
        <Header />
      </WorkbenchProvider>,
    );
    // Default project name from ProjectContext
    expect(screen.getByText('Untitled Project')).toBeDefined();
  });

  it('names a funnel project by its title, not "Generated"', () => {
    render(
      <WorkbenchProvider initialCode="return box(10, 10, 10);" projectName="Pipe clamp bracket">
        <Header />
      </WorkbenchProvider>,
    );
    expect(screen.getByText('Pipe clamp bracket')).toBeDefined();
    expect(screen.queryByText('Generated')).toBeNull();
  });

  it('shows no build hash in the header', () => {
    render(
      <WorkbenchProvider>
        <Header />
      </WorkbenchProvider>,
    );
    const text = screen.getByTestId('header').textContent ?? '';
    expect(text).not.toContain('DEV');
    if (typeof __COMMIT_HASH__ !== 'undefined') expect(text).not.toContain(__COMMIT_HASH__);
  });

  it('shows the Feedback button in the pinned account slot, even without auth', () => {
    render(
      <WorkbenchProvider>
        <Header />
      </WorkbenchProvider>,
    );
    const slot = screen.getByTestId('account-slot');
    expect(slot.querySelector('[data-testid="feedback-button"]')).not.toBeNull();
  });

  it('should export STEP via the server kernel path (not the legacy worker)', async () => {
    render(
      <WorkbenchProvider>
        <Header />
      </WorkbenchProvider>,
    );

    fireEvent.click(screen.getByTitle('Export STEP'));

    await waitFor(() => {
      expect(exportViaServerMod.exportViaServer).toHaveBeenCalled();
    });
    expect(exportViaServerMod.exportViaServer).toHaveBeenCalledWith(
      'step',
      expect.any(String),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    await waitFor(() => {
      expect(exportViaServerMod.downloadBlob).toHaveBeenCalled();
    });
  });

  it('should export STL via the server kernel path', async () => {
    render(
      <WorkbenchProvider>
        <Header />
      </WorkbenchProvider>,
    );

    fireEvent.click(screen.getByTitle('Export STL'));

    await waitFor(() => {
      expect(exportViaServerMod.exportViaServer).toHaveBeenCalledWith(
        'stl',
        expect.any(String),
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });
  });

  it('shows a failed export as the server message and hint, not an alert', async () => {
    const alertSpy = vi.fn();
    vi.stubGlobal('alert', alertSpy);
    vi.mocked(exportViaServerMod.exportViaServer).mockRejectedValueOnce(
      new exportViaServerMod.ServerExportError('The export did not finish within 150 s.', {
        status: 504, code: 'export.timeout', hint: 'Large assemblies export faster as STEP.',
      }),
    );
    render(
      <WorkbenchProvider>
        <Header />
      </WorkbenchProvider>,
    );

    fireEvent.click(screen.getByTitle('Export STL'));

    await waitFor(() => {
      expect(screen.getByTestId('header-export-status-error').textContent)
        .toBe('The export did not finish within 150 s.');
    });
    expect(screen.getByTestId('header-export-status-hint').textContent).toBe('Large assemblies export faster as STEP.');
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('should switch between shading modes', () => {
    render(
      <WorkbenchProvider>
        <Header />
      </WorkbenchProvider>,
    );

    // Default is usually shadedWithEdges (from WorkbenchContext)
    const boxBtn = screen.getByTitle('Shaded with Edges');
    const wireframeBtn = screen.getByTitle('Wireframe');
    const shadedBtn = screen.getByTitle('Shaded');

    // Initial check for shadedWithEdges active style (bg-[#444])
    expect(boxBtn.className).toContain('bg-[#444]');

    // Click wireframe
    fireEvent.click(wireframeBtn);
    expect(wireframeBtn.className).toContain('bg-[#444]');
    expect(boxBtn.className).not.toContain('bg-[#444]');

    // Click shaded
    fireEvent.click(shadedBtn);
    expect(shadedBtn.className).toContain('bg-[#444]');
    expect(wireframeBtn.className).not.toContain('bg-[#444]');
  });
});
