// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { type ReactNode } from 'react';
import { useWorkbench } from '../../context/WorkbenchContext';
import { Loader2, FolderOpen } from 'lucide-react';
import { useStudioChrome } from '../../context/StudioChromeContext';
import { useUI } from '../../context/UIContext';
import { COMPACT_HEADER_QUERY, useIsNarrow } from '../../hooks/useIsNarrow';
import { downloadBlob, exportViaServer } from '../../exportViaServer';
import { OverflowMenu } from './OverflowMenu';
import UserMenu from './UserMenu';
import { useHeaderHistory } from './useHeaderHistory';
import {
    ViewModeCluster, BackgroundCluster, GridButton, ExportButtons, UndoRedoButtons, HistoryControl,
} from './HeaderClusters';

/** Labelled row inside the narrow-viewport overflow menu. Keeps the bar's
 *  segmented controls intact but gives each cluster a name, since the icons
 *  alone carry no context once they leave the bar. */
function MenuRow({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-4 px-1 py-1.5">
            <span className="text-[11px] uppercase tracking-wide text-gray-500 whitespace-nowrap">{label}</span>
            <div className="flex items-center gap-1 shrink-0">{children}</div>
        </div>
    );
}

// Route through the node OCCT export endpoint (same as ExportTab). The
// legacy in-browser worker uses bare `new Function(code)` without an
// async wrapper, so top-level await / lib.fromSTEP fail with
// "await is only valid in async functions".
async function exportModelViaServer(
    type: 'step' | 'stl',
    code: string,
    projectName: string | undefined,
): Promise<void> {
    try {
        const { blob, downloadName } = await exportViaServer(type, code);
        const fallback = `${(projectName || 'model').replace(/[^a-z0-9]/gi, '_')}.${type}`;
        downloadBlob(blob, downloadName || fallback);
    } catch (err) {
        console.error(err);
        alert('Export failed: ' + (err instanceof Error ? err.message : String(err)));
    }
}

interface HeaderInstruments {
    viewModeCluster: ReactNode;
    backgroundCluster: ReactNode;
    gridButton: ReactNode;
    undoRedoButtons: ReactNode;
    historyControl: ReactNode;
}

function NarrowInstrumentMenu({ instruments, isComputing, onExport }: {
    instruments: HeaderInstruments;
    isComputing: boolean;
    onExport: (type: 'step' | 'stl') => void;
}) {
    return (
        <OverflowMenu label="View and file controls" testId="header-overflow">
            <MenuRow label="Display">{instruments.viewModeCluster}</MenuRow>
            <MenuRow label="Background">{instruments.backgroundCluster}</MenuRow>
            <MenuRow label="Ground grid">{instruments.gridButton}</MenuRow>
            <MenuRow label="Edit">
                {instruments.undoRedoButtons}
                {instruments.historyControl}
            </MenuRow>
            <MenuRow label="Export">
                <ExportButtons withLabels isComputing={isComputing} onExport={onExport} />
            </MenuRow>
        </OverflowMenu>
    );
}

function WideInstrumentCluster({ instruments, isComputing, onExport }: {
    instruments: HeaderInstruments;
    isComputing: boolean;
    onExport: (type: 'step' | 'stl') => void;
}) {
    return (
        <>
            {instruments.viewModeCluster}
            {instruments.backgroundCluster}
            {instruments.gridButton}
            <div className="h-6 w-px bg-[#333] mx-2" />
            {instruments.undoRedoButtons}
            {instruments.historyControl}
            <div className="h-6 w-px bg-[#333] mx-2" />
            <ExportButtons withLabels={false} isComputing={isComputing} onExport={onExport} />
        </>
    );
}

export function Header() {
    const { headerLeft, headerRight } = useStudioChrome();
    const {
        viewMode3D, setViewMode3D,
        isComputing, code, commandManager, setActiveDialog
    } = useWorkbench();
    const { viewportBackground, setViewportBackground, gridVisible, setGridVisible } = useUI();

    const {
        activeProject, revisions, historyOpen, setHistoryOpen, historyRef,
        historyAvailable, formatRevisionTime, handleRestore,
    } = useHeaderHistory();

    // Below `lg` the bar cannot hold the instrument cluster next to the route's
    // own chrome; the instruments move into a single overflow menu instead.
    const narrow = useIsNarrow(COMPACT_HEADER_QUERY);

    const handleExport = (type: 'step' | 'stl') => exportModelViaServer(type, code, activeProject?.name);

    const instruments: HeaderInstruments = {
        viewModeCluster: <ViewModeCluster viewMode3D={viewMode3D} setViewMode3D={setViewMode3D} />,
        backgroundCluster: (
            <BackgroundCluster viewportBackground={viewportBackground} setViewportBackground={setViewportBackground} />
        ),
        gridButton: <GridButton gridVisible={gridVisible} setGridVisible={setGridVisible} />,
        undoRedoButtons: <UndoRedoButtons commandManager={commandManager} />,
        historyControl: (
            <HistoryControl
                historyAvailable={historyAvailable}
                historyRef={historyRef}
                historyOpen={historyOpen}
                setHistoryOpen={setHistoryOpen}
                revisions={revisions}
                formatRevisionTime={formatRevisionTime}
                handleRestore={handleRestore}
            />
        ),
    };

    // A route that injects its own header chrome (e.g. /p/:slug shows the
    // project title) already names the document, so on a phone the Studio's
    // own project-name label is dropped rather than fighting for the same row.
    const hideProjectName = narrow && !!headerLeft;

    return (
        <div className="h-10 bg-[#111] border-b border-[#333] flex items-center px-2 md:px-4 gap-2 select-none shrink-0 bar-scroll-x" data-testid="header">
            {/* `overflow-hidden` is load-bearing: without it this group can be
                squeezed below its content width and its `shrink-0` children
                (title chip, live badge) spill out over the right-hand cluster,
                which is what made the phone header look like two rows of
                controls stacked on top of each other. */}
            <div className="flex items-center gap-3 min-w-0 overflow-hidden">
                <button
                    onClick={() => setActiveDialog('projectManager')}
                    aria-label="Open project manager"
                    className="flex items-center gap-2 group hover:bg-[#222] px-2 py-1 rounded transition-colors min-w-0 shrink-0"
                >
                    <div className="w-2 h-2 rounded-full bg-blue-500 group-hover:animate-pulse" />
                    <span className="text-sm font-medium text-gray-300 flex items-center gap-2 min-w-0">
                        {!hideProjectName && (
                            <span className="truncate max-w-[180px]">{activeProject?.name || 'Untitled Project'}</span>
                        )}
                        <FolderOpen size={12} className="text-gray-500 group-hover:text-blue-400" />
                    </span>
                </button>
                {headerLeft && (
                    <>
                        <div className="h-6 w-px bg-[#333] shrink-0" />
                        <div className="flex items-center gap-2 min-w-0">{headerLeft}</div>
                    </>
                )}
            </div>

            <div className="flex gap-2 items-center ml-auto shrink-0">
                {headerRight && (
                    <>
                        <div className="flex items-center gap-2">{headerRight}</div>
                        {!narrow && <div className="h-6 w-px bg-[#333] mx-2" />}
                    </>
                )}
                {narrow && <NarrowInstrumentMenu instruments={instruments} isComputing={isComputing} onExport={handleExport} />}
                {!narrow && <WideInstrumentCluster instruments={instruments} isComputing={isComputing} onExport={handleExport} />}
                {isComputing && <Loader2 className="w-3 h-3 animate-spin text-gray-500" />}
            </div>
            {/* Account menu — pinned to the right edge so it never scrolls out of
                the horizontally-scrollable toolbar. It used to be the last item
                inside the scrolling instrument cluster, so on narrow viewports it
                slid off-screen (the scrollbar is hidden) and users couldn't find
                sign-out / billing. */}
            <div
                className="sticky right-0 z-20 shrink-0 self-stretch flex items-center gap-2 pl-3 bg-[#111] shadow-[-8px_0_8px_-4px_rgba(0,0,0,0.55)]"
                data-testid="account-slot"
            >
                <div className="h-6 w-px bg-[#333]" />
                <UserMenu />
            </div>
            <div className="absolute bottom-0 right-0 p-1 text-[9px] text-gray-700 pointer-events-none opacity-50 font-mono">
                {typeof (window as unknown as { __COMMIT_HASH__: string }).__COMMIT_HASH__ !== 'undefined'
                    ? (window as unknown as { __COMMIT_HASH__: string }).__COMMIT_HASH__
                    : 'DEV'}
            </div>
        </div>
    );
}
