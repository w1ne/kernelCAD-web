// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { V3, ViewerDimension } from '../../../../shared/intent/viewerDimension';
import type { DimensionKind } from '../overlays/DimensionGraphic';
import { readThemeColor } from '../overlays/themeColor';

/** Labels sit this fraction of the bounding-box diagonal outside the body. */
export const LABEL_OFFSET_FRACTION = 0.06;
/** A linear dimension line moves off the body by at most this fraction of
 *  its own length, so a short one (a 6 mm thickness on a 70 mm body) stays
 *  next to the edge it measures. */
export const LABEL_OFFSET_PER_LENGTH = 0.5;

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
    /** Other label anchors, tried in order when the label at the first
     *  anchor (`labelAt`, else the midpoint) would cover a more important one. */
    labelAlternates?: V3[];
    /** Thin lines from the measured points to the moved dimension line. */
    extension?: Array<[V3, V3]>;
}

const add = (p: V3, q: V3): V3 => [p[0] + q[0], p[1] + q[1], p[2] + q[2]];
const sub = (p: V3, q: V3): V3 => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
const dot = (p: V3, q: V3): number => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
const len = (p: V3): number => Math.hypot(p[0], p[1], p[2]);
const mid = (p: V3, q: V3): V3 => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2];

/** The body's box. Overall extents lie on its edges and labels move out
 *  from its centre. */
export interface DimensionFrame {
    lo: V3;
    hi: V3;
    centre: V3;
    diagonal: number;
}

/** Bounds of the body, as the mesh payload reports them. */
export interface FrameBounds {
    min: readonly [number, number, number];
    max: readonly [number, number, number];
}

function frameOf(lo: V3, hi: V3): DimensionFrame {
    return { lo, hi, centre: mid(lo, hi), diagonal: Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) };
}

const isOverall = (d: ViewerDimension): boolean => d.source === 'auto' && /^auto:(overall|bounds):/.test(d.id);

/**
 * The body's box: the kernel's overall extents when present (measured on
 * the exact geometry), else the payload `bounds`, else the box around the
 * measured points. The payload bounds come second because they also cover
 * meshed tool bodies (a subtracted cylinder sticking out of a plate).
 * Construction points such as an angular apex are never used: they can lie
 * far from the body and would fling every label away from it.
 */
export function dimensionFrame(dimensions: readonly ViewerDimension[], bounds?: FrameBounds | null): DimensionFrame {
    const overall = dimensions.filter(isOverall);
    if (overall.length === 0 && bounds) return frameOf([...bounds.min], [...bounds.max]);
    const lo: V3 = [Infinity, Infinity, Infinity];
    const hi: V3 = [-Infinity, -Infinity, -Infinity];
    for (const d of overall.length > 0 ? overall : dimensions) {
        for (const p of [d.a, d.b]) {
            for (let k = 0; k < 3; k++) {
                lo[k] = Math.min(lo[k], p[k]);
                hi[k] = Math.max(hi[k], p[k]);
            }
        }
    }
    return frameOf(lo, hi);
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
    if (!isOverall(d) || k < 0) return d;
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

/** How far a linear dimension line moves: perpendicular to the line, away
 *  from the body centre, by the frame offset but at most
 *  `LABEL_OFFSET_PER_LENGTH` of the line's length. */
function lineShift(d: ViewerDimension, centre: V3, offset: number): V3 {
    const along = sub(d.b, d.a);
    const length = len(along);
    const m = mid(d.a, d.b);
    let v = sub(m, centre);
    if (length > 1e-9) {
        const t = dot(v, along) / (length * length);
        v = sub(v, [along[0] * t, along[1] * t, along[2] * t]);
    }
    const n = len(v);
    const size = Math.min(offset, LABEL_OFFSET_PER_LENGTH * length);
    // The line runs through the centre: any perpendicular will do.
    if (n < 1e-9) return Math.abs(along[2]) < 0.9 * length ? [0, 0, size] : [0, -size, 0];
    return [(v[0] / n) * size, (v[1] / n) * size, (v[2] / n) * size];
}

/** `shift` turned a quarter, half and three quarters around `axis` (the
 *  hole axis): the other sides of a hole its label can sit on. No axis, or a
 *  shift along it: no alternatives. */
function aroundAxis(shift: V3, axis: V3 | undefined): V3[] {
    if (!axis || len(axis) < 1e-9) return [];
    const n: V3 = [axis[0] / len(axis), axis[1] / len(axis), axis[2] / len(axis)];
    const h = dot(shift, n);
    const axial: V3 = [n[0] * h, n[1] * h, n[2] * h];
    const u = sub(shift, axial);
    if (len(u) < 1e-9) return [];
    const w: V3 = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]];
    const neg = (v: V3): V3 => [-v[0], -v[1], -v[2]];
    return [add(axial, w), add(axial, neg(u)), add(axial, neg(w))];
}

/** Hole label alternatives: the other three sides at the same distance,
 *  then all four sides at each of `FAR_LABEL` times it (on a long leader). */
const FAR_LABEL = [2, 3.5];
function alternateShifts(shift: V3, axis: V3 | undefined): V3[] {
    return [
        ...aroundAxis(shift, axis),
        ...FAR_LABEL.flatMap((k) => {
            const far: V3 = [shift[0] * k, shift[1] * k, shift[2] * k];
            return [far, ...aroundAxis(far, axis)];
        }),
    ];
}

/** Within this many mm two dimensions measure the same thing. */
const SAME_MM = 1e-3;
const near = (p: V3, q: V3): boolean => len(sub(p, q)) < SAME_MM;
function parallel(p: V3, q: V3): boolean {
    const lp = len(p);
    const lq = len(q);
    return lp > 1e-9 && lq > 1e-9 && Math.abs(Math.abs(dot(p, q)) / (lp * lq) - 1) < 1e-6;
}

/** True when the declared `d` already says what the automatic `auto` says:
 *  - a hole or radius callout of the same size about a parallel axis (the
 *    automatic one may stand for a whole group, `4× Ø5`);
 *  - a linear dimension between the same two points;
 *  - a hole spacing the same size and direction as the declared one (in a
 *    hole pattern the automatic spacing may pick another pair of holes).
 *  Angular dimensions are never automatic and never match. */
export function measuresSame(d: ViewerDimension, auto: ViewerDimension): boolean {
    if (d.kind !== auto.kind || d.kind === 'angular') return false;
    const size = len(sub(d.b, d.a));
    if (Math.abs(size - len(sub(auto.b, auto.a))) >= SAME_MM) return false;
    if (d.kind === 'diameter' || d.kind === 'radius') {
        return !d.axis || !auto.axis || parallel(d.axis, auto.axis);
    }
    if ((near(d.a, auto.a) && near(d.b, auto.b)) || (near(d.a, auto.b) && near(d.b, auto.a))) return true;
    return /^auto:spacing:/.test(auto.id) && parallel(sub(d.b, d.a), sub(auto.b, auto.a));
}

/** Automatic dimensions that a declared one already covers are dropped, so
 *  the author's label is the one drawn (and the only one). */
export function withoutAutoDuplicates(dimensions: readonly ViewerDimension[]): ViewerDimension[] {
    const declared = dimensions.filter((d) => d.source === 'declared');
    if (declared.length === 0) return [...dimensions];
    return dimensions.filter((d) => d.source === 'declared' || !declared.some((x) => measuresSame(x, d)));
}

function place(d: ViewerDimension, priority: number, centre: V3, offset: number): PlacedDimension {
    const base = {
        id: d.id,
        label: d.text,
        source: d.source,
        priority,
        ...(d.part ? { sublabel: d.part } : {}),
    };
    if (d.kind === 'diameter' || d.kind === 'radius') {
        // The callout must stay on the circle it measures; only the label moves.
        const m = mid(d.a, d.b);
        const shift = outward(m, centre, offset);
        return {
            ...base, kind: d.kind, a: d.a, b: d.b,
            labelAt: add(m, shift),
            labelAlternates: alternateShifts(shift, d.axis).map((s) => add(m, s)),
        };
    }
    // Linear and angular (drawn as a straight callout with its ° label):
    // the dimension line moves off the body, extension lines lead back.
    const shift = lineShift(d, centre, offset);
    const a = add(d.a, shift);
    const b = add(d.b, shift);
    const along = (t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    const out = (k: number): V3 => add(mid(a, b), [shift[0] * k, shift[1] * k, shift[2] * k]);
    // Alternatives: slid along the line, then further out on a leader.
    const labelAlternates = [along(0.25), along(0.75), ...(len(shift) > 1e-9 ? [out(1), out(2)] : [])];
    return { ...base, kind: 'linear', a, b, extension: [[d.a, a], [d.b, b]], labelAlternates };
}

/** Lay out dimensions around the body. Automatic dimensions a declared one
 *  duplicates are dropped (see `withoutAutoDuplicates`). Declared come first in
 *  priority; auto ones keep the kernel's order (overall > holes > spacing >
 *  radii > chamfers). Overall extents follow the camera octant `eye`. The
 *  frame is the payload `bounds` when given (see `dimensionFrame`). */
export function placeDimensions(
    dimensions: readonly ViewerDimension[],
    eye: ViewOctant = [1, 1, 1],
    bounds?: FrameBounds | null,
): PlacedDimension[] {
    if (dimensions.length === 0) return [];
    const f = dimensionFrame(dimensions, bounds);
    const offset = LABEL_OFFSET_FRACTION * f.diagonal;
    // The frame is taken before deduplication: a declared overall width
    // still leaves the kernel's overall extents to frame the body.
    const kept = withoutAutoDuplicates(dimensions);
    const ordered = [
        ...kept.filter((d) => d.source === 'declared'),
        ...kept.filter((d) => d.source !== 'declared'),
    ];
    return ordered.map((d, i) => place(silhouetteEdge(d, f, eye), i, f.centre, offset));
}

/** Declared dimensions use the accent token (`--kc-accent`), auto ones the
 *  neutral grey (`--kc-fg-2`), read from the active Studio theme. The
 *  numeric fallbacks (dark-theme values) apply when no theme is loaded. */
const TOKEN: Record<ViewerDimension['source'], [variable: string, fallback: number]> = {
    declared: ['--kc-accent', 0x5b9be6],
    auto: ['--kc-fg-2', 0xaab3c2],
};

export function dimensionColor(source: ViewerDimension['source']): string {
    const [variable, fallback] = TOKEN[source];
    return `#${readThemeColor(variable, fallback).getHexString()}`;
}
