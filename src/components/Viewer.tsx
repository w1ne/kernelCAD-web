import { Canvas, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, TransformControls } from "@react-three/drei";
import * as THREE from "three";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { GeometryResult, FaceGeometry, SketchGeometry } from "../lib/geometryEngine";
import type { ViewMode3D } from "../types/viewMode";
import { useWorkbench } from "../context/WorkbenchContext";
import type { SketchPlaneEntity } from "../types/plane";

import { computeCentroid } from "../lib/sketchHelpers";
import { HoverManager, type HoverResult } from "../features/interaction/HoverManager";
import { SnapManager, type SnapResult } from "../features/interaction/SnapManager";
import { CAD_COLORS, CAD_COLORS_HEX } from "../constants/colors";
import { extractVariables } from "../lib/codeAnalysis";

// Constants for sketch camera
export const SKETCH_FOV = 40;
export const SKETCH_DISTANCE = 20;

interface ViewerProps {
    geometries: GeometryResult[];
    previewGeometries: GeometryResult[];
    sketchesGeometries: SketchGeometry[];
    showSketches: boolean;
    viewMode3D: ViewMode3D;
}



function SketchLine({
    sketch,
    isSelected,
    onClick
}: {
    sketch: SketchGeometry;
    isSelected: boolean;
    onClick: (e?: ThreeEvent<MouseEvent>) => void;
}) {
    // const [hovered, setHovered] = useState(false); // Removed local hover
    const color = isSelected ? CAD_COLORS.selection : 0x3b82f6; // Selection Blue or Info Blue

    const geometry = useMemo(() => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(sketch.vertices, 3));
        return geo;
    }, [sketch]);

    useEffect(() => {
        return () => geometry.dispose();
    }, [geometry]);

    const material = useMemo(() => {
        return new THREE.LineBasicMaterial({
            color,
            linewidth: 2,
            depthTest: false,
            depthWrite: false
        });
    }, [color]);

    useEffect(() => {
        material.color.setHex(color);
        // eslint-disable-next-line react-hooks/immutability
        material.needsUpdate = true;
    }, [material, color]);

    useEffect(() => {
        return () => material.dispose();
    }, [material]);

    const line = useMemo(() => {
        const l = new THREE.Line(geometry, material);
        l.frustumCulled = false;
        // User data for hover manager - ownerId is the sketch name
        l.userData = { type: 'EDGE', id: sketch.id, ownerId: sketch.name };
        return l;
    }, [geometry, material, sketch.id, sketch.name]);

    return (
        <primitive
            object={line}
            renderOrder={999}
            onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onClick(e); }}
        />
    );
}

function PlaneLayer({ planes }: { planes: SketchPlaneEntity[] }) {
    return (
        <group>
            {planes.filter(p => p.visible).map(plane => (
                <PlaneEntity key={plane.id} plane={plane} />
            ))}
        </group>
    );
}

function PlaneEntity({ plane }: { plane: SketchPlaneEntity }) {
    // Generate a geometric plane mesh
    // Standard size for reference planes
    const size = 20;

    const geometry = useMemo(() => new THREE.PlaneGeometry(size, size), []);

    // Color based on type
    let color = 0x808080; // Default gray
    if (plane.type === 'base') {
        if (plane.id.includes('xy')) color = 0x22c55e; // Green for XY
        if (plane.id.includes('xz')) color = 0x3b82f6; // Blue for XZ
        if (plane.id.includes('yz')) color = 0xef4444; // Red for YZ
    } else if (plane.type === 'offset') {
        color = 0x0ea5e9; // Cyan for offset
    } else if (plane.type === 'face') {
        color = 0xa855f7; // Purple for face
    }

    const meshRef = useRef<THREE.Mesh>(null);

    useFrame(() => {
        if (meshRef.current) {
            const { origin, normal } = plane;
            meshRef.current.position.set(origin[0], origin[1], origin[2]);

            // Orient plane to its normal
            // Default THREE.PlaneGeometry is in XY plane (normal [0,0,1])
            const defaultNormal = new THREE.Vector3(0, 0, 1);
            const targetNormal = new THREE.Vector3(normal[0], normal[1], normal[2]);
            meshRef.current.quaternion.setFromUnitVectors(defaultNormal, targetNormal);
        }
    });

    return (
        <mesh ref={meshRef}>
            <primitive object={geometry} attach="geometry" />
            <meshBasicMaterial
                color={color}
                transparent
                opacity={0.15}
                side={THREE.DoubleSide}
                depthWrite={false}
            />
            {/* Outline */}
            <lineSegments>
                <edgesGeometry args={[geometry]} />
                <lineBasicMaterial color={color} transparent opacity={0.5} />
            </lineSegments>
        </mesh>
    );
}


function GhostShape({
    geometry,
}: {
    geometry: GeometryResult;
}) {
    return (
        <group>
            {geometry.faces.map((face) => {
                const threeGeometry = new THREE.BufferGeometry();
                threeGeometry.setAttribute('position', new THREE.BufferAttribute(face.vertices, 3));
                threeGeometry.setAttribute('normal', new THREE.BufferAttribute(face.normals, 3));
                threeGeometry.setIndex(new THREE.BufferAttribute(face.indices, 1));

                return (
                    <mesh key={face.faceId} geometry={threeGeometry}>
                        <meshBasicMaterial color={CAD_COLORS_HEX.selection} transparent opacity={0.4} />
                    </mesh>
                );
            })}
        </group>
    );
}

// Consolidated Geometry Helper
function useConsolidatedGeometry(faces: FaceGeometry[]) {
    return useMemo(() => {
        if (faces.length === 0) return { geometry: null, faceMap: null };

        // 1. Calculate totals
        let totalVertices = 0;
        let totalIndices = 0;
        faces.forEach(f => {
            totalVertices += f.vertices.length;
            totalIndices += f.indices.length;
        });

        // 2. Allocate
        const positionArray = new Float32Array(totalVertices);
        const normalArray = new Float32Array(totalVertices); // Normals match vertex count (x3)
        const indexArray = new Uint32Array(totalIndices);

        // Map triangle index to faceId
        // totalIndices contains 3 * numTriangles
        const faceMap = new Int32Array(totalIndices / 3);

        // 3. Merge
        let currentVertexOffset = 0; // In float count (not vertex count, wait. vertices is Float32Array of coords)
        // Attribute access: vertices[i]
        // But indices reference vertex INDEX (v0, v1..), not float index.
        // Vertex count = vertices.length / 3

        let vertexCountOffset = 0;
        let indexOffset = 0;
        let triangleIndexOffset = 0;

        faces.forEach(f => {
            // Copy Positions
            positionArray.set(f.vertices, currentVertexOffset);

            // Copy Normals
            normalArray.set(f.normals, currentVertexOffset);

            // Copy Indices (adjusted)
            const numVertices = f.vertices.length / 3;
            for (let i = 0; i < f.indices.length; i++) {
                indexArray[indexOffset + i] = f.indices[i] + vertexCountOffset;
            }

            // Fill FaceMap
            const numTriangles = f.indices.length / 3;
            for (let i = 0; i < numTriangles; i++) {
                faceMap[triangleIndexOffset + i] = f.faceId;
            }

            currentVertexOffset += f.vertices.length;
            vertexCountOffset += numVertices;
            indexOffset += f.indices.length;
            triangleIndexOffset += numTriangles;
        });

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positionArray, 3));
        geometry.setAttribute('normal', new THREE.BufferAttribute(normalArray, 3));
        geometry.setIndex(new THREE.BufferAttribute(indexArray, 1));

        return { geometry, faceMap };
    }, [faces]);
}

function ConsolidatedShape({
    geometry,
    shapeIndex,
    viewMode3D,
    isSelected,
    name
}: {
    geometry: GeometryResult;
    shapeIndex: number;
    viewMode3D: ViewMode3D;
    isSelected: boolean;
    name: string | undefined;
}) {
    const {
        selectedFace,
        setSelectedFace,
        setSelectedSketchName,
        setSelectedItemId,
        toggleSelection
    } = useWorkbench();

    const { geometry: mergedGeometry, faceMap } = useConsolidatedGeometry(geometry.faces);

    // Compute edges for the entire shape ONCE
    const edgesGeo = useMemo(() => {
        if (!mergedGeometry) return null;
        return new THREE.EdgesGeometry(mergedGeometry, 15);
    }, [mergedGeometry]);

    const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
        // e.stopPropagation(); // Stop propagation to other objects, but allow bubbling if needed? 
        // In R3F, stopPropagation() stops it from hitting objects behind this one. Good.
        e.stopPropagation();

        const isMulti = e.metaKey || e.ctrlKey || e.shiftKey;

        if (name) {
            if (isMulti) {
                toggleSelection(name, true);
                return;
            }
        }

        setSelectedSketchName(null);

        // Resolve Face ID
        let faceId = -1;
        // Check userData first (if legacy or direct)
        if (e.object.userData.faceMap && e.faceIndex != null) {
            faceId = e.object.userData.faceMap[e.faceIndex] ?? -1;
        } else if (typeof e.object.userData.id === 'number') {
            faceId = e.object.userData.id;
        }

        setSelectedFace({ shapeIndex, faceId });
        if (name) setSelectedItemId(name);

        // Tag event with ownerId for legacy listeners if any
        // (e as any).ownerId = name; 
    }, [name, shapeIndex, setSelectedFace, setSelectedSketchName, setSelectedItemId, toggleSelection]);


    // Color logic
    const color = isSelected ? CAD_COLORS.selection : 0x808080;

    // Memoize material to avoid flickering (moved before early return)
    const material = useMemo(() => new THREE.MeshLambertMaterial({
        color,
        flatShading: viewMode3D === 'shadedWithEdges'
    }), [color, viewMode3D]);

    if (!mergedGeometry) return null;

    return (
        <group>
            <mesh
                geometry={mergedGeometry}
                material={material}
                onClick={handleClick}
                userData={{ type: 'FACE', id: 'consolidated', shapeIndex, faceMap, ownerId: name }}
            />

            {/* Edges */}
            {viewMode3D === 'shadedWithEdges' && edgesGeo && (
                <lineSegments geometry={edgesGeo} renderOrder={500}>
                    <lineBasicMaterial color={0x000000} />
                </lineSegments>
            )}

            {/* Selected Face Overlay */}
            {selectedFace?.shapeIndex === shapeIndex && (
                <FaceSelectionOverlay
                    face={geometry.faces.find(f => f.faceId === selectedFace.faceId)}
                    isSelected={true}
                />
            )}
        </group>
    );
}

// Helper to render just the selected/hovered face on top
function FaceSelectionOverlay({ face, isSelected }: { face?: FaceGeometry, isSelected: boolean }) {
    const geometry = useMemo(() => {
        if (!face) return null;
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(face.vertices, 3));
        geo.setAttribute('normal', new THREE.BufferAttribute(face.normals, 3));
        geo.setIndex(new THREE.BufferAttribute(face.indices, 1));
        return geo;
    }, [face]);

    if (!face || !geometry) return null;

    return (
        <mesh geometry={geometry} renderOrder={1001}>
            {/* Use polygonOffset to prevent z-fighting */}
            <meshBasicMaterial
                color={CAD_COLORS.selection}
                transparent={!isSelected}
                opacity={isSelected ? 1.0 : 0.3}
                depthTest={true}
                polygonOffset
                polygonOffsetFactor={-1}
            />
        </mesh>
    );
}

// Shape Wrapper (Renamed from original Shape, but keeping the name 'Shape' for compatibility if exported, 
// though it is not exported. I will replace the internal Shape function)
// Actually, I'll name it Shape to match the existing component name in the file.

function Shape({
    geometry,
    shapeIndex,
    viewMode3D,
    isSelected,
    name
}: {
    geometry: GeometryResult;
    shapeIndex: number;
    viewMode3D: ViewMode3D;
    isSelected: boolean;
    name: string | undefined;
}) {
    return (
        <ConsolidatedShape
            geometry={geometry}
            shapeIndex={shapeIndex}
            viewMode3D={viewMode3D}
            isSelected={isSelected}
            name={name}
        />
    );
}


function ParametricLayer() {
    const { entities, selectedEntityIds, selectEntity, updateEntity, solve } = useWorkbench();
    const entityList = useMemo(() => Array.from(entities.values()), [entities]);

    // Compute Centroid of Selected Points
    const selectedPoints = useMemo(() => {
        return selectedEntityIds
            .map(id => entities.get(id))
            .filter(e => e?.type === 'POINT') as { id: string, x: number, y: number, type: 'POINT' }[];
    }, [selectedEntityIds, entities]);

    const centroid = useMemo(() => {
        return computeCentroid(selectedPoints);
    }, [selectedPoints]);

    // Dummy Object State for Gizmo
    // We need a stable object for TransformControls to attach to.
    const [dummy, setDummy] = useState<THREE.Group | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const initialPositions = useRef<Map<string, { x: number, y: number }>>(new Map());
    const initialCentroid = useRef<{ x: number, y: number } | null>(null);

    // Sync dummy position to centroid when NOT dragging
    useEffect(() => {
        if (!isDragging && dummy && centroid) {
            dummy.position.set(centroid.x, centroid.y, 0);
        }
    }, [centroid, isDragging, dummy]);

    return (
        <group>
            {entityList.map(entity => {
                if (entity.type === 'POINT') {
                    const isSelected = selectedEntityIds.includes(entity.id);
                    // selectedPointId is not defined in the original context,
                    // so this line is removed to avoid introducing new errors.
                    // const isGizmoTarget = entity.id === selectedPointId;

                    return (
                        <group key={entity.id} position={[entity.x, entity.y, 0]}>
                            <mesh
                                onClick={(e: ThreeEvent<MouseEvent>) => {
                                    e.stopPropagation();
                                    selectEntity(entity.id, e.metaKey || e.ctrlKey);
                                }}
                                userData={{ type: 'VERTEX', id: entity.id }}
                            >
                                <sphereGeometry args={[isSelected ? 0.8 : 0.5]} />
                                <meshBasicMaterial color={isSelected ? "red" : "yellow"} />
                            </mesh>

                            {/* Gizmo Logic remains same... */}
                        </group>
                    );
                } else if (entity.type === 'LINE') {
                    const p1 = entities.get(entity.p1);
                    const p2 = entities.get(entity.p2);

                    if (p1 && p1.type === 'POINT' && p2 && p2.type === 'POINT') {
                        const points = [
                            new THREE.Vector3(p1.x, p1.y, 0),
                            new THREE.Vector3(p2.x, p2.y, 0)
                        ];
                        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
                        const isSelected = selectedEntityIds.includes(entity.id);

                        return (
                            <lineSegments
                                key={entity.id}
                                geometry={lineGeo}
                                onClick={(e: ThreeEvent<MouseEvent>) => {
                                    e.stopPropagation();
                                    selectEntity(entity.id, e.metaKey || e.ctrlKey);
                                }}
                                userData={{ type: 'EDGE', id: entity.id }}
                            >
                                <lineBasicMaterial color={isSelected ? "orange" : "cyan"} />
                            </lineSegments>
                        )
                    }
                    return null;
                }
                return null;
            })}

            {/* Gizmo Logic */}
            {centroid && (
                <>
                    {/* Invisible dummy target for Gizmo */}
                    <group ref={setDummy} position={[centroid.x, centroid.y, 0]} />

                    {dummy && (
                        <TransformControls
                            object={dummy}
                            mode="translate"
                            showZ={false}
                            size={0.6}
                            translationSnap={0.5} // Snapping 0.5 units
                            onMouseDown={() => {
                                setIsDragging(true);
                                initialCentroid.current = { x: dummy.position.x, y: dummy.position.y };
                                initialPositions.current.clear();
                                selectedPoints.forEach(p => {
                                    initialPositions.current.set(p.id, { x: p.x, y: p.y });
                                });
                            }}
                            onMouseUp={() => {
                                setIsDragging(false);
                                initialCentroid.current = null;
                            }}
                            onObjectChange={() => {
                                if (isDragging && initialCentroid.current && dummy) {
                                    const currentPos = dummy.position;
                                    const dx = currentPos.x - initialCentroid.current.x;
                                    const dy = currentPos.y - initialCentroid.current.y;

                                    initialPositions.current.forEach((startPos, id) => {
                                        updateEntity(id, { x: startPos.x + dx, y: startPos.y + dy });
                                    });
                                    solve();
                                }
                            }}
                        />
                    )}
                </>
            )}
        </group>
    );
}

function CameraHandler({ geometries }: { geometries: GeometryResult[] }) {
    const { selectedFace, sketchMode } = useWorkbench();
    const { camera, controls } = useThree();
    // Target state for animation
    const targetState = useRef<{
        position: THREE.Vector3;
        lookAt: THREE.Vector3;
    } | null>(null);

    // Track previous sketch active state to trigger only on activation
    const prevSketchActive = useRef(false);

    // Saved camera state for restoration
    const savedCameraState = useRef<{
        position: THREE.Vector3;
        target: THREE.Vector3;
    } | null>(null);

    useEffect(() => {
        const isSketching = sketchMode.active;
        const wasSketching = prevSketchActive.current;
        prevSketchActive.current = isSketching;

        // On Sketch Enter
        if (isSketching && !wasSketching) {
            if (sketchMode.plane) {
                const center = new THREE.Vector3(0, 0, 0);
                const normalVec = new THREE.Vector3(0, 0, 1);
                let found = false;

                if (typeof sketchMode.plane === 'object') {
                    center.set(...sketchMode.plane.origin);
                    normalVec.set(...sketchMode.plane.normal);
                    found = true;
                } else if (typeof sketchMode.plane === 'string') {
                    if (sketchMode.plane === 'XY') { normalVec.set(0, 0, 1); found = true; }
                    else if (sketchMode.plane === 'XZ') { normalVec.set(0, 1, 0); found = true; }
                    else if (sketchMode.plane === 'YZ') { normalVec.set(1, 0, 0); found = true; }
                }

                if (found) {
                    normalVec.normalize();
                    // Save current state before moving
                    const ctrl = controls as unknown as { target?: THREE.Vector3 };
                    savedCameraState.current = {
                        position: camera.position.clone(),
                        target: ctrl?.target ? ctrl.target.clone() : new THREE.Vector3(0, 0, 0)
                    };

                    // Zoom in closer for sketching
                    const newPos = center.clone().add(normalVec.multiplyScalar(SKETCH_DISTANCE));

                    targetState.current = {
                        position: newPos,
                        lookAt: center
                    };
                }
            }
        }

        // On Sketch Exit
        if (!isSketching && wasSketching) {
            if (savedCameraState.current) {
                targetState.current = {
                    position: savedCameraState.current.position,
                    lookAt: savedCameraState.current.target
                };
            }
        }

    }, [sketchMode, selectedFace, geometries, camera, controls]);

    useFrame((state, delta) => {
        if (!targetState.current) return;

        const dampFactor = 5.0 * delta; // Slightly faster for responsiveness

        // Interpolate position
        state.camera.position.lerp(targetState.current.position, dampFactor);

        // Interpolate controls target if available
        // OrbitControls from @react-three/drei puts the actual controls instance in state.controls usually?
        // Or we use the hook result if makeDefault is true?
        // The type of `controls` from `useThree` is unknown by default, we cast or check
        const ctrl = controls as unknown as { target: THREE.Vector3, update: () => void };

        if (ctrl && ctrl.target) {
            ctrl.target.lerp(targetState.current.lookAt, dampFactor);
            ctrl.update();
        } else {
            state.camera.lookAt(targetState.current.lookAt);
        }

        // Stop animating when close enough to save perf? 
        // For now, continuous damping is fine and handles interruptions gracefully
        if (state.camera.position.distanceTo(targetState.current.position) < 0.1 &&
            (ctrl?.target?.distanceTo(targetState.current.lookAt) || 0) < 0.1) {
            targetState.current = null;
        }
    });

    return null;
}


function InteractionHandler({ setHovered, setSnap }: { setHovered: (h: HoverResult | null) => void, setSnap: (s: SnapResult | null) => void }) {
    const { camera, scene, raycaster, pointer } = useThree();
    const lastCheckTime = useRef(0);
    const lastPointer = useRef(new THREE.Vector2(0, 0));

    useFrame((state) => {
        const now = state.clock.elapsedTime;
        // Throttle to ~20 FPS (every 0.05s) to save massive CPU on idle
        if (now - lastCheckTime.current < 0.05) return;

        // Optimization: Only raycast if pointer moved significantly
        const pointerDist = lastPointer.current.distanceTo(pointer);
        if (pointerDist < 0.001) {
            // Even if mouse didn't move, we might need to update if the model changed (geometries updated).
            // But usually model update triggers re-render anyway. 
            // Logic: If static scene + static mouse, NO RAYCAST.
            // We'll update the timestamp though if we skipped to avoid stalling forever if something moved under cursor?
            // Actually, if scene moves, we probably want to update.
            // But for now, mouse movement is the primary trigger for hover changes.
        }

        lastCheckTime.current = now;
        lastPointer.current.copy(pointer);

        // Update raycaster
        raycaster.setFromCamera(pointer, camera);

        // Raycast against scene (filtering can be added here if scene gets large)
        const intersects = raycaster.intersectObjects(scene.children, true);

        const best = HoverManager.getBestHover(intersects);
        // Avoid state thrashing
        setHovered(best);
        setSnap(SnapManager.getSnapFromHover(best));
    });

    return null;
}

function SnapIndicator({ snap }: { snap: SnapResult | null }) {
    if (!snap) return null;

    const { type, position } = snap;

    return (
        <group position={position}>
            {type === 'ENDPOINT' && (
                <mesh renderOrder={2000}>
                    <boxGeometry args={[0.5, 0.5, 0.5]} />
                    <meshBasicMaterial color={CAD_COLORS_HEX.snap} depthTest={false} />
                </mesh>
            )}
            {type === 'MIDPOINT' && (
                <mesh renderOrder={2000} rotation={[0, 0, Math.PI / 4]}>
                    <octahedronGeometry args={[0.4]} />
                    <meshBasicMaterial color={CAD_COLORS_HEX.snap} depthTest={false} />
                </mesh>
            )}
            {/* Outline for the snap point */}
            <mesh renderOrder={2001}>
                <sphereGeometry args={[0.6]} />
                <meshBasicMaterial color="black" wireframe depthTest={false} transparent opacity={0.2} />
            </mesh>
        </group>
    );
}


// Fixed HighlightOverlay logic
function BetterHighlightOverlay({ hovered, geometries }: { hovered: HoverResult | null, geometries: GeometryResult[] }) {
    if (!hovered || !hovered.object) return null;
    const { type, object, id } = hovered;

    if (type === 'FACE') {
        // If it's a consolidated mesh, we need to extract the specific face geometry
        if (object.userData.faceMap) {
            // Find the face
            const shapeIndex = object.userData.shapeIndex as number;
            const faceId = id as number;

            if (typeof shapeIndex === 'number' && geometries[shapeIndex]) {
                const face = geometries[shapeIndex].faces.find(f => f.faceId === faceId);
                if (face) {
                    return (
                        <FaceSelectionOverlay face={face} isSelected={false} />
                    );
                }
            }
            return null;
        }

        // Legacy/Direct Mesh
        if (object instanceof THREE.Mesh) {
            return (
                <mesh
                    geometry={object.geometry}
                    matrix={object.matrixWorld}
                    matrixAutoUpdate={false}
                    renderOrder={1000}
                >
                    <meshBasicMaterial color={CAD_COLORS_HEX.selection} transparent opacity={0.3} depthTest={false} />
                </mesh>
            );
        }
    }

    if (type === 'EDGE') {
        if (object instanceof THREE.Line || object instanceof THREE.LineSegments) {
            return (
                <lineSegments
                    geometry={object.geometry}
                    matrix={object.matrixWorld}
                    matrixAutoUpdate={false}
                    renderOrder={1000}
                >
                    <lineBasicMaterial color={CAD_COLORS_HEX.highlight} linewidth={2} depthTest={false} />
                </lineSegments>
            );
        }
    }

    if (type === 'VERTEX') {
        if (object instanceof THREE.Mesh) {
            return (
                <mesh
                    geometry={object.geometry}
                    matrix={object.matrixWorld}
                    matrixAutoUpdate={false}
                    renderOrder={1001} // High priority
                >
                    <meshBasicMaterial color={CAD_COLORS_HEX.highlight} depthTest={false} />
                </mesh>
            );
        }
    }

    return null;
}

/**
 * SelectionOutline renders a high-visibility outline around the selected object(s).
 */
function SelectionOutline({ geometries, itemNames, selectedItemIds }: { geometries: GeometryResult[], itemNames: string[], selectedItemIds: string[] }) {
    // Collect all selected geometries
    const selectedGeometries = useMemo(() => {
        return selectedItemIds.map(id => {
            const idx = itemNames.indexOf(id);
            return idx !== -1 ? geometries[idx] : null;
        }).filter((g): g is GeometryResult => g !== null);
    }, [geometries, itemNames, selectedItemIds]);

    if (selectedGeometries.length === 0) return null;

    return (
        <group>
            {selectedGeometries.map((geometry, i) => (
                <group key={`sel-group-${i}`}>
                    {geometry.faces.map((face) => {
                        const threeGeometry = new THREE.BufferGeometry();
                        threeGeometry.setAttribute('position', new THREE.BufferAttribute(face.vertices, 3));
                        threeGeometry.setAttribute('normal', new THREE.BufferAttribute(face.normals, 3));
                        threeGeometry.setIndex(new THREE.BufferAttribute(face.indices, 1));

                        const edgesGeo = new THREE.EdgesGeometry(threeGeometry, 15);

                        return (
                            <lineSegments key={`outline-${face.faceId}`} geometry={edgesGeo} renderOrder={1002}>
                                <lineBasicMaterial color={CAD_COLORS_HEX.selection} linewidth={3} depthTest={false} transparent opacity={0.8} />
                            </lineSegments>
                        );
                    })}
                </group>
            ))}
        </group>
    );
}

export default function Viewer({ geometries, previewGeometries, sketchesGeometries, showSketches, viewMode3D }: ViewerProps) {
    const {
        setSelectedFace,
        selectedSketchName,
        setSelectedSketchName,
        sketchMode,
        planes,
        code,
        hiddenIds,
        selectedItemIds, // New
        setSelectedItemId,
        toggleSelection // New
    } = useWorkbench();

    // Correlate geometries with names from code
    const itemNames = useMemo(() => extractVariables(code).map(v => v.name), [code]);

    const [hoveredItem, setHoveredItem] = useState<HoverResult | null>(null);
    const [snapPoint, setSnapPoint] = useState<SnapResult | null>(null);

    const { setHoveredItemId } = useWorkbench();

    // Sync local hover to global hoveredItemId
    useEffect(() => {
        if (hoveredItem?.object?.userData?.ownerId) {
            setHoveredItemId(hoveredItem.object.userData.ownerId);
        } else {
            setHoveredItemId(null);
        }
    }, [hoveredItem, setHoveredItemId]);

    // Cursor Logic
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
                        Points: { threshold: 0.2 }, // Tighter threshold
                        Sprite: {}
                    }
                } as unknown as Partial<THREE.Raycaster>}
                onPointerMissed={() => {
                    setSelectedFace(null);
                    setSelectedSketchName(null);
                    setSelectedItemId(null);
                }}
            >
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 20, 10]} intensity={0.7} />
                <directionalLight position={[-5, -10, -5]} intensity={0.3} />

                <InteractionHandler setHovered={setHoveredItem} setSnap={setSnapPoint} />
                <BetterHighlightOverlay hovered={hoveredItem} geometries={geometries} />
                <SnapIndicator snap={snapPoint} />
                <SelectionOutline geometries={geometries} itemNames={itemNames} selectedItemIds={selectedItemIds} />

                {!sketchMode.active && (
                    <Grid args={[200, 200]} cellColor="#404040" sectionColor="#606060" fadeDistance={100} />
                )}


                <group>
                    {geometries.map((g, i) => {
                        const name = itemNames[i];
                        if (name && hiddenIds.includes(name)) return null;
                        return (
                            <Shape
                                key={i}
                                geometry={g}
                                shapeIndex={i}
                                viewMode3D={viewMode3D}
                                isSelected={name ? selectedItemIds.includes(name) : false}
                                name={name}
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
                                }}
                            />
                        ))}
                    </group>
                )}

                <PlaneLayer planes={planes} />

                <ParametricLayer />

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
