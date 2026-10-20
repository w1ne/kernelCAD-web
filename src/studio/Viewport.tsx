// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useEffect, useRef } from 'react';
import Viewer from './components/Viewer';
import { useWorkbench } from './context/WorkbenchContext';
import { useOptionalProjectId } from './context/ProjectContext';
import { useStudioChrome } from './context/StudioChromeContext';
import { useRecomputeResult } from './hooks/useRecomputeResult';
import { ParamChips } from './ParamChips';
import { SelectionHighlight } from './SelectionHighlight';
import { useStudioConfig } from './config/StudioConfigContext';
import { StudioEmptyState } from './start/StudioEmptyState';
import { CoachMarks } from './start/CoachMarks';
import { firstRunAllowed, isViewportEmpty } from './start/firstRun';
import { MarkupPanel } from './components/viewer/markup/MarkupPanel';
import { markupStore } from './markup/markupStore';

/** The first-run layer: the empty-viewport card and the coach marks. Only
 *  in the editable Studio; never on /p/, /g/, embeds or source links. */
function FirstRun({ geometryCount }: { geometryCount: number }) {
    const workbench = useWorkbench();
    const { viewerMode } = useStudioChrome();
    const config = useStudioConfig();
    const allowed = firstRunAllowed({
        viewerMode: !!viewerMode,
        showHeader: config.showHeader ?? true,
        pathname: window.location.pathname,
        search: window.location.search,
    });
    if (!allowed) return null;
    const empty = isViewportEmpty({
        isReady: !!workbench.isReady,
        isComputing: !!workbench.isComputing,
        error: workbench.error,
        executionCount: workbench.executionCount ?? 0,
        geometryCount,
        sketchCount: workbench.sketchesGeometries?.length ?? 0,
        previewCount: workbench.previewGeometries?.length ?? 0,
        sketching: !!workbench.sketchMode?.active,
    });
    return (
        <>
            {empty && (
                // Above the view gizmo (z-20); clear of the floating toolbar at the top.
                <div className="absolute inset-0 z-[25] flex items-center justify-center px-4 pb-4 pt-[76px] pointer-events-none">
                    <StudioEmptyState
                        enableAgent={config.enableAgentRail ?? true}
                        enableConnect={config.enableConnect ?? true}
                    />
                </div>
            )}
            <CoachMarks ready={!!workbench.isReady} />
        </>
    );
}

export function Viewport() {
    const { geometries } = useRecomputeResult();
    const activeProjectId = useOptionalProjectId();
    const {
        viewMode3D,
        sketchesGeometries,
        showSketches,
        previewGeometries,
    } = useWorkbench();
    const { viewportOverlay } = useStudioChrome();
    const previousProjectId = useRef(activeProjectId);
    useEffect(() => {
        if (previousProjectId.current === activeProjectId) return;
        previousProjectId.current = activeProjectId;
        markupStore.clear();
        markupStore.closePanel();
    }, [activeProjectId]);

    return (
        <div data-testid="studio-viewport" className="relative w-full h-full">
            <div className="absolute inset-0">
                <Viewer
                    geometries={[...geometries]}
                    previewGeometries={previewGeometries ?? []}
                    sketchesGeometries={sketchesGeometries ?? []}
                    showSketches={showSketches ?? false}
                    viewMode3D={viewMode3D}
                    enableMarkup
                />
            </div>
            <div className="absolute inset-0 pointer-events-none">
                <ParamChips />
                <SelectionHighlight />
                <MarkupPanel />
            </div>
            <FirstRun geometryCount={geometries.length} />
            {viewportOverlay && (
                <div className="absolute top-3 right-3 bottom-3 flex flex-col items-end pointer-events-none">
                    {viewportOverlay}
                </div>
            )}
        </div>
    );
}
