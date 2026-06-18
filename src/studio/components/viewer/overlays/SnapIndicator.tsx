// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { SnapResult } from "../../../features-ui/interaction/SnapManager";
import { CAD_COLORS_HEX } from "../../../../shared/constants/colors";

export function SnapIndicator({ snap }: { snap: SnapResult | null }) {
    if (!snap) return null;
    const { type, position } = snap;
    return (
        <group position={position}>
            {type === 'ENDPOINT' && (
                <mesh renderOrder={2000}>
                    <boxGeometry args={[0.5, 0.5, 0.5]} />
                    <meshBasicMaterial color={CAD_COLORS_HEX.snap} depthTest={false} />
                </mesh>
            )}
            {type === 'MIDPOINT' && (
                <mesh renderOrder={2000} rotation={[0, 0, Math.PI / 4]}>
                    <octahedronGeometry args={[0.4]} />
                    <meshBasicMaterial color={CAD_COLORS_HEX.snap} depthTest={false} />
                </mesh>
            )}
            <mesh renderOrder={2001}>
                <sphereGeometry args={[0.6]} />
                <meshBasicMaterial color="black" wireframe depthTest={false} transparent opacity={0.2} />
            </mesh>
        </group>
    );
}
