// src/studio/components/viewer/entities/TendonRenderer.tsx
//
// P7 — Studio render for closed-loop balance-spring tendons declared
// via `arm.tendon(...)`. Each tendon visualises as a thin dark-metallic
// cylinder spanning its two endpoints. The endpoints' world positions
// recompute on every recompute (the live FK per-part transforms feed in
// from GeometryContext); the resulting cylinder visibly stretches /
// contracts as the user drags joint pose sliders.
//
// Geometry pipeline:
//   - A single `THREE.CylinderGeometry(1, 1, 1, 16)` (unit-radius +Y) is
//     shared across all tendons.
//   - Per-tendon: position / rotation / scale come from
//     `tendonTransform`. `scale = (diameter/2, length, diameter/2)`.
//   - Material: a shared MeshStandardMaterial picked to read as "iconic
//     Anglepoise dark metallic spring". Matches the existing `mSpring`
//     palette used by single-body decorative springs in v0.7 examples.

import { useMemo } from 'react';
import * as THREE from 'three';
import { applyTransform, tendonTransform } from './tendonTransform';
import type { Vec3 } from '../../../../shared/intent/types';

/**
 * Per-tendon descriptor passed to `TendonRenderer`. The Studio's
 * recompute loop builds these from the live `Scene.tendons` field + the
 * per-part FK transforms.
 *
 * `fromLocalMm` / `toLocalMm` are the connector origins in their owner
 * part's LOCAL frame (mm). `fromTransform4x4` / `toTransform4x4` are
 * the owner parts' world transforms (column-major 4×4); the renderer
 * resolves the world-frame endpoint by `applyTransform(transform,
 * localMm)`.
 */
export interface RenderableTendon {
    readonly name: string;
    readonly fromLocalMm: Vec3;
    readonly toLocalMm: Vec3;
    /** Column-major 4×4 transform from `from` part's local to world. */
    readonly fromTransform4x4: readonly number[];
    /** Column-major 4×4 transform from `to`   part's local to world. */
    readonly toTransform4x4: readonly number[];
    readonly visualDiameterMm: number;
}

interface TendonRendererProps {
    tendons: readonly RenderableTendon[];
}

/**
 * One Three.js Mesh per tendon, drawn under the existing parts in the
 * Studio viewer. The shared geometry / material instances live for the
 * lifetime of the Studio session (the component memoises both); per
 * tendon, only the SE(3) attributes (position / rotation / scale) flow
 * through React props.
 */
export function TendonRenderer({ tendons }: TendonRendererProps) {
    const geometry = useMemo(() => new THREE.CylinderGeometry(1, 1, 1, 16), []);
    const material = useMemo(
        () => new THREE.MeshStandardMaterial({
            color: 0x2a2e36,
            metalness: 0.85,
            roughness: 0.4,
        }),
        [],
    );
    return (
        <>
            {tendons.map((t) => {
                const fromWorld = applyTransform(t.fromTransform4x4, t.fromLocalMm);
                const toWorld = applyTransform(t.toTransform4x4, t.toLocalMm);
                const { position, quaternion, scale } = tendonTransform(
                    fromWorld,
                    toWorld,
                    t.visualDiameterMm,
                );
                return (
                    <mesh
                        key={t.name}
                        geometry={geometry}
                        material={material}
                        position={position}
                        quaternion={quaternion}
                        scale={scale}
                        userData={{ type: 'TENDON', name: t.name }}
                    />
                );
            })}
        </>
    );
}
