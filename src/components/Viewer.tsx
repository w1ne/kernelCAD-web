import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import * as THREE from "three";
import { useMemo } from "react";
import type { GeometryResult } from "../lib/geometryEngine";
import type { ViewMode3D } from "../types/viewMode";
import { createCADMaterial } from "../lib/materials";

interface ViewerProps {
    geometries: GeometryResult[];
    viewMode3D: ViewMode3D;
}

function Shape({ geometry, viewMode3D }: { geometry: GeometryResult; viewMode3D: ViewMode3D }) {
    const threeGeometry = useMemo(() => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(geometry.vertices, 3));
        geo.setAttribute('normal', new THREE.BufferAttribute(geometry.normals, 3));
        geo.setIndex(new THREE.BufferAttribute(geometry.indices, 1));
        return geo;
    }, [geometry]);

    const materials = useMemo(() => {
        return createCADMaterial(0x6366f1, viewMode3D);
    }, [viewMode3D]);

    // Pre-compute geometries to avoid conditional hooks
    // Use EdgesGeometry for both wireframe and shaded-with-edges
    // This shows geometric edges, NOT mesh tessellation
    const edgesGeo = useMemo(() =>
        new THREE.EdgesGeometry(threeGeometry, 15), [threeGeometry]
    );

    // Wireframe mode: Show only geometric edges (NOT tessellation mesh)
    if (viewMode3D === 'wireframe' && materials.wireframe) {
        return (
            <lineSegments geometry={edgesGeo}>
                <primitive object={materials.wireframe} attach="material" />
            </lineSegments>
        );
    }

    // Shaded with Edges: Show mesh + edge lines
    if (viewMode3D === 'shadedWithEdges' && materials.mesh && materials.edges) {
        return (
            <group>
                <mesh geometry={threeGeometry}>
                    <primitive object={materials.mesh} attach="material" />
                </mesh>
                <lineSegments geometry={edgesGeo}>
                    <primitive object={materials.edges} attach="material" />
                </lineSegments>
            </group>
        );
    }

    // Shaded: Show only mesh
    if (materials.mesh) {
        return (
            <mesh geometry={threeGeometry}>
                <primitive object={materials.mesh} attach="material" />
            </mesh>
        );
    }

    return null;
}

export default function Viewer({ geometries, viewMode3D }: ViewerProps) {
    return (
        <div className="w-full h-full relative">
            <Canvas camera={{ position: [40, 40, 40], fov: 40 }}>
                {/* CAD-style lighting: bright ambient + headlight */}
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 20, 10]} intensity={0.7} />
                <directionalLight position={[-5, -10, -5]} intensity={0.3} />

                <Grid args={[200, 200]} cellColor="#404040" sectionColor="#606060" fadeDistance={100} />

                <group>
                    {geometries.map((g, i) => (
                        <Shape key={i} geometry={g} viewMode3D={viewMode3D} />
                    ))}
                </group>

                <OrbitControls makeDefault />
            </Canvas>
            <div className="absolute top-4 left-4 text-white/50 text-xs pointer-events-none">
                kernelCAD v0.4 | {viewMode3D === 'shadedWithEdges' ? 'Shaded + Edges' :
                    viewMode3D === 'wireframe' ? 'Wireframe' : 'Shaded'}
            </div>
        </div>
    );
}
