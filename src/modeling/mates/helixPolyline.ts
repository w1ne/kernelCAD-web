// src/modeling/mates/helixPolyline.ts
//
// P10 — pure geometry helper shared by the Studio TendonRenderer
// (TubeGeometry path) and the CLI featureMeshing (buildHelixTubeMesh).
// Sampling and twist-plane math live HERE so the Studio + CLI renders
// agree pixel-for-pixel on a hero-render of the Luxo lamp.
//
// Re-exported by `src/studio/components/viewer/entities/tendonTransform.ts`
// to keep the Studio import surface unchanged from PR #368.

import type { Vec3 } from '../../shared/intent/types';

/** P10: number of polyline samples per full coil turn. 16 reads as a
 *  smooth helix on a hero render while staying cheap enough for
 *  interactive Studio updates. */
export const HELIX_SAMPLES_PER_TURN = 16;

/**
 * Sample a HELIX polyline that spirals from world point `a` to world
 * point `b`, winding `turns` complete loops around the AB centerline
 * at radius `coilDiameterMm / 2`.
 *
 * Endpoints: the FIRST and LAST samples land exactly on `a` and `b`
 * (within 1e-9). This is achieved by a quadratic taper `4 * t * (1 - t)`
 * applied to the radial component, which peaks at 1 in the middle
 * (full helix radius) and is 0 at the endpoints — a smooth envelope
 * that preserves the helix winding sense everywhere in between.
 *
 * Twist plane: u = normalize(worldZ × AB), falling back to worldX × AB
 * when AB is parallel to worldZ. v = AB × u. The phase reference (s=0
 * at A) is deterministic: small pose changes produce small polyline
 * changes, no flickering.
 *
 * Sample count: `turns * HELIX_SAMPLES_PER_TURN + 1` (so the +1 closes
 * on B). 16 samples per turn gives a smooth read at coilTurns 8-14.
 */
export function helixPolyline(
    a: Vec3,
    b: Vec3,
    turns: number,
    coilDiameterMm: number,
): Vec3[] {
    const ax = a[0], ay = a[1], az = a[2];
    const bx = b[0], by = b[1], bz = b[2];
    const dx = bx - ax, dy = by - ay, dz = bz - az;
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Sample count: at least 1 turn, integer turn count rounded up so a
    // fractional `turns` value still produces a closed-on-endpoint helix.
    // 1-turn safety floor handled by the assembly validator (coilTurns
    // >= 1), but defend in depth here for direct callers.
    const safeTurns = Math.max(1, turns);
    const sampleCount = Math.max(2, Math.floor(safeTurns * HELIX_SAMPLES_PER_TURN) + 1);

    // Degenerate (a == b) tendon: return a constant polyline so the
    // caller's tube sweep degenerates without throwing.
    if (length < 1e-9) {
        const out: Vec3[] = new Array(sampleCount);
        for (let i = 0; i < sampleCount; i++) out[i] = [ax, ay, az];
        return out;
    }

    const axis: Vec3 = [dx / length, dy / length, dz / length];

    // Twist-plane basis. u = worldZ × AB normalised; fall back to worldX
    // × AB if AB is parallel to worldZ (|axis.z| ≈ 1).
    //   worldZ × axis = (-axis.y, axis.x, 0)
    //   worldX × axis = (0, -axis.z, axis.y)
    let ux = -axis[1], uy = axis[0], uz = 0;
    let uLen = Math.sqrt(ux * ux + uy * uy + uz * uz);
    if (uLen < 1e-6) {
        ux = 0;
        uy = -axis[2];
        uz = axis[1];
        uLen = Math.sqrt(ux * ux + uy * uy + uz * uz);
    }
    // Safety: if both fallbacks degenerate (impossible for a unit `axis`,
    // but defend in depth) emit a straight line so the caller never
    // dereferences NaN.
    if (uLen < 1e-12) {
        const out: Vec3[] = new Array(sampleCount);
        for (let i = 0; i < sampleCount; i++) {
            const t = i / (sampleCount - 1);
            out[i] = [ax + dx * t, ay + dy * t, az + dz * t];
        }
        return out;
    }
    ux /= uLen; uy /= uLen; uz /= uLen;
    // v = axis × u (right-handed; both are unit, both ⊥ axis).
    const vx = axis[1] * uz - axis[2] * uy;
    const vy = axis[2] * ux - axis[0] * uz;
    const vz = axis[0] * uy - axis[1] * ux;

    const coilR = coilDiameterMm * 0.5;
    const twoPi = Math.PI * 2;
    const out: Vec3[] = new Array(sampleCount);
    for (let i = 0; i < sampleCount; i++) {
        const t = i / (sampleCount - 1);
        const theta = t * safeTurns * twoPi;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);
        // Endpoint taper: collapse the helix radius to 0 at t=0 and
        // t=1 so the polyline starts and ends EXACTLY at `a` and `b`.
        const taper = 4 * t * (1 - t);
        const r = coilR * taper;
        const lx = ax + dx * t + (ux * cosT + vx * sinT) * r;
        const ly = ay + dy * t + (uy * cosT + vy * sinT) * r;
        const lz = az + dz * t + (uz * cosT + vz * sinT) * r;
        out[i] = [lx, ly, lz];
    }
    // Snap endpoints to a and b exactly (defends against floating-point
    // drift in the taper * trig path).
    out[0] = [ax, ay, az];
    out[sampleCount - 1] = [bx, by, bz];
    return out;
}
