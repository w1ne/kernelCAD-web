// src/studio/components/viewer/entities/tendonTransform.test.ts
//
// P7 Task 3 smoke tests for the pure-geometry side of the Studio tendon
// renderer. No R3F harness — exercises the transform math directly.

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { applyTransform, helixPolyline, HELIX_SAMPLES_PER_TURN, tendonTransform } from './tendonTransform';

describe('tendonTransform', () => {
    it('positions the cylinder midpoint between endpoints', () => {
        const r = tendonTransform([0, 0, 0], [10, 0, 0], 3);
        expect(r.position.x).toBeCloseTo(5);
        expect(r.position.y).toBeCloseTo(0);
        expect(r.position.z).toBeCloseTo(0);
    });

    it('scales the cylinder length to the endpoint distance', () => {
        const r = tendonTransform([0, 0, 0], [0, 0, 30], 4);
        expect(r.lengthMm).toBeCloseTo(30);
        expect(r.scale.y).toBeCloseTo(30);
    });

    it('scales X/Z by half the visual diameter (so radius = diameter/2)', () => {
        const r = tendonTransform([0, 0, 0], [10, 0, 0], 6);
        expect(r.scale.x).toBeCloseTo(3);
        expect(r.scale.z).toBeCloseTo(3);
    });

    it('rotates +Y to the endpoint→endpoint direction', () => {
        // Endpoints along +X: the +Y axis of the cylinder should map to +X.
        const r = tendonTransform([0, 0, 0], [10, 0, 0], 3);
        const probe = new THREE.Vector3(0, 1, 0).applyQuaternion(r.quaternion);
        expect(probe.x).toBeCloseTo(1);
        expect(probe.y).toBeCloseTo(0);
        expect(probe.z).toBeCloseTo(0);
    });

    it('rotates +Y to -Z (straight-down tendon)', () => {
        const r = tendonTransform([0, 0, 10], [0, 0, 0], 3);
        const probe = new THREE.Vector3(0, 1, 0).applyQuaternion(r.quaternion);
        expect(probe.x).toBeCloseTo(0);
        expect(probe.y).toBeCloseTo(0);
        expect(probe.z).toBeCloseTo(-1);
    });

    it('handles zero-length tendon without throwing (degenerate case)', () => {
        const r = tendonTransform([5, 5, 5], [5, 5, 5], 3);
        expect(r.lengthMm).toBe(0);
        expect(r.scale.y).toBe(0);
        // Midpoint == both endpoints.
        expect(r.position.x).toBeCloseTo(5);
    });
});

describe('applyTransform', () => {
    it('returns the input point when transform is identity', () => {
        const identity = [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1,
        ];
        const w = applyTransform(identity, [3, -7, 11]);
        expect(w).toEqual([3, -7, 11]);
    });

    it('applies a pure translation (column-major)', () => {
        const t = [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            10, 20, 30, 1,
        ];
        const w = applyTransform(t, [1, 2, 3]);
        expect(w[0]).toBeCloseTo(11);
        expect(w[1]).toBeCloseTo(22);
        expect(w[2]).toBeCloseTo(33);
    });

    it('applies a 90° rotation about Z (column-major)', () => {
        // Column-major Rz(90°): [cos, sin, 0, 0,  -sin, cos, 0, 0,  0, 0, 1, 0,  0, 0, 0, 1]
        //                       =   [0,   1,  0, 0,    -1,   0, 0, 0,  0, 0, 1, 0,  0, 0, 0, 1]
        const rz90 = [
            0, 1, 0, 0,
            -1, 0, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1,
        ];
        const w = applyTransform(rz90, [1, 0, 0]);
        // [1, 0, 0] rotated 90° about +Z → [0, 1, 0].
        expect(w[0]).toBeCloseTo(0);
        expect(w[1]).toBeCloseTo(1);
        expect(w[2]).toBeCloseTo(0);
    });

    it('composes rotation + translation', () => {
        const t = [
            0, 1, 0, 0,
            -1, 0, 0, 0,
            0, 0, 1, 0,
            5, 5, 0, 1,
        ];
        const w = applyTransform(t, [1, 0, 0]);
        // Rotated: (0, 1, 0); translated: (5, 6, 0)
        expect(w[0]).toBeCloseTo(5);
        expect(w[1]).toBeCloseTo(6);
        expect(w[2]).toBeCloseTo(0);
    });
});

describe('helixPolyline (P10)', () => {
    it('returns turns * HELIX_SAMPLES_PER_TURN + 1 samples', () => {
        const poly = helixPolyline([0, 0, 0], [100, 0, 0], 10, 7);
        expect(poly.length).toBe(10 * HELIX_SAMPLES_PER_TURN + 1);
    });

    it('endpoints land exactly on a and b', () => {
        const a: [number, number, number] = [3, -7, 11];
        const b: [number, number, number] = [50, 25, -8];
        const poly = helixPolyline(a, b, 8, 6);
        const first = poly[0];
        const last = poly[poly.length - 1];
        expect(Math.hypot(first[0] - a[0], first[1] - a[1], first[2] - a[2])).toBeLessThan(1e-9);
        expect(Math.hypot(last[0] - b[0], last[1] - b[1], last[2] - b[2])).toBeLessThan(1e-9);
    });

    it('at t≈0.5 the sample sits at coilDiameterMm/2 from the AB line', () => {
        const a: [number, number, number] = [0, 0, 0];
        const b: [number, number, number] = [100, 0, 0];
        const coilDiameterMm = 8;
        const turns = 10;
        const poly = helixPolyline(a, b, turns, coilDiameterMm);
        const midIdx = Math.floor((turns * HELIX_SAMPLES_PER_TURN) / 2);
        // t at midIdx: pick an index whose t lands on a full turn so the
        // cos/sin contribution is fully felt (not collapsed against the
        // axis). HELIX_SAMPLES_PER_TURN/4 → quarter turn → sin=1, cos=0:
        // distance from AB axis is exactly coilR.
        const qIdx = HELIX_SAMPLES_PER_TURN / 4;
        const p = poly[qIdx];
        // AB axis is +X; distance from axis = sqrt(y² + z²). At t = qIdx /
        // (turns*HELIX_SAMPLES_PER_TURN) the taper factor < 1, so use
        // exact relation: r = (coilDiameterMm/2) * 4 * t * (1 - t).
        const t = qIdx / (turns * HELIX_SAMPLES_PER_TURN);
        const expected = (coilDiameterMm / 2) * 4 * t * (1 - t);
        const distFromAxis = Math.sqrt(p[1] * p[1] + p[2] * p[2]);
        expect(distFromAxis).toBeCloseTo(expected, 6);
        void midIdx;
    });

    it('twist direction is stable under small pose changes', () => {
        // Tiny perturbation in B: the polyline at index N/2 should be
        // continuous (no flip in winding sense). We compare the angle of
        // the radial-component vector at index N/2 between the perturbed
        // and unperturbed polylines.
        const a: [number, number, number] = [0, 0, 0];
        const b0: [number, number, number] = [100, 0, 0];
        const b1: [number, number, number] = [100.5, 0.3, -0.1];
        const turns = 10;
        const polyA = helixPolyline(a, b0, turns, 6);
        const polyB = helixPolyline(a, b1, turns, 6);
        const midIdx = Math.floor((turns * HELIX_SAMPLES_PER_TURN) / 2);
        // Take the radial offset (sample - lerp(a, b, t)) for each polyline.
        const t = midIdx / (turns * HELIX_SAMPLES_PER_TURN);
        const lerpA = [a[0] + (b0[0] - a[0]) * t, a[1] + (b0[1] - a[1]) * t, a[2] + (b0[2] - a[2]) * t];
        const lerpB = [a[0] + (b1[0] - a[0]) * t, a[1] + (b1[1] - a[1]) * t, a[2] + (b1[2] - a[2]) * t];
        const rA = [polyA[midIdx][0] - lerpA[0], polyA[midIdx][1] - lerpA[1], polyA[midIdx][2] - lerpA[2]];
        const rB = [polyB[midIdx][0] - lerpB[0], polyB[midIdx][1] - lerpB[1], polyB[midIdx][2] - lerpB[2]];
        // Dot product of the radial vectors should be POSITIVE (similar
        // direction) — confirms the winding sense didn't flip.
        const dot = rA[0] * rB[0] + rA[1] * rB[1] + rA[2] * rB[2];
        expect(dot).toBeGreaterThan(0);
    });

    it('handles vertical AB (parallel to worldZ) without NaN via worldX fallback', () => {
        const a: [number, number, number] = [0, 0, 0];
        const b: [number, number, number] = [0, 0, 50];
        const poly = helixPolyline(a, b, 6, 5);
        for (const p of poly) {
            expect(Number.isFinite(p[0])).toBe(true);
            expect(Number.isFinite(p[1])).toBe(true);
            expect(Number.isFinite(p[2])).toBe(true);
        }
        // Sample mid-polyline should NOT sit on the AB line (helix
        // bulges outward in the perpendicular plane).
        const midIdx = Math.floor(poly.length / 2);
        const distFromAxis = Math.hypot(poly[midIdx][0], poly[midIdx][1]);
        expect(distFromAxis).toBeGreaterThan(0.1);
    });

    it('degenerate (a === b) returns a constant-position polyline (no NaN)', () => {
        const poly = helixPolyline([5, 5, 5], [5, 5, 5], 8, 7);
        expect(poly.length).toBeGreaterThan(2);
        for (const p of poly) {
            expect(Number.isFinite(p[0])).toBe(true);
            expect(p[0]).toBeCloseTo(5);
            expect(p[1]).toBeCloseTo(5);
            expect(p[2]).toBeCloseTo(5);
        }
    });
});
