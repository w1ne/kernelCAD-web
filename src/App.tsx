import { WorkbenchProvider, useWorkbench } from './context/WorkbenchContext';
import { WorkbenchLayout } from './components/Layout/WorkbenchLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DevLab } from './devlab/DevLab';
import { devLabScenarios } from './devlab/scenarios';
import { useEffect, useState } from 'react';
import { projectService } from './lib/projectService';

type ViewMode3D = 'shadedWithEdges' | 'wireframe' | 'shaded';

function AppContent({ isDevLab }: { isDevLab: boolean }) {
  const { code, viewMode, viewMode3D, sidePanelVisible, showSketches, setCode, setViewMode, setViewMode3D } = useWorkbench();
  const [isLoaded, setIsLoaded] = useState(false);

  // Auto-load on mount
  useEffect(() => {
    const isTest = typeof window !== 'undefined' && (window.navigator.webdriver || window.location.search.includes('test=true'));

    if (isDevLab || isTest) {
      setTimeout(() => setIsLoaded(true), 0);
      return;
    }

    const savedProject = projectService.loadFromLocalStorage();
    if (savedProject) {
      setCode(savedProject.code);
      if (savedProject.viewState) {
        setViewMode(savedProject.viewState.viewMode);
        setViewMode3D(savedProject.viewState.viewMode3D as ViewMode3D);
      }
    }
    setTimeout(() => setIsLoaded(true), 0);
  }, [isDevLab, setCode, setViewMode, setViewMode3D]);

  // Auto-save on changes
  useEffect(() => {
    if (!isLoaded || isDevLab) return;

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
