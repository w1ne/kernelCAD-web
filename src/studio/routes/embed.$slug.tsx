// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * /embed/$slug — a chrome-free embed of a public model's 3D viewer, for iframing
 * from other products (e.g. proto.cat's device-page CAD tab) WITHOUT a second
 * login and WITHOUT the Studio editor chrome.
 *
 * It reuses `FunnelViewer` — the same purpose-built "render geometry without the
 * full Studio shell" wrapper the anonymous-generation funnel uses: a bare 3D
 * canvas that auto-executes the model code and frames it, with no toolbar, no
 * inspector rail, no agent connect, and no auth UI. (Rendering the full `App`
 * even in viewerMode pulls in the toolbar + Inspector + Run/Brush/Section — the
 * editor, not a viewer.)
 *
 * Models load anonymously by slug (capability-based): `fetchProjectBySlug`
 * returns public/`public_unlisted` rows with no auth. Private models resolve to
 * null → "Not available".
 *
 * Ready means the model is *displayed* (nonempty geometry + camera fitted +
 * first frame), not merely that source finished downloading. iframe `load` is
 * not enough.
 *
 * What a visitor sees (EmbedFrame): the project's stored render as a poster
 * from first paint, one progress line, then a fade to the live canvas. The
 * attribution and Remix links sit in a footer under the canvas, never over
 * the model. `?theme=light|dark` pins the colours; without it the embed
 * follows the host's `prefers-color-scheme`.
 */
import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import { FunnelViewer, type FunnelViewerPhase } from '../../funnel/components/FunnelViewer';
import { fetchProjectBySlug, fetchProjectRevisionBySlug } from '../../funnel/lib/apiClient';
import StudioApp from '../App';
import { Button } from '../../ui';
import { StudioConfigProvider } from '../config/StudioConfigContext';
import { EmbedAttributionBar, MadeWithKernelcad } from '../components/MadeWithKernelcad';
import { StudioModelCustomizer } from '../customizer/StudioModelCustomizer';
import {
  EMBED_CANVAS_BG,
  embedCustomize,
  embedPosterUrl,
  embedPresentationMode,
  embedRevision,
  embedTheme,
  ensureUsableStorage,
  loadEmbedCode,
  resolveEmbedTheme,
  revisionPinnedMeshUrl,
  type EmbedTheme,
} from './-embedConfig';

// Runs before the first render (the route tree imports every route module).
// Only on the embed itself: other pages keep the browser's storage behaviour.
if (typeof window !== 'undefined' && window.location.pathname.startsWith('/embed/')) {
  ensureUsableStorage();
}

/** Bound source fetches so a hung API cannot pin the outer ChatGPT overlay forever. */
const SOURCE_FETCH_TIMEOUT_MS = 30_000;

/** No-progress watchdog for the embed page itself (source + viewer). */
/** Must outlive FunnelViewer MESH_PENDING_BUDGET (90s) so building meshes can land. */
const EMBED_NO_PROGRESS_TIMEOUT_MS = 100_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms / 1000}s.`));
    }, ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        window.clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/** Parent (ChatGPT widget) status — covers EVERY embed branch, including EmbedPending. */
function postEmbedStatus(args: {
  status: string;
  revision?: number | null;
  instanceId?: string;
  detail?: string | null;
  geometryNonempty?: boolean;
  cameraFitted?: boolean;
  framePresented?: boolean;
}) {
  if (typeof window === 'undefined' || window.parent === window) return;
  window.parent.postMessage({
    source: 'kernelcad-embed',
    type: 'kernelcad.viewer-status',
    status: args.status,
    revision: args.revision ?? undefined,
    instanceId: args.instanceId,
    detail: args.detail ?? undefined,
    geometryNonempty: args.geometryNonempty === true,
    cameraFitted: args.cameraFitted === true,
    framePresented: args.framePresented === true,
  }, '*');
}

function embedMeshUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length === 0) return undefined;
  if (value.startsWith('https://')) return value;
  // Loopback is for the local browser test. Production artifacts are https.
  if (value.startsWith('http://127.0.0.1') || value.startsWith('http://localhost')) return value;
  return undefined;
}

export const Route = createFileRoute('/embed/$slug')({
  validateSearch: (search: Record<string, unknown>) => ({
    mode: embedPresentationMode(search.mode),
    revision: embedRevision(search.revision),
    /** Widget instance echoed on the asynchronous display acknowledgement. */
    instance: typeof search.instance === 'string' && search.instance.length > 0 ? search.instance : undefined,
    /** Revision-matched mesh artifact. When set, the viewer loads it instead of re-executing CAD. */
    meshUrl: embedMeshUrl(search.meshUrl),
    /** CDN transforms-only animation bake for in-widget Play/scrub. */
    animUrl: embedMeshUrl(search.animUrl),
    /** Opt-in model customizer (`?customize=1`). */
    customize: embedCustomize(search.customize),
    /** `?theme=light|dark`; absent follows the host's colour-scheme preference. */
    theme: embedTheme(search.theme),
  }),
  component: EmbedPage,
});

type EmbedUiPhase =
  | 'loading_source'
  | 'project_saved'
  | 'building_geometry'
  | 'loading_mesh'
  | 'model_displayed'
  | 'missing'
  | 'build_failed'
  | 'viewer_failed'
  | 'source_error'
  | 'timed_out';

function useEmbedSource(slug: string, revision: number | null | undefined, retryKey: number) {
  const sourceKey = `${slug}\u0000${revision === undefined ? 'current' : revision === null ? 'invalid' : revision}`;
  const [code, setCode] = useState<string | null>(null);
  const [loadedSourceKey, setLoadedSourceKey] = useState<string | null>(null);
  const [sourceState, setSourceState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    // `sourceState` starts at 'loading'; the fetch resolves it. No sync setState in body.
    let disposed = false;
    const source = loadEmbedCode(revision, {
      loadCurrent: () => withTimeout(
        fetchProjectBySlug(slug).then((project) => project?.current_code ?? null),
        SOURCE_FETCH_TIMEOUT_MS,
        'Source fetch',
      ),
      loadRevision: (version) => withTimeout(
        fetchProjectRevisionBySlug(slug, version).then((saved) => saved.code),
        SOURCE_FETCH_TIMEOUT_MS,
        'Revision fetch',
      ),
    });
    source
      .then((sourceCode) => {
        if (disposed) return;
        if (sourceCode) {
          setCode(sourceCode);
          setLoadedSourceKey(sourceKey);
          setSourceState('ready');
        } else {
          setLoadedSourceKey(sourceKey);
          setSourceState('missing');
        }
      })
      .catch((e) => {
        if (disposed) return;
        // Requested release revisions fail closed: never substitute the live model
        // when the revision endpoint is unavailable or refuses access.
        if (revision !== undefined) {
          setLoadedSourceKey(sourceKey);
          setSourceState('missing');
          return;
        }
        setLoadedSourceKey(sourceKey);
        setErr(String(e));
        setSourceState('error');
      });
    return () => { disposed = true; };
  }, [slug, revision, sourceKey, retryKey]);

  const resetSource = () => {
    setErr(null);
    setSourceState('loading');
    setLoadedSourceKey(null);
  };

  return { code, sourceSettled: loadedSourceKey === sourceKey, sourceState, err, resetSource };
}

function useEmbedUiPhase(args: {
  revision: number | null | undefined;
  sourceSettled: boolean;
  sourceState: 'loading' | 'ready' | 'missing' | 'error';
  viewerPhase: FunnelViewerPhase | null;
  hasMesh: boolean;
  timedOut: boolean;
  err: string | null;
  viewerDetail: string | null;
}): { uiPhase: EmbedUiPhase; statusMessage: string | null; canRetry: boolean } {
  let uiPhase = deriveEmbedUiPhase(args);
  if (args.timedOut && uiPhase !== 'model_displayed') uiPhase = 'timed_out';
  return {
    uiPhase,
    statusMessage: embedStatusMessage(uiPhase, args.err, args.viewerDetail),
    canRetry: canRetryEmbed(uiPhase),
  };
}

/** Post every embed phase to the ChatGPT parent — including EmbedPending. */
function useEmbedParentStatus(
  uiPhase: EmbedUiPhase,
  statusMessage: string | null,
  revision: number | null | undefined,
  instanceId: string | undefined,
) {
  useEffect(() => {
    const failed =
      uiPhase === 'missing'
      || uiPhase === 'source_error'
      || uiPhase === 'build_failed'
      || uiPhase === 'viewer_failed'
      || uiPhase === 'timed_out';
    const displayed = uiPhase === 'model_displayed';
    postEmbedStatus({
      status: displayed ? 'model_displayed' : failed ? 'error' : 'loading',
      revision: typeof revision === 'number' ? revision : null,
      instanceId,
      detail: statusMessage,
      geometryNonempty: displayed,
      cameraFitted: displayed,
      framePresented: displayed,
    });
  }, [uiPhase, statusMessage, revision, instanceId]);
}

/** No-progress timeout — NEVER converts to displayed. */
function useEmbedNoProgressTimeout(
  uiPhase: EmbedUiPhase,
  retryKey: number,
  setTimedOut: (v: boolean) => void,
) {
  useEffect(() => {
    if (uiPhase === 'model_displayed' || uiPhase === 'missing' || uiPhase === 'source_error'
      || uiPhase === 'build_failed' || uiPhase === 'viewer_failed' || uiPhase === 'timed_out') {
      return undefined;
    }
    const timer = window.setTimeout(() => setTimedOut(true), EMBED_NO_PROGRESS_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [uiPhase, retryKey, setTimedOut]);
}

function EmbedPage() {
  const { slug } = Route.useParams();
  const { mode, revision, meshUrl: rawMeshUrl, instance, animUrl: rawAnimUrl, customize, theme: pinnedTheme } = Route.useSearch();
  // A customizable embed builds from source: a stored mesh has no parameters.
  const meshUrl = customize ? undefined : revisionPinnedMeshUrl(rawMeshUrl, slug, revision);
  const customizer = customize ? <StudioModelCustomizer slug={slug} /> : undefined;
  const animUrl = rawAnimUrl;
  const theme = resolveEmbedTheme(pinnedTheme, usePrefersDark());
  const [viewerPhase, setViewerPhase] = useState<FunnelViewerPhase | null>(null);
  const [viewerDetail, setViewerDetail] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  /** The retry generation that has shown a model. The poster never covers it again. */
  const [displayedFor, setDisplayedFor] = useState<number | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const { code, sourceSettled, sourceState, err, resetSource } = useEmbedSource(slug, revision, retryKey);

  const onPhaseChange = useCallback((phase: FunnelViewerPhase, detail?: string | null) => {
    setViewerPhase(phase);
    setViewerDetail(detail ?? null);
    if (phase === 'model_displayed') setDisplayedFor(retryKey);
  }, [retryKey]);

  const { uiPhase, statusMessage, canRetry } = useEmbedUiPhase({
    revision,
    sourceSettled,
    sourceState,
    viewerPhase,
    hasMesh: Boolean(meshUrl),
    timedOut,
    err,
    viewerDetail,
  });
  useEmbedParentStatus(uiPhase, statusMessage, revision, instance);
  useEmbedNoProgressTimeout(uiPhase, retryKey, setTimedOut);

  const retryViewer = () => {
    setViewerPhase(null);
    setViewerDetail(null);
    setTimedOut(false);
    setRetryKey((k) => k + 1);
  };
  const retrySource = () => {
    resetSource();
    setTimedOut(false);
    setRetryKey((k) => k + 1);
  };

  const viewerReady = embedViewerReady({ revision, sourceSettled, sourceState, code, meshUrl });
  const showViewer = viewerReady && mode !== 'studio';

  if (viewerReady && mode === 'studio' && sourceSettled && code) {
    return (
      <StudioConfigProvider value={{ showHeader: false, enableAgentRail: false, enableConnect: false }}>
        <StudioApp initialCode={code} viewerMode viewportOverlay={customizer} />
        {/* Bottom-right: the Studio viewport's bottom-left holds the parameter chips. */}
        <MadeWithKernelcad surface="embed" className="fixed bottom-2 right-2" remixSlug={slug} />
      </StudioConfigProvider>
    );
  }

  return (
    <EmbedFrame
      slug={slug}
      revision={revision}
      theme={theme}
      uiPhase={uiPhase}
      statusMessage={statusMessage}
      canRetry={canRetry}
      onRetry={showViewer ? retryViewer : retrySource}
      modelShown={displayedFor === retryKey}
      retryKey={retryKey}
    >
      {showViewer ? (
        <FunnelViewer
          code={code ?? ''}
          meshUrl={meshUrl}
          animUrl={animUrl}
          revision={typeof revision === 'number' ? revision : null}
          instanceId={instance}
          resetKey={retryKey}
          onPhaseChange={onPhaseChange}
          statusOverlay={false}
          background={theme}
          overlay={customizerOverlay(customizer)}
          feedback={{ surface: instance ? 'chatgpt' : 'embed', slug }}
          markFix={instance ? { slug, instanceId: instance, revision: typeof revision === 'number' ? revision : null } : undefined}
        />
      ) : null}
    </EmbedFrame>
  );
}

/** Source or a stored mesh is in hand, so a viewer can mount. */
function embedViewerReady(args: {
  revision: number | null | undefined;
  sourceSettled: boolean;
  sourceState: 'loading' | 'ready' | 'missing' | 'error';
  code: string | null;
  meshUrl: string | undefined;
}): boolean {
  if (args.revision === null) return false;
  if (args.meshUrl) return true;
  return args.sourceSettled && args.sourceState === 'ready' && Boolean(args.code);
}

/** The customizer panel, placed top-right over the canvas. */
function customizerOverlay(customizer: ReactNode | undefined): ReactNode | undefined {
  if (!customizer) return undefined;
  return (
    <div className="absolute top-2 right-2 bottom-2 flex flex-col items-end pointer-events-none">
      {customizer}
    </div>
  );
}

/** Derive the embed's UI phase from the source-load state and viewer phase. */
function deriveEmbedUiPhase(args: {
  revision: number | null | undefined;
  sourceSettled: boolean;
  sourceState: 'loading' | 'ready' | 'missing' | 'error';
  viewerPhase: FunnelViewerPhase | null;
  hasMesh: boolean;
}): EmbedUiPhase {
  const { revision, sourceSettled, sourceState, viewerPhase, hasMesh } = args;
  if (revision === null) return 'missing';
  // A loaded mesh is the model. A missing source row must not hide it.
  if (viewerPhase === 'model_displayed') return 'model_displayed';
  if (viewerPhase === 'build_failed') return 'build_failed';
  if (viewerPhase === 'viewer_failed') return 'viewer_failed';
  if (viewerPhase === 'building_geometry') return 'building_geometry';
  if (viewerPhase === 'loading_mesh') return 'loading_mesh';
  if (hasMesh && (sourceState !== 'ready' || !viewerPhase)) return 'loading_mesh';
  if (!sourceSettled || sourceState === 'loading') return 'loading_source';
  if (sourceState === 'missing') return 'missing';
  if (sourceState === 'error') return 'source_error';
  if (!viewerPhase) return 'project_saved';
  return 'project_saved';
}

/** Status line for the current UI phase; `null` when the phase is silent. */
function embedStatusMessage(
  uiPhase: EmbedUiPhase,
  err: string | null,
  viewerDetail: string | null,
): string | null {
  switch (uiPhase) {
    case 'loading_source': return 'Loading…';
    case 'project_saved': return 'Building geometry…';
    case 'building_geometry': return 'Building geometry…';
    case 'loading_mesh': return 'Loading mesh…';
    case 'model_displayed': return null;
    case 'missing': return 'Model not available.';
    case 'source_error': return `Failed to load: ${err}`;
    case 'build_failed': return `Build failed: ${viewerDetail ?? 'unknown error'}`;
    case 'viewer_failed': return `Viewer failed: ${viewerDetail ?? 'unknown error'}`;
    case 'timed_out': return `Timed out after ${EMBED_NO_PROGRESS_TIMEOUT_MS / 1000}s${viewerDetail ? `: ${viewerDetail}` : ''}.`;
    default: return 'Loading…';
  }
}

/** Whether the current phase offers a Retry affordance. */
function canRetryEmbed(uiPhase: EmbedUiPhase): boolean {
  return uiPhase === 'build_failed'
    || uiPhase === 'viewer_failed'
    || uiPhase === 'source_error'
    || uiPhase === 'timed_out';
}


const PREFERS_DARK = '(prefers-color-scheme: dark)';

function subscribePrefersDark(onChange: () => void): () => void {
  const query = typeof window.matchMedia === 'function' ? window.matchMedia(PREFERS_DARK) : null;
  if (!query) return () => {};
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/** The host page's colour-scheme preference. No `matchMedia`: dark, the embed's historical look. */
function usePrefersDark(): boolean {
  return useSyncExternalStore(
    subscribePrefersDark,
    () => (typeof window.matchMedia === 'function' ? window.matchMedia(PREFERS_DARK).matches : true),
    () => true,
  );
}

function metaContent(property: string): string | null {
  if (typeof document === 'undefined') return null;
  return document.querySelector(`meta[property="${property}"]`)?.getAttribute('content') ?? null;
}

/** Whole seconds since `active` became true for this `resetKey`; 0 while inactive. */
function useElapsedSeconds(active: boolean, resetKey: number): number {
  const [tick, setTick] = useState({ key: resetKey, seconds: 0 });
  useEffect(() => {
    if (!active) return undefined;
    const started = Date.now();
    const timer = window.setInterval(() => {
      setTick({ key: resetKey, seconds: Math.floor((Date.now() - started) / 1000) });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [active, resetKey]);
  return active && tick.key === resetKey ? tick.seconds : 0;
}

/** Show the elapsed time only once a wait is long enough to wonder about. */
const ELAPSED_VISIBLE_AFTER_S = 3;

function isLoadingPhase(uiPhase: EmbedUiPhase): boolean {
  return uiPhase === 'loading_source'
    || uiPhase === 'project_saved'
    || uiPhase === 'building_geometry'
    || uiPhase === 'loading_mesh';
}

/**
 * Every viewer-mode embed state draws in this frame: the canvas area with the
 * poster and one status line over it, and the attribution bar under it.
 *
 * - Loading: the stored render (poster) fills the canvas area from first
 *   paint, with one small progress line at the bottom. Without a poster, the
 *   line sits in the centre of a plain backdrop.
 * - Displayed: the poster fades out over the live canvas. It does not come
 *   back for a later rebuild (the customizer): the model stays in view.
 * - Failed: no poster (it would contradict the error); the message and a
 *   Retry button sit in the centre.
 */
function EmbedFrame(props: {
  slug: string;
  revision: number | null | undefined;
  theme: EmbedTheme;
  uiPhase: EmbedUiPhase;
  statusMessage: string | null;
  canRetry: boolean;
  onRetry: () => void;
  /** The live canvas has shown the model for the current retry. */
  modelShown: boolean;
  retryKey: number;
  children?: ReactNode;
}) {
  const { uiPhase, modelShown } = props;
  const loading = isLoadingPhase(uiPhase);
  const poster = useEmbedPoster(props.slug, props.revision);
  const showPoster = poster.usable && (loading || modelShown);
  const centred = !modelShown && !(showPoster && poster.loaded && loading);
  const elapsed = useElapsedSeconds(loading && !modelShown, props.retryKey);

  return (
    <main
      className="fixed inset-0 flex flex-col overflow-hidden bg-[var(--embed-canvas)] font-sans text-fg"
      style={{ '--embed-canvas': EMBED_CANVAS_BG[props.theme] } as CSSProperties}
      data-theme={props.theme}
      data-embed-phase={uiPhase}
      data-embed-theme={props.theme}
      aria-busy={loading && !modelShown}
    >
      {/* The view cube is 144 px: in a small frame it covers the model. */}
      <div className="relative min-h-0 flex-1 max-[479px]:[&_[data-testid=view-gizmo]]:hidden [@media(max-height:359px)]:[&_[data-testid=view-gizmo]]:hidden">
        {props.children}
        <EmbedCover visible={!modelShown} poster={showPoster ? poster : null} />
        {props.statusMessage ? (
          <EmbedStatus
            message={props.statusMessage}
            loading={loading}
            centred={centred}
            elapsed={elapsed}
            canRetry={props.canRetry}
            onRetry={props.onRetry}
          />
        ) : null}
      </div>
      <EmbedAttributionBar remixSlug={uiPhase === 'missing' ? undefined : props.slug} />
    </main>
  );
}

interface EmbedPoster {
  url: string;
  loaded: boolean;
  onLoad: () => void;
  onError: () => void;
}

/** This project's stored render and its load state. `usable` is false when
 *  there is none or it failed to load. */
function useEmbedPoster(slug: string, revision: number | null | undefined): EmbedPoster & { usable: boolean } {
  const url = useMemo(() => embedPosterUrl(slug, revision, metaContent('og:image')), [slug, revision]);
  const [state, setState] = useState<{ url: string; state: 'loaded' | 'failed' } | null>(null);
  const current = url !== undefined && state?.url === url ? state.state : null;
  return {
    url: url ?? '',
    usable: url !== undefined && current !== 'failed',
    loaded: current === 'loaded',
    onLoad: () => { if (url) setState({ url, state: 'loaded' }); },
    onError: () => { if (url) setState({ url, state: 'failed' }); },
  };
}

/** Backdrop over the canvas until the model shows, with the poster on it. */
function EmbedCover(props: { visible: boolean; poster: EmbedPoster | null }) {
  const { poster } = props;
  return (
    // Above the viewer's own overlays (view cube z-20).
    <div
      data-testid="embed-cover"
      data-visible={props.visible ? 'true' : 'false'}
      aria-hidden="true"
      className={`absolute inset-0 z-30 bg-[var(--embed-canvas)] motion-safe:transition-opacity motion-safe:duration-[250ms] ${props.visible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
    >
      {poster ? (
        <img
          data-testid="embed-poster"
          src={poster.url}
          alt=""
          decoding="async"
          fetchPriority="high"
          draggable={false}
          className={`h-full w-full object-contain ${poster.loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={poster.onLoad}
          onError={poster.onError}
        />
      ) : null}
    </div>
  );
}

/** The embed's one status line: progress while loading, the error and Retry after a failure. */
function EmbedStatus(props: {
  message: string;
  loading: boolean;
  centred: boolean;
  elapsed: number;
  canRetry: boolean;
  onRetry: () => void;
}) {
  const place = props.centred
    ? 'inset-0 grid place-items-center p-4'
    : 'inset-x-0 bottom-2 flex justify-center px-2';
  return (
    <div
      className={`pointer-events-none absolute z-40 ${place}`}
      data-testid="embed-status"
      data-placement={props.centred ? 'centre' : 'bottom'}
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto flex max-w-full flex-col items-center gap-2">
        <div className="flex max-w-full items-center gap-2 rounded-full bg-surface-1/90 px-3 py-1.5 text-xs leading-4 shadow-sm">
          {props.loading ? (
            <span
              aria-hidden="true"
              className="h-3 w-3 shrink-0 rounded-full border-2 border-fg-2 border-t-transparent motion-safe:animate-spin"
            />
          ) : null}
          <p className={`min-w-0 ${props.loading ? 'truncate' : 'line-clamp-3 break-words'} ${props.canRetry ? 'text-danger' : 'text-fg'}`}>
            {props.message}
          </p>
          {props.loading && props.elapsed >= ELAPSED_VISIBLE_AFTER_S ? (
            <span data-testid="embed-elapsed" className="shrink-0 font-mono tabular-nums text-fg-2">
              {props.elapsed} s
            </span>
          ) : null}
        </div>
        {props.canRetry ? (
          <Button variant="secondary" size="sm" onClick={props.onRetry}>
            Retry
          </Button>
        ) : null}
      </div>
    </div>
  );
}
