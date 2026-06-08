// Pure interpolation of baked per-part world transforms for client-side
// animation playback. No React, no THREE-scene mutation — just matrix math —
// so the slerp/lerp behaviour is golden-testable in isolation.
//
// A baked timeline (see `POST /__kernelcad/animation-bake`) gives, per part,
// one 16-float column-major world matrix at each scheduled `times[i]`. The
// player runs rAF at full rate; for an arbitrary tMs it finds the bracketing
// baked frames and interpolates each part's transform: position + scale lerp,
// rotation slerp (decomposed, so a revolute mate's rotation interpolates as a
// rotation, not as a component-wise matrix blend that would shear mid-arc).

import * as THREE from 'three';

/** A baked part: name + one column-major mat4[16] per scheduled frame. */
export interface BakedPart {
    name: string;
    matrices: number[][];
}

/** One colliding part pair at one sampled timeline position (advisory). */
export interface BakedCollision {
    /** Timeline position (ms) at which the pair interpenetrates. */
    tMs: number;
    a: string;
    b: string;
    /** Shared volume in mm³ above the interference threshold. */
    volumeMm3: number;
}

/** The full baked timeline returned by the bake endpoint. */
export interface BakedTimeline {
    frames: number;
    durationMs: number;
    fps: number;
    /** Monotonic non-decreasing frame times in ms; `times[0]` is 0. */
    times: number[];
    parts: BakedPart[];
    /** ADVISORY keyframe-pose interferences (the same check `kernelcad animate`
     *  runs). NON-FATAL — playback works regardless; a non-empty array drives
     *  the Animation tab's collision warning banner. May be absent on responses
     *  from an older server; treat `undefined` as "no collisions reported". */
    collisions?: BakedCollision[];
}

/** Locate `tMs` within the baked `times` schedule.
 *
 *  Returns the lower frame index `lo`, the upper frame index `hi`, and the
 *  blend fraction `u` ∈ [0,1] such that the interpolated value is
 *  `lerp(frame[lo], frame[hi], u)`. Clamps outside the schedule to the first
 *  / last frame (u=0). Assumes `times` is non-empty and ascending. */
export function bracketFrames(
    times: readonly number[],
    tMs: number,
): { lo: number; hi: number; u: number } {
    const n = times.length;
    if (n === 0) return { lo: 0, hi: 0, u: 0 };
    if (tMs <= times[0]) return { lo: 0, hi: 0, u: 0 };
    const last = n - 1;
    if (tMs >= times[last]) return { lo: last, hi: last, u: 0 };
    // Binary search for the first frame whose time is > tMs.
    let lo = 0;
    let hi = last;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (times[mid] <= tMs) lo = mid + 1;
        else hi = mid;
    }
    // `lo` is the first index with time > tMs, so the bracket is [lo-1, lo].
    const a = lo - 1;
    const b = lo;
    const span = times[b] - times[a];
    const u = span <= 0 ? 0 : (tMs - times[a]) / span;
    return { lo: a, hi: b, u };
}

// Scratch objects reused across calls — interpolation runs once per part per
// frame, so allocating four THREE objects each time would churn the GC during
// playback. Module-private; the functions are synchronous and single-threaded.
const _mA = new THREE.Matrix4();
const _mB = new THREE.Matrix4();
const _posA = new THREE.Vector3();
const _posB = new THREE.Vector3();
const _quatA = new THREE.Quaternion();
const _quatB = new THREE.Quaternion();
const _scaleA = new THREE.Vector3();
const _scaleB = new THREE.Vector3();
const _outPos = new THREE.Vector3();
const _outQuat = new THREE.Quaternion();
const _outScale = new THREE.Vector3();
const _outMat = new THREE.Matrix4();

/** Interpolate two column-major mat4s by fraction `u`: lerp position & scale,
 *  slerp rotation. Returns a fresh column-major number[16]. `u<=0` returns
 *  `a`; `u>=1` returns `b` (both still decomposed/recomposed so the output is
 *  always orthonormal-clean). */
export function interpolateMatrix(a: number[], b: number[], u: number): number[] {
    _mA.fromArray(a);
    _mB.fromArray(b);
    _mA.decompose(_posA, _quatA, _scaleA);
    _mB.decompose(_posB, _quatB, _scaleB);
    _outPos.copy(_posA).lerp(_posB, u);
    _outScale.copy(_scaleA).lerp(_scaleB, u);
    _outQuat.copy(_quatA).slerp(_quatB, u);
    _outMat.compose(_outPos, _outQuat, _outScale);
    return _outMat.toArray();
}

/** Sample the baked timeline at `tMs`, returning each part's interpolated
 *  world matrix keyed by part name. Identity-fast-paths the on-frame case
 *  (u===0) so scrubbing exactly to a baked time returns the stored matrix
 *  without a decompose round-trip. */
export function sampleBakedTransforms(
    timeline: BakedTimeline,
    tMs: number,
): Record<string, number[]> {
    const { lo, hi, u } = bracketFrames(timeline.times, tMs);
    const out: Record<string, number[]> = {};
    for (const part of timeline.parts) {
        const aMat = part.matrices[lo];
        if (!aMat) continue;
        if (u <= 0 || lo === hi) {
            out[part.name] = aMat;
            continue;
        }
        const bMat = part.matrices[hi];
        out[part.name] = bMat ? interpolateMatrix(aMat, bMat, u) : aMat;
    }
    return out;
}
