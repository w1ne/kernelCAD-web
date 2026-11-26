// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadMujocoSession, type MujocoSession } from './mujocoSession';

const CART_XML = readFileSync(new URL('../../../examples/physics/two-wheel-mechanical-port.xml', import.meta.url), 'utf8');
const CART_BODIES = ['chassis', 'wheel_left', 'wheel_right'];
const IMU_QUAT = '0.7071067811865476 0 0 0.7071067811865476';
const G = 9.81;

function sensor(session: MujocoSession, name: string): readonly number[] {
    const reading = session.sensorReadingsNow().find((value) => value.name === name);
    if (reading === undefined) throw new Error(`Missing sensor ${name}`);
    return reading.values;
}

function blockXml({ free = false, ground = false, height = 1, pitch = 0 } = {}): string {
    return `<mujoco>
      <compiler angle="radian"/>
      <option gravity="0 0 -${G}" timestep="0.001" integrator="Euler"/>
      <worldbody>
        ${ground ? '<geom name="ground" type="plane" size="2 2 0.1"/>' : ''}
        <body name="block" pos="0 0 ${height}" euler="0 ${pitch} 0">
          ${free ? '<freejoint name="root"/>' : '<joint name="support_pitch" type="hinge" axis="0 1 0"/>'}
          <geom name="block_geom" type="box" size="0.05 0.05 0.05" mass="1"/>
          <site name="imu" quat="${IMU_QUAT}"/>
        </body>
      </worldbody>
      <sensor>
        <accelerometer name="imu_accel" site="imu"/>
        <gyro name="imu_gyro" site="imu"/>
      </sensor>
    </mujoco>`;
}

describe('MuJoCo external mechanical ports (real WASM)', () => {
    it('uses separate scalar position/velocity addresses after a free root', async () => {
        const session = await loadMujocoSession(CART_XML, CART_BODIES, []);
        try {
            session.forward();
            const joints = session.scalarJointStatesNow();
            expect(session.nq).toBe(9);
            expect(session.nv).toBe(8);
            expect(joints.map(({ name, kind, qposAdr, dofAdr }) => ({ name, kind, qposAdr, dofAdr }))).toEqual([
                { name: 'left_wheel', kind: 'hinge', qposAdr: 7, dofAdr: 6 },
                { name: 'right_wheel', kind: 'hinge', qposAdr: 8, dofAdr: 7 },
            ]);
            session.setJointEfforts({ left_wheel: 0.01 });
            session.stepFixed(2, 0.001);
            const moved = session.scalarJointStatesNow()[0];
            expect(moved.position).toBeGreaterThan(0);
            expect(moved.velocity).toBeGreaterThan(moved.position);
            expect(moved.position).toBe(session.getQpos()[7]);
            expect(session.timeSeconds).toBeCloseTo(0.002, 12);
        } finally {
            session.dispose();
        }
    });

    it('observes world velocity at an offset, rotated body origin rather than at its COM', async () => {
        const xml = `<mujoco><option gravity="0 0 0"/><worldbody>
          <body name="offset_rotor" pos="0.3 -0.2 1" quat="0.7071067811865476 0.7071067811865476 0 0">
            <joint name="spin" type="hinge" pos="-0.1 0 0" axis="0 0 1"/>
            <inertial pos="0.03 0.02 0.01" mass="1" diaginertia="0.02 0.03 0.04"/>
            <geom type="sphere" size="0.02" contype="0" conaffinity="0"/>
          </body>
          <body name="static_marker" pos="0 0 2"><geom type="sphere" size="0.01"/></body>
        </worldbody></mujoco>`;
        const session = await loadMujocoSession(xml, ['offset_rotor', 'static_marker'], []);
        try {
            session.setJointEfforts({ spin: 1 });
            session.stepFixed(40, 0.001);
            const time = session.timeSeconds, pose = session.bodyPosesNow().get('offset_rotor')!;
            const joint = session.scalarJointStatesNow()[0];
            const snapshots = session.bodyVelocitiesNow();
            const moving = snapshots.get('offset_rotor')!;
            // Hinge is at world [0.2,-0.2,1], with world axis -Y. The body origin
            // circles at radius 0.1 m. Its COM is a different point, 30/20/10 mm away.
            expect(joint.velocity).toBeGreaterThan(0);
            expect(pose.matrix[12] / 1000).toBeCloseTo(0.2 + 0.1 * Math.cos(joint.position), 12);
            expect(pose.matrix[14] / 1000).toBeCloseTo(1 + 0.1 * Math.sin(joint.position), 12);
            expect(moving.velocityMps[0]).toBeCloseTo(-0.1 * Math.sin(joint.position) * joint.velocity, 12);
            expect(moving.velocityMps[1]).toBeCloseTo(0, 12);
            expect(moving.velocityMps[2]).toBeCloseTo(0.1 * Math.cos(joint.position) * joint.velocity, 12);
            expect(moving.angularVelocityRadS[0]).toBeCloseTo(0, 12);
            expect(moving.angularVelocityRadS[1]).toBeCloseTo(-joint.velocity, 12);
            expect(moving.angularVelocityRadS[2]).toBeCloseTo(0, 12);
            expect(snapshots.get('static_marker')).toEqual({ velocityMps: [0, 0, 0], angularVelocityRadS: [0, 0, 0] });
            (moving.velocityMps as number[])[0] = 999;
            expect(session.bodyVelocitiesNow().get('offset_rotor')!.velocityMps[0]).not.toBe(999);
            expect(session.timeSeconds).toBe(time);
            expect(session.bodyPosesNow().get('offset_rotor')).toEqual(pose);
        } finally {
            session.dispose();
        }
        expect(() => session.bodyVelocitiesNow()).toThrow('after dispose');
    });

    it('rejects a whole invalid effort frame and clears omitted efforts without changing state', async () => {
        const session = await loadMujocoSession(CART_XML, CART_BODIES, []);
        try {
            session.setJointEfforts({ left_wheel: 0.01, right_wheel: -0.02 });
            const initial = session.scalarJointStatesNow();
            expect(() => session.setJointEfforts({ left_wheel: 0.5, right_wheel: NaN })).toThrow('non-finite');
            expect(session.scalarJointStatesNow()).toEqual(initial);
            expect(() => session.setJointEfforts({ left_wheel: 0.5, root: 1 })).toThrow('unknown named scalar joint');
            expect(session.scalarJointStatesNow()).toEqual(initial);
            expect(() => session.setJointEfforts({ typo: 1 })).toThrow('unknown named scalar joint');
            session.setJointEfforts({ left_wheel: 0.03 });
            expect(session.scalarJointStatesNow().map((joint) => joint.appliedEffort)).toEqual([0.03, 0]);
            session.stepFixed(2, 0.001);
            const moving = session.scalarJointStatesNow();
            session.setJointEfforts({});
            const cleared = session.scalarJointStatesNow();
            expect(cleared.map((joint) => joint.appliedEffort)).toEqual([0, 0]);
            expect(cleared.map((joint) => joint.velocity)).toEqual(moving.map((joint) => joint.velocity));
            expect(cleared.map((joint) => joint.position)).toEqual(moving.map((joint) => joint.position));
        } finally {
            session.dispose();
        }
    });

    it('rejects fractional/invalid time steps without advancing the clock', async () => {
        const session = await loadMujocoSession(CART_XML, CART_BODIES, []);
        try {
            for (const count of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
                expect(() => session.stepFixed(count, 0.001)).toThrow('positive safe integer');
            }
            for (const dt of [0, -1, NaN, Infinity]) {
                expect(() => session.stepFixed(1, dt)).toThrow('positive and finite');
            }
            expect(session.timeSeconds).toBe(0);
            session.stepFixed(10, 0.001);
            expect(session.timeSeconds).toBeCloseTo(0.01, 12);
            expect(session.xposNow().get('chassis')![2]).toBeCloseTo(session.getQpos()[2], 12);
        } finally {
            session.dispose();
        }
        expect(() => session.setJointEfforts({})).toThrow('after dispose');
        expect(() => session.scalarJointStatesNow()).toThrow('after dispose');
        expect(() => session.sensorReadingsNow()).toThrow('after dispose');
        expect(() => session.stepFixed(1, 0.001)).toThrow('after dispose');
        expect(() => session.timeSeconds).toThrow('after dispose');
    });

    it('applies slide effort in newtons and returns velocity in metres per second', async () => {
        const xml = `<mujoco><option gravity="0 0 0"/><worldbody><body name="slider">
          <joint name="slide" type="slide" axis="1 0 0"/>
          <geom type="box" size="0.05 0.05 0.05" mass="1"/>
        </body></worldbody></mujoco>`;
        const session = await loadMujocoSession(xml, ['slider'], []);
        try {
            session.setJointEfforts({ slide: 1 });
            session.stepFixed(100, 0.001);
            const state = session.scalarJointStatesNow()[0];
            expect(state.kind).toBe('slide');
            expect(state.velocity).toBeCloseTo(0.1, 10); // a = F/m = 1 m/s²
            expect(state.position).toBeCloseTo(0.00505, 10); // semi-implicit Euler
            session.setJointEfforts({});
            session.stepFixed(10, 0.001);
            expect(session.scalarJointStatesNow()[0].velocity).toBeCloseTo(0.1, 10);
            expect(session.sensorReadingsNow()).toEqual([]);
        } finally {
            session.dispose();
        }
    });

    it('falls under gravity with zero free-fall specific force, then rests on contact with ~1 g', async () => {
        const falling = await loadMujocoSession(blockXml({ free: true }), ['block'], []);
        const supported = await loadMujocoSession(blockXml({ free: true, ground: true, height: 0.05 }), ['block'], []);
        try {
            falling.stepFixed(100, 0.001);
            expect(falling.xposNow().get('block')![2]).toBeCloseTo(1 - G * 0.001 ** 2 * 100 * 101 / 2, 10);
            expect(Math.hypot(...sensor(falling, 'imu_accel'))).toBeLessThan(1e-8);
            expect(Math.hypot(...sensor(falling, 'imu_gyro'))).toBeLessThan(1e-8);
            expect(falling.compiledContacts()).toEqual([]);
            supported.stepFixed(500, 0.001);
            expect(supported.xposNow().get('block')![2]).toBeGreaterThan(0.049);
            expect(supported.compiledContacts().some((contact) => contact.geomA === 'ground')).toBe(true);
            expect(sensor(supported, 'imu_accel')[2]).toBeCloseTo(G, 3);
        } finally {
            falling.dispose();
            supported.dispose();
        }
    });

    it.each([1, -1])('derives supported stationary pitch sign %i from the declared IMU site mount', async (sign) => {
        const angle = sign * Math.PI / 12;
        const session = await loadMujocoSession(blockXml({ pitch: angle }), ['block'], []);
        try {
            session.forward();
            const accel = sensor(session, 'imu_accel');
            expect(accel[0]).toBeCloseTo(0, 12);
            expect(accel[1]).toBeCloseTo(G * Math.sin(angle), 12);
            expect(accel[2]).toBeCloseTo(G * Math.cos(angle), 12);
            expect(Math.atan2(accel[1], accel[2])).toBeCloseTo(angle, 12);
            expect(sensor(session, 'imu_gyro')).toEqual([0, 0, 0]);
            const snapshot = session.sensorReadingsNow();
            expect(snapshot.map(({ name, type, values }) => [name, type, values.length])).toEqual([
                ['imu_accel', 1, 3], ['imu_gyro', 3, 3],
            ]);
            (accel as number[])[2] = -999;
            expect(sensor(session, 'imu_accel')[2]).toBeCloseTo(G * Math.cos(angle), 12);
        } finally {
            session.dispose();
        }
    });

    it.each([1, -1])('torque sign %i drives contact motion and the opposite body/gyro reaction', async (sign) => {
        const session = await loadMujocoSession(CART_XML, CART_BODIES, []);
        try {
            session.stepFixed(100, 0.001);
            session.setJointEfforts({ left_wheel: sign * 0.01, right_wheel: sign * 0.01 });
            session.stepFixed(50, 0.001);
            const joints = session.scalarJointStatesNow();
            expect(joints).toHaveLength(2);
            for (const joint of joints) {
                expect(sign * joint.position).toBeGreaterThan(0.2);
                expect(sign * joint.velocity).toBeGreaterThan(9);
            }
            expect(sign * session.xposNow().get('chassis')![0]).toBeGreaterThan(0.004);
            const gyro = sensor(session, 'imu_gyro');
            expect(sign * gyro[0]).toBeLessThan(-3);
            expect(Math.abs(gyro[1]) + Math.abs(gyro[2])).toBeLessThan(1e-6);
            // A measured accelerometer includes motion. Do not substitute
            // the gravity-only projection or claim its angle equals pitch.
            const qpos = session.getQpos();
            const geometricPitch = 2 * Math.atan2(qpos[5], qpos[3]);
            expect(sign * geometricPitch).toBeLessThan(-0.07);
            const accel = sensor(session, 'imu_accel');
            const apparentTilt = Math.atan2(accel[1], accel[2]);
            expect(Math.abs(apparentTilt - geometricPitch)).toBeGreaterThan(0.1);
            expect(session.compiledContacts().some((contact) => contact.geomA === 'ground')).toBe(true);
            expect(session.timeSeconds).toBeCloseTo(0.15, 12);
        } finally {
            session.dispose();
        }
    });
    it('rejects competing MJCF actuators and ambiguous indirect ownership', async () => {
        const direct = CART_XML.replace('</mujoco>',
            '<actuator><position name="wheel_servo" joint="left_wheel" kp="1"/></actuator></mujoco>');
        const indirect = CART_XML.replace('</mujoco>', `<tendon><fixed name="belt">
            <joint joint="left_wheel" coef="1"/><joint joint="right_wheel" coef="1"/>
            </fixed></tendon><actuator><motor name="belt_drive" tendon="belt"/></actuator></mujoco>`);
        const passiveSession = await loadMujocoSession(CART_XML, CART_BODIES, []);
        const directSession = await loadMujocoSession(direct, CART_BODIES, []);
        const indirectSession = await loadMujocoSession(indirect, CART_BODIES, []);
        try {
            expect(() => passiveSession.assertExternalJointOwnership(['left_wheel', 'right_wheel'])).not.toThrow();
            expect(() => passiveSession.assertExternalJointOwnership(['left_wheel', 'left_wheel'])).toThrow('duplicate');
            expect(() => passiveSession.assertExternalJointOwnership(['root'])).toThrow('Unknown external scalar joint');
            expect(() => directSession.assertExternalJointOwnership(['left_wheel'])).toThrow('also driven');
            expect(() => directSession.assertExternalJointOwnership(['right_wheel'])).not.toThrow();
            expect(() => indirectSession.assertExternalJointOwnership(['left_wheel'])).toThrow('indirect MJCF actuators');
        } finally {
            passiveSession.dispose();
            directSession.dispose();
            indirectSession.dispose();
        }
    });

    it('faults after a real MuJoCo instability auto-reset, even on the first step', async () => {
        const session = await loadMujocoSession(CART_XML, CART_BODIES, []);
        try {
            session.setJointEfforts({ left_wheel: 1e100, right_wheel: 1e100 });
            // MuJoCo can reset at t=0 and still finish at dt, so checking the
            // clock alone would publish a plausible but discarded trajectory.
            expect(() => session.stepFixed(1, 0.001)).toThrow('BADQACC');
            expect(() => session.scalarJointStatesNow()).toThrow('failed step');
            expect(() => session.sensorReadingsNow()).toThrow('failed step');
            expect(() => session.stepFixed(1, 0.001)).toThrow('failed step');
        } finally {
            session.dispose();
        }
    });

    it('rejects non-finite state before integrating and requires a fresh session', async () => {
        const session = await loadMujocoSession(CART_XML, CART_BODIES, []);
        try {
            const pose = [...session.getQpos()];
            pose[0] = NaN;
            session.setPose(pose);
            expect(() => session.stepFixed(1, 0.001)).toThrow('Invalid qpos[0]');
            expect(() => session.timeSeconds).toThrow('failed step');
        } finally {
            session.dispose();
        }
    });

});
