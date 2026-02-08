import { Canvas, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, TransformControls } from "@react-three/drei";
import * as THREE from "three";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { GeometryResult, FaceGeometry, SketchGeometry } from "../lib/geometryEngine";
import type { ViewMode3D } from "../types/viewMode";
import { useWorkbench } from "../context/WorkbenchContext";
import { useUI } from "../context/UIContext";
import type { SketchPlaneEntity } from "../types/plane";

import { computeCentroid } from "../lib/sketchHelpers";
import { HoverManager, type HoverResult } from "../features/interaction/HoverManager";
import { SnapManager, type SnapResult } from "../features/interaction/SnapManager";
import { CAD_COLORS, CAD_COLORS_HEX } from "../constants/colors";

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
    const color = isSelected ? CAD_COLORS.selection : 0x3b82f6;

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
    const { hiddenIds } = useWorkbench();
    return (
        <group>
            {planes.filter(p => !hiddenIds.includes(p.id)).map(plane => (
                <PlaneEntity key={plane.id} plane={plane} />
            ))}
        </group>
    );
}

function PlaneEntity({ plane }: { plane: SketchPlaneEntity }) {
    const { toggleSelection, setSelectedItemId, selectedItemIds } = useWorkbench();
    const size = 20;
    const geometry = useMemo(() => new THREE.PlaneGeometry(size, size), []);

    let color = 0x808080;
    if (plane.type === 'base') {
        if (plane.id.includes('xy')) color = 0x22c55e;
        if (plane.id.includes('xz')) color = 0x3b82f6;
        if (plane.id.includes('yz')) color = 0xef4444;
    } else if (plane.type === 'offset') {
        color = 0x0ea5e9;
    } else if (plane.type === 'face') {
        color = 0xa855f7;
    }

    const meshRef = useRef<THREE.Mesh>(null);
    const isSelected = selectedItemIds.includes(plane.id);

    useFrame(() => {
        if (meshRef.current) {
            const { origin, normal } = plane;
            meshRef.current.position.set(origin[0], origin[1], origin[2]);
            const defaultNormal = new THREE.Vector3(0, 0, 1);
            const targetNormal = new THREE.Vector3(normal[0], normal[1], normal[2]);
            meshRef.current.quaternion.setFromUnitVectors(defaultNormal, targetNormal);
        }
    });

    return (
        <mesh
            ref={meshRef}
            onClick={(e) => {
                e.stopPropagation();
                toggleSelection(plane.id, e.metaKey || e.ctrlKey || e.shiftKey);
                setSelectedItemId(plane.id);
            }}
        >
            <primitive object={geometry} attach="geometry" />
            <meshBasicMaterial
                color={isSelected ? CAD_COLORS.selection : color}
                transparent
                opacity={isSelected ? 0.3 : 0.15}
                side={THREE.DoubleSide}
                depthWrite={false}
            />
            <lineSegments>
                <edgesGeometry args={[geometry]} />
                <lineBasicMaterial color={isSelected ? CAD_COLORS.selection : color} transparent opacity={isSelected ? 0.8 : 0.5} />
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

function useConsolidatedGeometry(faces: FaceGeometry[]) {
    return useMemo(() => {
        if (faces.length === 0) return { geometry: null, faceMap: null };
        let totalVertices = 0;
        let totalIndices = 0;
        faces.forEach(f => {
            totalVertices += f.vertices.length;
            totalIndices += f.indices.length;
        });

        const positionArray = new Float32Array(totalVertices);
        const normalArray = new Float32Array(totalVertices);
        const indexArray = new Uint32Array(totalIndices);
        const faceMap = new Int32Array(totalIndices / 3);

        let currentVertexOffset = 0;
        let vertexCountOffset = 0;
        let indexOffset = 0;
        let triangleIndexOffset = 0;

        faces.forEach(f => {
            positionArray.set(f.vertices, currentVertexOffset);
            normalArray.set(f.normals, currentVertexOffset);
            const numVertices = f.vertices.length / 3;
            for (let i = 0; i < f.indices.length; i++) {
                indexArray[indexOffset + i] = f.indices[i] + vertexCountOffset;
            }
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

    const { setContextMenu } = useUI();

    const { geometry: mergedGeometry, faceMap } = useConsolidatedGeometry(geometry.faces);

    const edgesGeo = useMemo(() => {
        if (geometry.edges) {
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(geometry.edges, 3));
            return geo;
        }
        if (!mergedGeometry) return null;
        return new THREE.EdgesGeometry(mergedGeometry, 15);
    }, [mergedGeometry, geometry.edges]);

    useEffect(() => {
        return () => { edgesGeo?.dispose(); };
    }, [edgesGeo]);

    const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        const isMulti = e.metaKey || e.ctrlKey || e.shiftKey;

        if (name && isMulti) {
            toggleSelection(name, true);
            return;
        }

        setSelectedSketchName(null);
        let faceId = -1;
        if (e.object.userData.faceMap && e.faceIndex != null) {
            faceId = e.object.userData.faceMap[e.faceIndex] ?? -1;
        } else if (typeof e.object.userData.id === 'number') {
            faceId = e.object.userData.id;
        }

        setSelectedFace({ shapeIndex, faceId });
        if (name) setSelectedItemId(name);

        const x = e.nativeEvent.clientX;
        const y = e.nativeEvent.clientY;
        setContextMenu({
            visible: true,
            position: { x, y },
            type: 'FACE'
        });
    }, [name, shapeIndex, setSelectedFace, setSelectedSketchName, setSelectedItemId, toggleSelection, setContextMenu]);

    const color = isSelected ? CAD_COLORS.selection : 0x808080;
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
            {viewMode3D === 'shadedWithEdges' && edgesGeo && (
                <lineSegments geometry={edgesGeo} renderOrder={500}>
                    <lineBasicMaterial color={0x000000} />
                </lineSegments>
            )}
            {selectedFace?.shapeIndex === shapeIndex && (
                <FaceSelectionOverlay
                    face={geometry.faces.find(f => f.faceId === selectedFace.faceId)}
                    isSelected={true}
                />
            )}
        </group>
    );
}

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

    const selectedPoints = useMemo(() => {
        return selectedEntityIds
            .map(id => entities.get(id))
            .filter(e => e?.type === 'POINT') as { id: string, x: number, y: number, type: 'POINT' }[];
    }, [selectedEntityIds, entities]);

    const centroid = useMemo(() => {
        return computeCentroid(selectedPoints);
    }, [selectedPoints]);

    const [dummy, setDummy] = useState<THREE.Group | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const initialPositions = useRef<Map<string, { x: number, y: number }>>(new Map());
    const initialCentroid = useRef<{ x: number, y: number } | null>(null);

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
                }
                return null;
            })}

            {centroid && (
                <>
                    <group ref={setDummy} position={[centroid.x, centroid.y, 0]} />
                    {dummy && (
                        <TransformControls
                            object={dummy}
                            mode="translate"
                            showZ={false}
                            size={0.6}
                            translationSnap={0.5}
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
    const targetState = useRef<{ position: THREE.Vector3; lookAt: THREE.Vector3; } | null>(null);
    const prevSketchActive = useRef(false);
    const savedCameraState = useRef<{ position: THREE.Vector3; target: THREE.Vector3; } | null>(null);

    useEffect(() => {
        const isSketching = sketchMode.active;
        const wasSketching = prevSketchActive.current;
        prevSketchActive.current = isSketching;

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
                    const ctrl = controls as unknown as { target?: THREE.Vector3 };
                    savedCameraState.current = {
                        position: camera.position.clone(),
                        target: ctrl?.target ? ctrl.target.clone() : new THREE.Vector3(0, 0, 0)
                    };
                    const newPos = center.clone().add(normalVec.multiplyScalar(SKETCH_DISTANCE));
                    targetState.current = { position: newPos, lookAt: center };
                }
            }
        }

        if (!isSketching && wasSketching) {
            if (savedCameraState.current) {
                targetState.current = {
                    position: savedCameraState.current.position,
                    lookAt: savedCameraState.current.target
                };
            }
        }
    }, [sketchMode, selectedFace, geometries, camera, controls]);

    useFrame((_state, delta) => {
        if (!targetState.current) return;
        const dampFactor = 5.0 * delta;
        camera.position.lerp(targetState.current.position, dampFactor);
        const ctrl = controls as unknown as { target: THREE.Vector3, update: () => void };
        if (ctrl && ctrl.target) {
            ctrl.target.lerp(targetState.current.lookAt, dampFactor);
            ctrl.update();
        } else {
            camera.lookAt(targetState.current.lookAt);
        }
        if (camera.position.distanceTo(targetState.current.position) < 0.1 &&
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
        if (now - lastCheckTime.current < 0.05) return;
        lastCheckTime.current = now;
        lastPointer.current.copy(pointer);
        raycaster.setFromCamera(pointer, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);
        const best = HoverManager.getBestHover(intersects);
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
            <mesh renderOrder={2001}>
                <sphereGeometry args={[0.6]} />
                <meshBasicMaterial color="black" wireframe depthTest={false} transparent opacity={0.2} />
            </mesh>
        </group>
    );
}

function BetterHighlightOverlay({ hovered, geometries }: { hovered: HoverResult | null, geometries: GeometryResult[] }) {
    if (!hovered || !hovered.object) return null;
    const { type, object, id } = hovered;

    if (type === 'FACE') {
        if (object.userData.faceMap) {
            const shapeIndex = object.userData.shapeIndex as number;
            const faceId = id as number;
            if (typeof shapeIndex === 'number' && geometries[shapeIndex]) {
                const face = geometries[shapeIndex].faces.find(f => f.faceId === faceId);
                if (face) return <FaceSelectionOverlay face={face} isSelected={false} />;
            }
        }
    } else if (type === 'EDGE') {
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
    } else if (type === 'VERTEX') {
        if (object instanceof THREE.Mesh) {
            return (
                <mesh
                    geometry={object.geometry}
                    matrix={object.matrixWorld}
                    matrixAutoUpdate={false}
                    renderOrder={1001}
                >
                    <meshBasicMaterial color={CAD_COLORS_HEX.highlight} depthTest={false} />
                </mesh>
            );
        }
    }
    return null;
}

// Helper component for rendering selection outline of a single geometry
function SelectedGeometryOutline({ geometry }: { geometry: GeometryResult | null | undefined }) {
    if (!geometry) return null;
    if (geometry.edges) return <AnalyticalEdgeOutline edges={geometry.edges} />;
    return (
        <group>
            {geometry.faces.map((face) => (
                <FaceEdgeOutline key={face.faceId} face={face} />
            ))}
        </group>
    );
}

function AnalyticalEdgeOutline({ edges }: { edges: Float32Array }) {
    const geometry = useMemo(() => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(edges, 3));
        return geo;
    }, [edges]);

    useEffect(() => { return () => geometry.dispose(); }, [geometry]);

    return (
        <lineSegments geometry={geometry} renderOrder={1002}>
            <lineBasicMaterial color={CAD_COLORS_HEX.selection} linewidth={3} depthTest={false} transparent opacity={0.8} />
        </lineSegments>
    );
}

function FaceEdgeOutline({ face }: { face: FaceGeometry }) {
    const geometry = useMemo(() => {
        const threeGeometry = new THREE.BufferGeometry();
        threeGeometry.setAttribute('position', new THREE.BufferAttribute(face.vertices, 3));
        threeGeometry.setAttribute('normal', new THREE.BufferAttribute(face.normals, 3));
        threeGeometry.setIndex(new THREE.BufferAttribute(face.indices, 1));
        return new THREE.EdgesGeometry(threeGeometry, 15);
    }, [face]);

    useEffect(() => { return () => geometry.dispose(); }, [geometry]);

    return (
        <lineSegments geometry={geometry} renderOrder={1002}>
            <lineBasicMaterial color={CAD_COLORS_HEX.selection} linewidth={3} depthTest={false} transparent opacity={0.8} />
        </lineSegments>
    );
}

function SelectionOutline({ geometries, itemNames, selectedItemIds }: { geometries: GeometryResult[], itemNames: (string | null)[], selectedItemIds: string[] }) {
    const selectedGeometries = useMemo(() => {
        return selectedItemIds.map(id => {
            const idx = itemNames.indexOf(id);
            return idx !== -1 ? geometries[idx] : null;
        }).filter((g): g is GeometryResult => g !== null && g !== undefined);
    }, [geometries, itemNames, selectedItemIds]);

    if (selectedGeometries.length === 0) return null;

    return (
        <group>
            {selectedGeometries.map((geometry, i) => (
                <SelectedGeometryOutline key={i} geometry={geometry} />
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
        hiddenIds,
        selectedItemIds,
        setSelectedItemId,
        toggleSelection,
        codeContext,
        setHoveredItemId
    } = useWorkbench();

    const { setContextMenu } = useUI();

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
