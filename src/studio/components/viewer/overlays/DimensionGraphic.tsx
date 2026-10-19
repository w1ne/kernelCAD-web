// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { Line } from "@react-three/drei/core/Line";
import { Html } from "@react-three/drei/web/Html";
import * as THREE from "three";
import { useCallback, useMemo, useRef } from "react";
import { clampLabelCentre, compactDimensionLabel, compactLabels } from "../dimensions/labelFit";
import { ScreenScaled } from "./ScreenScaled";
import { readThemeColor } from "./themeColor";

export type DimensionKind = 'linear' | 'diameter' | 'radius';

export interface DimensionGraphicProps {
    a: readonly [number, number, number];
    b: readonly [number, number, number];
    label: string;
    sublabel?: string;
    kind: DimensionKind;
    /** Line, arrow and label-border colour. Defaults to the Measure amber. */
    color?: string;
    /** Label anchor when it should not sit on the line's midpoint; a thin
     *  leader joins it to the midpoint. */
    labelAt?: readonly [number, number, number];
}

const AMBER_FALLBACK = 0xffb703;
const ORDER = 3000;
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const anchor = new THREE.Vector3();

/** Arrowhead with its tip at the parent's origin, pointing along `outward`. */
function Arrow({ outward, color }: { outward: THREE.Vector3; color: THREE.ColorRepresentation }) {
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
export function DimensionGraphic({ a, b, label, sublabel, kind, color, labelAt }: DimensionGraphicProps) {
    const themeAmber = useMemo(() => readThemeColor('--kc-warn', AMBER_FALLBACK), []);
    const stroke: THREE.ColorRepresentation = color ?? themeAmber;
    const pa = useMemo(() => new THREE.Vector3(...a), [a]);
    const pb = useMemo(() => new THREE.Vector3(...b), [b]);
    const outwardA = useMemo(() => pa.clone().sub(pb).normalize(), [pa, pb]);
    const outwardB = useMemo(() => outwardA.clone().negate(), [outwardA]);
    const mid = useMemo(() => pa.clone().add(pb).multiplyScalar(0.5).toArray(), [pa, pb]);
    const labelPos = (labelAt ?? mid) as [number, number, number];
    const compact = compactLabels();
    const shown = compact ? compactDimensionLabel(label) : label;
    // The pill keeps inside the canvas: a label whose anchor is near an
    // edge slides in rather than run off the screen.
    const pill = useRef<HTMLDivElement>(null);
    const placeLabel = useCallback((el: THREE.Object3D, camera: THREE.Camera, size: { width: number; height: number }) => {
        anchor.setFromMatrixPosition(el.matrixWorld).project(camera);
        const x = (anchor.x + 1) * size.width / 2;
        const y = (1 - anchor.y) * size.height / 2;
        const box = pill.current;
        if (!box) return [x, y];
        return clampLabelCentre(x, y, box.offsetWidth, box.offsetHeight, size.width, size.height);
    }, []);
    if (pa.distanceTo(pb) < 1e-9) return null;
    return (
        <group data-testid="dimension-graphic" userData={{ dimensionKind: kind }}>
            <Line points={[a as [number, number, number], b as [number, number, number]]} color={stroke} lineWidth={2} depthTest={false} transparent renderOrder={ORDER} />
            {labelAt && <Line points={[mid as [number, number, number], labelPos]} color={stroke} lineWidth={1} depthTest={false} transparent opacity={0.8} renderOrder={ORDER} />}
            {kind !== 'radius' && <ScreenScaled position={a}><Arrow outward={outwardA} color={stroke} /></ScreenScaled>}
            <ScreenScaled position={b}><Arrow outward={outwardB} color={stroke} /></ScreenScaled>
            <Html position={labelPos} center calculatePosition={placeLabel} style={{ pointerEvents: 'none' }} zIndexRange={[30, 20]}>
                <div
                    ref={pill}
                    data-testid="dimension-label"
                    data-compact={compact ? 'true' : undefined}
                    title={shown === label ? undefined : label}
                    aria-label={shown === label ? undefined : label}
                    className={compact
                        ? "select-none whitespace-nowrap rounded border border-border-strong bg-surface-1/90 px-1.5 py-0.5 text-center text-fg shadow"
                        : "select-none whitespace-nowrap rounded-md border border-border-strong bg-surface-1 px-2 py-1 text-center text-fg shadow-lg"}
                    style={color === undefined ? undefined : { borderColor: color }}
                >
                    <div className={compact ? "text-2xs font-semibold leading-tight" : "text-sm font-semibold leading-tight"}>{shown}</div>
                    {sublabel && <div className="text-2xs leading-tight text-fg-2">{sublabel}</div>}
                </div>
            </Html>
        </group>
    );
}
