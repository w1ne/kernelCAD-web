import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import * as THREE from "three";
import { useEffect, useMemo, useState } from "react";
import type { GeometryResult, SketchGeometry } from "../lib/geometryEngine";
import type { ViewMode3D } from "../types/viewMode";
import { useWorkbench } from "../context/WorkbenchContext";
import { useUI } from "../context/UIContext";
import type { HoverResult } from "../features/interaction/HoverManager";
import type { SnapResult } from "../features/interaction/SnapManager";
import { extractReturnedHistoryItemIds } from "../lib/codeAnalysis";

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

// Constants
export const SKETCH_FOV = 40;
export const SKETCH_DISTANCE = 20;

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
        setHoveredItemId,
        code
    } = useWorkbench();

    const { setContextMenu } = useUI();

    const itemNames = useMemo(() => {
        return (codeContext?.returnedVariables as (string | null)[]) || [];
    }, [codeContext]);
    const itemIds = useMemo(() => {
        const ids = extractReturnedHistoryItemIds(code);
        if (ids.length === itemNames.length) return ids;
        // Keep array alignment with rendered geometry list even if parser cannot recover.
        return itemNames.map((_, idx) => ids[idx] ?? null);
    }, [code, itemNames]);

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
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 20, 10]} intensity={0.7} />
                <directionalLight position={[-5, -10, -5]} intensity={0.3} />

                <InteractionHandler setHovered={setHoveredItem} setSnap={setSnapPoint} />
                <HighlightOverlay hovered={hoveredItem} geometries={geometries} />
                <SnapIndicator snap={snapPoint} />
                <SelectionOutline geometries={geometries} itemIds={itemIds} selectedItemIds={selectedItemIds} />

                {!sketchMode.active && (
                    <Grid args={[200, 200]} cellColor="#404040" sectionColor="#606060" fadeDistance={100} />
                )}

                <group>
                    {geometries.map((g, i) => {
                        const name = itemNames[i];
                        const itemId = itemIds[i] ?? undefined;
                        if (name && hiddenIds.includes(name)) return null;
                        return (
                            <Shape
                                key={i}
                                geometry={g}
                                shapeIndex={i}
                                viewMode3D={viewMode3D}
                                isSelected={itemId ? selectedItemIds.includes(itemId) : false}
                                name={name ?? undefined}
                                itemId={itemId}
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
                        {sketchesGeometries.filter(s => !hiddenIds.includes(s.name)).map((s) => {
                            return (
                                <SketchLine
                                    key={s.id}
                                    sketch={s}
                                    ownerId={s.id}
                                    isSelected={selectedSketchName === s.name || selectedItemIds.includes(s.id)}
                                    onClick={(e) => {
                                        const isMulti = e ? (e.metaKey || e.ctrlKey || e.shiftKey) : false;
                                        if (isMulti) {
                                            toggleSelection(s.id, true);
                                            return;
                                        }

                                        setSelectedFace(null);
                                        setSelectedSketchName(s.name);
                                        setSelectedItemId(s.id);

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
                            );
                        })}
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
