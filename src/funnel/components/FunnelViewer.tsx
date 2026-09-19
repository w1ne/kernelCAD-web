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

export type FunnelViewerPhase =
  | 'building_geometry'
  | 'loading_mesh'
  | 'model_displayed'
  | 'build_failed'
  | 'viewer_failed';

export interface FunnelViewerProps {
  code: string;
  /** Optional precomputed mesh artifact URL (Phase 3 hook). When set, hosts may
   *  skip re-executing source once the artifact pipeline lands. */
  meshUrl?: string | null;
  onPhaseChange?: (phase: FunnelViewerPhase, detail?: string | null) => void;
  /** Bump to remount the provider stack (Retry). */
  resetKey?: number | string;
}

/** Inner component — must be mounted inside WorkbenchProvider. */
function FunnelViewerInner({
  onPhaseChange,
}: {
  onPhaseChange?: (phase: FunnelViewerPhase, detail?: string | null) => void;
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
  }, [phase, detail, onPhaseChange]);

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
export function FunnelViewer({ code, meshUrl, onPhaseChange, resetKey = 0 }: FunnelViewerProps) {
  // meshUrl is a Phase 3 hook: when artifact pipeline exists, FunnelViewer (or a
  // sibling mesh loader) can short-circuit CAD re-exec. Today we still execute code.
  void meshUrl;

  return (
    <div className="relative w-full h-full bg-code-bg" data-mesh-url={meshUrl ?? undefined}>
      <WorkbenchProvider key={`${resetKey}:${code.length}`} initialCode={code}>
        <FunnelViewerInner onPhaseChange={onPhaseChange} />
      </WorkbenchProvider>
    </div>
  );
}
