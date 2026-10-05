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

const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => mockNavigate }));

const mockSession = vi.fn<() => { session: { user: { email: string } } | null; loading: boolean }>(
  () => ({ session: null, loading: false }),
);
vi.mock('../../../funnel/hooks/useSession', () => ({
  useOptionalSession: () => mockSession(),
  useSession: () => mockSession(),
}));

const mockSaveProject = vi.fn();
vi.mock('../../../funnel/lib/apiClient', () => ({
  saveProject: (...args: unknown[]) => mockSaveProject(...args),
}));

vi.mock('../../../funnel/lib/supabaseClient', () => ({
  isAuthConfigured: () => false,
  getSupabase: () => ({
    auth: { getSession: async () => ({ data: { session: null } }) },
  }),
}));

beforeEach(() => {
  mockNavigate.mockClear();
  mockSaveProject.mockReset();
  mockSession.mockReturnValue({ session: null, loading: false });
  localStorage.clear();
  vi.mocked(exportViaServerMod.exportViaServer).mockClear();
  vi.mocked(exportViaServerMod.downloadBlob).mockClear();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { pathname: '/', search: '', hostname: 'localhost', origin: 'http://localhost' },
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

  it('keeps Feedback reachable in the account slot when there is no account menu', () => {
    render(
      <WorkbenchProvider>
        <Header />
      </WorkbenchProvider>,
    );
    const slot = screen.getByTestId('account-slot');
    expect(slot.querySelector('[data-testid="feedback-button"]')).not.toBeNull();
    fireEvent.click(screen.getByTestId('feedback-button'));
    expect(screen.getByRole('dialog')).toBeDefined();
  });

  it('is one row: no Quick start row and no second toolbar row', () => {
    render(
      <WorkbenchProvider>
        <Header />
      </WorkbenchProvider>,
    );
    expect(screen.queryByText('Quick start')).toBeNull();
    expect(screen.queryByTestId('studio-toolbar')).toBeNull();
    expect(screen.getByTestId('header').className).toContain('h-11');
  });

  it('should export STEP via the server kernel path (not the legacy worker)', async () => {
    render(
      <WorkbenchProvider>
        <Header />
      </WorkbenchProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'More export formats' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /^STEP/ }));

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

  it('exports STL from the primary split button, then offers the last used format', async () => {
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

    fireEvent.click(screen.getByRole('button', { name: 'More export formats' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /^3MF/ }));
    await waitFor(() => expect(screen.getByTitle('Export 3MF')).toBeDefined());
  });

  it('lists every server export format in the split menu', () => {
    render(
      <WorkbenchProvider>
        <Header />
      </WorkbenchProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'More export formats' }));
    const labels = screen.getAllByRole('menuitem').map((m) => m.textContent?.split(' — ')[0]);
    expect(labels).toEqual(['STL', 'STEP', 'DXF', '3MF', 'GLB', 'Drawing (PDF)']);
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

  it('toggles the inspector from the header', () => {
    render(
      <WorkbenchProvider>
        <Header />
      </WorkbenchProvider>,
    );
    const toggle = screen.getByTestId('toolbar-inspector');
    const before = toggle.getAttribute('aria-pressed');
    fireEvent.click(toggle);
    expect(screen.getByTestId('toolbar-inspector').getAttribute('aria-pressed')).not.toBe(before);
    fireEvent.click(screen.getByTestId('toolbar-inspector'));
  });
});

describe('Header — Share', () => {
  function renderHeader() {
    render(
      <WorkbenchProvider initialCode="return box(1, 2, 3);" projectName="My Model">
        <Header />
      </WorkbenchProvider>,
    );
  }

  it('sends a signed-out visitor to sign-in and back', async () => {
    renderHeader();
    fireEvent.click(screen.getByTestId('toolbar-publish'));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/signin', search: { next: '/' } });
  });

  it('publishes the editor code as an unlisted project and copies the link', async () => {
    mockSession.mockReturnValue({ session: { user: { email: 'a@b.c' } }, loading: false });
    mockSaveProject.mockResolvedValue({ slug: 'done-slug', projectId: 'p-3' });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    renderHeader();

    fireEvent.click(screen.getByTestId('toolbar-publish'));

    await waitFor(() => expect(mockSaveProject).toHaveBeenCalledTimes(1));
    expect(mockSaveProject.mock.calls[0][0]).toMatchObject({ privacy: 'public_unlisted', title: 'My Model' });
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('http://localhost/p/done-slug'));
    expect(screen.getByTestId('toolbar-publish-link').textContent).toContain('done-slug');
  });

  it('disables Share while publishing', async () => {
    mockSession.mockReturnValue({ session: { user: { email: 'a@b.c' } }, loading: false });
    mockSaveProject.mockReturnValue(new Promise(() => {}));
    renderHeader();
    fireEvent.click(screen.getByTestId('toolbar-publish'));
    await waitFor(() =>
      expect((screen.getByTestId('toolbar-publish') as HTMLButtonElement).disabled).toBe(true),
    );
  });
});
