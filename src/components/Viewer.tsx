import { Canvas, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import * as THREE from "three";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GeometryResult, FaceGeometry, SketchGeometry } from "../lib/geometryEngine";
import type { ViewMode3D } from "../types/viewMode";
import { useWorkbench } from "../context/WorkbenchContext";

// Constants for sketch camera
export const SKETCH_FOV = 40;
export const SKETCH_DISTANCE = 20;

interface ViewerProps {
    geometries: GeometryResult[];
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
    const [hovered, setHovered] = useState(false);

    const threeGeometry = useMemo(() => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(face.vertices, 3));
        geo.setAttribute('normal', new THREE.BufferAttribute(face.normals, 3));
        geo.setIndex(new THREE.BufferAttribute(face.indices, 1));
        return geo;
    }, [face]);

    const color = isSelected ? 0xffa500 : (hovered ? 0x818cf8 : 0x6366f1);

    const edgesGeo = useMemo(() =>
        new THREE.EdgesGeometry(threeGeometry, 15), [threeGeometry]
    );

    if (viewMode3D === 'wireframe') {
        return (
            <lineSegments
                geometry={edgesGeo}
                onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
                onPointerOut={() => setHovered(false)}
                onClick={(e) => { e.stopPropagation(); onClick(); }}
            >
                <lineBasicMaterial color={color} />
            </lineSegments>
        );
    }

    return (
        <group
            onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
            onPointerOut={() => setHovered(false)}
            onClick={(e) => { e.stopPropagation(); onClick(); }}
        >
            <mesh geometry={threeGeometry}>
                <meshLambertMaterial color={color} flatShading={viewMode3D === 'shadedWithEdges'} />
            </mesh>
            {viewMode3D === 'shadedWithEdges' && (
                <lineSegments geometry={edgesGeo}>
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
    const [hovered, setHovered] = useState(false);
    const color = isSelected ? 0xffa500 : (hovered ? 0x93c5fd : 0x3b82f6);

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
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -2.0,
            polygonOffsetUnits: -2.0
        });
        // material is intentionally created once; color is updated via effect below
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
        return l;
    }, [geometry, material]);

    return (
        <primitive
            object={line}
            renderOrder={999}
            onPointerOver={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHovered(true); }}
            onPointerOut={() => setHovered(false)}
            onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onClick(); }}
        />
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
    const { entities, selectedEntityIds, selectEntity } = useWorkbench();
    const entityList = useMemo(() => Array.from(entities.values()), [entities]);

    return (
        <group>
            {entityList.map(entity => {
                if (entity.type === 'POINT') {
                    const isSelected = selectedEntityIds.includes(entity.id);
                    return (
                        <mesh
                            key={entity.id}
                            position={[entity.x, entity.y, 0]}
                            onClick={(e: ThreeEvent<MouseEvent>) => {
                                e.stopPropagation();
                                selectEntity(entity.id, e.metaKey || e.ctrlKey);
                            }}
                        >
                            <sphereGeometry args={[isSelected ? 0.8 : 0.5]} />
                            <meshBasicMaterial color={isSelected ? "red" : "yellow"} />
                        </mesh>
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
                            >
                                <lineBasicMaterial color={isSelected ? "orange" : "cyan"} />
                            </lineSegments>
                        )
                    }
                    return null;
                }
                return null;
            })}
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
            // Check if we are sketching on a face
            let faceId: number | undefined;
            let shapeIndex: number | undefined;

            if (sketchMode.plane && typeof sketchMode.plane === 'object' && sketchMode.plane.type === 'face') {
                faceId = sketchMode.plane.faceId;
                if (selectedFace && selectedFace.faceId === faceId) {
                    shapeIndex = selectedFace.shapeIndex;
                }
            }

            if (faceId !== undefined && shapeIndex !== undefined) {
                // Find the selected face geometry and calculate target
                const geometry = geometries[shapeIndex];
                if (!geometry) return;
                const face = geometry.faces.find(f => f.faceId === faceId);
                if (!face) return;

                const center = new THREE.Vector3();
                const normal = new THREE.Vector3();
                const v = new THREE.Vector3();
                const n = new THREE.Vector3();
                const vertexCount = face.vertices.length / 3;

                for (let i = 0; i < face.vertices.length; i += 3) {
                    v.set(face.vertices[i], face.vertices[i + 1], face.vertices[i + 2]);
                    center.add(v);
                    n.set(face.normals[i], face.normals[i + 1], face.normals[i + 2]);
                    normal.add(n);
                }

                if (vertexCount > 0) {
                    center.divideScalar(vertexCount);
                    normal.divideScalar(vertexCount).normalize();
                }

                // Save current state before moving
                // Save current state before moving
                // We need to get the current control target.
                const ctrl = controls as unknown as { target?: THREE.Vector3 };
                savedCameraState.current = {
                    position: camera.position.clone(),
                    target: ctrl?.target ? ctrl.target.clone() : new THREE.Vector3(0, 0, 0)
                };

                // Zoom in closer for sketching
                const newPos = center.clone().add(normal.multiplyScalar(SKETCH_DISTANCE));

                setTargetState({
                    position: newPos,
                    lookAt: center
                });
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

export default function Viewer({ geometries, sketchesGeometries, showSketches, viewMode3D }: ViewerProps) {
    const { setSelectedFace, selectedSketchName, setSelectedSketchName, sketchMode } = useWorkbench();

    return (
        <div className="w-full h-full relative">
            <Canvas
                camera={{ position: [40, 40, 40], fov: SKETCH_FOV }}
                raycaster={{
                    params: {
                        Line: { threshold: 0.4 },
                        Mesh: {},
                        LOD: {},
                        Points: { threshold: 0.1 },
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

                {!sketchMode.active && (
                    <Grid args={[200, 200]} cellColor="#404040" sectionColor="#606060" fadeDistance={100} />
                )}

                <group>
                    {geometries.map((g, i) => (
                        <Shape key={i} geometry={g} shapeIndex={i} viewMode3D={viewMode3D} />
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
