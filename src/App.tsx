import { WorkbenchProvider, useWorkbench } from './context/WorkbenchContext';
import { WorkbenchLayout } from './components/Layout/WorkbenchLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DevLab } from './devlab/DevLab';
import { devLabScenarios } from './devlab/scenarios';
import { useEffect, useRef, useState } from 'react';
import { parseCode } from './lib/ast';

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

  const { activeProject, activeProjectId, saveActiveProject } = useProject();
  const [isInitialized, setIsInitialized] = useState(false);
  const loadedProjectIdRef = useRef<string | null>(null);

  // Sync active project -> workbench state
  useEffect(() => {
    if (isDevLab || !activeProject) return;

    // Sync project into editor only on first load and explicit project switches.
    const didProjectChange = loadedProjectIdRef.current !== activeProjectId;
    if (!isInitialized || didProjectChange) {
      setCode(activeProject.code);
      if (activeProject.viewState) {
        setViewMode(activeProject.viewState.viewMode);
        setViewMode3D(activeProject.viewState.viewMode3D as typeof viewMode3D);
      }
      loadedProjectIdRef.current = activeProjectId;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsInitialized(true);
    }
  }, [activeProject, activeProjectId, isDevLab, setCode, setViewMode, setViewMode3D, isInitialized, viewMode3D]);

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

export default function App() {
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
