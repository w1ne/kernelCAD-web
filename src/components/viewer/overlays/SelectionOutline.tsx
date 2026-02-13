import * as THREE from "three";
import { useMemo, useEffect } from "react";
import type { GeometryResult, FaceGeometry } from "../../../lib/geometryEngine";
import { CAD_COLORS_HEX } from "../../../constants/colors";

function FaceEdgeOutline({ face }: { face: FaceGeometry }) {
    const geometry = useMemo(() => {
        const threeGeometry = new THREE.BufferGeometry();
        threeGeometry.setAttribute('position', new THREE.BufferAttribute(face.vertices, 3));
        threeGeometry.setAttribute('normal', new THREE.BufferAttribute(face.normals, 3));
        threeGeometry.setIndex(new THREE.BufferAttribute(face.indices, 1));
        return new THREE.EdgesGeometry(threeGeometry, 15);
    }, [face]);

    useEffect(() => { return () => geometry.dispose(); }, [geometry]);

    return (
        <lineSegments geometry={geometry} renderOrder={1002}>
            <lineBasicMaterial color={CAD_COLORS_HEX.selection} linewidth={3} depthTest={false} transparent opacity={0.8} />
        </lineSegments>
    );
}

function AnalyticalEdgeOutline({ edges }: { edges: Float32Array }) {
    const geometry = useMemo(() => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(edges, 3));
        return geo;
    }, [edges]);

    useEffect(() => { return () => geometry.dispose(); }, [geometry]);

    return (
        <lineSegments geometry={geometry} renderOrder={1002}>
            <lineBasicMaterial color={CAD_COLORS_HEX.selection} linewidth={3} depthTest={false} transparent opacity={0.8} />
        </lineSegments>
    );
}

function SelectedGeometryOutline({ geometry }: { geometry: GeometryResult | null | undefined }) {
    if (!geometry) return null;
    if (geometry.edges) return <AnalyticalEdgeOutline edges={geometry.edges} />;
    return (
        <group>
            {geometry.faces.map((face) => (
                <FaceEdgeOutline key={face.faceId} face={face} />
            ))}
        </group>
    );
}

interface SelectionOutlineProps {
    geometries: GeometryResult[];
    itemNames: (string | null)[];
    selectedItemIds: string[];
}

export function SelectionOutline({ geometries, itemNames, selectedItemIds }: SelectionOutlineProps) {
    const selectedGeometries = useMemo(() => {
        return selectedItemIds.map(id => {
            const idx = itemNames.indexOf(id);
            return idx !== -1 ? geometries[idx] : null;
        }).filter((g): g is GeometryResult => g !== null && g !== undefined);
    }, [geometries, itemNames, selectedItemIds]);

    if (selectedGeometries.length === 0) return null;

    return (
        <group>
            {selectedGeometries.map((geometry, i) => (
                <SelectedGeometryOutline key={i} geometry={geometry} />
            ))}
        </group>
    );
}
