// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as THREE from "three";
import { useLayoutEffect } from "react";
import { useThree } from "@react-three/fiber";
import { Grid } from "@react-three/drei/core/Grid";
import { OrbitControls } from "@react-three/drei/core/OrbitControls";
import { installRoomEnvironment } from "./roomEnvironment";
import { VIEWER_FILL_LIGHT, VIEWER_HEMISPHERE, VIEWER_KEY_LIGHT } from "./viewerLighting";
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
import { CodeLinkOverlay } from "./overlays/CodeLinkOverlay";
import { GeometryLayer } from "./layers/GeometryLayer";
import { SketchLayer } from "./layers/SketchLayer";
import { DirectEditGizmo } from "./DirectEditGizmo";
import { PlaneLayer } from "./entities/PlaneEntity";
import { ParametricLayer } from "./layers/ParametricLayer";
import { GhostShape } from "./entities/ShapeGeometry";
import { CameraHandler } from "./controllers/CameraHandler";
import { CAPTURE_HIDDEN_FLAG } from "./captureViewerPng";
import { PublishStage } from "./PublishStage";
import type { ViewerLook } from "./publishLook";

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
    /** 'publish' (embed): studio rig + contact shadow instead of the
     *  engineering lights, and no ground grid. */
    look?: ViewerLook;
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
    look = 'engineering',
}: ViewerSceneProps) {
    const publish = look === 'publish';
    return (
        <>
            <RoomEnvironmentRig />
            <RendererSnapshotPublisher />
            <SceneBackground mode={viewportBackground} />

            {publish
                ? <PublishStage geometries={geometries} background={viewportBackground} />
                : <SceneLights />}

            <SceneOverlays
                geometries={geometries}
                itemNames={itemNames}
                selectedItemIds={selectedItemIds}
                hoveredItem={hoveredItem}
                setHoveredItem={setHoveredItem}
                snapPoint={snapPoint}
                setSnapPoint={setSnapPoint}
                mouseHoverOnly={publish}
            />

            <GroundGrid
                gridPlacement={gridPlacement}
                gridVisible={gridVisible && !publish}
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
                look={look}
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

/** Procedural IBL on the scene this canvas actually renders. Lives in the
 *  tree so its cleanup is the effect cleanup, not a module-level handle that
 *  a second canvas or a StrictMode remount can use to blank the live scene. */
function RoomEnvironmentRig() {
    const gl = useThree((state) => state.gl);
    const scene = useThree((state) => state.scene);
    useLayoutEffect(() => installRoomEnvironment(gl, scene), [gl, scene]);
    return null;
}

function SceneLights() {
    return (
        <>
            <hemisphereLight
                color={VIEWER_HEMISPHERE.sky}
                groundColor={VIEWER_HEMISPHERE.ground}
                intensity={VIEWER_HEMISPHERE.intensity}
                position={VIEWER_HEMISPHERE.position}
            />
            <directionalLight position={VIEWER_KEY_LIGHT.position} intensity={VIEWER_KEY_LIGHT.intensity} />
            <directionalLight position={VIEWER_FILL_LIGHT.position} intensity={VIEWER_FILL_LIGHT.intensity} />
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
    mouseHoverOnly,
}: Pick<
    ViewerSceneProps,
    | 'geometries'
    | 'itemNames'
    | 'selectedItemIds'
    | 'hoveredItem'
    | 'setHoveredItem'
    | 'snapPoint'
    | 'setSnapPoint'
> & { mouseHoverOnly: boolean }) {
    return (
        <>
            <InteractionHandler setHovered={setHoveredItem} setSnap={setSnapPoint} mouseHoverOnly={mouseHoverOnly} />
            <HighlightOverlay hovered={hoveredItem} geometries={geometries} />
            <SnapIndicator snap={snapPoint} />
            <SelectionOutline geometries={geometries} itemNames={itemNames} selectedItemIds={selectedItemIds} />
            <CodeLinkOverlay geometries={geometries} itemNames={itemNames} />
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
