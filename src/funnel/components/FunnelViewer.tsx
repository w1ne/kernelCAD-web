// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * FunnelViewer — wraps the existing Viewer inside a self-contained provider
 * stack so anonymous-generation pages can render 3D geometry without the
 * full Studio shell.
 *
 * Integration pattern: WorkbenchProvider accepts `initialCode`; GeometryProvider
 * auto-executes whenever `code` changes; inner component reads geometry from
 * context and feeds Viewer with the same props Viewport.tsx uses.
 *
 * Embed hosts get explicit build/display status so an empty canvas is never
 * presented as "ready" (iframe load alone is not enough).
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Viewer from '../../studio/components/Viewer';
import { hasNonemptyGeometry } from '../../studio/components/viewer/hasNonemptyGeometry';
import { WorkbenchProvider, useWorkbench } from '../../studio/context/WorkbenchContext';
import type { GeometryResult } from '../../shared/worker/geometryEngine';
import type { ViewportBackground } from '../../shared/types/viewMode';
import {
  geometriesFromArtifact,
  parseMeshArtifact,
  type MeshArtifactBounds,
} from '../meshArtifact';
import {
  meshArtifactLatestUrl,
  shouldAcceptLatestMeshFallback,
} from '../meshArtifactFallback';
import { animArtifactUrlFromMeshUrl } from '../animArtifactUrl';
import { EmbedAnimationOverlay } from './EmbedAnimationOverlay';
import type { MeshDimensionsInfo } from '../../studio/components/viewer/dimensions/boundsDimensions';
import { FeedbackLauncher } from '../../studio/components/Layout/FeedbackLauncher';
import type { FeedbackContext, FeedbackPayload } from '../../studio/components/Layout/feedbackApi';

export type FunnelViewerPhase =
  | 'building_geometry'
  | 'loading_mesh'
  | 'model_displayed'
  | 'build_failed'
  | 'viewer_failed';

export interface FunnelViewerProps {
  code: string;
  /** Revision-matched mesh artifact. When it loads, source is not evaluated. */
  meshUrl?: string | null;
  /** Project revision this viewer is showing. Display acks carry it. */
  revision?: number | null;
  /** Widget instance id from the host, echoed on the display ack. */
  instanceId?: string;
  onPhaseChange?: (phase: FunnelViewerPhase, detail?: string | null) => void;
  /** Bump to reload the viewer or refetch the mesh. Does not change CAD source. */
  resetKey?: number | string;
  /** CDN animation-bake URL (transforms-only). When set (or derivable from meshUrl),
   *  shows Play/scrub chrome that drives part transforms client-side. */
  animUrl?: string | null;
  /** Drawn over the canvas inside the source viewer's workbench providers
   *  (the embed's model customizer). Source execution only. It reports its
   *  own build errors, so a failed re-build over a displayed model keeps the
   *  last good geometry visible instead of the full-canvas failure notice. */
  overlay?: ReactNode;
  /** Draw the viewer's own centred status text. The embed turns it off: it
   *  shows one status line of its own over a poster. Phases are still
   *  reported through `onPhaseChange`. Default true. */
  statusOverlay?: boolean;
  /** Canvas background; overrides the stored Studio preference. */
  background?: ViewportBackground;
  /** Adds a small "Feedback" button over the canvas that sends this context
   *  with the message. Off (no button) when unset. */
  feedback?: FeedbackContext;
  /** Override the feedback network call (tests). */
  submitFeedback?: (payload: FeedbackPayload) => Promise<void>;
}

/** Props FunnelViewer passes down to the inner viewer unchanged. */
type InnerDisplayProps = Pick<FunnelViewerProps, 'statusOverlay' | 'background'> & {
  /** Stored artifact's dimensions + bounds (mesh path only). */
  meshDimensions?: MeshDimensionsInfo | null;
};

function funnelStatusLabel(phase: FunnelViewerPhase, detail: string | null): string | null {
  switch (phase) {
    case 'building_geometry': return 'Building geometry…';
    case 'loading_mesh': return 'Loading mesh…';
    case 'build_failed': return `Build failed: ${detail ?? 'unknown error'}`;
    case 'viewer_failed': return `Viewer failed: ${detail ?? 'unknown error'}`;
    default: return null;
  }
}

/** Inner component — must be mounted inside WorkbenchProvider. */
function FunnelViewerInner({
  onPhaseChange,
  revision = null,
  instanceId,
  overlay,
  statusOverlay = true,
  background,
  meshDimensions,
}: InnerDisplayProps & {
  onPhaseChange?: (phase: FunnelViewerPhase, detail?: string | null) => void;
  revision?: number | null;
  instanceId?: string;
  overlay?: ReactNode;
}) {
  const {
    geometries,
    previewGeometries,
    sketchesGeometries,
    showSketches,
    viewMode3D,
    isReady,
    isComputing,
    error,
  } = useWorkbench();

  const [displayReady, setDisplayReady] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [emptyBuildError, setEmptyBuildError] = useState<string | null>(null);

  const nonempty = useMemo(() => hasNonemptyGeometry(geometries), [geometries]);

  const phase: FunnelViewerPhase = useMemo(() => {
    if (viewerError) return 'viewer_failed';
    if (error || emptyBuildError) return 'build_failed';
    if (displayReady && nonempty) return 'model_displayed';
    if (!isReady || (isComputing && !nonempty)) return 'building_geometry';
    if (isComputing || (nonempty && !displayReady)) return 'loading_mesh';
    if (nonempty) return 'loading_mesh';
    return 'building_geometry';
  }, [viewerError, error, emptyBuildError, displayReady, nonempty, isReady, isComputing]);

  const detail = viewerError ?? emptyBuildError ?? error ?? null;

  useEffect(() => {
    onPhaseChange?.(phase, detail);
    if (typeof window === 'undefined' || window.parent === window) return;
    const displayed = phase === 'model_displayed';
    const failed = phase === 'build_failed' || phase === 'viewer_failed';
    window.parent.postMessage({
      source: 'kernelcad-embed',
      type: 'kernelcad.viewer-status',
      status: displayed ? 'model_displayed' : failed ? 'error' : 'loading',
      revision: revision ?? undefined,
      instanceId,
      geometryNonempty: displayed,
      cameraFitted: displayed,
      framePresented: displayed,
      detail,
    }, '*');
  }, [phase, detail, onPhaseChange, revision, instanceId]);

  // Empty successful build (no solid) is a build failure, not a blank "ready" canvas.
  useEffect(() => {
    if (!isComputing && isReady && !error && !nonempty && !viewerError) {
      // Give the auto-run a beat to populate; if still empty after settle, surface failure.
      const t = window.setTimeout(() => {
        if (!hasNonemptyGeometry(geometries) && !error) {
          setEmptyBuildError('Build produced no displayable geometry.');
        }
      }, 800);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [isComputing, isReady, error, nonempty, geometries, viewerError]);

  const onDisplayReady = useCallback(() => {
    setDisplayReady(true);
    setViewerError(null);
    setEmptyBuildError(null);
  }, []);

  // A customizer overlay reports its own build errors; over a displayed
  // model it keeps the last good geometry in view.
  const overlayOwnsError = Boolean(overlay) && phase === 'build_failed' && displayReady && nonempty;
  const statusLabel = overlayOwnsError || !statusOverlay ? null : funnelStatusLabel(phase, detail);

  return (
    <div className="absolute inset-0">
      <Viewer
        geometries={[...geometries]}
        previewGeometries={previewGeometries ?? []}
        sketchesGeometries={sketchesGeometries ?? []}
        showSketches={showSketches ?? false}
        viewMode3D={viewMode3D}
        onDisplayReady={onDisplayReady}
        background={background}
        meshDimensions={meshDimensions}
      />
      {statusLabel ? (
        <div
          className="absolute inset-0 grid place-items-center bg-code-bg/80 pointer-events-none"
          data-testid="funnel-viewer-status"
          role="status"
          aria-live="polite"
        >
          <p className="text-ink-faint font-mono text-sm px-6 text-center">{statusLabel}</p>
        </div>
      ) : null}
      {overlay}
    </div>
  );
}

/**
 * Mount this component with a `code` string — it spins up the provider stack,
 * executes the geometry, and renders the 3D canvas. No Studio chrome is pulled in.
 */
function SourceViewer({
  code,
  onPhaseChange,
  resetKey,
  revision,
  instanceId,
  overlay,
  statusOverlay,
  background,
}: InnerDisplayProps & {
  code: string;
  onPhaseChange?: FunnelViewerProps['onPhaseChange'];
  resetKey: number | string;
  revision?: number | null;
  instanceId?: string;
  overlay?: ReactNode;
}) {
  return (
    <WorkbenchProvider key={`${resetKey}:${code.length}`} initialCode={code}>
      <FunnelViewerInner
        onPhaseChange={onPhaseChange}
        revision={revision}
        instanceId={instanceId}
        overlay={overlay}
        statusOverlay={statusOverlay}
        background={background}
      />
    </WorkbenchProvider>
  );
}

function boundsAttribute(bounds: MeshArtifactBounds): string {
  return `${bounds.min.join(',')},${bounds.max.join(',')}`;
}

interface MeshLoadResult {
  key: string;
  geometries: GeometryResult[] | null;
  bounds: MeshArtifactBounds | null;
  /** Mesh dimensions + bounds for the viewer overlay. */
  meshDimensions?: MeshDimensionsInfo;
  fallback: boolean;
  error: string | null;
}

function meshRequestKey(meshUrl: string, revision: number | null, resetKey: number | string, code: string): string {
  return `${meshUrl}\n${revision ?? ''}\n${String(resetKey)}\n${code}`;
}

function meshHttpError(body: unknown, status: number): string {
  if (body && typeof body === 'object' && 'error' in body) {
    return String((body as { error: unknown }).error);
  }
  return `Mesh request failed (${status}).`;
}

/** Stored artifacts can be multi-MB; keep headroom without inviting OCCT hangs. */
const MESH_FETCH_TIMEOUT_MS = 60_000;
/** Publish returns before OCCT finishes. Keep asking the CDN until the object lands. */
const MESH_PENDING_BUDGET_MS = 90_000;

class MeshHttpError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function meshPending(err: unknown): boolean {
  return err instanceof MeshHttpError && err.status === 404;
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('aborted', 'AbortError'));
    };
    if (signal.aborted) onAbort();
    else signal.addEventListener('abort', onAbort, { once: true });
  });
}

async function fetchRevisionMesh(meshUrl: string, revision: number | null, signal: AbortSignal) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MESH_FETCH_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal.addEventListener('abort', onAbort, { once: true });
  try {
    const response = await fetch(meshUrl, { signal: controller.signal });
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) throw new MeshHttpError(meshHttpError(body, response.status), response.status);
    return parseMeshArtifact(body, revision);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(`Mesh request timed out after ${MESH_FETCH_TIMEOUT_MS / 1000}s.`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', onAbort);
  }
}

async function tryLatestMeshFallback(
  meshUrl: string,
  revision: number | null,
  signal: AbortSignal,
) {
  const latestUrl = meshArtifactLatestUrl(meshUrl);
  if (!latestUrl) return null;
  try {
    // Ignore revision stamp on latest — historical pins may never match.
    const artifact = await fetchRevisionMesh(latestUrl, null, signal);
    if (!shouldAcceptLatestMeshFallback(revision, artifact.revision)) return null;
    return artifact;
  } catch (err) {
    if (meshPending(err)) return null;
    throw err;
  }
}

async function fetchRevisionMeshWhenReady(meshUrl: string, revision: number | null, signal: AbortSignal) {
  const started = Date.now();
  let delay = 400;
  let triedLatest = false;
  for (;;) {
    try {
      return await fetchRevisionMesh(meshUrl, revision, signal);
    } catch (err) {
      if (!meshPending(err)) throw err;
      // One extra CDN GET: if latest is at least as new as the request, the
      // pinned vN was never uploaded (legacy ChatGPT embed). Avoid a 90s poll.
      if (!triedLatest) {
        triedLatest = true;
        const fallback = await tryLatestMeshFallback(meshUrl, revision, signal);
        if (fallback) return fallback;
      }
      if (Date.now() - started >= MESH_PENDING_BUDGET_MS) throw err;
      await sleep(delay, signal);
      delay = Math.min(delay * 2, 4_000);
    }
  }
}

function meshFailure(key: string, err: unknown): MeshLoadResult {
  const message = err instanceof Error ? err.message : String(err);
  // Published revisions advertise meshUrl only when an artifact was persisted.
  // Never silently fall back to browser OCCT (huge models hang / blank ChatGPT).
  return {
    key,
    geometries: null,
    bounds: null,
    fallback: false,
    error: message,
  };
}

function useRevisionMesh(props: FunnelViewerProps): MeshLoadResult | null {
  const { code, meshUrl, revision = null, resetKey = 0 } = props;
  const meshKey = meshUrl ? meshRequestKey(meshUrl, revision, resetKey, code) : '';
  const [meshResult, setMeshResult] = useState<MeshLoadResult | null>(null);

  useEffect(() => {
    if (!meshUrl) return undefined;
    const key = meshKey;
    const ac = new AbortController();
    let cancelled = false;
    void fetchRevisionMeshWhenReady(meshUrl, revision, ac.signal)
      .then((artifact) => {
        if (cancelled) return;
        setMeshResult({
          key,
          geometries: geometriesFromArtifact(artifact),
          bounds: artifact.bounds,
          meshDimensions: { dimensions: artifact.dimensions, bounds: artifact.bounds },
          fallback: false,
          error: null,
        });
      })
      .catch((err: unknown) => {
        if (cancelled || (err instanceof DOMException && err.name === 'AbortError')) return;
        setMeshResult(meshFailure(key, err));
      });
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [meshUrl, meshKey, revision, code]);

  if (!meshResult || meshResult.key !== meshKey) return null;
  return meshResult;
}

function MeshStatus(props: {
  message: string;
  phase?: FunnelViewerPhase;
  revision?: number | null;
  instanceId?: string;
  onPhaseChange?: FunnelViewerProps['onPhaseChange'];
  statusOverlay?: boolean;
}) {
  const { message, revision = null, instanceId, onPhaseChange, statusOverlay = true } = props;
  const phase = props.phase ?? 'viewer_failed';
  useEffect(() => {
    onPhaseChange?.(phase, message);
    if (typeof window === 'undefined' || window.parent === window) return;
    const failed = phase === 'viewer_failed' || phase === 'build_failed';
    window.parent.postMessage({
      source: 'kernelcad-embed',
      type: 'kernelcad.viewer-status',
      status: failed ? 'error' : 'loading',
      revision: revision ?? undefined,
      instanceId,
      detail: message,
    }, '*');
  }, [phase, message, revision, instanceId, onPhaseChange]);

  // The host draws its own status; keep the phase report, drop the text.
  if (!statusOverlay) return <div className="relative w-full h-full" />;
  return (
    <div className="relative w-full h-full bg-code-bg grid place-items-center" data-testid="funnel-viewer-status" role="status">
      <p className="text-ink-faint font-mono text-sm px-6 text-center">{message}</p>
    </div>
  );
}

function LoadedMeshViewer(props: FunnelViewerProps & {
  geometries: GeometryResult[];
  bounds: MeshArtifactBounds;
  meshDimensions?: MeshDimensionsInfo;
}) {
  const resolvedAnimUrl = props.animUrl
    ?? (props.meshUrl ? animArtifactUrlFromMeshUrl(props.meshUrl) : null);

  return (
    <div
      className="relative w-full h-full bg-code-bg"
      data-mesh-url={props.meshUrl ?? undefined}
      data-anim-url={resolvedAnimUrl ?? undefined}
      data-camera-bounds={boundsAttribute(props.bounds)}
      data-source-suspended="true"
    >
      <WorkbenchProvider
        key={`${props.resetKey ?? 0}:mesh`}
        initialCode=""
        suspendSourceExecution
        externalGeometries={props.geometries}
      >
        <FunnelViewerInner
          onPhaseChange={props.onPhaseChange}
          revision={props.revision}
          instanceId={props.instanceId}
          statusOverlay={props.statusOverlay}
          background={props.background}
          meshDimensions={props.meshDimensions}
        />
        {resolvedAnimUrl ? <EmbedAnimationOverlay key={resolvedAnimUrl} animUrl={resolvedAnimUrl} /> : null}
      </WorkbenchProvider>
    </div>
  );
}

const FEEDBACK_BUTTON_CLASS =
  'absolute bottom-2 left-2 z-20 rounded px-2 py-0.5 text-xs text-fg-2 opacity-70 hover:opacity-100 hover:text-fg '
  + 'bg-surface-1/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent';

export function FunnelViewer(props: FunnelViewerProps) {
  if (!props.feedback) return <FunnelViewerContent {...props} />;
  return (
    <div className="relative w-full h-full">
      <FunnelViewerContent {...props} />
      <FeedbackLauncher
        context={{ ...props.feedback, revision: props.feedback.revision ?? props.revision }}
        className={FEEDBACK_BUTTON_CLASS}
        submitFeedback={props.submitFeedback}
      />
    </div>
  );
}

function FunnelViewerContent(props: FunnelViewerProps) {
  const mesh = useRevisionMesh(props);
  // No meshUrl → evaluate source (funnel / unpublished). meshUrl present → stored
  // artifact only; never browser-OCCT fallback for published ChatGPT revisions.
  if (!props.meshUrl) {
    return (
      <div className="relative w-full h-full bg-code-bg">
        <SourceViewer
          code={props.code}
          onPhaseChange={props.onPhaseChange}
          resetKey={props.resetKey ?? 0}
          revision={props.revision}
          instanceId={props.instanceId}
          overlay={props.overlay}
          statusOverlay={props.statusOverlay}
          background={props.background}
        />
      </div>
    );
  }
  if (mesh?.error) {
    return (
      <MeshStatus
        message={`Viewer failed: ${mesh.error}`}
        revision={props.revision}
        instanceId={props.instanceId}
        onPhaseChange={props.onPhaseChange}
        statusOverlay={props.statusOverlay}
      />
    );
  }
  if (!mesh?.geometries || !mesh.bounds) {
    return (
      <MeshStatus
        message="Loading mesh…"
        phase="loading_mesh"
        revision={props.revision}
        instanceId={props.instanceId}
        onPhaseChange={props.onPhaseChange}
        statusOverlay={props.statusOverlay}
      />
    );
  }
  return <LoadedMeshViewer {...props} geometries={mesh.geometries} bounds={mesh.bounds} meshDimensions={mesh.meshDimensions} />;
}
