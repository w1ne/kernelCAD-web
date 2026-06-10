// @vitest-environment happy-dom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

const mocks = vi.hoisted(() => ({
  currentCode: '// DEFAULT_WORKBENCH_CODE',
  localProjectCode: '// LOCAL_PROJECT_CODE',
  saveActiveProject: vi.fn(),
  setCode: vi.fn((nextCode: string) => {
    mocks.currentCode = nextCode;
  }),
  setViewMode: vi.fn(),
  setViewMode3D: vi.fn(),
}));

vi.mock('./context/WorkbenchContext', async () => {
  const React = await import('react');

  return {
    WorkbenchProvider: ({ children, initialCode }: { children: ReactNode; initialCode?: string }) => {
      const [code, setCode] = React.useState(initialCode ?? '// DEFAULT_WORKBENCH_CODE');
      mocks.currentCode = code;

      return (
        <div data-testid="workbench-provider">
          {children}
        </div>
      );
    },
    useWorkbench: () => ({
      code: mocks.currentCode,
      setCode: mocks.setCode,
      viewMode: 'code',
      setViewMode: mocks.setViewMode,
      viewMode3D: 'shadedWithEdges',
      setViewMode3D: mocks.setViewMode3D,
      sidePanelVisible: true,
      showSketches: true,
    }),
  };
});

vi.mock('./context/ProjectContext', () => ({
  useProject: () => ({
    activeProject: {
      code: mocks.localProjectCode,
      viewState: {
        viewMode: 'code',
        viewMode3D: 'shadedWithEdges',
        agentRailOpen: false,
      },
    },
    // Non-ephemeral id: gallery source route uses a ?gallery= param and
    // returns early before the ephemeral guard, so this value is irrelevant
    // there — but must be present to avoid undefined-function crashes on
    // any effects that reach the guard.
    activeProjectId: 'local-project-id',
    saveActiveProject: mocks.saveActiveProject,
  }),
  isEphemeralProjectId: (id: string | null) => id === '__funnel_ephemeral__',
}));

vi.mock('./store/useShellStore', () => ({
  useShellStore: () => ({ agentRailOpen: false }),
}));

vi.mock('./store/shellStore', () => ({
  shellStore: {
    setAgentRailOpen: vi.fn(),
  },
}));

vi.mock('./StudioShell', () => ({
  StudioShell: () => (
    <main data-testid="studio-shell">
      <span data-testid="workbench-code">{mocks.currentCode}</span>
    </main>
  ),
}));

import App from './App';

const gallerySource = 'export default box(1, 1, 1);';
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

async function flushSourceLoad() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  mocks.currentCode = '// DEFAULT_WORKBENCH_CODE';
  mocks.localProjectCode = '// LOCAL_PROJECT_CODE';
  mocks.saveActiveProject.mockClear();
  mocks.setCode.mockClear();
  mocks.setViewMode.mockClear();
  mocks.setViewMode3D.mockClear();
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  window.history.pushState(null, '', '/studio');
});

afterEach(() => {
  cleanup();
  consoleErrorSpy.mockRestore();
  vi.unstubAllGlobals();
});

describe('App gallery source route', () => {
  it('loads gallery source into the workbench without syncing or autosaving it into the local project', async () => {
    window.history.pushState(null, '', '/studio?gallery=fixture-build');

    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url === '/gallery.json') {
        return {
          ok: true,
          json: async () => ({
            entries: [
              { slug: 'other-build', sourceUrl: '/gallery/other-build/source.kcad.ts' },
              { slug: 'fixture-build', sourceUrl: '/gallery/fixture-build/source.kcad.ts' },
            ],
          }),
        };
      }

      return {
        ok: true,
        text: async () => gallerySource,
      };
    }) as unknown as typeof fetch);

    render(<App />);

    await flushSourceLoad();

    expect(screen.getByTestId('workbench-code').textContent).toBe(gallerySource);
    expect(screen.getByTestId('workbench-code').textContent).not.toBe(mocks.localProjectCode);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 1700));
    });

    expect(mocks.saveActiveProject).not.toHaveBeenCalled();
  });

  it('shows a visible error instead of the Studio shell when gallery source loading fails', async () => {
    window.history.pushState(null, '', '/studio?gallery=bad-slug');

    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        entries: [
          { slug: 'fixture-build', sourceUrl: '/gallery/fixture-build/source.kcad.ts' },
        ],
      }),
    })) as unknown as typeof fetch);

    render(<App />);

    await flushSourceLoad();

    expect(screen.getByText(/failed to load studio source/i)).toBeTruthy();
    expect(screen.queryByTestId('studio-shell')).toBeNull();
    expect(screen.queryByText(mocks.localProjectCode)).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load Studio source:', expect.any(Error));
  });
});
