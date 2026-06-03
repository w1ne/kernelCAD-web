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

function unitFrame(t: Vec3): [Vec3, Vec3] {
    // u = worldZ × t (fallback worldX × t when t ∥ worldZ); v = t × u.
    let ux = -t[1], uy = t[0], uz = 0;
    let uLen = Math.sqrt(ux * ux + uy * uy + uz * uz);
    if (uLen < 1e-6) {
        ux = 0; uy = -t[2]; uz = t[1];
        uLen = Math.sqrt(ux * ux + uy * uy + uz * uz) || 1;
    }
    ux /= uLen; uy /= uLen; uz /= uLen;
    const v: Vec3 = [
        t[1] * uz - t[2] * uy,
        t[2] * ux - t[0] * uz,
        t[0] * uy - t[1] * ux,
    ];
    return [[ux, uy, uz], v];
}

// Rotate vector `w` from tangent `t0` to tangent `t1` (Rodrigues about the
// t0×t1 axis) so a twist frame parallel-transports across a waypoint kink
// without flipping. Returns `w` unchanged when the tangents are colinear.
function transport(w: Vec3, t0: Vec3, t1: Vec3): Vec3 {
    const ax = t0[1] * t1[2] - t0[2] * t1[1];
    const ay = t0[2] * t1[0] - t0[0] * t1[2];
    const az = t0[0] * t1[1] - t0[1] * t1[0];
    const sin = Math.sqrt(ax * ax + ay * ay + az * az);
    const cos = t0[0] * t1[0] + t0[1] * t1[1] + t0[2] * t1[2];
    if (sin < 1e-9) return w; // colinear (same or opposite — leave as-is)
    const kx = ax / sin, ky = ay / sin, kz = az / sin;
    const dot = kx * w[0] + ky * w[1] + kz * w[2];
    const cx = ky * w[2] - kz * w[1];
    const cy = kz * w[0] - kx * w[2];
    const cz = kx * w[1] - ky * w[0];
    return [
        w[0] * cos + cx * sin + kx * dot * (1 - cos),
        w[1] * cos + cy * sin + ky * dot * (1 - cos),
        w[2] * cos + cz * sin + kz * dot * (1 - cos),
    ];
}

/**
 * P11 Slice 3 — spiral a helix along an arbitrary piecewise-linear
 * centerline `[a, w1, w2, …, b]` (the tendon's wrap-routed path) instead
 * of a straight A→B segment. Winding phase advances by cumulative arc
 * length so the coil reads continuously across waypoint kinks; the twist
 * frame parallel-transports between segments to avoid flips. Endpoints
 * land exactly on the first/last centerline point.
 *
 * A 2-point centerline reduces to `helixPolyline(a, b, …)` exactly, so
 * straight (wrap-free) tendons are byte-identical to the pre-Slice-3 path.
 */
export function helixPolylineRouted(
    centerline: readonly Vec3[],
    turns: number,
    coilDiameterMm: number,
): Vec3[] {
    // Drop consecutive duplicate waypoints (a collapsed wrap origin etc.).
    const c: Vec3[] = [];
    for (const p of centerline) {
        const last = c[c.length - 1];
        if (last === undefined || Math.hypot(p[0] - last[0], p[1] - last[1], p[2] - last[2]) > 1e-9) {
            c.push([p[0], p[1], p[2]]);
        }
    }
    if (c.length === 0) return helixPolyline([0, 0, 0], [0, 0, 0], turns, coilDiameterMm);
    if (c.length === 1) return helixPolyline(c[0], c[0], turns, coilDiameterMm);
    if (c.length === 2) return helixPolyline(c[0], c[1], turns, coilDiameterMm);

    // Segment directions, lengths, cumulative arc length.
    const dirs: Vec3[] = [];
    const lens: number[] = [];
    const cum: number[] = [0];
    let L = 0;
    for (let i = 0; i < c.length - 1; i++) {
        const dx = c[i + 1][0] - c[i][0];
        const dy = c[i + 1][1] - c[i][1];
        const dz = c[i + 1][2] - c[i][2];
        const l = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        dirs.push([dx / l, dy / l, dz / l]);
        lens.push(l);
        L += l;
        cum.push(L);
    }

    // Parallel-transported twist frame per segment.
    const us: Vec3[] = [];
    const vs: Vec3[] = [];
    let [u, v] = unitFrame(dirs[0]);
    us.push(u); vs.push(v);
    for (let i = 1; i < dirs.length; i++) {
        u = transport(u, dirs[i - 1], dirs[i]);
        v = transport(v, dirs[i - 1], dirs[i]);
        us.push(u); vs.push(v);
    }

    const safeTurns = Math.max(1, turns);
    const sampleCount = Math.max(2, Math.floor(safeTurns * HELIX_SAMPLES_PER_TURN) + 1);
    const coilR = coilDiameterMm * 0.5;
    const twoPi = Math.PI * 2;
    const out: Vec3[] = new Array(sampleCount);
    for (let i = 0; i < sampleCount; i++) {
        const t = i / (sampleCount - 1);
        const s = t * L;
        let k = 0;
        while (k < lens.length - 1 && s > cum[k + 1]) k++;
        const local = lens[k] > 1e-12 ? (s - cum[k]) / lens[k] : 0;
        const bx = c[k][0] + dirs[k][0] * local * lens[k];
        const by = c[k][1] + dirs[k][1] * local * lens[k];
        const bz = c[k][2] + dirs[k][2] * local * lens[k];
        const theta = t * safeTurns * twoPi;
        const cosT = Math.cos(theta), sinT = Math.sin(theta);
        const r = coilR * 4 * t * (1 - t);
        const uu = us[k], vv = vs[k];
        out[i] = [
            bx + (uu[0] * cosT + vv[0] * sinT) * r,
            by + (uu[1] * cosT + vv[1] * sinT) * r,
            bz + (uu[2] * cosT + vv[2] * sinT) * r,
        ];
    }
    out[0] = [c[0][0], c[0][1], c[0][2]];
    out[sampleCount - 1] = [c[c.length - 1][0], c[c.length - 1][1], c[c.length - 1][2]];
    return out;
}
