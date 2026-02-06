
import Viewer from '../Viewer';
import { ConstraintsToolbar } from '../Sketcher/ConstraintsToolbar';
import { MousePointer2 } from 'lucide-react';
import type { GeometryResult, SketchGeometry } from '../../lib/geometryEngine';
import type { ViewMode3D } from '../../types/viewMode';

interface ViewerPanelProps {
    geometries: GeometryResult[];
    previewGeometries: GeometryResult[];
    sketchesGeometries: SketchGeometry[];
    showSketches: boolean;
    viewMode3D: ViewMode3D;
    isFaceSelecting: boolean;
    onCancelFaceSelection: () => void;
}

export function ViewerPanel({
    geometries,
    previewGeometries,
    sketchesGeometries,
    showSketches,
    viewMode3D,
    isFaceSelecting,
    onCancelFaceSelection
}: ViewerPanelProps) {
    return (
        <div className="flex-1 h-full relative bg-[#0a0a0a]">
            <Viewer
                geometries={geometries}
                previewGeometries={previewGeometries}
                sketchesGeometries={sketchesGeometries}
                showSketches={showSketches}
                viewMode3D={viewMode3D}
            />
            <ConstraintsToolbar />
            {isFaceSelecting && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div className="bg-blue-600/90 text-white px-6 py-3 rounded-full shadow-2xl animate-bounce backdrop-blur-sm border border-blue-400/50 pointer-events-auto flex items-center gap-3">
                        <MousePointer2 className="w-5 h-5" />
                        <span className="font-bold">Click a face to start sketching</span>
                        <button
                            onClick={onCancelFaceSelection}
                            className="ml-2 hover:bg-white/20 p-1 rounded transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
