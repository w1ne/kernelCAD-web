// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// One instance group (same geometry + appearance) as ONE THREE.InstancedMesh
// plus ONE instanced edge object: two draw calls for N parts.
import * as THREE from "three";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { type ThreeEvent } from "@react-three/fiber";
import type { ViewMode3D } from "../../../../shared/types/viewMode";
import { useConsolidatedGeometry } from "../../../hooks/viewer/useConsolidatedGeometry";
import { DEFAULT_COLOR, resolveColor } from "../../../../shared/render/palette";
import { buildShapeMaterial } from "./buildShapeMaterial";
import { matrixFromGeometryTransform } from "./geometryTransform";
import { useShapePick } from "./ShapeGeometry";
import type { InstanceGroup } from "../instancing/groupForInstancing";
import { resolvePickedPart } from "../instancing/resolvePickedPart";
import { buildInstancedEdgeGeometry, makeInstancedLineMaterial, raycastInstancedLines } from "../instancing/instancedLines";

const EMPTY_PLANES: THREE.Plane[] = [];

interface InstancedShapeProps {
    group: InstanceGroup;
    viewMode3D: ViewMode3D;
    clippingPlanes?: THREE.Plane[];
    clipIntersection?: boolean;
}

interface InstanceUserData {
    instanceShapeIndices: number[];
    instanceParts: (string | undefined)[];
}

interface EdgeArgs {
    edges: Float32Array;
    edgeRanges: number[] | undefined;
    matrices: readonly THREE.Matrix4[];
    color: THREE.ColorRepresentation;
    planes: THREE.Plane[];
    clipIntersection: boolean;
    ids: InstanceUserData;
}

/** BREP edges of every instance as one instanced LineSegments, pickable per
 *  instance when the geometry carries `edgeRanges`. */
function buildInstancedEdges(a: EdgeArgs): THREE.LineSegments {
    const lines = new THREE.LineSegments(
        buildInstancedEdgeGeometry(a.edges, a.matrices),
        makeInstancedLineMaterial(a.color, a.planes, a.clipIntersection),
    );
    lines.renderOrder = 500;
    lines.frustumCulled = false; // base bounding sphere sits at the origin, not over the instances
    lines.userData = a.edgeRanges
        ? { type: 'EDGE', id: 'edges', edgeRanges: a.edgeRanges, ...a.ids }
        : {};
    lines.raycast = (raycaster, hits) => raycastInstancedLines(lines, a.matrices, raycaster, hits);
    return lines;
}

/** Geometry without BREP edge data: the same feature-angle edges a single
 *  shape derives, drawn per instance (no instanced path for this fallback). */
function PlainInstanceEdges({ merged, matrices, color, planes, clipIntersection }: {
    merged: THREE.BufferGeometry;
    matrices: readonly THREE.Matrix4[];
    color: THREE.ColorRepresentation;
    planes: THREE.Plane[];
    clipIntersection: boolean;
}) {
    const edgesGeo = useMemo(() => new THREE.EdgesGeometry(merged, 15), [merged]);
    useEffect(() => () => edgesGeo.dispose(), [edgesGeo]);
    return (
        <>
            {matrices.map((m, i) => (
                <lineSegments key={i} geometry={edgesGeo} renderOrder={500} matrix={m} matrixAutoUpdate={false}>
                    <lineBasicMaterial color={color} clippingPlanes={planes} clipIntersection={clipIntersection} />
                </lineSegments>
            ))}
        </>
    );
}

export function InstancedShape({ group, viewMode3D, clippingPlanes, clipIntersection }: InstancedShapeProps) {
    const first = group.members[0].geometry;
    const { geometry: merged, faceMap } = useConsolidatedGeometry(first.faces);
    const matrices = useMemo(
        () => group.members.map((m) => matrixFromGeometryTransform(m.geometry) ?? new THREE.Matrix4()),
        [group.members],
    );
    const color = resolveColor(first.color) ?? DEFAULT_COLOR;
    const edgeColor = viewMode3D === 'wireframe' ? color : 0x000000;
    const planes = clippingPlanes ?? EMPTY_PLANES;
    const clip = clipIntersection ?? false;
    const material = useMemo(
        () => buildShapeMaterial(first.material, false, color, viewMode3D, planes, clip),
        [first.material, color, viewMode3D, planes, clip],
    );
    const ids = useMemo<InstanceUserData>(() => ({
        instanceShapeIndices: group.members.map((m) => m.shapeIndex),
        instanceParts: group.members.map((m) => m.name),
    }), [group.members]);
    const userData = useMemo(() => ({ type: 'FACE', id: 'consolidated', faceMap, ...ids }), [faceMap, ids]);

    const meshRef = useRef<THREE.InstancedMesh>(null);
    // `args` change (geometry / material / count) rebuilds the InstancedMesh
    // with identity matrices, so re-apply them whenever any of those change.
    useLayoutEffect(() => {
        const mesh = meshRef.current;
        if (!mesh) return;
        matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
    }, [matrices, merged, material]);

    const edges = useMemo(() => {
        if (!first.edges || viewMode3D === 'shaded') return null;
        return buildInstancedEdges({
            edges: first.edges, edgeRanges: first.edgeRanges, matrices, color: edgeColor, planes, clipIntersection: clip, ids,
        });
    }, [first.edges, first.edgeRanges, matrices, viewMode3D, edgeColor, planes, clip, ids]);
    useEffect(() => () => {
        edges?.geometry.dispose();
        (edges?.material as THREE.Material | undefined)?.dispose();
    }, [edges]);

    const pick = useShapePick();
    const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
        const picked = resolvePickedPart(e);
        const member = group.members.find((m) => m.shapeIndex === picked.shapeIndex);
        if (member) pick(e, member.geometry, member.shapeIndex, member.name);
    }, [group.members, pick]);

    if (!merged) return null;
    const plainEdges = !first.edges && viewMode3D !== 'shaded';
    return (
        <group>
            <instancedMesh
                ref={meshRef}
                args={[merged, material, group.members.length]}
                onClick={handleClick}
                userData={userData}
            />
            {edges && <primitive object={edges} />}
            {plainEdges && (
                <PlainInstanceEdges merged={merged} matrices={matrices} color={edgeColor} planes={planes} clipIntersection={clip} />
            )}
        </group>
    );
}
