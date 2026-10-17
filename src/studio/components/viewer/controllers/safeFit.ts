// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as THREE from 'three';

/** Canvas pixels covered by overlays on each side (toolbar, tab bar...). */
export interface CanvasInsets {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

export const NO_INSETS: CanvasInsets = { top: 0, right: 0, bottom: 0, left: 0 };

export interface SafeFitInput {
    /** World-space points that must be in view: the box corners, plus any
     *  dimension endpoints. */
    points: readonly THREE.Vector3[];
    /** Unit vector from the target to the camera (the view direction). */
    direction: THREE.Vector3;
    up: THREE.Vector3;
    fovDegrees: number;
    /** Canvas size in CSS pixels. */
    width: number;
    height: number;
    /** The part of the canvas the model must stay inside. */
    insets: CanvasInsets;
    /** Fraction of the free area kept as air on each side (0.03 = 3 %). */
    air?: number;
}

export interface SafeFitPose {
    position: THREE.Vector3;
    lookAt: THREE.Vector3;
    distance: number;
}

interface Projected { x: number; y: number; z: number }

/** The free area as NDC bounds, shrunk by `air` on each side. */
function safeNdc(width: number, height: number, insets: CanvasInsets, air: number) {
    const left = -1 + (2 * insets.left) / width;
    const right = 1 - (2 * insets.right) / width;
    const top = 1 - (2 * insets.top) / height;
    const bottom = -1 + (2 * insets.bottom) / height;
    const padX = (right - left) * air;
    const padY = (top - bottom) * air;
    return { left: left + padX, right: right - padX, top: top - padY, bottom: bottom + padY };
}

/** The range of shifts `s` for which every (p - s) / (depth * tan) lies in
 *  [lo, hi]; null when there is none at this distance. */
function shiftRange(coords: readonly number[], depths: readonly number[], tan: number, lo: number, hi: number): [number, number] | null {
    let min = -Infinity;
    let max = Infinity;
    for (let i = 0; i < coords.length; i++) {
        const k = depths[i] * tan;
        min = Math.max(min, coords[i] - hi * k);
        max = Math.min(max, coords[i] - lo * k);
    }
    return min <= max + 1e-9 ? [min, max] : null;
}

/** Camera axes for a view along `-direction` with `up` as the hint; null
 *  when `up` is parallel to the view. */
function viewBasis(direction: THREE.Vector3, upHint: THREE.Vector3) {
    const dir = direction.clone().normalize();
    const right = new THREE.Vector3().crossVectors(dir.clone().negate(), upHint);
    if (right.lengthSq() < 1e-12) return null;
    right.normalize();
    const up = new THREE.Vector3().crossVectors(right, dir.clone().negate()).normalize();
    return { dir, right, up };
}

function safeFov(fovDegrees: number): number {
    return Number.isFinite(fovDegrees) && fovDegrees > 0 && fovDegrees < 180 ? fovDegrees : 40;
}

/** Smallest distance in (lo, hi] at which `fits` holds, by bisection.
 *  `fits` is monotone: farther always fits once nearer does. */
function closestFit<T>(lo: number, start: number, fits: (d: number) => T | null): { d: number; fit: T } | null {
    let hi = start;
    for (let i = 0; i < 40 && !fits(hi); i++) hi *= 2;
    let best = fits(hi);
    if (!best) return null;
    for (let i = 0; i < 48; i++) {
        const mid = (lo + hi) / 2;
        const at = fits(mid);
        if (at) { hi = mid; best = at; } else lo = mid;
    }
    return { d: hi, fit: best };
}

/**
 * The closest camera, looking along `-direction`, that shows every point
 * inside the free part of the canvas — the canvas minus the overlays — and
 * centres them there.
 *
 * A bounding-sphere fit frames the sphere, not the model: on a phone the
 * model ends up centred on the whole canvas, partly under the toolbar, and
 * its dimension lines run off the edge. This fits the actual points to the
 * free area instead, moving the target sideways (in the view plane) as
 * needed. Returns null when nothing fits (no points, or no free area).
 */
export function fitPointsToSafeArea(input: SafeFitInput): SafeFitPose | null {
    const { points, width, height } = input;
    if (points.length === 0 || !(width > 0) || !(height > 0)) return null;
    const ndc = safeNdc(width, height, input.insets, input.air ?? 0.03);
    const basis = viewBasis(input.direction, input.up);
    if (!basis || ndc.right - ndc.left <= 0.05 || ndc.top - ndc.bottom <= 0.05) return null;

    const centre = new THREE.Vector3();
    for (const p of points) centre.add(p);
    centre.multiplyScalar(1 / points.length);
    const rel: Projected[] = points.map((p) => {
        const q = p.clone().sub(centre);
        return { x: q.dot(basis.right), y: q.dot(basis.up), z: q.dot(basis.dir) };
    });
    const tanV = Math.tan((safeFov(input.fovDegrees) * Math.PI) / 360);
    const tanH = tanV * (width / height);
    const xs = rel.map((r) => r.x);
    const ys = rel.map((r) => r.y);
    const nearest = Math.max(...rel.map((r) => r.z));
    const radius = Math.max(...rel.map((r) => Math.hypot(r.x, r.y, r.z)), 1e-6);

    const fits = (d: number) => {
        const depths = rel.map((r) => d - r.z);
        const sx = shiftRange(xs, depths, tanH, ndc.left, ndc.right);
        const sy = sx && shiftRange(ys, depths, tanV, ndc.bottom, ndc.top);
        return sx && sy ? { sx, sy } : null;
    };
    // Every point must stay in front of the camera.
    const lo = nearest + radius * 1e-3;
    const found = closestFit(lo, Math.max(lo * 2, radius * 4), fits);
    if (!found) return null;
    const sx = (found.fit.sx[0] + found.fit.sx[1]) / 2;
    const sy = (found.fit.sy[0] + found.fit.sy[1]) / 2;
    const lookAt = centre.clone().addScaledVector(basis.right, sx).addScaledVector(basis.up, sy);
    return { lookAt, position: lookAt.clone().addScaledVector(basis.dir, found.d), distance: found.d };
}

/** The 8 corners of an axis-aligned box. */
export function boxCorners(min: THREE.Vector3, max: THREE.Vector3): THREE.Vector3[] {
    const out: THREE.Vector3[] = [];
    for (const x of [min.x, max.x]) for (const y of [min.y, max.y]) for (const z of [min.z, max.z]) out.push(new THREE.Vector3(x, y, z));
    return out;
}

/**
 * Canvas pixels hidden by overlays marked `data-viewport-occluder` (the
 * floating toolbar). An overlay counts for the side it hugs, and only when it
 * spans most of the canvas across that side: a small corner widget does not
 * shrink the fit.
 */
export function occluderInsets(canvas: DOMRect, occluders: readonly DOMRect[]): CanvasInsets {
    const insets = { ...NO_INSETS };
    for (const r of occluders) {
        const left = Math.max(r.left, canvas.left);
        const right = Math.min(r.right, canvas.right);
        const top = Math.max(r.top, canvas.top);
        const bottom = Math.min(r.bottom, canvas.bottom);
        if (right <= left || bottom <= top) continue;
        const wide = (right - left) >= canvas.width * 0.5;
        if (!wide) continue;
        const midY = (top + bottom) / 2 - canvas.top;
        if (midY < canvas.height / 2) insets.top = Math.max(insets.top, bottom - canvas.top);
        else insets.bottom = Math.max(insets.bottom, canvas.bottom - top);
    }
    return insets;
}
