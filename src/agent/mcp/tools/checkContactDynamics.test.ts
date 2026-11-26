// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { verifyTool } from './verify';
import type { CheckContactDynamicsOutput } from './checkContactDynamics';

const code = `
const arm = assembly('contact-rig');
const axis = (p, a) => ({ type: 'axis', origin: { kind: 'vec3', value: p }, axis: a });
const base = box(120, 100, 6, true).translate(30, 0, -20);
const driver = box(80, 8, 8, true).translate(40, 0, 0);
const follower = box(24, 8, 16, true);
arm.part('base', base)
  .connector('drive', axis([0, 0, 0], [0, 0, 1]))
  .connector('guide', axis([60, 18, 0], [0, 1, 0]));
arm.part('driver', driver, { massKg: 0.02 })
  .collision([driver]).connector('drive', axis([0, 0, 0], [0, 0, 1]));
arm.part('follower', follower, { massKg: 0.02 })
  .collision([follower]).connector('guide', axis([0, 0, 0], [0, 1, 0]));
arm.mate('drive', 'base.drive', 'driver.drive', 'revolute', { dampingNmmsPerDeg: 0.0174533 });
arm.mate('passive', 'base.guide', 'follower.guide', 'prismatic', { stiffnessNPerMm: 0.01, dampingNsPerMm: 0.00001 });
return arm.model();
`;
const dynamics = {
    steps: 1000, dt_seconds: 0.0005, efforts: { drive: 0.01 },
    contact_model: { friction: [1, 0.005, 0.0001], solref: [0.002, 1], solimp: [0.99, 0.999, 0.001] },
    pairs: [{ bodies: ['driver', 'follower'], min_episodes: 1, max_penetration_mm: 1 }],
};

describe('CAD contact dynamics MCP path', () => {
    it('rejects invalid dynamics before evaluating CAD', async () => {
        const result = await verifyTool({ check: 'physics', code: 'throw new Error("must not evaluate")',
            dynamics: { ...dynamics, dt_seconds: 0 } }) as CheckContactDynamicsOutput;
        expect(result.ok).toBe(false);
        expect(result).toMatchObject({ mode: 'contact-dynamics', error: expect.stringContaining('timestep') });
    });

    it('lowers captured BRep geometry into native contacts and measures passive displacement', async () => {
        const result = await verifyTool({ check: 'physics', code, dynamics }) as CheckContactDynamicsOutput;
        expect(result.ok).toBe(true);
        if (!('pairs' in result)) throw new Error(JSON.stringify(result));
        expect(result.pairs[0].peakNormalForceN).toBeGreaterThan(0.01);
        expect(result.finalJoints.find(j => j.name === 'passive')?.appliedEffort).toBe(0);
        expect(Math.abs(result.finalJoints.find(j => j.name === 'passive')!.position)).toBeGreaterThan(0.001);
    }, 60000);
});
