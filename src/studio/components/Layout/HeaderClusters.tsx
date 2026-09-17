// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { Download, FileDown, Undo2, Redo2, Box, Grid as GridIcon, Grid3x3, Circle, Moon, Sun, LayoutGrid, History, RotateCcw } from 'lucide-react';
import { formatTooltip, SHORTCUT_HINTS } from '../../../shared/constants/shortcuts';
import type { ProjectRevision } from '../../../authoring/projectService';
import type { ViewMode3D, ViewportBackground } from '../../../shared/types/viewMode';

export function ViewModeCluster({ viewMode3D, setViewMode3D }: {
    viewMode3D: ViewMode3D;
    setViewMode3D: (mode: ViewMode3D) => void;
}) {
    return (
        <div className="flex bg-[#222] rounded p-0.5" data-testid="view-3d-toggle">
            <button
                onClick={() => setViewMode3D('shadedWithEdges')}
                className={`p-1 rounded text-xs flex items-center gap-1 ${viewMode3D === 'shadedWithEdges' ? 'bg-[#444] text-white shadow' : 'text-gray-400 hover:text-white'}`}
                title="Shaded with Edges"
                aria-label="Shaded with Edges"
            >
                <Box size={14} />
            </button>
            <button
                onClick={() => setViewMode3D('wireframe')}
                className={`p-1 rounded text-xs flex items-center gap-1 ${viewMode3D === 'wireframe' ? 'bg-[#444] text-white shadow' : 'text-gray-400 hover:text-white'}`}
                title="Wireframe"
                aria-label="Wireframe"
            >
                <GridIcon size={14} />
            </button>
            <button
                onClick={() => setViewMode3D('shaded')}
                className={`p-1 rounded text-xs flex items-center gap-1 ${viewMode3D === 'shaded' ? 'bg-[#444] text-white shadow' : 'text-gray-400 hover:text-white'}`}
                title="Shaded"
                aria-label="Shaded"
            >
                <Circle size={14} />
            </button>
        </div>
    );
}

/* Viewport background switcher (dark / light / checkered) */
export function BackgroundCluster({ viewportBackground, setViewportBackground }: {
    viewportBackground: ViewportBackground;
    setViewportBackground: (bg: ViewportBackground) => void;
}) {
    return (
        <div className="flex bg-[#222] rounded p-0.5" data-testid="viewport-background-toggle">
            <button
                onClick={() => setViewportBackground('dark')}
                className={`p-1 rounded text-xs flex items-center gap-1 ${viewportBackground === 'dark' ? 'bg-[#444] text-white shadow' : 'text-gray-400 hover:text-white'}`}
                title="Dark background"
                aria-label="Dark background"
                data-testid="viewport-background-dark"
            >
                <Moon size={14} />
            </button>
            <button
                onClick={() => setViewportBackground('light')}
                className={`p-1 rounded text-xs flex items-center gap-1 ${viewportBackground === 'light' ? 'bg-[#444] text-white shadow' : 'text-gray-400 hover:text-white'}`}
                title="Light background"
                aria-label="Light background"
                data-testid="viewport-background-light"
            >
                <Sun size={14} />
            </button>
            <button
                onClick={() => setViewportBackground('checkered')}
                className={`p-1 rounded text-xs flex items-center gap-1 ${viewportBackground === 'checkered' ? 'bg-[#444] text-white shadow' : 'text-gray-400 hover:text-white'}`}
                title="Checkered background"
                aria-label="Checkered background"
                data-testid="viewport-background-checkered"
            >
                <LayoutGrid size={14} />
            </button>
        </div>
    );
}

/* Ground grid visibility */
export function GridButton({ gridVisible, setGridVisible }: {
    gridVisible: boolean;
    setGridVisible: (visible: boolean) => void;
}) {
    return (
        <button
            onClick={() => setGridVisible(!gridVisible)}
            className={`p-1 rounded text-xs flex items-center gap-1 ${gridVisible ? 'bg-[#444] text-white shadow' : 'text-gray-400 hover:text-white'}`}
            title={gridVisible ? 'Hide ground grid' : 'Show ground grid'}
            aria-label="Toggle ground grid"
            aria-pressed={gridVisible}
            data-testid="viewport-grid-toggle"
        >
            <Grid3x3 size={14} />
        </button>
    );
}

export function ExportButtons({ withLabels, isComputing, onExport }: {
    withLabels: boolean;
    isComputing: boolean;
    onExport: (type: 'step' | 'stl') => void;
}) {
    return (
        <>
            <button
                onClick={() => onExport('step')}
                disabled={isComputing}
                className={`p-1 hover:bg-[#333] rounded text-gray-400 hover:text-white transition-colors ${withLabels ? 'inline-flex items-center gap-1.5 px-2 text-xs' : ''}`}
                title="Export STEP"
                aria-label="Export STEP"
            >
                <FileDown className="w-4 h-4" />
                {withLabels && 'STEP'}
            </button>
            <button
                onClick={() => onExport('stl')}
                disabled={isComputing}
                className={`p-1 hover:bg-[#333] rounded text-gray-400 hover:text-white transition-colors ${withLabels ? 'inline-flex items-center gap-1.5 px-2 text-xs' : ''}`}
                title="Export STL"
                aria-label="Export STL"
            >
                <Download className="w-4 h-4" />
                {withLabels && 'STL'}
            </button>
        </>
    );
}

export function UndoRedoButtons({ commandManager }: {
    commandManager: { undo: () => void; redo: () => void; canUndo: boolean; canRedo: boolean };
}) {
    return (
        <>
            <button
                onClick={() => commandManager.undo()}
                disabled={!commandManager.canUndo}
                className={`p-1 rounded transition-colors ${!commandManager.canUndo ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-white hover:bg-[#333]'}`}
                aria-label="Undo"
                title={formatTooltip('Undo', SHORTCUT_HINTS.undo)}
            >
                <Undo2 className="w-4 h-4" />
            </button>
            <button
                onClick={() => commandManager.redo()}
                disabled={!commandManager.canRedo}
                className={`p-1 rounded transition-colors ${!commandManager.canRedo ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-white hover:bg-[#333]'}`}
                aria-label="Redo"
                title={formatTooltip('Redo', SHORTCUT_HINTS.redo)}
            >
                <Redo2 className="w-4 h-4" />
            </button>
        </>
    );
}

export function HistoryControl({
    historyAvailable, historyRef, historyOpen, setHistoryOpen, revisions, formatRevisionTime, handleRestore,
}: {
    historyAvailable: boolean;
    historyRef: React.RefObject<HTMLDivElement | null>;
    historyOpen: boolean;
    setHistoryOpen: (updater: (open: boolean) => boolean) => void;
    revisions: ProjectRevision[];
    formatRevisionTime: (ts: string) => string;
    handleRestore: (v: number) => void;
}) {
    if (!historyAvailable) return null;
    return (
        <div className="relative" ref={historyRef} data-testid="history-menu">
            <button
                onClick={() => setHistoryOpen(o => !o)}
                className={`p-1 rounded transition-colors ${historyOpen ? 'bg-[#333] text-white' : 'text-gray-400 hover:text-white hover:bg-[#333]'}`}
                aria-label="Revision history"
                aria-haspopup="menu"
                aria-expanded={historyOpen}
                title="Revision history"
                data-testid="history-button"
            >
                <History className="w-4 h-4" />
            </button>
            {historyOpen && (
                <div
                    role="menu"
                    className="absolute right-0 top-full mt-1 w-64 max-h-80 overflow-y-auto bg-[#1a1a1a] border border-[#333] rounded shadow-lg z-50 py-1"
                    data-testid="history-dropdown"
                >
                    <div className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-gray-500 font-medium">
                        Revision history
                    </div>
                    {[...revisions].reverse().map((rev) => (
                        <div
                            key={rev.v}
                            className="group flex items-center justify-between gap-2 px-3 py-1.5 hover:bg-[#222]"
                        >
                            <div className="min-w-0">
                                <div className="text-xs text-gray-300">v{rev.v}</div>
                                <div className="text-[10px] text-gray-500 truncate">{formatRevisionTime(rev.ts)}</div>
                            </div>
                            <button
                                onClick={() => handleRestore(rev.v)}
                                className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-white px-1.5 py-1 rounded hover:bg-[#333] transition-colors shrink-0"
                                aria-label={`Restore revision v${rev.v}`}
                                title={`Restore v${rev.v}`}
                            >
                                <RotateCcw className="w-3 h-3" />
                                Restore
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
