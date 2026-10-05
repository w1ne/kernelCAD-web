// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { V3, ViewerDimension } from '../../../../shared/intent/viewerDimension';
import type { ViewportBackground } from '../../../../shared/types/viewMode';
import type { DimensionKind } from '../overlays/DimensionGraphic';

/** Labels sit this fraction of the bounding-box diagonal outside the body. */
export const LABEL_OFFSET_FRACTION = 0.06;

/** One dimension ready to draw: graphic endpoints, label and draw order. */
export interface PlacedDimension {
    id: string;
    kind: DimensionKind;
    a: V3;
    b: V3;
    label: string;
    sublabel?: string;
    source: ViewerDimension['source'];
    /** 0 is the most important label (declared first, then auto order). */
    priority: number;
    /** Label anchor when it is not the midpoint of a–b (hole and radius callouts). */
    labelAt?: V3;
    /** Thin lines from the measured points to the moved dimension line. */
    extension?: Array<[V3, V3]>;
}

const add = (p: V3, q: V3): V3 => [p[0] + q[0], p[1] + q[1], p[2] + q[2]];
const mid = (p: V3, q: V3): V3 => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2];

/** Box around every dimension point. Overall extents lie on its edges. */
export interface DimensionFrame {
    lo: V3;
    hi: V3;
    centre: V3;
    diagonal: number;
}

export function dimensionFrame(dimensions: readonly ViewerDimension[]): DimensionFrame {
    const lo: V3 = [Infinity, Infinity, Infinity];
    const hi: V3 = [-Infinity, -Infinity, -Infinity];
    for (const d of dimensions) {
        for (const p of [d.a, d.b, ...(d.centre ? [d.centre] : [])]) {
            for (let k = 0; k < 3; k++) {
                lo[k] = Math.min(lo[k], p[k]);
                hi[k] = Math.max(hi[k], p[k]);
            }
        }
    }
    return { lo, hi, centre: mid(lo, hi), diagonal: Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) };
}

/** `length` along the direction from `centre` to `p` (straight up when `p` is the centre). */
function outward(p: V3, centre: V3, length: number): V3 {
    const v: V3 = [p[0] - centre[0], p[1] - centre[1], p[2] - centre[2]];
    const n = Math.hypot(...v);
    if (n < 1e-9) return [0, 0, length];
    return [(v[0] / n) * length, (v[1] / n) * length, (v[2] / n) * length];
}

/** Which side of the frame centre the camera is on, per axis (+1 / -1). */
export type ViewOctant = readonly [number, number, number];

/** The single axis an axis-aligned segment runs along, else -1. */
function alignedAxis(d: ViewerDimension): number {
    const moved = [0, 1, 2].filter((k) => Math.abs(d.b[k] - d.a[k]) > 1e-6);
    return moved.length === 1 ? moved[0] : -1;
}

/** Overall extents may sit on any of the four parallel box edges; pick the
 *  silhouette edge for this view (nearer side on the first other axis,
 *  farther side on the second) so the line never crosses the body. */
function silhouetteEdge(d: ViewerDimension, f: DimensionFrame, eye: ViewOctant): ViewerDimension {
    const k = alignedAxis(d);
    const overall = d.source === 'auto' && /^auto:(overall|bounds):/.test(d.id);
    if (!overall || k < 0) return d;
    const [i, j] = [0, 1, 2].filter((n) => n !== k);
    const at: V3 = [0, 0, 0];
    at[i] = eye[i] > 0 ? f.hi[i] : f.lo[i];
    at[j] = eye[j] > 0 ? f.lo[j] : f.hi[j];
    const a: V3 = [...at];
    const b: V3 = [...at];
    a[k] = f.lo[k];
    b[k] = f.hi[k];
    return { ...d, a, b };
}

function place(d: ViewerDimension, priority: number, centre: V3, offset: number): PlacedDimension {
    const base = {
        id: d.id,
        label: d.text,
        source: d.source,
        priority,
        ...(d.part ? { sublabel: d.part } : {}),
    };
    const shift = outward(mid(d.a, d.b), centre, offset);
    if (d.kind === 'diameter' || d.kind === 'radius') {
        // The callout must stay on the circle it measures; only the label moves.
        return { ...base, kind: d.kind, a: d.a, b: d.b, labelAt: add(mid(d.a, d.b), shift) };
    }
    // Linear and angular (drawn as a straight callout with its ° label):
    // the dimension line moves off the body, extension lines lead back.
    const a = add(d.a, shift);
    const b = add(d.b, shift);
    return { ...base, kind: 'linear', a, b, extension: [[d.a, a], [d.b, b]] };
}

/** Lay out dimensions around the body. Declared dimensions come first in
 *  priority; auto ones keep the kernel's order (overall > holes > spacing >
 *  radii > chamfers). Overall extents follow the camera octant `eye`. */
export function placeDimensions(
    dimensions: readonly ViewerDimension[],
    eye: ViewOctant = [1, 1, 1],
): PlacedDimension[] {
    if (dimensions.length === 0) return [];
    const f = dimensionFrame(dimensions);
    const offset = LABEL_OFFSET_FRACTION * f.diagonal;
    const ordered = [
        ...dimensions.filter((d) => d.source === 'declared'),
        ...dimensions.filter((d) => d.source !== 'declared'),
    ];
    return ordered.map((d, i) => place(silhouetteEdge(d, f, eye), i, f.centre, offset));
}

/** Declared dimensions use the accent token (`--kc-accent`), auto ones a
 *  neutral grey (`--kc-fg-2` / `--kc-fg-3`), picked for the canvas
 *  background rather than the page theme so lines read on either. */
const PALETTE: Record<'light' | 'dark', Record<ViewerDimension['source'], string>> = {
    light: { declared: '#1E5FA8', auto: '#566072' },
    dark: { declared: '#5B9BE6', auto: '#AAB3C2' },
};

export function dimensionColor(source: ViewerDimension['source'], background: ViewportBackground): string {
    return PALETTE[background === 'light' ? 'light' : 'dark'][source];
}
