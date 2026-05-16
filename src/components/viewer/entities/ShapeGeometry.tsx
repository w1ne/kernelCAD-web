import * as THREE from "three";
import { useCallback, useMemo, useEffect } from "react";
import { type ThreeEvent } from "@react-three/fiber";
import type { GeometryResult, FaceGeometry } from "../../../shared/worker/geometryEngine";
import type { ViewMode3D } from "../../../shared/types/viewMode";
import { useWorkbench } from "../../../context/WorkbenchContext";
import { useUI } from "../../../context/UIContext";
import { CAD_COLORS, CAD_COLORS_HEX } from "../../../shared/constants/colors";
import { useConsolidatedGeometry } from "../../../hooks/viewer/useConsolidatedGeometry";
import { DEFAULT_COLOR, resolveColor } from "../../../shared/render/palette";

interface ShapeProps {
    geometry: GeometryResult;
    shapeIndex: number;
    viewMode3D: ViewMode3D;
    isSelected: boolean;
    name: string | undefined;
}

export function GhostShape({
    geometry,
}: {
    geometry: GeometryResult;
}) {
    return (
        <group>
            {geometry.faces.map((face) => {
                const threeGeometry = new THREE.BufferGeometry();
                threeGeometry.setAttribute('position', new THREE.BufferAttribute(face.vertices, 3));
                threeGeometry.setAttribute('normal', new THREE.BufferAttribute(face.normals, 3));
                threeGeometry.setIndex(new THREE.BufferAttribute(face.indices, 1));

                return (
                    <mesh key={face.faceId} geometry={threeGeometry}>
                        <meshBasicMaterial color={CAD_COLORS_HEX.selection} transparent opacity={0.4} />
                    </mesh>
                );
            })}
        </group>
    );
}

export function FaceSelectionOverlay({ face, isSelected }: { face?: FaceGeometry, isSelected: boolean }) {
    const geometry = useMemo(() => {
        if (!face) return null;
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(face.vertices, 3));
        geo.setAttribute('normal', new THREE.BufferAttribute(face.normals, 3));
        geo.setIndex(new THREE.BufferAttribute(face.indices, 1));
        return geo;
    }, [face]);

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
    const material = useMemo(() => new THREE.MeshLambertMaterial({
        color,
        flatShading: viewMode3D === 'shadedWithEdges'
    }), [color, viewMode3D]);

    if (!mergedGeometry) return null;

    return (
        <group>
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
