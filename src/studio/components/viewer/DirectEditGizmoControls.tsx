// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as THREE from "three";
import { useMemo } from "react";
import { TransformControls } from "@react-three/drei/core/TransformControls";
import type { GeometryResult } from "../../../shared/worker/geometryEngine";
import { matrixFromGeometryTransform } from "./entities/geometryTransform";
import { GhostShape } from "./entities/ShapeGeometry";
import type { DragDelta } from "../../hooks/viewer/useDirectEditDrag";

interface DirectEditGizmoControlsProps {
    geometry: GeometryResult;
    dragDelta: DragDelta | null;
    proxy: THREE.Object3D;
    reviewing: boolean;
    onMouseDown: () => void;
    onObjectChange: () => void;
    onMouseUp: () => void;
}

/**
 * Ghost preview, drag proxy and translate control for the direct-edit gizmo.
 * The parent only renders this once the selection resolved to a geometry.
 */
export function DirectEditGizmoControls({
    geometry,
    dragDelta,
    proxy,
    reviewing,
    onMouseDown,
    onObjectChange,
    onMouseUp,
}: DirectEditGizmoControlsProps) {
    // GhostShape composes its geometry's own transform, so it gets a
    // transform-free copy here and this wrapper owns the full
    // translate(delta) * matrixFromGeometryTransform matrix.
    const ghostGeometry = useMemo(
        () => ({ ...geometry, transform: undefined }),
        [geometry],
    );
    const ghostMatrix = useMemo(() => {
        if (!geometry || !dragDelta) return null;
        const geometryMatrix = matrixFromGeometryTransform(geometry) ?? new THREE.Matrix4();
        return new THREE.Matrix4()
            .makeTranslation(dragDelta[0], dragDelta[1], dragDelta[2])
            .multiply(geometryMatrix);
    }, [dragDelta, geometry]);

    return (
        <group>
            {ghostMatrix && (
                <group matrix={ghostMatrix} matrixAutoUpdate={false}>
                    <GhostShape geometry={ghostGeometry} />
                </group>
            )}
            <primitive object={proxy} />
            <TransformControls
                object={proxy}
                mode="translate"
                space="world"
                size={0.8}
                enabled={!reviewing}
                onMouseDown={onMouseDown}
                onObjectChange={onObjectChange}
                onMouseUp={onMouseUp}
            />
        </group>
    );
}
