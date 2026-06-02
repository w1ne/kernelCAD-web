// src/studio/components/viewer/entities/tendonTransform.test.ts
//
// P7 Task 3 smoke tests for the pure-geometry side of the Studio tendon
// renderer. No R3F harness — exercises the transform math directly.

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { applyTransform, tendonTransform } from './tendonTransform';

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
