// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { useCallback, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { GeometryResult, SketchGeometry } from "../../shared/worker/geometryEngine";
import type { ViewMode3D, ViewportBackground } from "../../shared/types/viewMode";
import { useWorkbench } from "../context/WorkbenchContext";
import { useUI } from "../context/UIContext";
import { shellStore, useShellStore } from "../store/useShellStore";
import { markupStore } from "../markup/markupStore";
import { MarkupButton } from "./viewer/markup/MarkupButton";
import { MarkupTool } from "./viewer/markup/MarkupTool";
import { MarkupLayer } from "./viewer/markup/MarkupLayer";
import { MarkupCameraBridge } from "./viewer/markup/MarkupCameraBridge";

// Extracted Components
import { ViewerScene } from "./viewer/ViewerScene";
import { VIEWER_TONE_MAPPING, VIEWER_TONE_MAPPING_EXPOSURE } from "./viewer/viewerLighting";
import { PUBLISH_LOOK_EXPOSURE, PUBLISH_LOOK_TONE_MAPPING, type ViewerLook } from "./viewer/publishLook";
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
import { ExplodeButton } from "./viewer/explode/ExplodeButton";
import { useExplodedView } from "./viewer/explode/useExplodedView";
import { currentToolDock, subscribeToolDock } from "./viewer/cornerControls";

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
    /** 'publish' draws the model as a product render (the embed): smooth
     *  shading, soft feature edges, camera-relative studio lights, contact
     *  shadow, no grid. Default 'engineering' (Studio). */
    look?: ViewerLook;
    /** Extra R3F nodes drawn inside the canvas (the embed's Mark & fix pins). */
    canvasExtras?: ReactNode;
    /** Anchored notes and replayable markup are only enabled in Studio. */
    enableMarkup?: boolean;
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
        featureRecords,
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
        featureRecords,
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

function useToolDock(): HTMLElement | null {
    return useSyncExternalStore(subscribeToolDock, currentToolDock, () => null);
}

function ViewerToolButtons({ measuring, setMeasuring, dims, explode, enableMarkup }: {
    measuring: boolean;
    setMeasuring: (fn: (on: boolean) => boolean) => void;
    dims: ReturnType<typeof useViewerDimensions>;
    explode: ReturnType<typeof useExplodedView>;
    enableMarkup: boolean;
}): ReactNode {
    const dock = useToolDock();
    const markup = useSyncExternalStore(markupStore.subscribe, markupStore.getSnapshot, markupStore.getSnapshot);
    const buttons = (
        <>
            {enableMarkup ? <MarkupButton docked={dock != null} left={dims.available ? 'left-24' : 'left-14'} active={markup.panelOpen} onToggle={() => {
                if (markup.panelOpen) {
                    markupStore.closePanel();
                } else {
                    setMeasuring(() => false);
                    shellStore.setMarkingMode(false);
                    shellStore.setSectionMode(false);
                    markupStore.openPanel();
                }
            }} /> : null}
            <MeasureButton docked={dock != null} active={measuring} onToggle={() => {
                const next = !measuring;
                setMeasuring(() => next);
                if (next) markupStore.setMode('off');
            }} />
            {dims.available ? <DimensionsButton docked={dock != null} on={dims.on} onToggle={dims.toggle} legacy={dims.legacy} /> : null}
            {explode.available ? <ExplodeButton docked={dock != null} view={explode} left={enableMarkup ? (dims.available ? 'left-44' : 'left-24') : (dims.available ? 'left-[6.25rem]' : 'left-14')} /> : null}
        </>
    );
    return dock ? createPortal(buttons, dock) : buttons;
}

type SelectedViewerFace = { shapeIndex: number; faceId: number } | null;

function isHoveredEdgeForShape(
    hoveredEdge: ReturnType<typeof selectionCodeStore.getPreselect>,
    shapeIndex: number,
): hoveredEdge is { shapeIndex: number; kind: 'edge'; id: number } {
    return hoveredEdge?.kind === 'edge' && hoveredEdge.shapeIndex === shapeIndex;
}

function syncMarkupSelection(selection: SelectedViewerFace, geometries: GeometryResult[]): void {
    if (!selection || selection.faceId < 0) {
        markupStore.setSelection([]);
        return;
    }

    const geometry = geometries[selection.shapeIndex];
    const hoveredEdge = selectionCodeStore.getPreselect();
    if (isHoveredEdgeForShape(hoveredEdge, selection.shapeIndex)) {
        const featureId = geometry?.edgeOwners?.[hoveredEdge.id] ?? geometry?.featureId;
        markupStore.setSelection([{
            shapeIndex: hoveredEdge.shapeIndex,
            kind: 'edge',
            id: hoveredEdge.id,
            ...(featureId ? { featureId } : {}),
        }]);
        return;
    }

    const featureId = geometry?.faceOwners?.[selection.faceId] ?? geometry?.featureId;
    markupStore.setSelection([{
        shapeIndex: selection.shapeIndex,
        kind: 'face',
        id: selection.faceId,
        ...(featureId ? { featureId } : {}),
    }]);
}

type ViewerSetup = ReturnType<typeof useViewerSetup>;
type ViewerDimensions = ReturnType<typeof useViewerDimensions>;
type ViewerExplodedView = ReturnType<typeof useExplodedView>;

interface ViewerCanvasContentsProps extends ViewerProps {
    setup: ViewerSetup;
    dims: ViewerDimensions;
    explode: ViewerExplodedView;
    measuring: boolean;
    updateSelectedFace: (selection: SelectedViewerFace) => void;
    shownPlanes: ViewerSetup['planes'];
}

function ViewerCanvasContents({
    geometries, previewGeometries, sketchesGeometries, showSketches, viewMode3D,
    onDisplayReady, background, canvasExtras, look = 'engineering', enableMarkup = false,
    setup, dims, explode, measuring, updateSelectedFace, shownPlanes,
}: ViewerCanvasContentsProps) {
    const {
        hiddenIds, gridPlacement, gridVisible, sketchMode, itemNames, selectedItemIds,
        selectedSketchName, sectionKeepWhole, clippingPlanes, hoveredItem, setHoveredItem,
        snapPoint, setSnapPoint, toggleSelection, setSelectedSketchName, setSelectedItemId,
        setContextMenu, navigationRequest, focusRequest, viewportBackground,
    } = setup;

    return (
        <>
            <ViewerScene
                geometries={explode.geometries}
                cameraGeometries={geometries}
                fitPoints={dims.on ? dims.fitPoints : undefined}
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
                setSelectedFace={updateSelectedFace}
                setSelectedSketchName={setSelectedSketchName}
                setSelectedItemId={setSelectedItemId}
                setContextMenu={setContextMenu}
                navigationRequest={navigationRequest}
                focusRequest={focusRequest}
                viewportBackground={background ?? viewportBackground}
                planes={shownPlanes}
                look={look}
                enableMarkup={enableMarkup}
            />
            {enableMarkup ? <MarkupCameraBridge /> : null}
            {dims.on ? <DimensionsOverlay dimensions={dims.dimensions} bounds={dims.bounds} /> : null}
            {measuring ? <MeasureTool
                geometries={explode.geometries}
                itemNames={itemNames}
                hiddenIds={hiddenIds}
                onMeasurementAdded={enableMarkup ? (measurement) => {
                    const added = markupStore.addMeasurement(measurement);
                    if (added) markupStore.setSelection(measurement.refs);
                    return added;
                } : undefined}
            /> : null}
            {enableMarkup ? <MarkupTool /> : null}
            {enableMarkup ? <MarkupLayer geometries={explode.geometries} itemNames={itemNames} hiddenIds={hiddenIds} /> : null}
            {canvasExtras}
            {onDisplayReady ? <DisplayReadySensor geometries={geometries} onDisplayReady={onDisplayReady} /> : null}
        </>
    );
}

function ViewerCanvas({ look, onPointerMissed, children }: {
    look: ViewerLook;
    onPointerMissed: () => void;
    children: ReactNode;
}) {
    return (
        <Canvas
            camera={{ position: [40, 40, 40], fov: SKETCH_FOV }}
            gl={{
                // AgX holds saturated CAD hues (ACES Filmic does not) and rolls light aluminium and plastic off before they clip to white.
                // The publish look uses Neutral like the product render, to keep clear-coat highlights without AgX's grey cast.
                toneMapping: look === 'publish' ? PUBLISH_LOOK_TONE_MAPPING : VIEWER_TONE_MAPPING,
                outputColorSpace: THREE.SRGBColorSpace,
                // The marking tool reads this drawing buffer with toDataURL after painting.
                preserveDrawingBuffer: true,
            }}
            onCreated={({ gl }) => {
                gl.localClippingEnabled = true;
                gl.toneMappingExposure = look === 'publish' ? PUBLISH_LOOK_EXPOSURE : VIEWER_TONE_MAPPING_EXPOSURE;
            }}
            raycaster={{
                params: {
                    Line: { threshold: 0.4 },
                    Mesh: {},
                    LOD: {},
                    Points: { threshold: 0.2 },
                    Sprite: {},
                },
            } as unknown as Partial<THREE.Raycaster>}
            onPointerMissed={onPointerMissed}
        >
            {children}
        </Canvas>
    );
}

function useViewerDisplayReady(
    geometries: GeometryResult[],
    onDisplayReady: (() => void) | undefined,
    trackDisplayReady: boolean,
) {
    const [readyGeometries, setReadyGeometries] = useState<GeometryResult[] | null>(null);
    const markDisplayReady = useCallback(() => {
        setReadyGeometries(geometries);
        onDisplayReady?.();
    }, [geometries, onDisplayReady]);

    return {
        isDisplayReady: readyGeometries === geometries,
        onDisplayReady: trackDisplayReady || onDisplayReady ? markDisplayReady : undefined,
    };
}

export default function Viewer({
    geometries, previewGeometries, sketchesGeometries, showSketches, viewMode3D,
    onDisplayReady, background, meshDimensions, showOriginPlanes = true, canvasExtras,
    look = 'engineering', enableMarkup = false,
}: ViewerProps) {
    const displayReady = useViewerDisplayReady(geometries, onDisplayReady, enableMarkup);
    const setup = useViewerSetup(geometries);
    const [measuring, setMeasuring] = useState(false);
    const dims = useViewerDimensions(meshDimensions ?? setup.meshDimensions);
    const explode = useExplodedView(geometries, setup.featureRecords);
    const { setSelectedFace } = setup;
    const updateSelectedFace = useCallback((selection: SelectedViewerFace) => {
        setSelectedFace(selection);
        if (enableMarkup) syncMarkupSelection(selection, explode.geometries);
    }, [enableMarkup, explode.geometries, setSelectedFace]);
    const shownPlanes = useMemo(
        () => (showOriginPlanes ? setup.planes : setup.planes.filter((p) => p.type !== 'base')),
        [setup.planes, showOriginPlanes],
    );

    return (
        <div
            className="w-full h-full relative"
            style={{ cursor: setup.cursor }}
            data-testid="viewer-container"
            data-model-display-ready={enableMarkup ? String(displayReady.isDisplayReady) : undefined}
        >
            <ViewerCanvas look={look} onPointerMissed={() => {
                updateSelectedFace(null);
                setup.setSelectedSketchName(null);
                setup.setSelectedItemId(null);
                setup.setContextMenu({ visible: false, position: null, type: 'FACE' });
                selectionCodeStore.clearLink();
            }}>
                <ViewerCanvasContents
                    geometries={geometries}
                    previewGeometries={previewGeometries}
                    sketchesGeometries={sketchesGeometries}
                    showSketches={showSketches}
                    viewMode3D={viewMode3D}
                    onDisplayReady={displayReady.onDisplayReady}
                    background={background}
                    canvasExtras={canvasExtras}
                    look={look}
                    enableMarkup={enableMarkup}
                    setup={setup}
                    dims={dims}
                    explode={explode}
                    measuring={measuring}
                    updateSelectedFace={updateSelectedFace}
                    shownPlanes={shownPlanes}
                />
            </ViewerCanvas>
            <CodeLinkLabel />
            <ViewerToolButtons measuring={measuring} setMeasuring={setMeasuring} dims={dims} explode={explode} enableMarkup={enableMarkup} />
            <ViewGizmo onNavigate={(target) => setup.setNavigationRequest((prev) => ({
                target,
                id: (prev?.id ?? 0) + 1,
            }))} />
        </div>
    );
}
