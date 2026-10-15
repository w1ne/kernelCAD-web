// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { Vec3 } from '../../shared/intent/types';
import type { Triangle } from './assemblyPathSweep';
export type SolidPointClassification = 'inside' | 'outside' | 'boundary' | 'unknown';
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const ROUNDING = 64 * Number.EPSILON;
/** Oriented closed-shell winding from signed solid angles. Unlike ray
 * parity, a distant tangential edge cannot create a spurious crossing.
 * Oppositely oriented cavity shells cancel. Unresolved near-surface or
 * non-integral winding is unknown, never a clear containment result. */
export function classifySolidPoint(point: Vec3, triangles: readonly Triangle[], consumeWork: () => void): SolidPointClassification {
    let sum = 0, compensation = 0;
    for (const triangle of triangles) {
        consumeWork();
        const vectors = triangle.map(p => p.map((x, i) => x - point[i]) as Vec3);
        const lengths = vectors.map(v => Math.hypot(...v));
        if (lengths.some(n => n === 0))
            return 'boundary';
        const [a, b, c] = vectors.map((v, i) => v.map(x => x / lengths[i]) as Vec3);
        const determinant = a[0] * (b[1] * c[2] - b[2] * c[1]) + a[1] * (b[2] * c[0] - b[0] * c[2]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
        // Equivalent to 1+a·b+b·c+c·a, without cancellation of four
        // O(1) terms when a thin triangle subtends nearly a half sphere.
        const ab = a.map((x, i) => x + b[i]) as Vec3, ac = a.map((x, i) => x + c[i]) as Vec3;
        const denominator = dot(ab, ac);
        if (!Number.isFinite(determinant) || !Number.isFinite(denominator))
            return 'unknown';
        if (determinant === 0 && denominator <= 0)
            return 'boundary';
        if (Math.abs(determinant) <= ROUNDING && denominator <= ROUNDING)
            return 'unknown';
        const angle = 2 * Math.atan2(determinant, denominator);
        // Compensated summation keeps cancellation stable across dense shells.
        const adjusted = angle - compensation, next = sum + adjusted;
        compensation = (next - sum) - adjusted;
        sum = next;
    }
    const winding = sum / (4 * Math.PI), integral = Math.round(winding);
    if (Math.abs(winding - integral) > 1e-7)
        return 'unknown';
    return integral === 0 ? 'outside' : 'inside';
}
