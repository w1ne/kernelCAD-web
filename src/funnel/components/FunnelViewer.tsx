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
import { useCallback, useEffect, useMemo, useState } from 'react';
import Viewer from '../../studio/components/Viewer';
import { hasNonemptyGeometry } from '../../studio/components/viewer/hasNonemptyGeometry';
import { WorkbenchProvider, useWorkbench } from '../../studio/context/WorkbenchContext';
import type { GeometryResult } from '../../shared/worker/geometryEngine';
import {
  geometriesFromArtifact,
  parseMeshArtifact,
  type MeshArtifactBounds,
} from '../meshArtifact';

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
}

/** Inner component — must be mounted inside WorkbenchProvider. */
function FunnelViewerInner({
  onPhaseChange,
  revision = null,
  instanceId,
}: {
  onPhaseChange?: (phase: FunnelViewerPhase, detail?: string | null) => void;
  revision?: number | null;
  instanceId?: string;
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

  const statusLabel =
    phase === 'building_geometry' ? 'Building geometry…'
    : phase === 'loading_mesh' ? 'Loading mesh…'
    : phase === 'build_failed' ? `Build failed: ${detail ?? 'unknown error'}`
    : phase === 'viewer_failed' ? `Viewer failed: ${detail ?? 'unknown error'}`
    : null;

  return (
    <div className="absolute inset-0">
      <Viewer
        geometries={[...geometries]}
        previewGeometries={previewGeometries ?? []}
        sketchesGeometries={sketchesGeometries ?? []}
        showSketches={showSketches ?? false}
        viewMode3D={viewMode3D}
        onDisplayReady={onDisplayReady}
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
}: {
  code: string;
  onPhaseChange?: FunnelViewerProps['onPhaseChange'];
  resetKey: number | string;
  revision?: number | null;
  instanceId?: string;
}) {
  return (
    <WorkbenchProvider key={`${resetKey}:${code.length}`} initialCode={code}>
      <FunnelViewerInner onPhaseChange={onPhaseChange} revision={revision} instanceId={instanceId} />
    </WorkbenchProvider>
  );
}

function boundsAttribute(bounds: MeshArtifactBounds): string {
  return `${bounds.min.join(',')},${bounds.max.join(',')}`;
}

export function FunnelViewer({
  code,
  meshUrl,
  revision = null,
  instanceId,
  onPhaseChange,
  resetKey = 0,
}: FunnelViewerProps) {
  const meshKey = meshUrl ? `${meshUrl}\n${revision ?? ''}\n${String(resetKey)}\n${code}` : '';
  const [meshResult, setMeshResult] = useState<{
    key: string;
    geometries: GeometryResult[] | null;
    bounds: MeshArtifactBounds | null;
    fallback: boolean;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    if (!meshUrl) return undefined;
    const key = meshKey;
    let cancelled = false;
    fetch(meshUrl)
      .then(async (response) => {
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          const message = body && typeof body === 'object' && body !== null && 'error' in body
            ? String((body as { error: unknown }).error)
            : `Mesh request failed (${response.status}).`;
          throw new Error(message);
        }
        return parseMeshArtifact(body, revision);
      })
      .then((artifact) => {
        if (cancelled) return;
        setMeshResult({
          key,
          geometries: geometriesFromArtifact(artifact),
          bounds: artifact.bounds,
          fallback: false,
          error: null,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        const fallback = code.trim().length > 0;
        setMeshResult({
          key,
          geometries: null,
          bounds: null,
          fallback,
          error: fallback ? null : message,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [meshUrl, meshKey, revision, code]);

  const settled = meshResult !== null && meshResult.key === meshKey;
  const useSourceFallback = settled && meshResult.fallback;
  const meshError = settled ? meshResult.error : null;
  const meshGeometries = settled ? meshResult.geometries : null;
  const cameraBounds = settled ? meshResult.bounds : null;

  if (!meshUrl || useSourceFallback) {
    return (
      <div className="relative w-full h-full bg-code-bg" data-mesh-url={meshUrl ?? undefined} data-source-fallback={useSourceFallback ? 'true' : 'false'}>
        <SourceViewer
          code={code}
          onPhaseChange={onPhaseChange}
          resetKey={resetKey}
          revision={revision}
          instanceId={instanceId}
        />
      </div>
    );
  }

  if (meshError) {
    return (
      <div className="relative w-full h-full bg-code-bg grid place-items-center" data-testid="funnel-viewer-status" role="status">
        <p className="text-ink-faint font-mono text-sm px-6 text-center">Viewer failed: {meshError}</p>
      </div>
    );
  }

  if (!meshGeometries || !cameraBounds) {
    return (
      <div className="relative w-full h-full bg-code-bg grid place-items-center" data-testid="funnel-viewer-status" role="status">
        <p className="text-ink-faint font-mono text-sm">Loading mesh…</p>
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-full bg-code-bg"
      data-mesh-url={meshUrl}
      data-camera-bounds={boundsAttribute(cameraBounds)}
      data-source-suspended="true"
    >
      <WorkbenchProvider
        key={`${resetKey}:mesh`}
        initialCode=""
        suspendSourceExecution
        externalGeometries={meshGeometries}
      >
        <FunnelViewerInner onPhaseChange={onPhaseChange} revision={revision} instanceId={instanceId} />
      </WorkbenchProvider>
    </div>
  );
}
