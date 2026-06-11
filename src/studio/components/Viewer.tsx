// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { Canvas } from "@react-three/fiber";
// Subpath imports — pulling from the barrel index made vite prebundle 3.6MB
// of drei. We only use 3 components total across the whole app.
import { OrbitControls } from "@react-three/drei/core/OrbitControls";
import { Grid } from "@react-three/drei/core/Grid";
import { RendererSnapshotPublisher } from "./viewer/RendererSnapshotPublisher";
import * as THREE from "three";
import { useEffect, useMemo, useState } from "react";
import type { GeometryResult, SketchGeometry } from "../../shared/worker/geometryEngine";
import type { ViewMode3D } from "../../shared/types/viewMode";
import { useWorkbench } from "../context/WorkbenchContext";
import { useUI } from "../context/UIContext";
import { useShellStore } from "../store/useShellStore";
import { cutawayPlanesFromState } from "./viewer/sectionPlane";
import { computeGeometryBox } from "./viewer/sectionRange";
import { sectionPartKey } from "./viewer/sectionParts";
import type { HoverResult } from "../features-ui/interaction/HoverManager";
import type { SnapResult } from "../features-ui/interaction/SnapManager";

// Extracted Components
import { SketchLine } from "./viewer/entities/SketchLine";
import { Shape, GhostShape } from "./viewer/entities/ShapeGeometry";
import { PlaneLayer } from "./viewer/entities/PlaneEntity";
import { ParametricLayer } from "./viewer/layers/ParametricLayer";
import { CameraHandler } from "./viewer/controllers/CameraHandler";
import { InteractionHandler } from "./viewer/controllers/InteractionHandler";
import { SnapIndicator } from "./viewer/overlays/SnapIndicator";
import { HighlightOverlay } from "./viewer/overlays/HighlightOverlay";
import { SelectionOutline } from "./viewer/overlays/SelectionOutline";
import { SceneBackground } from "./viewer/SceneBackground";

// Constants
export const SKETCH_FOV = 40;
export const SKETCH_DISTANCE = 20;

// Stable empty array so keep-whole shapes never re-memo their materials.
const NO_PLANES: THREE.Plane[] = [];

interface ViewerProps {
    geometries: GeometryResult[];
    previewGeometries: GeometryResult[];
    sketchesGeometries: SketchGeometry[];
    showSketches: boolean;
    viewMode3D: ViewMode3D;
}

export default function Viewer({ geometries, previewGeometries, sketchesGeometries, showSketches, viewMode3D }: ViewerProps) {
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

    // kernelCAD models are z-up, so the ground grid must lie in the XY plane
    // at the model's lowest point — drei's default y-up XZ grid would slice
    // vertically through the model. Nudged slightly below min-z to avoid
    // z-fighting with bottom faces; fade scales with model size.
    const gridPlacement = useMemo(() => {
        const box = computeGeometryBox(geometries);
        if (!box) return { z: 0, fade: 300 };
        const size = box.getSize(new THREE.Vector3());
        const radius = Math.max(size.x, size.y, size.z) / 2;
        return { z: box.min.z - 0.1, fade: Math.max(300, radius * 8) };
    }, [geometries]);

    const {
        sectionMode, sectionAxesEnabled, sectionSides, sectionOffsets, sectionKeepWhole,
    } = useShellStore();
    // Three stable plane instances, mutated in place so slider/side changes
    // never rebuild materials (only mode/axis-count switches do — see ShapeGeometry).
    const sectionPlaneRefs = useMemo(
        () => [
            new THREE.Plane(new THREE.Vector3(0, 0, -1), 0),
            new THREE.Plane(new THREE.Vector3(0, 0, -1), 0),
            new THREE.Plane(new THREE.Vector3(0, 0, -1), 0),
        ],
        [],
    );
    useEffect(() => {
        cutawayPlanesFromState(sectionAxesEnabled, sectionSides, sectionOffsets)
            .forEach((p, i) => sectionPlaneRefs[i].copy(p));
    }, [sectionPlaneRefs, sectionAxesEnabled, sectionSides, sectionOffsets]);
    const clippingPlanes = useMemo(() => {
        if (!sectionMode) return NO_PLANES;
        const count = (['x', 'y', 'z'] as const).filter((a) => sectionAxesEnabled[a]).length;
        return count === 0 ? NO_PLANES : sectionPlaneRefs.slice(0, count);
    }, [sectionMode, sectionAxesEnabled, sectionPlaneRefs]);

    const itemNames = useMemo(() => {
        return (codeContext?.returnedVariables as (string | null)[]) || [];
    }, [codeContext]);

    const [hoveredItem, setHoveredItem] = useState<HoverResult | null>(null);
    const [snapPoint, setSnapPoint] = useState<SnapResult | null>(null);

    useEffect(() => {
        if (hoveredItem?.object?.userData?.ownerId) {
            setHoveredItemId(hoveredItem.object.userData.ownerId);
        } else {
            setHoveredItemId(null);
        }
    }, [hoveredItem, setHoveredItemId]);

    const cursor = useMemo(() => {
        if (sketchMode.active) return 'crosshair';
        if (hoveredItem) {
            if (hoveredItem.type === 'VERTEX') return 'move';
            return 'pointer';
        }
        return 'default';
    }, [hoveredItem, sketchMode.active]);

    return (
        <div className="w-full h-full relative" style={{ cursor }} data-testid="viewer-container">
            <Canvas
                camera={{ position: [40, 40, 40], fov: SKETCH_FOV }}
                gl={{
                    toneMapping: THREE.ACESFilmicToneMapping,
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
                <RendererSnapshotPublisher />
                <SceneBackground mode={viewportBackground} />

                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 20, 10]} intensity={0.7} />
                <directionalLight position={[-5, -10, -5]} intensity={0.3} />

                <InteractionHandler setHovered={setHoveredItem} setSnap={setSnapPoint} />
                <HighlightOverlay hovered={hoveredItem} geometries={geometries} />
                <SnapIndicator snap={snapPoint} />
                <SelectionOutline geometries={geometries} itemNames={itemNames} selectedItemIds={selectedItemIds} />

                {!sketchMode.active && gridVisible && (
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
                )}

                <group>
                    {geometries.map((g, i) => {
                        const name = itemNames[i];
                        if (name && hiddenIds.includes(name)) return null;
                        // Hide whole assembly parts by name (the Parts list in the
                        // Scene tab toggles `assemblyPartName` into hiddenIds).
                        if (g.assemblyPartName && hiddenIds.includes(g.assemblyPartName)) return null;
                        const partKey = sectionPartKey(g, name, i);
                        return (
                            <Shape
                                key={i}
                                geometry={g}
                                shapeIndex={i}
                                viewMode3D={viewMode3D}
                                clippingPlanes={sectionKeepWhole.has(partKey) ? NO_PLANES : clippingPlanes}
                                clipIntersection={true}
                                isSelected={name ? selectedItemIds.includes(name) : false}
                                name={name ?? undefined}
                            />
                        );
                    })}
                </group>

                <group>
                    {previewGeometries.map((g, i) => (
                        <GhostShape key={`preview-${i}`} geometry={g} />
                    ))}
                </group>

                {showSketches && (
                    <group>
                        {sketchesGeometries.filter(s => !hiddenIds.includes(s.name)).map((s) => (
                            <SketchLine
                                key={s.id}
                                sketch={s}
                                isSelected={selectedSketchName === s.name || selectedItemIds.includes(s.name)}
                                onClick={(e) => {
                                    const isMulti = e ? (e.metaKey || e.ctrlKey || e.shiftKey) : false;
                                    if (isMulti) {
                                        toggleSelection(s.name, true);
                                        return;
                                    }

                                    setSelectedFace(null);
                                    setSelectedSketchName(s.name);
                                    setSelectedItemId(s.name);

                                    if (e) {
                                        const x = e.nativeEvent.clientX;
                                        const y = e.nativeEvent.clientY;
                                        setContextMenu({
                                            visible: true,
                                            position: { x, y },
                                            type: 'SKETCH'
                                        });
                                    }
                                }}
                            />
                        ))}
                    </group>
                )}

                <PlaneLayer planes={planes} />
                {sketchMode.active && <ParametricLayer />}
                <OrbitControls makeDefault enabled={!sketchMode.active} />
                <CameraHandler geometries={geometries} />
            </Canvas>
            <div className="absolute top-4 left-4 text-white/50 text-xs pointer-events-none font-mono">
                kernelCAD v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'DEV'} ({typeof __COMMIT_HASH__ !== 'undefined' ? __COMMIT_HASH__ : 'DEV'}) | {viewMode3D === 'shadedWithEdges' ? 'Shaded + Edges' :
                    viewMode3D === 'wireframe' ? 'Wireframe' : 'Shaded'}
            </div>
        </div>
    );
}
