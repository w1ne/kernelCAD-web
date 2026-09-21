// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as THREE from "three";
import { Grid } from "@react-three/drei/core/Grid";
import { OrbitControls } from "@react-three/drei/core/OrbitControls";
import type { GeometryResult, SketchGeometry } from "../../../shared/worker/geometryEngine";
import type { SketchPlaneEntity } from "../../../shared/types/plane";
import type { ViewMode3D, ViewportBackground } from "../../../shared/types/viewMode";
import type { HoverResult } from "../../features-ui/interaction/HoverManager";
import type { SnapResult } from "../../features-ui/interaction/SnapManager";
import type { ViewTarget } from "./controllers/cameraPose";
import type { ViewportFocusTarget } from "../../store/shellStore";
import { RendererSnapshotPublisher } from "./RendererSnapshotPublisher";
import { SceneBackground } from "./SceneBackground";
import { InteractionHandler } from "./controllers/InteractionHandler";
import { HighlightOverlay } from "./overlays/HighlightOverlay";
import { SnapIndicator } from "./overlays/SnapIndicator";
import { SelectionOutline } from "./overlays/SelectionOutline";
import { GeometryLayer } from "./layers/GeometryLayer";
import { SketchLayer } from "./layers/SketchLayer";
import { DirectEditGizmo } from "./DirectEditGizmo";
import { PlaneLayer } from "./entities/PlaneEntity";
import { ParametricLayer } from "./layers/ParametricLayer";
import { GhostShape } from "./entities/ShapeGeometry";
import { CameraHandler } from "./controllers/CameraHandler";
import { CAPTURE_HIDDEN_FLAG } from "./captureViewerPng";

// Tag value for scene furniture (origin construction planes + ground grid) that
// render-to-image capture hides so the PNG shows the clean framed model, not the
// authoring view. Read by captureViewerPngBase64; see captureViewerPng.ts.
const CAPTURE_HIDDEN_USERDATA = { [CAPTURE_HIDDEN_FLAG]: true } as const;

type ContextMenuRequest = {
    visible: boolean;
    position: { x: number; y: number } | null;
    type: 'FACE' | 'EDGE' | 'VERTEX' | 'SKETCH';
};

interface ViewerSceneProps {
    geometries: GeometryResult[];
    previewGeometries: GeometryResult[];
    sketchesGeometries: SketchGeometry[];
    showSketches: boolean;
    viewMode3D: ViewMode3D;
    gridPlacement: { z: number; fade: number };
    gridVisible: boolean;
    sketchActive: boolean;
    itemNames: (string | null)[];
    hiddenIds: string[];
    selectedItemIds: string[];
    selectedSketchName: string | null;
    sectionKeepWhole: ReadonlySet<string>;
    clippingPlanes: THREE.Plane[];
    hoveredItem: HoverResult | null;
    setHoveredItem: (hovered: HoverResult | null) => void;
    snapPoint: SnapResult | null;
    setSnapPoint: (snap: SnapResult | null) => void;
    toggleSelection: (id: string, multi: boolean) => void;
    setSelectedFace: (selection: { shapeIndex: number; faceId: number } | null) => void;
    setSelectedSketchName: (name: string | null) => void;
    setSelectedItemId: (id: string | null) => void;
    setContextMenu: (menu: ContextMenuRequest) => void;
    navigationRequest: { target: ViewTarget; id: number } | null;
    focusRequest: { target: ViewportFocusTarget; id: number } | null;
    viewportBackground: ViewportBackground;
    planes: SketchPlaneEntity[];
}

/**
 * Everything Canvas renders, extracted verbatim from Viewer so the scene tree
 * and render order stay identical.
 */
export function ViewerScene({
    geometries,
    previewGeometries,
    sketchesGeometries,
    showSketches,
    viewMode3D,
    gridPlacement,
    gridVisible,
    sketchActive,
    itemNames,
    hiddenIds,
    selectedItemIds,
    selectedSketchName,
    sectionKeepWhole,
    clippingPlanes,
    hoveredItem,
    setHoveredItem,
    snapPoint,
    setSnapPoint,
    toggleSelection,
    setSelectedFace,
    setSelectedSketchName,
    setSelectedItemId,
    setContextMenu,
    navigationRequest,
    focusRequest,
    viewportBackground,
    planes,
}: ViewerSceneProps) {
    return (
        <>
            <RendererSnapshotPublisher />
            <SceneBackground mode={viewportBackground} />

            <SceneLights />

            <SceneOverlays
                geometries={geometries}
                itemNames={itemNames}
                selectedItemIds={selectedItemIds}
                hoveredItem={hoveredItem}
                setHoveredItem={setHoveredItem}
                snapPoint={snapPoint}
                setSnapPoint={setSnapPoint}
            />

            <GroundGrid
                gridPlacement={gridPlacement}
                gridVisible={gridVisible}
                sketchActive={sketchActive}
            />

            <GeometryLayer
                geometries={geometries}
                itemNames={itemNames}
                hiddenIds={hiddenIds}
                viewMode3D={viewMode3D}
                selectedItemIds={selectedItemIds}
                sectionKeepWhole={sectionKeepWhole}
                clippingPlanes={clippingPlanes}
            />

            <group>
                {previewGeometries.map((g, i) => (
                    <GhostShape key={`preview-${i}`} geometry={g} />
                ))}
            </group>

            <SketchEditLayers
                showSketches={showSketches}
                sketchesGeometries={sketchesGeometries}
                hiddenIds={hiddenIds}
                selectedSketchName={selectedSketchName}
                selectedItemIds={selectedItemIds}
                toggleSelection={toggleSelection}
                setSelectedFace={setSelectedFace}
                setSelectedSketchName={setSelectedSketchName}
                setSelectedItemId={setSelectedItemId}
                setContextMenu={setContextMenu}
                sketchActive={sketchActive}
                geometries={geometries}
                itemNames={itemNames}
                planes={planes}
            />

            <SceneControls
                sketchActive={sketchActive}
                geometries={geometries}
                navigationRequest={navigationRequest}
                focusRequest={focusRequest}
            />
        </>
    );
}

function SceneLights() {
    return (
        <>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 20, 10]} intensity={0.7} />
            <directionalLight position={[-5, -10, -5]} intensity={0.3} />
        </>
    );
}

function SceneOverlays({
    geometries,
    itemNames,
    selectedItemIds,
    hoveredItem,
    setHoveredItem,
    snapPoint,
    setSnapPoint,
}: Pick<
    ViewerSceneProps,
    | 'geometries'
    | 'itemNames'
    | 'selectedItemIds'
    | 'hoveredItem'
    | 'setHoveredItem'
    | 'snapPoint'
    | 'setSnapPoint'
>) {
    return (
        <>
            <InteractionHandler setHovered={setHoveredItem} setSnap={setSnapPoint} />
            <HighlightOverlay hovered={hoveredItem} geometries={geometries} />
            <SnapIndicator snap={snapPoint} />
            <SelectionOutline geometries={geometries} itemNames={itemNames} selectedItemIds={selectedItemIds} />
        </>
    );
}

function GroundGrid({
    gridPlacement,
    gridVisible,
    sketchActive,
}: Pick<ViewerSceneProps, 'gridPlacement' | 'gridVisible' | 'sketchActive'>) {
    return (
        <>
            {!sketchActive && gridVisible && (
                <group userData={CAPTURE_HIDDEN_USERDATA}>
                    <Grid
                        position={[0, 0, gridPlacement.z]}
                        rotation={[Math.PI / 2, 0, 0]}
                        infiniteGrid
                        cellSize={5}
                        sectionSize={25}
                        cellColor="#404040"
                        sectionColor="#606060"
                        fadeDistance={gridPlacement.fade}
                        fadeStrength={1.5}
                    />
                </group>
            )}
        </>
    );
}

function SketchEditLayers({
    showSketches,
    sketchesGeometries,
    hiddenIds,
    selectedSketchName,
    selectedItemIds,
    toggleSelection,
    setSelectedFace,
    setSelectedSketchName,
    setSelectedItemId,
    setContextMenu,
    sketchActive,
    geometries,
    itemNames,
    planes,
}: Pick<
    ViewerSceneProps,
    | 'showSketches'
    | 'sketchesGeometries'
    | 'hiddenIds'
    | 'selectedSketchName'
    | 'selectedItemIds'
    | 'toggleSelection'
    | 'setSelectedFace'
    | 'setSelectedSketchName'
    | 'setSelectedItemId'
    | 'setContextMenu'
    | 'sketchActive'
    | 'geometries'
    | 'itemNames'
    | 'planes'
>) {
    return (
        <>
            {showSketches && (
                <SketchLayer
                    sketchesGeometries={sketchesGeometries}
                    hiddenIds={hiddenIds}
                    selectedSketchName={selectedSketchName}
                    selectedItemIds={selectedItemIds}
                    toggleSelection={toggleSelection}
                    setSelectedFace={setSelectedFace}
                    setSelectedSketchName={setSelectedSketchName}
                    setSelectedItemId={setSelectedItemId}
                    setContextMenu={setContextMenu}
                />
            )}

            {!sketchActive && (
                <DirectEditGizmo geometries={geometries} itemNames={itemNames} />
            )}

            <group userData={CAPTURE_HIDDEN_USERDATA}>
                <PlaneLayer planes={planes} />
            </group>
            {sketchActive && <ParametricLayer />}
        </>
    );
}

function SceneControls({
    sketchActive,
    geometries,
    navigationRequest,
    focusRequest,
}: Pick<ViewerSceneProps, 'sketchActive' | 'geometries' | 'navigationRequest' | 'focusRequest'>) {
    return (
        <>
            <OrbitControls
                makeDefault
                enabled={!sketchActive}
                mouseButtons={{
                    LEFT: THREE.MOUSE.ROTATE,
                    MIDDLE: THREE.MOUSE.PAN,
                    RIGHT: THREE.MOUSE.PAN,
                }}
                touches={{
                    ONE: THREE.TOUCH.ROTATE,
                    TWO: THREE.TOUCH.DOLLY_PAN,
                }}
                screenSpacePanning
                enableDamping
                dampingFactor={0.12}
            />
            <CameraHandler
                geometries={geometries}
                navigationRequest={navigationRequest}
                focusRequest={focusRequest}
            />
        </>
    );
}
