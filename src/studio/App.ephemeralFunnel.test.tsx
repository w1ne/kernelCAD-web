// @vitest-environment happy-dom
/**
 * Regression guard for the /g/$genId live-code-clobber bug.
 *
 * The ephemeral funnel project (initialCode, no viewerMode) must:
 *   1. seed the workbench with initialCode on first mount
 *   2. never overwrite subsequent external setCode calls with the stale
 *      mount-time snapshot stored in the ephemeral project object
 */
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

const INITIAL_CODE = '// INITIAL_GEN_CODE';
const LIVE_UPDATE_CODE = '// LIVE_AGENT_UPDATE';
const EPHEMERAL_ID = '__funnel_ephemeral__';

const mocks = vi.hoisted(() => ({
  // Must use a literal here — vi.hoisted runs before module initialization
  // so named constants are not yet bound.
  currentCode: '// INITIAL_GEN_CODE',
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
      const [code, setCode] = React.useState(initialCode ?? '// DEFAULT');
      mocks.currentCode = code;
      return <div data-testid="workbench-provider">{children}</div>;
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

// Mock ProjectContext — expose activeProjectId = EPHEMERAL_ID so the guard
// in App.tsx can detect the ephemeral funnel path.
vi.mock('./context/ProjectContext', () => ({
  useProject: () => ({
    activeProject: {
      code: INITIAL_CODE,
      viewState: {
        viewMode: 'code',
        viewMode3D: 'shadedWithEdges',
        agentRailOpen: false,
      },
    },
    activeProjectId: EPHEMERAL_ID,
    saveActiveProject: mocks.saveActiveProject,
  }),
  isEphemeralProjectId: (id: string | null) => id === EPHEMERAL_ID,
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

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  mocks.currentCode = INITIAL_CODE;
  mocks.saveActiveProject.mockClear();
  mocks.setCode.mockClear();
  mocks.setViewMode.mockClear();
  mocks.setViewMode3D.mockClear();
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  window.history.pushState(null, '', '/g/00000000-0000-0000-0000-000000000001');
});

afterEach(() => {
  cleanup();
  consoleErrorSpy.mockRestore();
  vi.unstubAllGlobals();
});

describe('App ephemeral funnel route (/g/$genId)', () => {
  it('seeds the workbench with initialCode on first mount', async () => {
    render(<App initialCode={INITIAL_CODE} />);

    await act(async () => {
      await Promise.resolve();
    });

    // The sync effect must have seeded initialCode via setCode.
    expect(mocks.setCode).toHaveBeenCalledWith(INITIAL_CODE);
  });

  it('does not revert to initialCode after an external setCode call', async () => {
    render(<App initialCode={INITIAL_CODE} />);

    // Let the initialization effect run (seeds initialCode).
    await act(async () => {
      await Promise.resolve();
    });

    // Simulate a live agent update — drive new code directly through setCode
    // as LiveCodeApplier would on a /p route, or as any programmatic caller would.
    act(() => {
      mocks.setCode(LIVE_UPDATE_CODE);
    });

    // Flush all pending effects (including the sync effect re-run).
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // The sync effect must NOT have reverted the code back to INITIAL_CODE.
    expect(mocks.currentCode).toBe(LIVE_UPDATE_CODE);

    // Specifically: setCode must not have been called a second time with
    // the stale INITIAL_CODE after the live update.
    const callsWithInitial = mocks.setCode.mock.calls.filter(
      ([arg]) => arg === INITIAL_CODE,
    );
    const callsWithLive = mocks.setCode.mock.calls.filter(
      ([arg]) => arg === LIVE_UPDATE_CODE,
    );
    // At most one seeding call with INITIAL_CODE (the initialization call).
    expect(callsWithInitial.length).toBeLessThanOrEqual(1);
    // The live update call must be present.
    expect(callsWithLive.length).toBeGreaterThanOrEqual(1);
    // The LAST setCode call must be the live update, not a revert.
    const lastCall = mocks.setCode.mock.calls.at(-1)?.[0];
    expect(lastCall).toBe(LIVE_UPDATE_CODE);
  });
});
