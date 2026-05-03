import { WorkbenchProvider, useWorkbench } from './context/WorkbenchContext';
import { WorkbenchLayout } from './components/Layout/WorkbenchLayout';
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

function AppContent({ isDevLab }: { isDevLab: boolean }) {
  const {
    code, viewMode, viewMode3D, sidePanelVisible, showSketches,
    setCode, setViewMode, setViewMode3D
  } = useWorkbench();

  const { activeProject, saveActiveProject } = useProject();
  const [isInitialized, setIsInitialized] = useState(false);

  // Sync active project -> workbench state
  useEffect(() => {
    if (isDevLab || !activeProject) return;

    // Only sync on initial load or project switch
    if (!isInitialized || activeProject.code !== code) {
      setCode(activeProject.code);
      if (activeProject.viewState) {
        setViewMode(activeProject.viewState.viewMode);
        setViewMode3D(activeProject.viewState.viewMode3D as typeof viewMode3D);
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsInitialized(true);
    }
  }, [activeProject, isDevLab, setCode, setViewMode, setViewMode3D, isInitialized, code, viewMode3D]);

  // Auto-save: workbench state -> active project
  useEffect(() => {
    if (isDevLab || !isInitialized || !activeProject) return;
    if (!isCodeParsable(code)) return;

    const timeoutId = setTimeout(() => {
      saveActiveProject({
        code,
        viewState: {
          viewMode,
          viewMode3D,
          sidePanelVisible,
          showSketches
        }
      });
    }, 1500); // 1.5s debounce for project save

    return () => clearTimeout(timeoutId);
  }, [code, viewMode, viewMode3D, sidePanelVisible, showSketches, isDevLab, isInitialized, activeProject, saveActiveProject]);

  return isDevLab ? <DevLab /> : <WorkbenchLayout />;
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
