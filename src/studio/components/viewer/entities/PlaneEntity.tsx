// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { SketchPlaneEntity } from "../../../../shared/types/plane";
import { useWorkbench } from "../../../context/WorkbenchContext";
import { CAD_COLORS } from "../../../../shared/constants/colors";

export function PlaneLayer({ planes }: { planes: SketchPlaneEntity[] }) {
    const { hiddenIds } = useWorkbench();
    return (
        <group>
            {planes.filter(p => !hiddenIds.includes(p.id)).map(plane => (
                <PlaneEntity key={plane.id} plane={plane} />
            ))}
        </group>
    );
}

export function PlaneEntity({ plane }: { plane: SketchPlaneEntity }) {
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
