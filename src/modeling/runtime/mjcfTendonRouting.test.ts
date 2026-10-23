// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/mjcfTendonRouting.test.ts
//
// MJCF emission for routed / actuated tendons (`via`, `actuator`, strap
// width / rgba) and for joint compliance (revolute `stiffnessNmmPerDeg`,
// `springRefDeg`, `dampingNmmsPerDeg`; prismatic equivalents), plus a one-joint
// MuJoCo run that checks the torsion spring's static deflection.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { CaptureSession } from '../capture/captureSession';
import { createModelingApi } from '../api';
import { initOcct } from '../../kernel/backends/occt/occtBackend';
import { assemblyToMjcf } from './mjcfExport';

const require_ = createRequire(import.meta.url);

async function loadMujocoInNode(): Promise<any> {
    const pkgEntry = require_.resolve('@mujoco/mujoco');
    const pkgDir = dirname(pkgEntry);
    const wasmBinary = await readFile(join(pkgDir, 'mujoco.wasm'));
    const loadMujoco = (await import('@mujoco/mujoco')).default;
    return await loadMujoco({
        wasmBinary,
        locateFile: (path: string) => join(pkgDir, path),
        print: () => undefined,
        printErr: () => undefined,
    });
}

type MateOpts = Parameters<ReturnType<ReturnType<typeof createModelingApi>['assembly']>['mate']>[4];

/** base (fixed, left) + link (box along +X from the hinge at the origin). */
function hingeArm(mateOpts: MateOpts) {
    const session = new CaptureSession();
    const kcad = createModelingApi({ session });
    const arm = kcad.assembly('hinge');
    const axis = { type: 'axis' as const, origin: { kind: 'vec3' as const, value: [0, 0, 0] as [number, number, number] }, axis: [0, 1, 0] as [number, number, number] };
    arm.part('base', kcad.box(20, 20, 20, true).translate(-12, 0, 0)).connector('h', axis);
    arm.part('link', kcad.box(100, 10, 10, true).translate(50, 0, 0), { density: 1000 })
        .connector('h', axis)
        .connector('tip', { type: 'frame', origin: { kind: 'vec3', value: [100, 0, 0] } });
    arm.mate('joint', 'base.h', 'link.h', 'revolute', mateOpts);
    return arm;
}

/** palm + prox + dist chain with via-routed tendons. */
function routedArm() {
    const session = new CaptureSession();
    const kcad = createModelingApi({ session });
    const arm = kcad.assembly('routed');
    const axis = (x: number) => ({ type: 'axis' as const, origin: { kind: 'vec3' as const, value: [x, 0, 0] as [number, number, number] }, axis: [0, 1, 0] as [number, number, number] });
    const pt = (x: number, z: number) => ({ type: 'frame' as const, origin: { kind: 'vec3' as const, value: [x, 0, z] as [number, number, number] } });
    arm.part('palm', kcad.box(40, 20, 20, true).translate(-20, 0, 0))
        .connector('h', axis(0)).connector('in', pt(-20, -8));
    arm.part('prox', kcad.box(40, 12, 10, true).translate(20, 0, 0))
        .connector('h', axis(0)).connector('h2', axis(40)).connector('loop', pt(20, -8))
        .wrapGeom('knuckle', { axis: [0, 1, 0], origin: [40, 0, 0], radius: 7 });
    arm.part('dist', kcad.box(30, 12, 10, true).translate(15, 0, 0))
        .connector('h2', axis(0)).connector('tip', pt(15, -8));
    arm.mate('mcp', 'palm.h', 'prox.h', 'revolute', { limitsDeg: [0, 90] });
    arm.mate('pip', 'prox.h2', 'dist.h2', 'revolute', { limitsDeg: [0, 90] });
    return arm;
}

beforeAll(async () => { await initOcct(); }, 60000);

describe('assemblyToMjcf — tendon via routing + actuator', () => {
    it('emits sites and wrap geoms in via order between from and to', async () => {
        const arm = routedArm();
        arm.tendon('cable', {
            from: 'palm.in',
            via: ['prox.loop', { wrap: { partName: 'prox', wrapName: 'knuckle', sidesite: [40, 0, 12] } }],
            to: 'dist.tip',
            actuator: { kind: 'force', maxForceN: 40 },
        });
        const { mjcf } = await assemblyToMjcf(arm);
        const spatial = mjcf.slice(mjcf.indexOf('<spatial'), mjcf.indexOf('</spatial>'));
        const order = ['cable__from', 'cable__via0', 'wrap-prox-knuckle', 'cable__to'].map((n) => spatial.indexOf(n));
        expect(order.every((i) => i >= 0)).toBe(true);
        expect([...order].sort((a, b) => a - b)).toEqual(order);
        // Via site lives on its owning body, at the connector origin (mm -> m).
        expect(mjcf).toMatch(/<body name="prox"[\s\S]*<site name="cable__via0" pos="0\.020000 0 -0\.008000"\/>/);
    });

    it('emits a tension motor (gear -1, ctrlrange 0..max) and no spring for an actuated tendon', async () => {
        const arm = routedArm();
        arm.tendon('cable', { from: 'palm.in', via: ['prox.loop'], to: 'dist.tip', actuator: { kind: 'force', maxForceN: 40 } });
        const { mjcf } = await assemblyToMjcf(arm);
        expect(mjcf).toContain('<motor name="cable" tendon="cable" gear="-1" ctrllimited="true" ctrlrange="0 40.000000"/>');
        const spatialTag = mjcf.match(/<spatial [^>]*>/)![0];
        expect(spatialTag).not.toMatch(/stiffness|springlength/);
    });

    it('passive tendons keep spring attributes and emit no actuator block', async () => {
        const arm = routedArm();
        arm.tendon('spring', { from: 'palm.in', via: ['prox.loop'], to: 'dist.tip', restLengthMm: 30, stiffnessNmm: 0.5 });
        const { mjcf } = await assemblyToMjcf(arm);
        expect(mjcf).toMatch(/<spatial name="spring" springlength="0\.030000" stiffness="500\.000000"/);
        expect(mjcf).not.toContain('<actuator>');
    });

    it('a flat profile emits width (half its width, m) and an rgba from baseColor', async () => {
        const arm = routedArm();
        arm.tendon('s', {
            from: 'palm.in', to: 'dist.tip', actuator: { kind: 'force', maxForceN: 5 },
            profile: { kind: 'flat', widthMm: 6, thicknessMm: 1 }, material: { baseColor: '#ff8000' },
        });
        const { mjcf } = await assemblyToMjcf(arm);
        const tag = mjcf.match(/<spatial [^>]*>/)![0];
        expect(tag).toContain('width="0.003000"');
        expect(tag).toContain('rgba="1.000000 0.501961 0 1"');
    });
});

describe('assemblyToMjcf — joint compliance', () => {
    it('converts revolute N·mm/deg and deg to MuJoCo SI (radians)', async () => {
        const arm = hingeArm({
            limitsDeg: [0, 90],
            stiffnessNmmPerDeg: 10,
            springRefDeg: -10,
            dampingNmmsPerDeg: 0.5,
        });
        const { mjcf } = await assemblyToMjcf(arm);
        const joint = mjcf.match(/<joint [^>]*>/)![0];
        // 10 N·mm/deg = 10 * (180/pi) / 1000 N·m/rad = 0.572958
        expect(joint).toContain('stiffness="0.572958"');
        expect(joint).toContain(`springref="${(-10 * Math.PI / 180).toFixed(6)}"`);
        expect(joint).toContain('damping="0.028648"');
        expect(joint).toContain('range="0 1.570796"');
    });

    it('converts prismatic N/mm, mm and N·s/mm to MuJoCo SI (metres)', async () => {
        const session = new CaptureSession();
        const kcad = createModelingApi({ session });
        const arm = kcad.assembly('slider');
        const axis = { type: 'axis' as const, origin: { kind: 'vec3' as const, value: [0, 0, 0] as [number, number, number] }, axis: [1, 0, 0] as [number, number, number] };
        arm.part('base', kcad.box(20, 20, 20, true)).connector('s', axis);
        arm.part('ram', kcad.box(30, 10, 10, true).translate(20, 0, 0)).connector('s', axis);
        arm.mate('slide', 'base.s', 'ram.s', 'prismatic', { limitsMm: [0, 20], stiffnessNPerMm: 2, springRefMm: -5, dampingNsPerMm: 0.1 });
        const { mjcf } = await assemblyToMjcf(arm);
        const joint = mjcf.match(/<joint [^>]*>/)![0];
        expect(joint).toContain('stiffness="2000.000000"');
        expect(joint).toContain('springref="-0.005000"');
        expect(joint).toContain('damping="100.000000"');
    });

    it('emits nothing extra for a plain revolute mate', async () => {
        const { mjcf } = await assemblyToMjcf(hingeArm({ limitsDeg: [0, 90] }));
        expect(mjcf.match(/<joint [^>]*>/)![0]).not.toMatch(/stiffness|springref|damping|armature/);
    });

    it('statically deflects a loaded arm by F·a/k from springref (MuJoCo)', async () => {
        const kNmmPerDeg = 0.85;
        const refDeg = -10;
        const arm = hingeArm({ stiffnessNmmPerDeg: kNmmPerDeg, springRefDeg: refDeg, dampingNmmsPerDeg: 1 });
        const { mjcf } = await assemblyToMjcf(arm);
        // Gravity is the tip load: weight m·g at the COM, lever a = COM x.
        const inertial = mjcf.match(/<body name="link"[\s\S]*?<inertial pos="([^"]+)" mass="([^"]+)"/)!;
        const a = Number(inertial[1].split(/\s+/)[0]);
        const mass = Number(inertial[2]);
        const kSiNmRad = kNmmPerDeg * (180 / Math.PI) / 1000;
        const mujoco = await loadMujocoInNode();
        const model = mujoco.MjModel.from_xml_string(mjcf);
        const data = new mujoco.MjData(model);
        try {
            data.qpos[0] = (refDeg * Math.PI) / 180; // start at springref
            for (let i = 0; i < 20000; i++) mujoco.mj_step(model, data);
            const theta = data.qpos[0];
            const thetaRef = (refDeg * Math.PI) / 180;
            // Exact balance: k (θ - θref) = m g a cosθ ; small-angle F·a/k.
            const expected = (mass * 9.81 * a) / kSiNmRad;
            expect(theta - thetaRef).toBeGreaterThan(0.05); // measurable deflection
            expect((theta - thetaRef) / expected).toBeGreaterThan(0.98);
            expect((theta - thetaRef) / expected).toBeLessThan(1.02);
        } finally {
            data.delete();
            model.delete();
        }
    }, 60000);
});
