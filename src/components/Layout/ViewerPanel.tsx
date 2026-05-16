import Viewer from '../Viewer';
import type { GeometryResult, SketchGeometry } from '../../shared/worker/geometryEngine';
import type { ViewMode3D } from '../../shared/types/viewMode';

interface ViewerPanelProps {
    geometries: GeometryResult[];
    previewGeometries: GeometryResult[];
    sketchesGeometries: SketchGeometry[];
    showSketches: boolean;
    viewMode3D: ViewMode3D;
}

export function ViewerPanel({
    geometries,
    previewGeometries,
    sketchesGeometries,
    showSketches,
    viewMode3D,
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
        </div>
    );
}
