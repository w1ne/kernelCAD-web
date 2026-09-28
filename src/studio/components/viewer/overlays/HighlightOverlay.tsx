// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as THREE from "three";
import type { HoverResult } from "../../../features-ui/interaction/HoverManager";
import type { GeometryResult } from "../../../../shared/worker/geometryEngine";
import { CAD_COLORS_HEX } from "../../../../shared/constants/colors";
import { FaceSelectionOverlay } from "../entities/ShapeGeometry";
import { matrixFromGeometryTransform } from "../entities/geometryTransform";
import { EdgeRangeLines } from "./EdgeRangeLines";

interface HighlightOverlayProps {
    hovered: HoverResult | null;
    geometries: GeometryResult[];
}

/** One hovered BREP edge of a shape's merged edge set, or null when `object`
 *  is not such an edge set. */
function brepEdgeHighlight(object: THREE.Object3D, id: string | number) {
    if (!object.userData.edgeRanges || !(object instanceof THREE.LineSegments)) return null;
    return (
        <EdgeRangeLines
            positions={object.geometry.getAttribute('position').array as Float32Array}
            edgeRanges={object.userData.edgeRanges as number[]}
            edgeIndex={id as number}
            matrix={object.matrixWorld}
            color={CAD_COLORS_HEX.highlight}
        />
    );
}

export function HighlightOverlay({ hovered, geometries }: HighlightOverlayProps) {
    if (!hovered || !hovered.object) return null;
    const { type, object, id } = hovered;

    if (type === 'FACE') {
        if (object.userData.faceMap) {
            const shapeIndex = object.userData.shapeIndex as number;
            const faceId = id as number;
            if (typeof shapeIndex === 'number' && geometries[shapeIndex]) {
                const geometry = geometries[shapeIndex];
                const face = geometry.faces.find(f => f.faceId === faceId);
                const transformMatrix = matrixFromGeometryTransform(geometry);
                if (face) {
                    return (
                        <group matrix={transformMatrix} matrixAutoUpdate={transformMatrix ? false : undefined}>
                            <FaceSelectionOverlay face={face} isSelected={false} />
                        </group>
                    );
                }
            }
        }
    } else if (type === 'EDGE') {
        const brepEdge = brepEdgeHighlight(object, id);
        if (brepEdge) return brepEdge;
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
