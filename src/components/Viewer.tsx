import { Canvas, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, TransformControls } from "@react-three/drei";
import * as THREE from "three";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GeometryResult, FaceGeometry, SketchGeometry } from "../lib/geometryEngine";
import type { ViewMode3D } from "../types/viewMode";
import { useWorkbench } from "../context/WorkbenchContext";
import type { SketchPlaneEntity } from "../types/plane";

import { computeCentroid } from "../lib/sketchHelpers";
import { HoverManager, type HoverResult } from "../features/interaction/HoverManager";

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

function FaceMesh({
    face,
    viewMode3D,
    isSelected,
    onClick
}: {
    face: FaceGeometry;
    viewMode3D: ViewMode3D;
    isSelected: boolean;
    onClick: () => void;
}) {


    const threeGeometry = useMemo(() => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(face.vertices, 3));
        geo.setAttribute('normal', new THREE.BufferAttribute(face.normals, 3));
        geo.setIndex(new THREE.BufferAttribute(face.indices, 1));
        return geo;
    }, [face]);

    const color = isSelected ? 0x2EC4B6 : 0x6366f1; // var(--selection-blue) : default blue

    const edgesGeo = useMemo(() =>
        new THREE.EdgesGeometry(threeGeometry, 15), [threeGeometry]
    );

    if (viewMode3D === 'wireframe') {
        return (
            <lineSegments
                geometry={edgesGeo}
                onClick={(e) => { e.stopPropagation(); onClick(); }}
                userData={{ type: 'FACE', id: face.faceId }}
            >
                <lineBasicMaterial color={color} />
            </lineSegments>
        );
    }

    return (
        <group
            onClick={(e) => { e.stopPropagation(); onClick(); }}
        >
            <mesh geometry={threeGeometry} userData={{ type: 'FACE', id: face.faceId }}>
                {/* Use meshLambertMaterial but slightly adjusted for standard look */}
                <meshLambertMaterial color={color} flatShading={viewMode3D === 'shadedWithEdges'} />
            </mesh>
            {viewMode3D === 'shadedWithEdges' && (
                <lineSegments geometry={edgesGeo} userData={{ type: 'EDGE', id: `edge-${face.faceId}` }}>
                    <lineBasicMaterial color={0x000000} />
                </lineSegments>
            )}
        </group>
    );
}

function SketchLine({
    sketch,
    isSelected,
    onClick
}: {
    sketch: SketchGeometry;
    isSelected: boolean;
    onClick: () => void;
}) {
    // const [hovered, setHovered] = useState(false); // Removed local hover
    const color = isSelected ? 0x2EC4B6 : 0x3b82f6; // Selection Blue or Info Blue

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
    }, []);

    useEffect(() => {
        material.color.setHex(color);
        material.needsUpdate = true;
    }, [material, color]);

    useEffect(() => {
        return () => material.dispose();
    }, [material]);

    const line = useMemo(() => {
        const l = new THREE.Line(geometry, material);
        l.frustumCulled = false;
        // User data for hover manager
        l.userData = { type: 'EDGE', id: sketch.id };
        return l;
    }, [geometry, material]);

    return (
        <primitive
            object={line}
            renderOrder={999}
            onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onClick(); }}
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
                        <meshBasicMaterial color="#2EC4B6" transparent opacity={0.4} />
                    </mesh>
                );
            })}
        </group>
    );
}

function Shape({
    geometry,
    shapeIndex,
    viewMode3D
}: {
    geometry: GeometryResult;
    shapeIndex: number;
    viewMode3D: ViewMode3D
}) {
    const { selectedFace, setSelectedFace, setSelectedSketchName } = useWorkbench();

    return (
        <group>
            {geometry.faces.map((face) => (
                <FaceMesh
                    key={face.faceId}
                    face={face}
                    viewMode3D={viewMode3D}
                    isSelected={selectedFace?.shapeIndex === shapeIndex && selectedFace?.faceId === face.faceId}
                    onClick={() => {
                        setSelectedSketchName(null);
                        setSelectedFace({ shapeIndex, faceId: face.faceId });
                    }}
                />
            ))}
        </group>
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
    const dummyRef = useRef<THREE.Group>(null);
    const [isDragging, setIsDragging] = useState(false);
    const initialPositions = useRef<Map<string, { x: number, y: number }>>(new Map());
    const initialCentroid = useRef<{ x: number, y: number } | null>(null);

    // Sync dummy position to centroid when NOT dragging
    useEffect(() => {
        if (!isDragging && dummyRef.current && centroid) {
            dummyRef.current.position.set(centroid.x, centroid.y, 0);
        }
    }, [centroid, isDragging]);

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
                    <group ref={dummyRef} position={[centroid.x, centroid.y, 0]} />

                    <TransformControls
                        object={dummyRef.current as any}
                        mode="translate"
                        showZ={false}
                        size={0.6}
                        translationSnap={0.5} // Snapping 0.5 units
                        onMouseDown={() => {
                            setIsDragging(true);
                            initialCentroid.current = { x: dummyRef.current!.position.x, y: dummyRef.current!.position.y };
                            initialPositions.current.clear();
                            selectedPoints.forEach(p => {
                                initialPositions.current.set(p.id, { x: p.x, y: p.y });
                            });
                        }}
                        onMouseUp={() => {
                            setIsDragging(false);
                            initialCentroid.current = null;
                        }}
                        onObjectChange={(_e: any) => {
                            if (isDragging && initialCentroid.current && dummyRef.current) {
                                const currentPos = dummyRef.current.position;
                                const dx = currentPos.x - initialCentroid.current.x;
                                const dy = currentPos.y - initialCentroid.current.y;

                                initialPositions.current.forEach((startPos, id) => {
                                    updateEntity(id, { x: startPos.x + dx, y: startPos.y + dy });
                                });
                                solve();
                            }
                        }}
                    />
                </>
            )}
        </group>
    );
}

function CameraHandler({ geometries }: { geometries: GeometryResult[] }) {
    const { selectedFace, sketchMode } = useWorkbench();
    const { camera, controls } = useThree();
    // Target state for animation
    const [targetState, setTargetState] = useState<{
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
                let center = new THREE.Vector3(0, 0, 0);
                let normalVec = new THREE.Vector3(0, 0, 1);
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

                    setTargetState({
                        position: newPos,
                        lookAt: center
                    });
                }
            }
        }

        // On Sketch Exit
        if (!isSketching && wasSketching) {
            if (savedCameraState.current) {
                setTargetState({
                    position: savedCameraState.current.position,
                    lookAt: savedCameraState.current.target
                });
            }
        }

    }, [sketchMode, selectedFace, geometries, camera, controls]);

    useFrame((state, delta) => {
        if (!targetState) return;

        const dampFactor = 5.0 * delta; // Slightly faster for responsiveness

        // Interpolate position
        state.camera.position.lerp(targetState.position, dampFactor);

        // Interpolate controls target if available
        // OrbitControls from @react-three/drei puts the actual controls instance in state.controls usually?
        // Or we use the hook result if makeDefault is true?
        // The type of `controls` from `useThree` is unknown by default, we cast or check
        const ctrl = controls as unknown as { target: THREE.Vector3, update: () => void };

        if (ctrl && ctrl.target) {
            ctrl.target.lerp(targetState.lookAt, dampFactor);
            ctrl.update();
        } else {
            state.camera.lookAt(targetState.lookAt);
        }

        // Stop animating when close enough to save perf? 
        // For now, continuous damping is fine and handles interruptions gracefully
        if (state.camera.position.distanceTo(targetState.position) < 0.1 &&
            (ctrl?.target?.distanceTo(targetState.lookAt) || 0) < 0.1) {
            setTargetState(null);
        }
    });

    return null;
}


function InteractionHandler({ setHovered }: { setHovered: (h: HoverResult | null) => void }) {
    const { camera, scene, raycaster, pointer } = useThree();

    useFrame(() => {
        // Update raycaster
        raycaster.setFromCamera(pointer, camera);

        // Raycast against scene (filtering can be added here if scene gets large)
        const intersects = raycaster.intersectObjects(scene.children, true);

        const best = HoverManager.getBestHover(intersects);
        setHovered(best);
    });

    return null;
}



// Fixed HighlightOverlay logic
function BetterHighlightOverlay({ hovered }: { hovered: HoverResult | null }) {


    useFrame(() => {
        // Ensure overlay tracks the object if it moves (e.g. gizmo dragging)
        if (hovered?.object) {
            // This component re-renders often anyway due to parent state?
            // Actually no, setHovered in parent triggers re-render.
        }
    });

    if (!hovered || !hovered.object) return null;
    const { type, object } = hovered;

    // Use <primitive> with a CLONED material? No, that modifies original object.
    // We want to render a COPY.

    if (type === 'FACE' && object instanceof THREE.Mesh) {
        return (
            <mesh
                geometry={object.geometry}
                matrix={object.matrixWorld}
                matrixAutoUpdate={false}
                renderOrder={1000}
            >
                <meshBasicMaterial color="#2EC4B6" transparent opacity={0.3} depthTest={false} />
                {/* IDK about depthTest false, might show through everything. Let's try true first. */}
            </mesh>
        );
    }

    if (type === 'EDGE') {
        // Could be Line or LineSegments
        // Assuming geometry is compatible
        if (object instanceof THREE.Line || object instanceof THREE.LineSegments) {
            return (
                <lineSegments // Use lineSegments generic wrapper
                    geometry={object.geometry}
                    matrix={object.matrixWorld}
                    matrixAutoUpdate={false}
                    renderOrder={1000}
                >
                    <lineBasicMaterial color="#FF9F1C" linewidth={2} depthTest={false} />
                </lineSegments>
            );
        }
    }

    if (type === 'VERTEX') {
        // It's a sphere mesh
        if (object instanceof THREE.Mesh) {
            return (
                <mesh
                    geometry={object.geometry}
                    matrix={object.matrixWorld}
                    matrixAutoUpdate={false}
                    renderOrder={1001} // High priority
                >
                    <meshBasicMaterial color="#FF9F1C" depthTest={false} />
                </mesh>
            );
        }
    }

    return null;
}

export default function Viewer({ geometries, previewGeometries, sketchesGeometries, showSketches, viewMode3D }: ViewerProps) {
    const { setSelectedFace, selectedSketchName, setSelectedSketchName, sketchMode, planes } = useWorkbench();
    const [hoveredItem, setHoveredItem] = useState<HoverResult | null>(null);

    return (
        <div className="w-full h-full relative" style={{ cursor: hoveredItem ? 'pointer' : 'default' }}>
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
                }}
            >
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 20, 10]} intensity={0.7} />
                <directionalLight position={[-5, -10, -5]} intensity={0.3} />

                <InteractionHandler setHovered={setHoveredItem} />
                <BetterHighlightOverlay hovered={hoveredItem} />

                {!sketchMode.active && (
                    <Grid args={[200, 200]} cellColor="#404040" sectionColor="#606060" fadeDistance={100} />
                )}


                <group>
                    {geometries.map((g, i) => (
                        <Shape key={i} geometry={g} shapeIndex={i} viewMode3D={viewMode3D} />
                    ))}
                </group>

                <group>
                    {previewGeometries.map((g, i) => (
                        <GhostShape key={`preview-${i}`} geometry={g} />
                    ))}
                </group>

                {showSketches && (
                    <group>
                        {sketchesGeometries.map((s) => (
                            <SketchLine
                                key={s.id}
                                sketch={s}
                                isSelected={selectedSketchName === s.name}
                                onClick={() => {
                                    setSelectedFace(null);
                                    setSelectedSketchName(s.name);
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
