import * as THREE from "three";
import type { HoverResult } from "../../../features-ui/interaction/HoverManager";
import type { GeometryResult } from "../../../../shared/worker/geometryEngine";
import { CAD_COLORS_HEX } from "../../../../shared/constants/colors";
import { FaceSelectionOverlay } from "../entities/ShapeGeometry";

interface HighlightOverlayProps {
    hovered: HoverResult | null;
    geometries: GeometryResult[];
}

export function HighlightOverlay({ hovered, geometries }: HighlightOverlayProps) {
    if (!hovered || !hovered.object) return null;
    const { type, object, id } = hovered;

    if (type === 'FACE') {
        if (object.userData.faceMap) {
            const shapeIndex = object.userData.shapeIndex as number;
            const faceId = id as number;
            if (typeof shapeIndex === 'number' && geometries[shapeIndex]) {
                const face = geometries[shapeIndex].faces.find(f => f.faceId === faceId);
                if (face) return <FaceSelectionOverlay face={face} isSelected={false} />;
            }
        }
    } else if (type === 'EDGE') {
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
