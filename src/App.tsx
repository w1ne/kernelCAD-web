import { WorkbenchProvider, useWorkbench } from './context/WorkbenchContext';
import { StudioShell } from './studio/StudioShell';
import { shellStore } from './studio/store/shellStore';
import { useShellStore } from './studio/store/useShellStore';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DevLab } from './devlab/DevLab';
import { devLabScenarios } from './devlab/scenarios';
import { useEffect, useState } from 'react';
import { parseCode } from './lib/ast';
import { DemoPlayerPage } from './components/demoPlayer/DemoPlayerPage';

function isCodeParsable(code: string): boolean {
  try {
    parseCode(code);
    return true;
  } catch {
    return false;
  }
}

import { useProject } from './context/ProjectContext';

function readScriptParam(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('script');
}

function AppContent({ isDevLab }: { isDevLab: boolean }) {
  const {
    code, viewMode, viewMode3D, sidePanelVisible, showSketches,
    setCode, setViewMode, setViewMode3D
  } = useWorkbench();

  const { activeProject, saveActiveProject } = useProject();
  const { agentRailOpen } = useShellStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const scriptParam = readScriptParam();

  useEffect(() => {
    if (isDevLab || !scriptParam) return;

    let cancelled = false;
    fetch(`/__kernelcad/mesh?script=${encodeURIComponent(scriptParam)}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) {
          const message = typeof payload?.error === 'string' ? payload.error : response.statusText;
          throw new Error(message);
        }
        if (typeof payload?.source !== 'string') {
          throw new Error('Script endpoint did not return source code.');
        }
        return payload.source as string;
      })
      .then((source) => {
        if (cancelled) return;
        setCode(source);
        setViewMode('code');
        setIsInitialized(true);
      })
      .catch((error) => {
        console.error('Failed to load script source:', error);
      });

    return () => {
      cancelled = true;
    };
  }, [isDevLab, scriptParam, setCode, setViewMode]);

  // Sync active project -> workbench state
  useEffect(() => {
    if (scriptParam) return;
    if (isDevLab || !activeProject) return;

    // Only sync on initial load or project switch
    if (!isInitialized || activeProject.code !== code) {
      setCode(activeProject.code);
      if (activeProject.viewState) {
        setViewMode(activeProject.viewState.viewMode);
        setViewMode3D(activeProject.viewState.viewMode3D as typeof viewMode3D);
        shellStore.setAgentRailOpen(activeProject.viewState.agentRailOpen ?? false);
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsInitialized(true);
    }
  }, [activeProject, isDevLab, setCode, setViewMode, setViewMode3D, isInitialized, code, viewMode3D, scriptParam]);

  // Auto-save: workbench state -> active project
  useEffect(() => {
    if (scriptParam) return;
    if (isDevLab || !isInitialized || !activeProject) return;
    if (!isCodeParsable(code)) return;

    const timeoutId = setTimeout(() => {
      saveActiveProject({
        code,
        viewState: {
          viewMode,
          viewMode3D,
          sidePanelVisible,
          showSketches,
          agentRailOpen,
        }
      });
    }, 1500); // 1.5s debounce for project save

    return () => clearTimeout(timeoutId);
  }, [code, viewMode, viewMode3D, sidePanelVisible, showSketches, agentRailOpen, isDevLab, isInitialized, activeProject, saveActiveProject, scriptParam]);

  return isDevLab ? <DevLab /> : <StudioShell />;
}

function isDemoPlayerRoute(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.pathname === '/demo-player';
}

export default function App() {
  if (isDemoPlayerRoute()) {
    return <DemoPlayerPage />;
  }

  const isDevLab = typeof window !== 'undefined' && window.location.pathname.startsWith('/dev-lab');
  const initialCode = isDevLab ? (devLabScenarios[0]?.code ?? undefined) : undefined;

  return (
    <WorkbenchProvider initialCode={initialCode}>
      <ErrorBoundary>
        <AppContent isDevLab={isDevLab} />
      </ErrorBoundary>
    </WorkbenchProvider>
  );
}
