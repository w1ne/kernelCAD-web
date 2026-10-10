// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { useMemo, useState, type ReactNode } from "react";
import type { GeometryResult, SketchGeometry } from "../../shared/worker/geometryEngine";
import type { ViewMode3D, ViewportBackground } from "../../shared/types/viewMode";
import { useWorkbench } from "../context/WorkbenchContext";
import { useUI } from "../context/UIContext";
import { useShellStore } from "../store/useShellStore";

// Extracted Components
import { ViewerScene } from "./viewer/ViewerScene";
import { VIEWER_TONE_MAPPING, VIEWER_TONE_MAPPING_EXPOSURE } from "./viewer/viewerLighting";
import { DisplayReadySensor } from "./viewer/DisplayReadySensor";
import { ViewGizmo } from "./viewer/overlays/ViewGizmo";
import { CodeLinkLabel } from "./viewer/overlays/CodeLinkLabel";
import { MeasureButton } from "./viewer/measure/MeasureButton";
import { MeasureTool } from "./viewer/measure/MeasureTool";
import { DimensionsOverlay } from "./viewer/dimensions/DimensionsOverlay";
import { DimensionsButton } from "./viewer/dimensions/DimensionsButton";
import { useViewerDimensions } from "./viewer/dimensions/useViewerDimensions";
import type { MeshDimensionsInfo } from "./viewer/dimensions/boundsDimensions";
import { selectionCodeStore } from "../selectionCode/selectionCodeStore";

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
    /** Overrides the stored viewport background (the embed's `?theme=`). */
    background?: ViewportBackground;
    /** Dimensions of a stored mesh artifact (ChatGPT widget). Otherwise the
     *  workbench's last mesh payload is used. */
    meshDimensions?: MeshDimensionsInfo | null;
    /** Draw Studio's origin XY/XZ/YZ planes (default). The public viewers
     *  (/p page, ChatGPT widget, embed) pass false: the planes are a modelling
     *  aid there is nothing to do with, and they sit on the model's origin. */
    showOriginPlanes?: boolean;
    /** Extra R3F nodes drawn inside the canvas (the embed's Mark & fix pins). */
    canvasExtras?: ReactNode;
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
        setHoveredItemId,
        meshDimensions,
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
        meshDimensions,
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

export default function Viewer({ geometries, previewGeometries, sketchesGeometries, showSketches, viewMode3D, onDisplayReady, background, meshDimensions, showOriginPlanes = true, canvasExtras }: ViewerProps) {
    const {
        meshDimensions: workbenchDimensions, setSelectedFace, selectedSketchName, setSelectedSketchName, sketchMode, planes, hiddenIds,
        selectedItemIds, setSelectedItemId, toggleSelection, setContextMenu, viewportBackground,
        gridVisible, gridPlacement, sectionKeepWhole, clippingPlanes, itemNames, hoveredItem,
        setHoveredItem, snapPoint, setSnapPoint, navigationRequest, setNavigationRequest,
        focusRequest, cursor,
    } = useViewerSetup(geometries);
    const [measuring, setMeasuring] = useState(false);
    const dims = useViewerDimensions(meshDimensions ?? workbenchDimensions);
    const shownPlanes = useMemo(
        () => (showOriginPlanes ? planes : planes.filter((p) => p.type !== 'base')),
        [planes, showOriginPlanes],
    );

    return (
        <div className="w-full h-full relative" style={{ cursor }} data-testid="viewer-container">
            <Canvas
                camera={{ position: [40, 40, 40], fov: SKETCH_FOV }}
                gl={{
                    // AgX holds saturated CAD hues (ACES Filmic does not) and
                    // rolls light aluminium and plastic off before they clip
                    // to white. The demo player keeps its own Neutral rig;
                    // that path is calibrated for hero capture, not this canvas.
                    toneMapping: VIEWER_TONE_MAPPING,
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
                    gl.toneMappingExposure = VIEWER_TONE_MAPPING_EXPOSURE;
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
                    selectionCodeStore.clearLink();
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
                    viewportBackground={background ?? viewportBackground}
                    planes={shownPlanes}
                />
                {dims.on ? <DimensionsOverlay dimensions={dims.dimensions} bounds={dims.bounds} /> : null}
                {measuring ? <MeasureTool geometries={geometries} itemNames={itemNames} hiddenIds={hiddenIds} /> : null}
                {canvasExtras}
                {onDisplayReady ? (
                    <DisplayReadySensor geometries={geometries} onDisplayReady={onDisplayReady} />
                ) : null}
            </Canvas>
            <CodeLinkLabel />
            <MeasureButton active={measuring} onToggle={() => setMeasuring((on) => !on)} />
            {dims.available ? <DimensionsButton on={dims.on} onToggle={dims.toggle} legacy={dims.legacy} /> : null}
            <ViewGizmo
                onNavigate={(target) => setNavigationRequest((prev) => ({
                    target,
                    id: (prev?.id ?? 0) + 1,
                }))}
            />
        </div>
    );
}
