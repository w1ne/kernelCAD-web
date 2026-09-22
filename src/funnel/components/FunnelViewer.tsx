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

interface MeshLoadResult {
  key: string;
  geometries: GeometryResult[] | null;
  bounds: MeshArtifactBounds | null;
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

async function fetchRevisionMesh(meshUrl: string, revision: number | null) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MESH_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(meshUrl, { signal: controller.signal });
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) throw new Error(meshHttpError(body, response.status));
    return parseMeshArtifact(body, revision);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(`Mesh request timed out after ${MESH_FETCH_TIMEOUT_MS / 1000}s.`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
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
    let cancelled = false;
    fetchRevisionMesh(meshUrl, revision)
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
        setMeshResult(meshFailure(key, err));
      });
    return () => {
      cancelled = true;
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
}) {
  const { message, revision = null, instanceId, onPhaseChange } = props;
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

  return (
    <div className="relative w-full h-full bg-code-bg grid place-items-center" data-testid="funnel-viewer-status" role="status">
      <p className="text-ink-faint font-mono text-sm px-6 text-center">{message}</p>
    </div>
  );
}

function LoadedMeshViewer(props: FunnelViewerProps & { geometries: GeometryResult[]; bounds: MeshArtifactBounds }) {
  return (
    <div
      className="relative w-full h-full bg-code-bg"
      data-mesh-url={props.meshUrl ?? undefined}
      data-camera-bounds={boundsAttribute(props.bounds)}
      data-source-suspended="true"
    >
      <WorkbenchProvider
        key={`${props.resetKey ?? 0}:mesh`}
        initialCode=""
        suspendSourceExecution
        externalGeometries={props.geometries}
      >
        <FunnelViewerInner onPhaseChange={props.onPhaseChange} revision={props.revision} instanceId={props.instanceId} />
      </WorkbenchProvider>
    </div>
  );
}

export function FunnelViewer(props: FunnelViewerProps) {
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
      />
    );
  }
  return <LoadedMeshViewer {...props} geometries={mesh.geometries} bounds={mesh.bounds} />;
}
