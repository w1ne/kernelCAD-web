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
 */
import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useEffect, useState } from 'react';
import { FunnelViewer, type FunnelViewerPhase } from '../../funnel/components/FunnelViewer';
import { fetchProjectBySlug, fetchProjectRevisionBySlug } from '../../funnel/lib/apiClient';
import StudioApp from '../App';
import { StudioConfigProvider } from '../config/StudioConfigContext';
import { embedPresentationMode, embedRevision, loadEmbedCode, revisionPinnedMeshUrl } from './-embedConfig';

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
  const { mode, revision, meshUrl: rawMeshUrl, instance, animUrl: rawAnimUrl} = Route.useSearch();
  const meshUrl = revisionPinnedMeshUrl(rawMeshUrl, slug, revision);
  const animUrl = rawAnimUrl;
  const [viewerPhase, setViewerPhase] = useState<FunnelViewerPhase | null>(null);
  const [viewerDetail, setViewerDetail] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const { code, sourceSettled, sourceState, err, resetSource } = useEmbedSource(slug, revision, retryKey);

  const onPhaseChange = useCallback((phase: FunnelViewerPhase, detail?: string | null) => {
    setViewerPhase(phase);
    setViewerDetail(detail ?? null);
  }, []);

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

  const meshReady = Boolean(meshUrl) && revision !== null;
  if (revision !== null && ((sourceSettled && sourceState === 'ready' && code) || meshReady)) {
    if (mode === 'studio') {
      if (!(sourceSettled && code)) {
        return (
          <EmbedPending
            uiPhase={uiPhase}
            statusMessage={statusMessage}
            canRetry={canRetry}
            onRetry={retrySource}
          />
        );
      }
      return (
        <StudioConfigProvider value={{ showHeader: false, enableAgentRail: false, enableConnect: false }}>
          <StudioApp initialCode={code} viewerMode />
        </StudioConfigProvider>
      );
    }
    return (
      <EmbedViewerSurface
        code={code ?? ''}
        meshUrl={meshUrl}
        animUrl={animUrl}
        revision={typeof revision === 'number' ? revision : null}
        instanceId={instance}
        retryKey={retryKey}
        uiPhase={uiPhase}
        statusMessage={statusMessage}
        canRetry={canRetry}
        onPhaseChange={onPhaseChange}
        onRetry={retryViewer}
      />
    );
  }

  return (
    <EmbedPending
      uiPhase={uiPhase}
      statusMessage={statusMessage}
      canRetry={canRetry}
      onRetry={retrySource}
    />
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
    case 'project_saved': return 'Project saved. Building geometry…';
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

/** Ready-model viewer branch: the chrome-free FunnelViewer plus its status
 *  overlay and retry affordance. */
function EmbedViewerSurface(props: {
  code: string;
  meshUrl: string | undefined;
  animUrl: string | undefined;
  revision: number | null;
  instanceId?: string;
  retryKey: number;
  uiPhase: EmbedUiPhase;
  statusMessage: string | null;
  canRetry: boolean;
  onPhaseChange: (phase: FunnelViewerPhase, detail?: string | null) => void;
  onRetry: () => void;
}) {
  return (
    <div className="fixed inset-0" data-embed-phase={props.uiPhase}>
      <FunnelViewer
        code={props.code}
        meshUrl={props.meshUrl}
        animUrl={props.animUrl}
        revision={props.revision}
        instanceId={props.instanceId}
        resetKey={props.retryKey}
        onPhaseChange={props.onPhaseChange}
      />
      {props.statusMessage ? (
        <div
          className="absolute inset-x-0 bottom-0 p-4 flex flex-col items-center gap-2 pointer-events-none"
          data-testid="embed-status"
          role="status"
          aria-live="polite"
        >
          <p className="text-ink-faint font-mono text-xs bg-vellum/90 px-3 py-1.5 rounded">
            {props.statusMessage}
          </p>
          {props.canRetry ? (
            <button
              type="button"
              className="pointer-events-auto font-mono text-xs underline text-ink-faint"
              onClick={props.onRetry}
            >
              Retry
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Not-yet-ready branch: centered status line and retry affordance. */
function EmbedPending(props: {
  uiPhase: EmbedUiPhase;
  statusMessage: string | null;
  canRetry: boolean;
  onRetry: () => void;
}) {
  return (
    <main className="fixed inset-0 bg-vellum font-sans grid place-items-center p-8" data-embed-phase={props.uiPhase}>
      <div className="flex flex-col items-center gap-3">
        <p className="text-ink-faint font-mono text-sm" data-testid="embed-status">{props.statusMessage ?? 'Loading…'}</p>
        {props.canRetry ? (
          <button
            type="button"
            className="font-mono text-xs underline text-ink-faint"
            onClick={props.onRetry}
          >
            Retry
          </button>
        ) : null}
      </div>
    </main>
  );
}
