import { WorkbenchProvider, useWorkbench } from './context/WorkbenchContext';
import { StudioShell } from './StudioShell';
import { shellStore } from './store/shellStore';
import { useShellStore } from './store/useShellStore';
import { ErrorBoundary } from './components/ErrorBoundary';
import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { parseCode } from '../shared/codeGeneration/ast';
import { StudioChromeProvider } from './context/StudioChromeContext';

const LazyDevLab = lazy(() =>
  import('./devlab/DevLab').then(({ DevLab }) => ({
    default: DevLab,
  })),
);

function isCodeParsable(code: string): boolean {
  try {
    parseCode(code);
    return true;
  } catch {
    return false;
  }
}

import { useProject } from './context/ProjectContext';
import { loadGalleryScriptSource, loadStudioScriptSource } from './scriptSource';

function readScriptParam(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('script');
}

function readGalleryParam(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('gallery');
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
  const galleryParam = readGalleryParam();

  useEffect(() => {
    if (isDevLab || (!scriptParam && !galleryParam)) return;

    let cancelled = false;
    const sourcePromise = galleryParam
      ? loadGalleryScriptSource(galleryParam)
      : loadStudioScriptSource(scriptParam as string);

    sourcePromise
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
  }, [galleryParam, isDevLab, scriptParam, setCode, setViewMode]);

  // Sync active project -> workbench state
  useEffect(() => {
    if (scriptParam || galleryParam) return;
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
  }, [activeProject, isDevLab, setCode, setViewMode, setViewMode3D, isInitialized, code, viewMode3D, scriptParam, galleryParam]);

  // Auto-save: workbench state -> active project
  useEffect(() => {
    if (scriptParam || galleryParam) return;
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
  }, [code, viewMode, viewMode3D, sidePanelVisible, showSketches, agentRailOpen, isDevLab, isInitialized, activeProject, saveActiveProject, scriptParam, galleryParam]);

  return isDevLab ? (
    <Suspense fallback={null}>
      <LazyDevLab />
    </Suspense>
  ) : (
    <StudioShell />
  );
}

interface AppProps {
  /** Seed the workbench with this code on first mount. Used by the funnel
   * routes (/g/$genId, /p/$slug) to open generated/saved artifacts inside
   * the full Studio shell rather than a stripped viewer. */
  initialCode?: string;
  /** Funnel-route chrome injected into the Studio Header (left of toolbar).
   * Use for prompt context or saved-project metadata pills. */
  headerLeft?: ReactNode;
  /** Funnel-route chrome injected into the Studio Header (right cluster).
   * Use for Save / Sign-in / per-project actions. */
  headerRight?: ReactNode;
}

function AppProviders({
  initialCode,
  isDevLab,
  headerLeft,
  headerRight,
}: AppProps & { isDevLab: boolean }) {
  return (
    <WorkbenchProvider initialCode={initialCode}>
      <StudioChromeProvider value={{ headerLeft, headerRight }}>
        <ErrorBoundary>
          <AppContent isDevLab={isDevLab} />
        </ErrorBoundary>
      </StudioChromeProvider>
    </WorkbenchProvider>
  );
}

function DevLabApp({ headerLeft, headerRight }: Pick<AppProps, 'headerLeft' | 'headerRight'>) {
  const [initialCode, setInitialCode] = useState<string | undefined>();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    import('./devlab/scenarios')
      .then(({ devLabScenarios }) => {
        if (cancelled) return;
        setInitialCode(devLabScenarios[0]?.code);
      })
      .finally(() => {
        if (!cancelled) setIsLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!isLoaded) return null;

  return (
    <AppProviders
      initialCode={initialCode}
      isDevLab={true}
      headerLeft={headerLeft}
      headerRight={headerRight}
    />
  );
}

export default function App({ initialCode: initialCodeProp, headerLeft, headerRight }: AppProps = {}) {
  const isDevLab = typeof window !== 'undefined' && window.location.pathname.startsWith('/dev-lab');

  if (isDevLab && initialCodeProp === undefined) {
    return <DevLabApp headerLeft={headerLeft} headerRight={headerRight} />;
  }

  return (
    <AppProviders
      initialCode={initialCodeProp}
      isDevLab={isDevLab}
      headerLeft={headerLeft}
      headerRight={headerRight}
    />
  );
}
