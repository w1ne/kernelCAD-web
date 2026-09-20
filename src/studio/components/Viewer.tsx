// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { useMemo } from "react";
import type { GeometryResult, SketchGeometry } from "../../shared/worker/geometryEngine";
import type { ViewMode3D } from "../../shared/types/viewMode";
import { useWorkbench } from "../context/WorkbenchContext";
import { useUI } from "../context/UIContext";
import { useShellStore } from "../store/useShellStore";

// Extracted Components
import { ViewerScene } from "./viewer/ViewerScene";
import { DisplayReadySensor } from "./viewer/DisplayReadySensor";
import { ViewGizmo } from "./viewer/overlays/ViewGizmo";

// Extracted hooks
import { useViewerGridPlacement } from "../hooks/viewer/useViewerGridPlacement";
import { useViewerSectionClipping } from "../hooks/viewer/useViewerSectionClipping";
import { useViewerInteraction } from "../hooks/viewer/useViewerInteraction";

// Constants
export const SKETCH_FOV = 40;
export const SKETCH_DISTANCE = 20;

interface ViewerProps {
    geometries: GeometryResult[];
    previewGeometries: GeometryResult[];
    sketchesGeometries: SketchGeometry[];
    showSketches: boolean;
    viewMode3D: ViewMode3D;
    /** Embed/status hosts: fired once after nonempty geometry + camera fit + first frame. */
    onDisplayReady?: () => void;
}

/** Scene state phase: workbench/ui/shell context plus the grid, section-clipping
 *  and hover/interaction hooks the Viewer canvas is driven by. */
function useViewerSetup(geometries: GeometryResult[]) {
    const {
        setSelectedFace,
        selectedSketchName,
        setSelectedSketchName,
        sketchMode,
        planes,
        hiddenIds,
        selectedItemIds,
        setSelectedItemId,
        toggleSelection,
        codeContext,
        setHoveredItemId
    } = useWorkbench();

    const { setContextMenu, viewportBackground, gridVisible } = useUI();

    const gridPlacement = useViewerGridPlacement(geometries);

    const {
        sectionMode,
        sectionAxesEnabled,
        sectionSides,
        sectionOffsets,
        sectionKeepWhole,
        viewportFocusTarget,
        viewportFocusTargetVersion,
    } = useShellStore();
    const clippingPlanes = useViewerSectionClipping(
        sectionMode,
        sectionAxesEnabled,
        sectionSides,
        sectionOffsets,
    );

    const itemNames = useMemo(() => {
        return (codeContext?.returnedVariables as (string | null)[]) || [];
    }, [codeContext]);

    const {
        hoveredItem,
        setHoveredItem,
        snapPoint,
        setSnapPoint,
        navigationRequest,
        setNavigationRequest,
        focusRequest,
        cursor,
    } = useViewerInteraction({
        setHoveredItemId,
        sketchActive: sketchMode.active,
        viewportFocusTarget,
        viewportFocusTargetVersion,
    });

    return {
        setSelectedFace,
        selectedSketchName,
        setSelectedSketchName,
        sketchMode,
        planes,
        hiddenIds,
        selectedItemIds,
        setSelectedItemId,
        toggleSelection,
        setContextMenu,
        viewportBackground,
        gridVisible,
        gridPlacement,
        sectionKeepWhole,
        clippingPlanes,
        itemNames,
        hoveredItem,
        setHoveredItem,
        snapPoint,
        setSnapPoint,
        navigationRequest,
        setNavigationRequest,
        focusRequest,
        cursor,
    };
}

export default function Viewer({ geometries, previewGeometries, sketchesGeometries, showSketches, viewMode3D, onDisplayReady }: ViewerProps) {
    const {
        setSelectedFace, selectedSketchName, setSelectedSketchName, sketchMode, planes, hiddenIds,
        selectedItemIds, setSelectedItemId, toggleSelection, setContextMenu, viewportBackground,
        gridVisible, gridPlacement, sectionKeepWhole, clippingPlanes, itemNames, hoveredItem,
        setHoveredItem, snapPoint, setSnapPoint, navigationRequest, setNavigationRequest,
        focusRequest, cursor,
    } = useViewerSetup(geometries);

    return (
        <div className="w-full h-full relative" style={{ cursor }} data-testid="viewer-container">
            <Canvas
                camera={{ position: [40, 40, 40], fov: SKETCH_FOV }}
                gl={{
                    // Neutral, not ACES Filmic. ACES crushes saturated
                    // coral/pink/orange baseColors toward desaturated dark —
                    // CAD palettes prize accurate hue over film-emulation
                    // roll-off. This is the same conclusion demoPlayer/
                    // ViewerPane.tsx:43-51 reached and documented; the Studio
                    // canvas was simply never brought in line with it.
                    toneMapping: THREE.NeutralToneMapping,
                    outputColorSpace: THREE.SRGBColorSpace,
                    // Marking-tool requires reading the WebGL canvas via
                    // toDataURL after the user paints. Without this, the
                    // browser is free to discard the drawing buffer after
                    // compositing and toDataURL returns a blank PNG.
                    preserveDrawingBuffer: true,
                }}
                onCreated={({ gl }) => {
                    // Section tool clips per-material; opt the renderer into local clipping.
                    gl.localClippingEnabled = true;
                }}
                raycaster={{
                    params: {
                        Line: { threshold: 0.4 },
                        Mesh: {},
                        LOD: {},
                        Points: { threshold: 0.2 },
                        Sprite: {}
                    }
                } as unknown as Partial<THREE.Raycaster>}
                onPointerMissed={() => {
                    setSelectedFace(null);
                    setSelectedSketchName(null);
                    setSelectedItemId(null);
                    setContextMenu({ visible: false, position: null, type: 'FACE' });
                }}
            >
                <ViewerScene
                    geometries={geometries}
                    previewGeometries={previewGeometries}
                    sketchesGeometries={sketchesGeometries}
                    showSketches={showSketches}
                    viewMode3D={viewMode3D}
                    gridPlacement={gridPlacement}
                    gridVisible={gridVisible}
                    sketchActive={sketchMode.active}
                    itemNames={itemNames}
                    hiddenIds={hiddenIds}
                    selectedItemIds={selectedItemIds}
                    selectedSketchName={selectedSketchName}
                    sectionKeepWhole={sectionKeepWhole}
                    clippingPlanes={clippingPlanes}
                    hoveredItem={hoveredItem}
                    setHoveredItem={setHoveredItem}
                    snapPoint={snapPoint}
                    setSnapPoint={setSnapPoint}
                    toggleSelection={toggleSelection}
                    setSelectedFace={setSelectedFace}
                    setSelectedSketchName={setSelectedSketchName}
                    setSelectedItemId={setSelectedItemId}
                    setContextMenu={setContextMenu}
                    navigationRequest={navigationRequest}
                    focusRequest={focusRequest}
                    viewportBackground={viewportBackground}
                    planes={planes}
                />
                {onDisplayReady ? (
                    <DisplayReadySensor geometries={geometries} onDisplayReady={onDisplayReady} />
                ) : null}
            </Canvas>
            <ViewGizmo
                onNavigate={(target) => setNavigationRequest((prev) => ({
                    target,
                    id: (prev?.id ?? 0) + 1,
                }))}
            />
            <div className="absolute top-4 left-4 text-white/50 text-xs pointer-events-none font-mono">
                kernelCAD v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'DEV'} ({typeof __COMMIT_HASH__ !== 'undefined' ? __COMMIT_HASH__ : 'DEV'}) | {viewMode3D === 'shadedWithEdges' ? 'Shaded + Edges' :
                    viewMode3D === 'wireframe' ? 'Wireframe' : 'Shaded'}
            </div>
        </div>
    );
}
