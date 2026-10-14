// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { Vec3 } from '../../shared/intent/types';
export type Triangle = readonly [
    Vec3,
    Vec3,
    Vec3
];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const edges = (t: Triangle): Vec3[] => [sub(t[1], t[0]), sub(t[2], t[1]), sub(t[0], t[2])];
const EPS = 1e-9;
/** Continuous triangle/triangle SAT. Intersect the overlap time intervals
 * on both face normals and all edge cross products; coplanar triangles
 * additionally need in-plane edge normals. No sampled poses or tunneling.
 * Contact at positive travel is conservative; t=0-only departure is free. */
export function trianglesCollideAlong(a: Triangle, b: Triangle, direction: Vec3, distance: number): boolean {
    if (!Number.isFinite(distance) || !direction.every(Number.isFinite))
        throw new Error('Assembly path sweep has non-finite travel inputs.');
    const ae = edges(a), be = edges(b);
    const an = cross(ae[0], ae[1]), bn = cross(be[0], be[1]);
    const axes = [an, bn, ...ae.flatMap(x => be.map(y => cross(x, y))), ...ae.map(e => cross(an, e)), ...be.map(e => cross(bn, e))];
    let enter = 0, leave = distance;
    for (const axis of axes) {
        const length = Math.hypot(...axis);
        if (!Number.isFinite(length))
            throw new Error('Assembly path sweep produced a non-finite separating axis.');
        if (length === 0)
            continue;
        const n = axis.map(v => v / length) as Vec3;
        const ap = a.map(p => dot(p, n)), bp = b.map(p => dot(p, n));
        const amin = Math.min(...ap), amax = Math.max(...ap), bmin = Math.min(...bp), bmax = Math.max(...bp);
        const speed = dot(direction, n);
        if (![amin,amax,bmin,bmax,speed].every(Number.isFinite))
            throw new Error('Assembly path sweep produced non-finite projections.');
        if (speed === 0) {
            if (amax < bmin - EPS || bmax < amin - EPS)
                return false;
        }
        else {
            const t0 = (bmin - amax) / speed, t1 = (bmax - amin) / speed;
            if (!Number.isFinite(t0) || !Number.isFinite(t1))
                throw new Error('Assembly path sweep produced non-finite overlap times.');
            enter = Math.max(enter, Math.min(t0, t1));
            leave = Math.min(leave, Math.max(t0, t1));
            if (enter > leave + EPS)
                return false;
        }
    }
    // Exclude only t=0-only departure, not a positive interval shorter than EPS.
    return leave > 0 && enter <= distance && enter <= leave + EPS;
}
