import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import * as THREE from "three";
import { useMemo } from "react";
import { Edges } from "@react-three/drei";
import type { GeometryResult } from "../lib/geometryEngine";

interface ViewerProps {
    geometries: GeometryResult[];
}

function Shape({ geometry }: { geometry: GeometryResult }) {
    const threeGeometry = useMemo(() => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(geometry.vertices, 3));
        geo.setAttribute('normal', new THREE.BufferAttribute(geometry.normals, 3));
        geo.setIndex(new THREE.BufferAttribute(geometry.indices, 1));
        return geo;
    }, [geometry]);

    return (
        <mesh geometry={threeGeometry}>
            <meshStandardMaterial color="#6366f1" roughness={0.3} metalness={0.1} />
            <Edges color="#1e1b4b" threshold={15} />
        </mesh>
    );
}

export default function Viewer({ geometries }: ViewerProps) {
    return (
        <div className="w-full h-full relative">
            <Canvas shadows camera={{ position: [40, 40, 40], fov: 40 }}>
                <fog attach="fog" args={['#101010', 10, 100]} />
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 20, 10]} intensity={1} castShadow />

                <Grid args={[200, 200]} cellColor="#404040" sectionColor="#606060" fadeDistance={100} />

                <group>
                    {geometries.map((g, i) => (
                        <Shape key={i} geometry={g} />
                    ))}
                </group>

                <OrbitControls makeDefault />
            </Canvas>
            <div className="absolute top-4 left-4 text-white/50 text-xs pointer-events-none">
                kernelCAD v0.1 | Orbit: Left Click | Pan: Right Click
            </div>
        </div>
    );
}
