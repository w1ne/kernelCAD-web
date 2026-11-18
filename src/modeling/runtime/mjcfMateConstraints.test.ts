// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { describe, expect, it } from 'vitest';
import type { MateRecord } from '../mates/mate';
import { emitMateCouplingBlock } from './mjcfMateConstraints';
import { restBodyPlacement } from './mjcfRestPose';

function mate(name: string): MateRecord {
    return { name, a: 'p.x', b: 'c.x', type: 'revolute' };
}

describe('emitMateCouplingBlock qpos0', () => {
    const coupling = [{ driven: 'drv', source: 'src', ratio: -1, offset: 3 }];

    it('keeps a non-zero offset in polycoef when both references are 0', () => {
        const xml = emitMateCouplingBlock([mate('src'), mate('drv')], coupling).join('\n');
        const offsetSi = (3 * Math.PI / 180).toFixed(6);
        expect(xml).toContain(`polycoef="${offsetSi} -1.000000 0 0 0"`);
    });

    it('moves the offset into qpos0 when the refs are coupling-consistent', () => {
        const xml = emitMateCouplingBlock(
            [mate('src'), mate('drv')],
            coupling,
            { src: 20, drv: -17 },
        ).join('\n');
        expect(xml).toContain('polycoef="0 -1.000000 0 0 0"');
    });
});

describe('rest body frame at the authored pose', () => {
    const hinge = mate('swing');
    const frame = { origin: [20, 0, 0], axis: [0, 0, 1], childOrigin: [-20, 0, 0] };

    it('keeps the connector translation and omits the quaternion at pose 0', () => {
        expect(restBodyPlacement(hinge, frame, {})).toEqual({ posMm: [40, 0, 0] });
    });

    it('rotates a hinge about the parent connector by the authored angle', () => {
        const placed = restBodyPlacement(hinge, frame, { swing: 90 });
        expect(placed.posMm[0]).toBeCloseTo(20, 9);
        expect(placed.posMm[1]).toBeCloseTo(20, 9);
        expect(placed.posMm[2]).toBeCloseTo(0, 9);
        const half = Math.PI / 4;
        expect(placed.quat?.[0]).toBeCloseTo(Math.cos(half), 9);
        expect(placed.quat?.[1]).toBeCloseTo(0, 9);
        expect(placed.quat?.[2]).toBeCloseTo(0, 9);
        expect(placed.quat?.[3]).toBeCloseTo(Math.sin(half), 9);
    });

    it('slides a prismatic joint along its axis by the authored travel', () => {
        const slide: MateRecord = { name: 'lift', a: 'p.x', b: 'c.x', type: 'prismatic' };
        const placed = restBodyPlacement(slide, { ...frame, axis: [1, 0, 0] }, { lift: 12 });
        expect(placed.posMm[0]).toBeCloseTo(52, 9);
        expect(placed.posMm[1]).toBeCloseTo(0, 9);
        expect(placed.posMm[2]).toBeCloseTo(0, 9);
        expect(placed.quat).toBeUndefined();
    });

    it('omits the ball quaternion at the zero Euler triple', () => {
        const ball: MateRecord = { name: 'wrist', a: 'p.x', b: 'c.x', type: 'ball' };
        expect(restBodyPlacement(ball, frame, {})).toEqual({ posMm: [40, 0, 0] });
        expect(restBodyPlacement(ball, frame, { wrist: [0, 0, 0] })).toEqual({ posMm: [40, 0, 0] });
    });

    it('places a ball child at the authored extrinsic XYZ Euler', () => {
        const ball: MateRecord = { name: 'wrist', a: 'p.x', b: 'c.x', type: 'ball', pose: [0, 90, 0] };
        const placed = restBodyPlacement(ball, frame, { wrist: [0, 90, 0] });
        expect(placed.posMm[0]).toBeCloseTo(20, 9);
        expect(placed.posMm[1]).toBeCloseTo(0, 9);
        expect(placed.posMm[2]).toBeCloseTo(-20, 9);
        const half = Math.PI / 4;
        expect(placed.quat?.[0]).toBeCloseTo(Math.cos(half), 9);
        expect(placed.quat?.[1]).toBeCloseTo(0, 9);
        expect(placed.quat?.[2]).toBeCloseTo(Math.sin(half), 9);
        expect(placed.quat?.[3]).toBeCloseTo(0, 9);
    });
});
