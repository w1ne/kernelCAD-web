import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import * as THREE from "three";
import { useMemo, useState } from "react";
import type { GeometryResult, FaceGeometry, SketchGeometry } from "../lib/geometryEngine";
import type { ViewMode3D } from "../types/viewMode";
import { createCADMaterial, createSketchMaterial } from "../lib/materials";
import { useWorkbench } from "../context/WorkbenchContext";

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

    const materials = useMemo(() => {
        return createCADMaterial(color, viewMode3D);
    }, [color, viewMode3D]);

    const edgesGeo = useMemo(() =>
        new THREE.EdgesGeometry(threeGeometry, 15), [threeGeometry]
    );

    if (viewMode3D === 'wireframe' && materials.wireframe) {
        return (
            <lineSegments geometry={edgesGeo}>
                <primitive object={materials.wireframe} attach="material" />
            </lineSegments>
        );
    }

    return (
        <group
            onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
            onPointerOut={() => setHovered(false)}
            onClick={(e) => { e.stopPropagation(); onClick(); }}
        >
            {materials.mesh && (
                <mesh geometry={threeGeometry}>
                    <primitive object={materials.mesh} attach="material" />
                </mesh>
            )}
            {viewMode3D === 'shadedWithEdges' && materials.edges && (
                <lineSegments geometry={edgesGeo}>
                    <primitive object={materials.edges} attach="material" />
                </lineSegments>
            )}
        </group>
    );
}

function SketchLine({ sketch }: { sketch: SketchGeometry }) {
    const material = useMemo(() => createSketchMaterial(), []);

    const geometry = useMemo(() => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(sketch.vertices, 3));
        return geo;
    }, [sketch]);

    return (
        <lineSegments geometry={geometry}>
            <primitive object={material} attach="material" />
        </lineSegments>
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
    const { selectedFace, setSelectedFace } = useWorkbench();

    return (
        <group>
            {geometry.faces.map((face) => (
                <FaceMesh
                    key={face.faceId}
                    face={face}
                    viewMode3D={viewMode3D}
                    isSelected={selectedFace?.shapeIndex === shapeIndex && selectedFace?.faceId === face.faceId}
                    onClick={() => setSelectedFace({ shapeIndex, faceId: face.faceId })}
                />
            ))}
        </group>
    );
}

export default function Viewer({ geometries, sketchesGeometries, showSketches, viewMode3D }: ViewerProps) {
    const { setSelectedFace } = useWorkbench();

    return (
        <div className="w-full h-full relative" onClick={() => setSelectedFace(null)}>
            <Canvas camera={{ position: [40, 40, 40], fov: 40 }}>
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 20, 10]} intensity={0.7} />
                <directionalLight position={[-5, -10, -5]} intensity={0.3} />

                <Grid args={[200, 200]} cellColor="#404040" sectionColor="#606060" fadeDistance={100} />

                <group>
                    {geometries.map((g, i) => (
                        <Shape key={i} geometry={g} shapeIndex={i} viewMode3D={viewMode3D} />
                    ))}
                </group>

                {showSketches && (
                    <group>
                        {sketchesGeometries.map((s) => (
                            <SketchLine key={s.id} sketch={s} />
                        ))}
                    </group>
                )}

                <OrbitControls makeDefault />
            </Canvas>
            <div className="absolute top-4 left-4 text-white/50 text-xs pointer-events-none">
                kernelCAD v0.6 | {viewMode3D === 'shadedWithEdges' ? 'Shaded + Edges' :
                    viewMode3D === 'wireframe' ? 'Wireframe' : 'Shaded'}
            </div>
        </div>
    );
}
