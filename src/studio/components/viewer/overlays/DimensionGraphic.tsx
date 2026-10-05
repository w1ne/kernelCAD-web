// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { Line } from "@react-three/drei/core/Line";
import { Html } from "@react-three/drei/web/Html";
import * as THREE from "three";
import { useMemo } from "react";
import { ScreenScaled } from "./ScreenScaled";
import { readThemeColor } from "./themeColor";

export type DimensionKind = 'linear' | 'diameter' | 'radius';

export interface DimensionGraphicProps {
    a: readonly [number, number, number];
    b: readonly [number, number, number];
    label: string;
    sublabel?: string;
    kind: DimensionKind;
}

const AMBER_FALLBACK = 0xffb703;
const ORDER = 3000;
const Y_AXIS = new THREE.Vector3(0, 1, 0);

/** Arrowhead with its tip at the parent's origin, pointing along `outward`. */
function Arrow({ outward, color }: { outward: THREE.Vector3; color: THREE.Color }) {
    const quaternion = useMemo(() => new THREE.Quaternion().setFromUnitVectors(Y_AXIS, outward), [outward]);
    return (
        <group quaternion={quaternion}>
            <mesh position={[0, -6, 0]} renderOrder={ORDER}>
                <coneGeometry args={[3.5, 12, 12]} />
                <meshBasicMaterial color={color} depthTest={false} depthWrite={false} transparent />
            </mesh>
        </group>
    );
}

/**
 * A 3D dimension between two world points: a line with arrowheads and a label
 * (plus an optional smaller second line). Drawn on top of the model with
 * constant screen-size arrows and an HTML label that reads on light and dark
 * backgrounds. Shared by the interactive Measure tool and, later, automatic
 * and agent dimensions.
 */
export function DimensionGraphic({ a, b, label, sublabel, kind }: DimensionGraphicProps) {
    const COLOR = useMemo(() => readThemeColor('--kc-warn', AMBER_FALLBACK), []);
    const pa = useMemo(() => new THREE.Vector3(...a), [a]);
    const pb = useMemo(() => new THREE.Vector3(...b), [b]);
    const outwardA = useMemo(() => pa.clone().sub(pb).normalize(), [pa, pb]);
    const outwardB = useMemo(() => outwardA.clone().negate(), [outwardA]);
    const mid = useMemo(() => pa.clone().add(pb).multiplyScalar(0.5).toArray(), [pa, pb]);
    if (pa.distanceTo(pb) < 1e-9) return null;
    return (
        <group data-testid="dimension-graphic" userData={{ dimensionKind: kind }}>
            <Line points={[a as [number, number, number], b as [number, number, number]]} color={COLOR} lineWidth={2} depthTest={false} transparent renderOrder={ORDER} />
            {kind !== 'radius' && <ScreenScaled position={a}><Arrow outward={outwardA} color={COLOR} /></ScreenScaled>}
            <ScreenScaled position={b}><Arrow outward={outwardB} color={COLOR} /></ScreenScaled>
            <Html position={mid as [number, number, number]} center style={{ pointerEvents: 'none' }} zIndexRange={[30, 20]}>
                <div
                    data-testid="dimension-label"
                    className="select-none whitespace-nowrap rounded-md border border-border-strong bg-surface-1 px-2 py-1 text-center text-fg shadow-lg"
                >
                    <div className="text-sm font-semibold leading-tight">{label}</div>
                    {sublabel && <div className="text-2xs leading-tight text-fg-2">{sublabel}</div>}
                </div>
            </Html>
        </group>
    );
}
