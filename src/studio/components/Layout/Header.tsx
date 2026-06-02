import { useWorkbench } from '../../context/WorkbenchContext';
import { Loader2, Download, FileDown, Undo2, Redo2, Box, Grid as GridIcon, Circle, FolderOpen, Moon, Sun, LayoutGrid } from 'lucide-react';
import { exportSTEP, exportSTL } from '../../../shared/worker/geometryEngine';
import { formatTooltip, SHORTCUT_HINTS } from '../../../shared/constants/shortcuts';
import { useProject } from '../../context/ProjectContext';
import { useStudioChrome } from '../../context/StudioChromeContext';
import { useUI } from '../../context/UIContext';

export function Header() {
    const { headerLeft, headerRight } = useStudioChrome();
    const {
        viewMode3D, setViewMode3D,
        isComputing, code, commandManager, setActiveDialog
    } = useWorkbench();
    const { viewportBackground, setViewportBackground } = useUI();

    const { activeProject } = useProject();

    const handleExport = async (type: 'step' | 'stl') => {
        try {
            let blob: Blob;
            if (type === 'step') {
                blob = await exportSTEP(code);
            } else {
                blob = await exportSTL(code);
            }

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${(activeProject?.name || 'model').replace(/[^a-z0-9]/gi, '_')}.${type}`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error(err);
            alert("Export failed: " + (err instanceof Error ? err.message : String(err)));
        }
    };

    return (
        <div className="h-10 bg-[#111] border-b border-[#333] flex items-center px-4 justify-between select-none shrink-0" data-testid="header">
            <div className="flex items-center gap-3 min-w-0">
                <button
                    onClick={() => setActiveDialog('projectManager')}
                    aria-label="Open project manager"
                    className="flex items-center gap-2 group hover:bg-[#222] px-2 py-1 rounded transition-colors min-w-0"
                >
                    <div className="w-2 h-2 rounded-full bg-blue-500 group-hover:animate-pulse" />
                    <span className="text-sm font-medium text-gray-300 flex items-center gap-2 min-w-0">
                        <span className="truncate max-w-[180px]">{activeProject?.name || 'Untitled Project'}</span>
                        <FolderOpen size={12} className="text-gray-500 group-hover:text-blue-400" />
                    </span>
                </button>
                {headerLeft && (
                    <>
                        <div className="h-6 w-px bg-[#333]" />
                        <div className="flex items-center gap-2 min-w-0">{headerLeft}</div>
                    </>
                )}
            </div>

            <div className="flex gap-2 items-center">
                {headerRight && (
                    <>
                        <div className="flex items-center gap-2">{headerRight}</div>
                        <div className="h-6 w-px bg-[#333] mx-2" />
                    </>
                )}
                {/* 3D View Mode Toggle */}
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

                {/* Viewport background switcher (dark / light / checkered) */}
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

                <div className="h-6 w-px bg-[#333] mx-2" />

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

                <div className="h-6 w-px bg-[#333] mx-2" />

                <button
                    onClick={() => handleExport('step')}
                    disabled={isComputing}
                    className="p-1 hover:bg-[#333] rounded text-gray-400 hover:text-white transition-colors"
                    title="Export STEP"
                    aria-label="Export STEP"
                >
                    <FileDown className="w-4 h-4" />
                </button>
                <button
                    onClick={() => handleExport('stl')}
                    disabled={isComputing}
                    className="p-1 hover:bg-[#333] rounded text-gray-400 hover:text-white transition-colors"
                    title="Export STL"
                    aria-label="Export STL"
                >
                    <Download className="w-4 h-4" />
                </button>
                {isComputing && <Loader2 className="w-3 h-3 animate-spin text-gray-500" />}
            </div>
            <div className="absolute bottom-0 right-0 p-1 text-[9px] text-gray-700 pointer-events-none opacity-50 font-mono">
                {typeof (window as unknown as { __COMMIT_HASH__: string }).__COMMIT_HASH__ !== 'undefined'
                    ? (window as unknown as { __COMMIT_HASH__: string }).__COMMIT_HASH__
                    : 'DEV'}
            </div>
        </div>
    );
}
