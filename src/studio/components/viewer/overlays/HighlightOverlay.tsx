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

/** World matrix of the hovered edge set. Instanced edge objects have no
 *  per-object transform; the instance transform comes from the part geometry. */
function edgeWorldMatrix(hovered: HoverResult, geometries: GeometryResult[]): THREE.Matrix4 {
    const { object } = hovered;
    if (!Array.isArray(object.userData.instanceShapeIndices) || hovered.shapeIndex === undefined) return object.matrixWorld;
    const part = geometries[hovered.shapeIndex];
    const local = part ? matrixFromGeometryTransform(part) : undefined;
    return local ? object.matrixWorld.clone().multiply(local) : object.matrixWorld;
}

/** One hovered BREP edge of a shape's merged edge set, or null when the
 *  hovered object is not such an edge set. */
function brepEdgeHighlight(hovered: HoverResult, geometries: GeometryResult[]) {
    const { object, id } = hovered;
    if (!object.userData.edgeRanges || !(object instanceof THREE.LineSegments)) return null;
    return (
        <EdgeRangeLines
            positions={object.geometry.getAttribute('position').array as Float32Array}
            edgeRanges={object.userData.edgeRanges as number[]}
            edgeIndex={id as number}
            matrix={edgeWorldMatrix(hovered, geometries)}
            color={CAD_COLORS_HEX.highlight}
        />
    );
}

/** The hovered face of a consolidated (or instanced) shape, placed by its
 *  part's transform; null when the hit is not a shape face. */
function faceHighlight(hovered: HoverResult, geometries: GeometryResult[]) {
    const { object, id } = hovered;
    if (!object.userData.faceMap) return null;
    const shapeIndex = hovered.shapeIndex ?? (object.userData.shapeIndex as number | undefined);
    const geometry = typeof shapeIndex === 'number' ? geometries[shapeIndex] : undefined;
    const face = geometry?.faces.find(f => f.faceId === (id as number));
    if (!geometry || !face) return null;
    const transformMatrix = matrixFromGeometryTransform(geometry);
    return (
        <group matrix={transformMatrix} matrixAutoUpdate={transformMatrix ? false : undefined}>
            <FaceSelectionOverlay face={face} isSelected={false} />
        </group>
    );
}

export function HighlightOverlay({ hovered, geometries }: HighlightOverlayProps) {
    if (!hovered || !hovered.object) return null;
    const { type, object } = hovered;

    if (type === 'FACE') {
        return faceHighlight(hovered, geometries);
    } else if (type === 'EDGE') {
        const brepEdge = brepEdgeHighlight(hovered, geometries);
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
