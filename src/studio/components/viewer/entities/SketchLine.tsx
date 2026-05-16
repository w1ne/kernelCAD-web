import { type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { useEffect, useMemo } from "react";
import type { SketchGeometry } from "../../../../shared/worker/geometryEngine";
import { CAD_COLORS } from "../../../../shared/constants/colors";

interface SketchLineProps {
    sketch: SketchGeometry;
    isSelected: boolean;
    onClick: (e?: ThreeEvent<MouseEvent>) => void;
}

export function SketchLine({
    sketch,
    isSelected,
    onClick
}: SketchLineProps) {
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
