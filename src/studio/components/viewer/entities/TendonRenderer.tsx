// src/studio/components/viewer/entities/TendonRenderer.tsx
//
// P7 — Studio render for closed-loop balance-spring tendons declared
// via `arm.tendon(...)`. Each tendon visualises as either:
//
//   - `visualStyle: 'line'` (default, PR #368): a thin dark-metallic
//     cylinder spanning the two endpoints. Endpoint world positions
//     recompute every frame from live FK; the cylinder visibly
//     stretches / contracts as the user drags joint pose sliders.
//   - `visualStyle: 'coil'` (P10): a helical Anglepoise-style spring
//     swept around the AB centerline. The polyline samples come from
//     `helixPolyline(...)` and feed a `THREE.TubeGeometry` whose
//     centerline tracks the live AB direction.
//
// Geometry pipeline:
//   - `'line'`: a single shared `THREE.CylinderGeometry(1, 1, 1, 16)`
//     (unit-radius +Y). Per-tendon SE(3) attributes (position /
//     rotation / scale) come from `tendonTransform`.
//   - `'coil'`: a per-tendon `THREE.TubeGeometry` built from the helix
//     polyline. The geometry instance lives only as long as the
//     endpoints haven't moved; `useMemo` keyed on the endpoint
//     positions + coil parameters disposes the previous one on update.
//
// Material: a shared `MeshStandardMaterial` picked to read as "iconic
// Anglepoise dark metallic spring". Matches the existing `mSpring`
// palette used by single-body decorative springs in v0.7 examples.

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { applyTransform, helixPolyline, tendonTransform } from './tendonTransform';
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
    /** P10: visual style. Defaults to `'line'` if not set. */
    readonly visualStyle?: 'line' | 'coil';
    /** P10: helix turn count when `visualStyle === 'coil'`. */
    readonly coilTurns?: number;
    /** P10: helix outer diameter (mm) when `visualStyle === 'coil'`. */
    readonly coilDiameterMm?: number;
}

interface TendonRendererProps {
    tendons: readonly RenderableTendon[];
}

/**
 * One Three.js Mesh per tendon, drawn under the existing parts in the
 * Studio viewer. The shared cylinder geometry / material instances live
 * for the lifetime of the Studio session; coil tendons get their own
 * per-update `TubeGeometry` (disposed on next update via `useMemo`'s
 * dependency-change cleanup).
 */
export function TendonRenderer({ tendons }: TendonRendererProps) {
    const cylinderGeometry = useMemo(() => new THREE.CylinderGeometry(1, 1, 1, 16), []);
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
                if ((t.visualStyle ?? 'line') === 'coil') {
                    return (
                        <CoilTendonMesh
                            key={t.name}
                            name={t.name}
                            fromWorld={fromWorld}
                            toWorld={toWorld}
                            coilTurns={t.coilTurns ?? 10}
                            coilDiameterMm={t.coilDiameterMm ?? 7}
                            visualDiameterMm={t.visualDiameterMm}
                            material={material}
                        />
                    );
                }
                const { position, quaternion, scale } = tendonTransform(
                    fromWorld,
                    toWorld,
                    t.visualDiameterMm,
                );
                return (
                    <mesh
                        key={t.name}
                        geometry={cylinderGeometry}
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

/**
 * Coil tendon mesh — a `THREE.TubeGeometry` swept along the helix
 * polyline. The geometry is rebuilt whenever the endpoints or coil
 * parameters change; `useEffect`'s cleanup disposes the previous one.
 */
function CoilTendonMesh(props: {
    name: string;
    fromWorld: Vec3;
    toWorld: Vec3;
    coilTurns: number;
    coilDiameterMm: number;
    visualDiameterMm: number;
    material: THREE.Material;
}) {
    const { name, fromWorld, toWorld, coilTurns, coilDiameterMm, visualDiameterMm, material } = props;
    const geometry = useMemo(() => {
        const polyline = helixPolyline(fromWorld, toWorld, coilTurns, coilDiameterMm);
        const points = polyline.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
        // CatmullRom over the helix samples produces a smooth tube
        // sweep without bumpy seams between segments. Tubular segments
        // match the polyline density so the helix doesn't lose turns
        // in the smoothing pass.
        const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
        const tubularSegments = Math.max(2, polyline.length - 1);
        return new THREE.TubeGeometry(
            curve,
            tubularSegments,
            visualDiameterMm / 2,
            8,
            false,
        );
    }, [fromWorld, toWorld, coilTurns, coilDiameterMm, visualDiameterMm]);
    useEffect(() => () => geometry.dispose(), [geometry]);
    return (
        <mesh
            geometry={geometry}
            material={material}
            userData={{ type: 'TENDON', name }}
        />
    );
}
