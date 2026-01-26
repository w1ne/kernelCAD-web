import { useWorkbench } from '../../context/WorkbenchContext';
import { Loader2, Download, FileDown, Code, Monitor, Undo2, Redo2, Box, Grid as GridIcon, Circle } from 'lucide-react';
import { exportSTEP, exportSTL } from '../../lib/geometryEngine';

export function Header() {
    const { viewMode, setViewMode, viewMode3D, setViewMode3D, isComputing, code, commandManager } = useWorkbench();

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
            a.download = `model.${type}`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error(err);
            alert("Export failed: " + (err instanceof Error ? err.message : String(err)));
        }
    };

    return (
        <div className="h-10 bg-[#111] border-b border-[#333] flex items-center px-4 justify-between select-none shrink-0">
            <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    {viewMode === 'code' ? 'script.js' : 'Design'}
                </span>
            </div>

            <div className="flex gap-2 items-center">
                {/* Mode Toggle */}
                <div className="flex bg-[#222] rounded p-0.5 mr-2">
                    <button
                        onClick={() => setViewMode('code')}
                        className={`p-1 rounded text-xs flex items-center gap-1 ${viewMode === 'code' ? 'bg-[#444] text-white shadow' : 'text-gray-400 hover:text-white'}`}
                        title="Code Mode"
                    >
                        <Code size={14} />
                        {viewMode === 'code' && <span>Code</span>}
                    </button>
                    <button
                        onClick={() => setViewMode('gui')}
                        className={`p-1 rounded text-xs flex items-center gap-1 ${viewMode === 'gui' ? 'bg-[#444] text-white shadow' : 'text-gray-400 hover:text-white'}`}
                        title="Design Mode"
                    >
                        <Monitor size={14} />
                        {viewMode === 'gui' && <span>GUI</span>}
                    </button>
                </div>

                {/* 3D View Mode Toggle */}
                <div className="flex bg-[#222] rounded p-0.5">
                    <button
                        onClick={() => setViewMode3D('shadedWithEdges')}
                        className={`p-1 rounded text-xs flex items-center gap-1 ${viewMode3D === 'shadedWithEdges' ? 'bg-[#444] text-white shadow' : 'text-gray-400 hover:text-white'}`}
                        title="Shaded with Edges"
                    >
                        <Box size={14} />
                    </button>
                    <button
                        onClick={() => setViewMode3D('wireframe')}
                        className={`p-1 rounded text-xs flex items-center gap-1 ${viewMode3D === 'wireframe' ? 'bg-[#444] text-white shadow' : 'text-gray-400 hover:text-white'}`}
                        title="Wireframe"
                    >
                        <GridIcon size={14} />
                    </button>
                    <button
                        onClick={() => setViewMode3D('shaded')}
                        className={`p-1 rounded text-xs flex items-center gap-1 ${viewMode3D === 'shaded' ? 'bg-[#444] text-white shadow' : 'text-gray-400 hover:text-white'}`}
                        title="Shaded"
                    >
                        <Circle size={14} />
                    </button>
                </div>

                <div className="h-6 w-px bg-[#333] mx-2" />

                <button
                    onClick={() => commandManager.undo()}
                    disabled={!commandManager.canUndo}
                    className={`p-1 rounded transition-colors ${!commandManager.canUndo ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-white hover:bg-[#333]'}`}
                    title="Undo"
                >
                    <Undo2 className="w-4 h-4" />
                </button>
                <button
                    onClick={() => commandManager.redo()}
                    disabled={!commandManager.canRedo}
                    className={`p-1 rounded transition-colors ${!commandManager.canRedo ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-white hover:bg-[#333]'}`}
                    title="Redo"
                >
                    <Redo2 className="w-4 h-4" />
                </button>

                <div className="h-6 w-px bg-[#333] mx-2" />

                <button
                    onClick={() => handleExport('step')}
                    disabled={isComputing}
                    className="p-1 hover:bg-[#333] rounded text-gray-400 hover:text-white transition-colors"
                    title="Export STEP"
                >
                    <FileDown className="w-4 h-4" />
                </button>
                <button
                    onClick={() => handleExport('stl')}
                    disabled={isComputing}
                    className="p-1 hover:bg-[#333] rounded text-gray-400 hover:text-white transition-colors"
                    title="Export STL"
                >
                    <Download className="w-4 h-4" />
                </button>
                {isComputing && <Loader2 className="w-3 h-3 animate-spin text-gray-500" />}
            </div>
        </div>
    );
}
