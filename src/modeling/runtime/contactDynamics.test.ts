// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { loadMujocoSession } from './mujocoSession';
import { runContactDynamics, type ContactDynamicsInput } from './contactDynamics';

function model(gap: number) {
    return `<mujoco><compiler angle="radian"/><option gravity="0 0 0" timestep="0.0005"/>
    <default><geom solref="0.002 1" solimp="0.99 0.999 0.001"/></default><worldbody>
      <body name="driver">
        <joint name="drive" type="hinge" axis="0 0 1" damping="0.001"/>
        <geom name="driver_tip" type="box" pos="0.04 0 0" size="0.04 0.004 0.004" mass="0.02"/>
      </body>
      <body name="follower" pos="0.06 ${gap} 0">
        <joint name="passive" type="slide" axis="0 1 0" damping="0.01" stiffness="10"/>
        <geom name="pallet" type="box" size="0.012 0.004 0.008" mass="0.02"/>
      </body>
    </worldbody></mujoco>`;
}
const input: ContactDynamicsInput = {
    steps: 1000, dtSeconds: 0.0005, efforts: { drive: 0.01 },
    pairs: [{ bodies: ['driver', 'follower'], minEpisodes: 1, maxPenetrationMm: 1 }],
};

describe('torque-driven native contact dynamics', () => {
    it('observes passive motion and load, and deterministically repeats the result', async () => {
        async function run() {
            const session = await loadMujocoSession(model(0.018), ['driver', 'follower'], []);
            try { return runContactDynamics(session, input); }
            finally { session.dispose(); }
        }
        const result = await run();
        expect(result.ok).toBe(true);
        expect(result.pairs[0].peakNormalForceN).toBeGreaterThan(0.01);
        expect(result.pairs[0].episodes).toBeGreaterThanOrEqual(1);
        expect(result.initialJoints[1].position).toBe(0);
        expect(result.finalJoints[1].appliedEffort).toBe(0);
        expect(Math.abs(result.finalJoints[1].position)).toBeGreaterThan(0.0001);
        expect(result.durationSeconds).toBeCloseTo(0.5, 10);
        expect(await run()).toEqual(result);
    });
    it('fails when the driven part never touches the passive follower', async () => {
        const session = await loadMujocoSession(model(0.2), ['driver', 'follower'], []);
        try {
            const result = runContactDynamics(session, input);
            expect(result.ok).toBe(false);
            expect(result.pairs[0].episodes).toBe(0);
            expect(result.pairs[0].peakNormalForceN).toBe(0);
            expect(result.finalJoints[1].position).toBe(0);
        } finally { session.dispose(); }
    });
    it('fails a measured contact load limit and rejects an invalid timestep', async () => {
        const session = await loadMujocoSession(model(0.018), ['driver', 'follower'], []);
        try {
            expect(() => runContactDynamics(session, { ...input, dtSeconds: 0 })).toThrow();
            expect(session.timeSeconds).toBe(0);
            const result = runContactDynamics(session, { ...input, pairs: [{ ...input.pairs[0], maxNormalForceN: 0 }] });
            expect(result.pairs[0].peakNormalForceN).toBeGreaterThan(0);
            expect(result.ok).toBe(false);
        } finally { session.dispose(); }
    });
});

describe('ordered physical contact events', () => {
    it('requires the declared onset order rather than counting contacts alone', async () => {
        const xml = `<mujoco><compiler angle="radian"/>
          <option gravity="0 0 0" timestep="0.0005"/>
          <default><geom solref="0.002 1" solimp="0.99 0.999 0.001" friction="0 0 0"/></default>
          <worldbody>
            <body name="wheel"><joint name="wheel_spin" type="hinge" axis="0 0 1" damping="0.001"/>
              <geom name="tooth" type="sphere" size="0.004" pos="0.04 0 0" mass="0.02"/>
            </body>
            <body name="entry" pos="0 0.04 0"><joint name="entry_slide" type="slide" axis="1 0 0"/>
              <geom type="sphere" size="0.004" mass="0.001"/>
            </body>
            <body name="exit" pos="0 -0.04 0"><joint name="exit_slide" type="slide" axis="1 0 0"/>
              <geom type="sphere" size="0.004" mass="0.001"/>
            </body>
          </worldbody></mujoco>`;
        const run = async (order: number[]) => {
            const session = await loadMujocoSession(xml, ['wheel', 'entry', 'exit'], []);
            try {
                return runContactDynamics(session, { steps: 1500, dtSeconds: 0.0005,
                    efforts: { wheel_spin: 0.01 },
                    pairs: [
                        { bodies: ['wheel', 'entry'], minEpisodes: 1, maxPenetrationMm: 1 },
                        { bodies: ['wheel', 'exit'], minEpisodes: 1, maxPenetrationMm: 1 },
                    ],
                    sequence: { order, minCycles: 1 },
                });
            } finally { session.dispose(); }
        };
        const correct = await run([0, 1]);
        expect(correct.ok).toBe(true);
        expect(correct.contactSequence).toEqual({ cycles: 1, unexpectedOnsets: 0, ok: true });
        const reversed = await run([1, 0]);
        expect(reversed.pairs.every(pair => pair.ok)).toBe(true);
        expect(reversed.ok).toBe(false);
        expect(reversed.contactSequence?.unexpectedOnsets).toBeGreaterThan(0);
    });
});
