import * as THREE from "three";
import { useCallback, useMemo, useEffect } from "react";
import { type ThreeEvent } from "@react-three/fiber";
import type { GeometryResult, FaceGeometry } from "../../../../shared/worker/geometryEngine";
import type { ViewMode3D } from "../../../../shared/types/viewMode";
import { useWorkbench } from "../../../context/WorkbenchContext";
import { useUI } from "../../../context/UIContext";
import { CAD_COLORS, CAD_COLORS_HEX } from "../../../../shared/constants/colors";
import { useConsolidatedGeometry } from "../../../hooks/viewer/useConsolidatedGeometry";
import { DEFAULT_COLOR, resolveColor } from "../../../../shared/render/palette";
import { buildMaterialFromPBR } from "../../demoPlayer/buildMaterialFromPBR";
import { matrixFromGeometryTransform } from "./geometryTransform";

interface ShapeProps {
    geometry: GeometryResult;
    shapeIndex: number;
    viewMode3D: ViewMode3D;
    isSelected: boolean;
    name: string | undefined;
}

function bufferGeometryFromFace(face: FaceGeometry): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(face.vertices, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(face.normals, 3));
    geometry.setIndex(new THREE.BufferAttribute(face.indices, 1));
    return geometry;
}

/**
 * Build the THREE material for a shape given the geometry record, selection state,
 * resolved fallback color, and the active 3D view mode.
 *
 * Exported so unit tests can verify the (viewMode3D → material flags) mapping without
 * mounting an R3F Canvas. The three modes are:
 *  - `'shaded'`             — smooth shading, no wireframe, no edge overlay
 *  - `'wireframe'`          — `material.wireframe = true`, surfaces drawn as lines
 *  - `'shadedWithEdges'`    — flat shading + black edge overlay rendered separately
 */
export function buildShapeMaterial(
    pbr: GeometryResult['material'],
    isSelected: boolean,
    color: number | string,
    viewMode3D: ViewMode3D,
): THREE.Material {
    const isWireframe = viewMode3D === 'wireframe';
    const flatShading = viewMode3D === 'shadedWithEdges';
    if (pbr && !isSelected) {
        const pbrMaterial = buildMaterialFromPBR(pbr) as THREE.MeshPhysicalMaterial;
        pbrMaterial.flatShading = flatShading;
        pbrMaterial.wireframe = isWireframe;
        pbrMaterial.side = THREE.DoubleSide;
        pbrMaterial.depthWrite = (pbr.opacity ?? 1) >= 1;
        return pbrMaterial;
    }
    return new THREE.MeshLambertMaterial({
        color,
        flatShading,
        wireframe: isWireframe,
    });
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
            {geometry.faces.map((face) => (
                <GhostFaceMesh key={face.faceId} face={face} />
            ))}
        </group>
    );
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
                color={CAD_COLORS.selection}
                transparent={!isSelected}
                opacity={isSelected ? 1.0 : 0.3}
                depthTest={true}
                polygonOffset
                polygonOffsetFactor={-1}
            />
        </mesh>
    );
}

export function ConsolidatedShape({
    geometry,
    shapeIndex,
    viewMode3D,
    isSelected,
    name
}: ShapeProps) {
    const {
        selectedFace,
        setSelectedFace,
        setSelectedSketchName,
        setSelectedItemId,
        toggleSelection
    } = useWorkbench();

    const { setContextMenu } = useUI();

    const { geometry: mergedGeometry, faceMap } = useConsolidatedGeometry(geometry.faces);
    const transformMatrix = useMemo(() => matrixFromGeometryTransform(geometry), [geometry]);

    const edgesGeo = useMemo(() => {
        if (geometry.edges) {
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(geometry.edges, 3));
            return geo;
        }
        if (!mergedGeometry) return null;
        return new THREE.EdgesGeometry(mergedGeometry, 15);
    }, [mergedGeometry, geometry.edges]);

    useEffect(() => {
        return () => { edgesGeo?.dispose(); };
    }, [edgesGeo]);

    const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        const isMulti = e.metaKey || e.ctrlKey || e.shiftKey;

        if (name && isMulti) {
            toggleSelection(name, true);
            return;
        }

        setSelectedSketchName(null);
        let faceId = -1;
        if (e.object.userData.faceMap && e.faceIndex != null) {
            faceId = e.object.userData.faceMap[e.faceIndex] ?? -1;
        } else if (typeof e.object.userData.id === 'number') {
            faceId = e.object.userData.id;
        }

        setSelectedFace({ shapeIndex, faceId });
        if (name) setSelectedItemId(name);

        const x = e.nativeEvent.clientX;
        const y = e.nativeEvent.clientY;
        setContextMenu({
            visible: true,
            position: { x, y },
            type: 'FACE'
        });
    }, [name, shapeIndex, setSelectedFace, setSelectedSketchName, setSelectedItemId, toggleSelection, setContextMenu]);

    const resolvedColor = resolveColor(geometry.color) ?? DEFAULT_COLOR;
    const color = isSelected ? CAD_COLORS.selection : resolvedColor;
    const material = useMemo(
        () => buildShapeMaterial(geometry.material, isSelected, color, viewMode3D),
        [geometry.material, isSelected, color, viewMode3D],
    );

    if (!mergedGeometry) return null;

    return (
        <group matrix={transformMatrix} matrixAutoUpdate={transformMatrix ? false : undefined}>
            <mesh
                geometry={mergedGeometry}
                material={material}
                onClick={handleClick}
                userData={{ type: 'FACE', id: 'consolidated', shapeIndex, faceMap, ownerId: name }}
            />
            {viewMode3D === 'shadedWithEdges' && edgesGeo && (
                <lineSegments geometry={edgesGeo} renderOrder={500}>
                    <lineBasicMaterial color={0x000000} />
                </lineSegments>
            )}
            {selectedFace?.shapeIndex === shapeIndex && (
                <FaceSelectionOverlay
                    face={geometry.faces.find(f => f.faceId === selectedFace.faceId)}
                    isSelected={true}
                />
            )}
        </group>
    );
}

export function Shape(props: ShapeProps) {
    return (
        <ConsolidatedShape {...props} />
    );
}
