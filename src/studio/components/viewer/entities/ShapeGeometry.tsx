// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as THREE from "three";
import { useCallback, useMemo, useEffect } from "react";
import { type ThreeEvent } from "@react-three/fiber";
import type { GeometryResult, FaceGeometry } from "../../../../shared/worker/geometryEngine";
import type { ViewMode3D } from "../../../../shared/types/viewMode";
import { useWorkbench } from "../../../context/WorkbenchContext";
import { useUI } from "../../../context/UIContext";
import { CAD_COLORS, CAD_COLORS_HEX, faceOverlayColor } from "../../../../shared/constants/colors";
import { useConsolidatedGeometry } from "../../../hooks/viewer/useConsolidatedGeometry";
import { DEFAULT_COLOR, resolveColor } from "../../../../shared/render/palette";
import { buildShapeMaterial } from "./buildShapeMaterial";
import { featureEdgePositions, publishEdgeColor, PUBLISH_EDGE_OPACITY, type ViewerLook } from "../publishLook";
import { pinRoomEnvironment } from "../roomEnvironment";
import { matrixFromGeometryTransform } from "./geometryTransform";
import { handleShapeModelClick } from "./shapeClickRouting";

const EMPTY_PLANES: THREE.Plane[] = [];

interface ShapeProps {
    geometry: GeometryResult;
    shapeIndex: number;
    viewMode3D: ViewMode3D;
    clippingPlanes?: THREE.Plane[];
    clipIntersection?: boolean;
    isSelected: boolean;
    name: string | undefined;
    /** 'publish' (the embed): smooth shading, soft feature edges only. */
    look?: ViewerLook;
}

function bufferGeometryFromFace(face: FaceGeometry): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(face.vertices, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(face.normals, 3));
    geometry.setIndex(new THREE.BufferAttribute(face.indices, 1));
    return geometry;
}

function GhostFaceMesh({ face }: { face: FaceGeometry }) {
    const geometry = useMemo(() => bufferGeometryFromFace(face), [face]);

    useEffect(() => {
        return () => {
            geometry.dispose();
        };
    }, [geometry]);

    return (
        <mesh geometry={geometry}>
            <meshBasicMaterial color={CAD_COLORS_HEX.selection} transparent opacity={0.4} />
        </mesh>
    );
}

export function GhostShape({
    geometry,
}: {
    geometry: GeometryResult;
}) {
    const transformMatrix = useMemo(() => matrixFromGeometryTransform(geometry), [geometry]);
    return (
        <group matrix={transformMatrix} matrixAutoUpdate={transformMatrix ? false : undefined}>
            {geometry.mesh && <mesh geometry={bufferGeometryFromIndexed(geometry.mesh)} />}
            {geometry.faces.map((face) => (
                <GhostFaceMesh key={face.faceId} face={face} />
            ))}
        </group>
    );
}

function bufferGeometryFromIndexed(mesh: NonNullable<GeometryResult['mesh']>): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(mesh.positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(mesh.normals, 3));
    geometry.setIndex(new THREE.BufferAttribute(mesh.indices, 1));
    return geometry;
}

/** Owned BufferGeometry for a display-only indexed mesh; disposed on change/unmount. */
function useIndexedMeshGeometry(mesh: GeometryResult['mesh']): THREE.BufferGeometry | null {
    const indexed = useMemo(() => (mesh ? bufferGeometryFromIndexed(mesh) : null), [mesh]);
    useEffect(() => () => indexed?.dispose(), [indexed]);
    return indexed;
}

export function FaceSelectionOverlay({ face, isSelected }: { face?: FaceGeometry, isSelected: boolean }) {
    const geometry = useMemo(() => {
        if (!face) return null;
        return bufferGeometryFromFace(face);
    }, [face]);

    useEffect(() => {
        return () => {
            geometry?.dispose();
        };
    }, [geometry]);

    if (!face || !geometry) return null;

    return (
        <mesh geometry={geometry} renderOrder={1001}>
            <meshBasicMaterial
                color={faceOverlayColor(isSelected)}
                transparent={!isSelected}
                opacity={isSelected ? 1.0 : 0.3}
                depthTest={true}
                polygonOffset
                polygonOffsetFactor={-1}
            />
        </mesh>
    );
}

/** The room belongs to the scene (and WebGL context) the mesh is drawn in.
 *  A callback ref pins it on mount and again when the material changes, which
 *  a layout effect keyed only on the material would miss if the mesh appears
 *  a frame later. */
function usePinnedRoomEnvironment(material: THREE.Material) {
    return useCallback((node: THREE.Mesh | null) => {
        if (node) pinRoomEnvironment(node, material);
    }, [material]);
}

export function ConsolidatedShape({
    geometry,
    shapeIndex,
    viewMode3D,
    clippingPlanes,
    clipIntersection,
    isSelected,
    name,
    look = 'engineering',
}: ShapeProps) {
    const {
        selectedFace,
        setSelectedFace,
        setSelectedSketchName,
        setSelectedItemId,
        toggleSelection,
        featureRecords,
    } = useWorkbench();

    const { setContextMenu } = useUI();

    const indexedMesh = useIndexedMeshGeometry(geometry.mesh);
    const { geometry: mergedGeometry, faceMap } = useConsolidatedGeometry(geometry.faces);
    const displayGeometry = indexedMesh ?? mergedGeometry;
    const transformMatrix = useMemo(() => matrixFromGeometryTransform(geometry), [geometry]);

    const edgesGeo = useMemo(() => {
        if (geometry.edges) {
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(geometry.edges, 3));
            return geo;
        }
        if (!displayGeometry) return null;
        return new THREE.EdgesGeometry(displayGeometry, 15);
    }, [displayGeometry, geometry.edges]);

    useEffect(() => {
        return () => { edgesGeo?.dispose(); };
    }, [edgesGeo]);

    const handleClick = useCallback((event: ThreeEvent<MouseEvent>) => {
        handleShapeModelClick(event, {
            geometry,
            shapeIndex,
            name,
            featureRecords: featureRecords ?? [],
            setSelectedFace,
            setSelectedSketchName,
            setSelectedItemId,
            toggleSelection,
            setContextMenu,
        });
    }, [geometry, featureRecords, name, shapeIndex, setSelectedFace, setSelectedSketchName, setSelectedItemId, toggleSelection, setContextMenu]);

    const resolvedColor = resolveColor(geometry.color) ?? DEFAULT_COLOR;
    const color = isSelected ? CAD_COLORS.selection : resolvedColor;
    const material = useMemo(
        () => buildShapeMaterial(
            geometry.material, isSelected, color, viewMode3D,
            clippingPlanes ?? EMPTY_PLANES, clipIntersection ?? false, look,
        ),
        [geometry.material, isSelected, color, viewMode3D, clippingPlanes, clipIntersection, look],
    );
    const meshRef = usePinnedRoomEnvironment(material);

    if (!displayGeometry) return null;

    return (
        <group matrix={transformMatrix} matrixAutoUpdate={transformMatrix ? false : undefined}>
            <mesh
                ref={meshRef}
                geometry={displayGeometry}
                material={material}
                onClick={handleClick}
                userData={{ type: 'FACE', id: 'consolidated', shapeIndex, faceMap, ownerId: name }}
            />
            <ShapeEdges
                edgesGeo={edgesGeo}
                geometry={geometry}
                shapeIndex={shapeIndex}
                name={name}
                color={color}
                viewMode3D={viewMode3D}
                clippingPlanes={clippingPlanes ?? EMPTY_PLANES}
                clipIntersection={clipIntersection ?? false}
                look={look}
            />
            {selectedFace?.shapeIndex === shapeIndex && (
                <FaceSelectionOverlay
                    face={geometry.faces.find(f => f.faceId === selectedFace.faceId)}
                    isSelected={true}
                />
            )}
        </group>
    );
}

/** BREP edge curves. In shadedWithEdges they overlay the shaded faces in
 *  black; in wireframe mode they ARE the shape (faces are ghosted by
 *  buildShapeMaterial), drawn in the body colour so they read against the
 *  viewport background. Under the publish look this full set stays only as
 *  the pick target (`visible: false` skips drawing, not raycasting) and
 *  PublishFeatureEdges draws the creases. */
function ShapeEdges({ edgesGeo, geometry, shapeIndex, name, color, viewMode3D, clippingPlanes, clipIntersection, look }: {
    edgesGeo: THREE.BufferGeometry | null;
    geometry: GeometryResult;
    shapeIndex: number;
    name: string | undefined;
    color: number | string;
    viewMode3D: ViewMode3D;
    clippingPlanes: THREE.Plane[];
    clipIntersection: boolean;
    look: ViewerLook;
}) {
    if (viewMode3D === 'shaded' || !edgesGeo) return null;
    const publishEdges = look === 'publish' && viewMode3D === 'shadedWithEdges';
    return (
        <>
            <lineSegments
                geometry={edgesGeo}
                renderOrder={500}
                // Pickable BREP edges: `edgeRanges` maps a raycast hit
                // to one edge (HoverManager / HighlightOverlay).
                userData={geometry.edgeRanges ? { type: 'EDGE', id: 'edges', shapeIndex, edgeRanges: geometry.edgeRanges, ownerId: name } : {}}
            >
                <lineBasicMaterial
                    color={viewMode3D === 'wireframe' ? color : 0x000000}
                    visible={!publishEdges}
                    clippingPlanes={clippingPlanes}
                    clipIntersection={clipIntersection}
                />
            </lineSegments>
            {publishEdges && geometry.edges ? <PublishFeatureEdges geometry={geometry} color={color} /> : null}
        </>
    );
}

/** The publish look's edge line: creases only (no seams of periodic faces,
 *  no tangent blends), in a darker shade of the body, part-transparent. Not
 *  pickable: it carries no userData type. */
function PublishFeatureEdges({ geometry, color }: { geometry: GeometryResult; color: number | string }) {
    const lines = useMemo(() => {
        if (!geometry.edges) return null;
        const positions = featureEdgePositions(geometry.faces, geometry.edges, geometry.edgeRanges);
        if (positions.length === 0) return null;
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        return geo;
    }, [geometry.faces, geometry.edges, geometry.edgeRanges]);
    const edgeColor = useMemo(() => publishEdgeColor(color), [color]);
    useEffect(() => () => { lines?.dispose(); }, [lines]);
    if (!lines) return null;
    return (
        <lineSegments geometry={lines} renderOrder={500}>
            <lineBasicMaterial color={edgeColor} transparent opacity={PUBLISH_EDGE_OPACITY} depthWrite={false} />
        </lineSegments>
    );
}

export function Shape(props: ShapeProps) {
    return (
        <ConsolidatedShape {...props} />
    );
}
