// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import Viewer from './components/Viewer';
import { useWorkbench } from './context/WorkbenchContext';
import { useStudioChrome } from './context/StudioChromeContext';
import { useRecomputeResult } from './hooks/useRecomputeResult';
import { ParamChips } from './ParamChips';
import { SelectionHighlight } from './SelectionHighlight';

export function Viewport() {
    const { geometries } = useRecomputeResult();
    const {
        viewMode3D,
        sketchesGeometries,
        showSketches,
        previewGeometries,
    } = useWorkbench();
    const { viewportOverlay } = useStudioChrome();

    return (
        <div data-testid="studio-viewport" className="relative w-full h-full">
            <div className="absolute inset-0">
                <Viewer
                    geometries={[...geometries]}
                    previewGeometries={previewGeometries ?? []}
                    sketchesGeometries={sketchesGeometries ?? []}
                    showSketches={showSketches ?? false}
                    viewMode3D={viewMode3D}
                />
            </div>
            <div className="absolute inset-0 pointer-events-none">
                <ParamChips />
                <SelectionHighlight />
            </div>
            {viewportOverlay && (
                <div className="absolute top-3 right-3 bottom-3 flex flex-col items-end pointer-events-none">
                    {viewportOverlay}
                </div>
            )}
        </div>
    );
}
