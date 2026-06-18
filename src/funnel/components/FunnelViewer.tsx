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
 */
import Viewer from '../../studio/components/Viewer';
import { WorkbenchProvider, useWorkbench } from '../../studio/context/WorkbenchContext';

export interface FunnelViewerProps {
  code: string;
}

/** Inner component — must be mounted inside WorkbenchProvider. */
function FunnelViewerInner() {
  const {
    geometries,
    previewGeometries,
    sketchesGeometries,
    showSketches,
    viewMode3D,
  } = useWorkbench();

  return (
    <div className="absolute inset-0">
      <Viewer
        geometries={[...geometries]}
        previewGeometries={previewGeometries ?? []}
        sketchesGeometries={sketchesGeometries ?? []}
        showSketches={showSketches ?? false}
        viewMode3D={viewMode3D}
      />
    </div>
  );
}

/**
 * Mount this component with a `code` string — it spins up the provider stack,
 * executes the geometry, and renders the 3D canvas. No Studio chrome is pulled in.
 */
export function FunnelViewer({ code }: FunnelViewerProps) {
  return (
    <div className="relative w-full h-full bg-code-bg">
      <WorkbenchProvider initialCode={code}>
        <FunnelViewerInner />
      </WorkbenchProvider>
    </div>
  );
}
