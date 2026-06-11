// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
    bracketFrames,
    interpolateMatrix,
    sampleBakedTransforms,
    type BakedTimeline,
} from './bakeInterpolation';

const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

function rotZ(deg: number): number[] {
    return new THREE.Matrix4().makeRotationZ((deg * Math.PI) / 180).toArray();
}

describe('bracketFrames', () => {
    const times = [0, 100, 400, 1000];
    it('clamps before the first and after the last frame', () => {
        expect(bracketFrames(times, -50)).toEqual({ lo: 0, hi: 0, u: 0 });
        expect(bracketFrames(times, 5000)).toEqual({ lo: 3, hi: 3, u: 0 });
    });
    it('returns the exact frame on a sample time', () => {
        expect(bracketFrames(times, 0)).toEqual({ lo: 0, hi: 0, u: 0 });
        expect(bracketFrames(times, 1000)).toEqual({ lo: 3, hi: 3, u: 0 });
    });
    it('brackets an off-sample time with the correct fraction', () => {
        // 250 between [100,400]: u = (250-100)/300 = 0.5
        expect(bracketFrames(times, 250)).toEqual({ lo: 1, hi: 2, u: 0.5 });
        // 700 between [400,1000]: u = 300/600 = 0.5
        expect(bracketFrames(times, 700)).toEqual({ lo: 2, hi: 3, u: 0.5 });
    });
});

describe('interpolateMatrix', () => {
    it('u=0 returns the first transform, u=1 the second (orthonormal-clean)', () => {
        const a = rotZ(0);
        const b = rotZ(90);
        const at0 = interpolateMatrix(a, b, 0);
        const at1 = interpolateMatrix(a, b, 1);
        for (let i = 0; i < 16; i += 1) {
            expect(at0[i]).toBeCloseTo(a[i], 10);
            expect(at1[i]).toBeCloseTo(b[i], 10);
        }
    });

    it('slerps rotation at the midpoint (90° → 45°, not a sheared matrix blend)', () => {
        const mid = interpolateMatrix(rotZ(0), rotZ(90), 0.5);
        const expected = rotZ(45);
        for (let i = 0; i < 16; i += 1) expect(mid[i]).toBeCloseTo(expected[i], 6);
    });

    it('lerps translation', () => {
        const a = new THREE.Matrix4().makeTranslation(0, 0, 0).toArray();
        const b = new THREE.Matrix4().makeTranslation(10, 20, 30).toArray();
        const mid = interpolateMatrix(a, b, 0.25);
        const m = new THREE.Matrix4().fromArray(mid);
        const pos = new THREE.Vector3().setFromMatrixPosition(m);
        expect(pos.x).toBeCloseTo(2.5, 6);
        expect(pos.y).toBeCloseTo(5, 6);
        expect(pos.z).toBeCloseTo(7.5, 6);
    });
});

describe('sampleBakedTransforms', () => {
    const timeline: BakedTimeline = {
        frames: 2,
        durationMs: 1000,
        fps: 30,
        times: [0, 1000],
        parts: [
            { name: 'base', matrices: [IDENTITY, IDENTITY] },
            { name: 'arm', matrices: [rotZ(0), rotZ(90)] },
        ],
    };

    it('on-frame returns the stored matrix (no interpolation)', () => {
        const at0 = sampleBakedTransforms(timeline, 0);
        expect(at0.base).toBe(timeline.parts[0].matrices[0]); // identity-fast-path: same ref
        expect(at0.arm).toBe(timeline.parts[1].matrices[0]);
    });

    it('off-frame interpolates each part', () => {
        const mid = sampleBakedTransforms(timeline, 500);
        const expectedArm = rotZ(45);
        for (let i = 0; i < 16; i += 1) expect(mid.arm[i]).toBeCloseTo(expectedArm[i], 6);
        // base is static → identity at the midpoint too.
        for (let i = 0; i < 16; i += 1) expect(mid.base[i]).toBeCloseTo(IDENTITY[i], 6);
    });
});
