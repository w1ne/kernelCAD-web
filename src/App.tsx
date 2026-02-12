import { WorkbenchProvider, useWorkbench } from './context/WorkbenchContext';
import { WorkbenchLayout } from './components/Layout/WorkbenchLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DevLab } from './devlab/DevLab';
import { devLabScenarios } from './devlab/scenarios';
import { useEffect, useState } from 'react';
import { projectService } from './lib/projectService';
import { parseCode } from './lib/ast';

function isCodeParsable(code: string): boolean {
  try {
    parseCode(code);
    return true;
  } catch {
    return false;
  }
}


function AppContent({ isDevLab }: { isDevLab: boolean }) {
  const { code, viewMode, viewMode3D, sidePanelVisible, showSketches, setCode, setViewMode, setViewMode3D } = useWorkbench();
  const [isLoaded, setIsLoaded] = useState(false);

  // Auto-load on mount
  useEffect(() => {
    if (isDevLab) {
      setTimeout(() => setIsLoaded(true), 0);
      return;
    }

    const savedProject = projectService.loadFromLocalStorage();
    if (savedProject) {
      const savedCode = savedProject.code;
      if (isCodeParsable(savedCode)) {
        setCode(savedCode);
        if (savedProject.viewState?.viewMode === 'gui' || savedProject.viewState?.viewMode === 'code') {
          setViewMode(savedProject.viewState.viewMode);
        }
        if (typeof savedProject.viewState?.viewMode3D === 'string') {
          setViewMode3D(savedProject.viewState.viewMode3D as typeof viewMode3D);
        }
      } else {
        // Avoid reload loops where invalid code is restored forever.
        projectService.clearLocalStorage();
        setViewMode('code');
        console.warn('Recovered from invalid saved project code in localStorage.');
      }
    }
    setTimeout(() => setIsLoaded(true), 0);
  }, [isDevLab, setCode, setViewMode, setViewMode3D]);

  // Auto-save on changes
  useEffect(() => {
    if (!isLoaded || isDevLab) return;
    if (!isCodeParsable(code)) return;

    const timeoutId = setTimeout(() => {
      const project = projectService.createProject(code, {
        viewMode,
        viewMode3D,
        sidePanelVisible,
        showSketches
      }, 'Auto-saved Project');
      projectService.persistToLocalStorage(project);
    }, 1000); // Debounce save

    return () => clearTimeout(timeoutId);
  }, [code, viewMode, viewMode3D, sidePanelVisible, showSketches, isLoaded, isDevLab]);

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
