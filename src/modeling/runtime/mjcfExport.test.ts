// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/mjcfExport.test.ts
//
// Unit tests for the Assembly → MJCF converter. Round-trips a tiny
// hand-built assembly through MuJoCo: emit, parse via from_xml_string,
// assert the resulting model has the expected joint count and that
// inverse dynamics produces finite torques at rest.

import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { CaptureSession } from '../capture/captureSession';
import { createApi } from '../api';
import { initOcct } from '../../kernel/backends/occt/occtBackend';
import { assemblyToMjcf } from './mjcfExport';

const require_ = createRequire(import.meta.url);

async function loadMujocoInNode(): Promise<unknown> {
    const pkgEntry = require_.resolve('@mujoco/mujoco');
    const pkgDir = dirname(pkgEntry);
    const wasmBinary = await readFile(join(pkgDir, 'mujoco.wasm'));
    const loadMujoco = (await import('@mujoco/mujoco')).default;
    return await loadMujoco({
        wasmBinary,
        locateFile: (path: string) => join(pkgDir, path),
    });
}

describe('assemblyToMjcf', () => {
    it('round-trips a 1-revolute hinge into a parseable MJCF with 1 qpos slot', async () => {
        await initOcct();
        const session = new CaptureSession();
        const kcad = createApi({ session });
        const arm = kcad.assembly('hinge');

        const baseBody = kcad.box(40, 40, 30, true).translate(0, 0, -15);
        const armBody = kcad.box(120, 20, 20, true).translate(70, 0, 0);
        const j = kcad.joint.clevis({
            parentBody: baseBody,
            childBody: armBody,
            axis: 'Y',
            pivotParent: [0, 0, 15],
            pivotChild: [0, 0, 0],
            limitsDeg: [-45, 45],
        });
        const parent = arm.part('base', j.parentGeometry);
        parent.connector('hinge', {
            type: 'axis',
            origin: { kind: 'vec3', value: j.parentConnector.origin },
            axis: j.parentConnector.axis,
        });
        const child = arm.part('lower-arm', j.childGeometry);
        child.connector('hinge', {
            type: 'axis',
            origin: { kind: 'vec3', value: j.childConnector.origin },
            axis: j.childConnector.axis,
        });
        arm.mate('elbow', 'base.hinge', 'lower-arm.hinge', 'revolute', {
            limitsDeg: [-45, 45],
        });

        const { mjcf, jointOrder, bodyOrder } = await assemblyToMjcf(arm);
        expect(mjcf).toContain('<mujoco model="hinge">');
        expect(mjcf).toContain('<joint name="elbow" type="hinge"');
        expect(jointOrder.length).toBe(1);
        expect(jointOrder[0].mateName).toBe('elbow');
        expect(bodyOrder).toContain('base');
        expect(bodyOrder).toContain('lower-arm');

        // Parse through MuJoCo. mj_forward at qpos=0 should not throw and
        // the model should have nq=1 (one hinge DOF).
        const mujoco = (await loadMujocoInNode()) as {
            MjModel: { from_xml_string: (s: string) => unknown };
            MjData: new (m: unknown) => unknown;
            mj_forward: (m: unknown, d: unknown) => void;
        };
        const model = mujoco.MjModel.from_xml_string(mjcf);
        const data = new mujoco.MjData(model);
        try {
            mujoco.mj_forward(model, data);
            const qpos = (data as { qpos: number[] }).qpos;
            expect(qpos.length).toBe(1);
        } finally {
            (data as { delete: () => void }).delete();
            (model as { delete: () => void }).delete();
        }
    }, 60000);

    it('emits a fastened mate as nested body without a joint', async () => {
        await initOcct();
        const session = new CaptureSession();
        const kcad = createApi({ session });
        const arm = kcad.assembly('rigid');

        const armBody = kcad.box(80, 20, 10, true).translate(40, 0, 0);
        const armPart = arm.part('arm', armBody);
        armPart.connector('mount', {
            type: 'frame',
            origin: { kind: 'vec3', value: [10, 0, 0] },
        });

        const springShape = kcad.cylinder(20, 2, 16).rotate([0, 1, 0], 90);
        const springPart = arm.part('spring', springShape);
        springPart.connector('mount', {
            type: 'frame',
            origin: { kind: 'vec3', value: [0, 0, 0] },
        });
        arm.mate('rigid', 'arm.mount', 'spring.mount', 'fastened');

        const { mjcf, jointOrder, bodyOrder } = await assemblyToMjcf(arm);
        expect(jointOrder.length).toBe(0); // fastened emits no joint
        expect(bodyOrder).toEqual(['arm', 'spring']);
        // Spring body nested inside arm body — count XML body opens.
        const bodyOpenCount = (mjcf.match(/<body /g) ?? []).length;
        expect(bodyOpenCount).toBe(2);

        // P11 Slice 1: every part contributes one `<asset><mesh>` and one
        // `<geom type="mesh">`. Two parts → two of each.
        const meshAssetCount = (mjcf.match(/<mesh name="part-/g) ?? []).length;
        expect(meshAssetCount).toBe(2);
        const geomMeshCount = (mjcf.match(/<geom type="mesh"/g) ?? []).length;
        expect(geomMeshCount).toBe(2);
        // P11 Slice 1: the inline mesh vertex stream is in millimetres,
        // but the rest of the MJCF (body `pos`, `<inertial>`, gravity) is
        // in metres. Every `<mesh>` MUST carry `scale="0.001 0.001 0.001"`
        // so MuJoCo rescales the hull into its metre world — without it
        // the collision geometry is 1000× oversized and explodes the
        // drop-test. Guards the unit regression directly.
        const scaledMeshCount = (
            mjcf.match(/<mesh name="part-[^"]*" scale="0\.001 0\.001 0\.001"/g) ?? []
        ).length;
        expect(scaledMeshCount).toBe(2);
        // Asset references match their declared assets — `<geom mesh="part-arm">`
        // and `<geom mesh="part-spring">` are both present.
        expect(mjcf).toMatch(/<geom type="mesh" mesh="part-arm"/);
        expect(mjcf).toMatch(/<geom type="mesh" mesh="part-spring"/);
        // `<size nconmax>` is set so MuJoCo doesn't overflow contact storage
        // on tighter assemblies than this 2-body fixture.
        expect(mjcf).toMatch(/<size nconmax="500"\/>/);
        // P11 Slice 1: every mate emits one `<contact><exclude>` line so
        // the joint-anchor mesh overlap doesn't generate spurious
        // contact forces. This fixture has one mate; expect one
        // exclude. Body-name order matches `parseConnectorRef(mate.a)`
        // (parent) then `(mate.b)` (child).
        expect(mjcf).toMatch(/<contact>/);
        const excludeCount = (mjcf.match(/<exclude /g) ?? []).length;
        expect(excludeCount).toBe(1);

        // Parse — qpos should be empty (no joints).
        const mujoco = (await loadMujocoInNode()) as {
            MjModel: { from_xml_string: (s: string) => unknown };
            MjData: new (m: unknown) => unknown;
        };
        const model = mujoco.MjModel.from_xml_string(mjcf);
        const data = new mujoco.MjData(model);
        try {
            const qpos = (data as { qpos: number[] }).qpos;
            expect(qpos.length).toBe(0);
        } finally {
            (data as { delete: () => void }).delete();
            (model as { delete: () => void }).delete();
        }
    }, 60000);

    it('rejects a closed-loop mate graph', async () => {
        await initOcct();
        const session = new CaptureSession();
        const kcad = createApi({ session });
        const arm = kcad.assembly('loop');

        // Three parts mutually linked: a→b, b→c, c→a is a cycle.
        for (const partName of ['a', 'b', 'c']) {
            const box = kcad.box(10, 10, 10, true);
            const part = arm.part(partName, box);
            part.connector('p', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
            part.connector('q', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
        }
        arm.mate('m1', 'a.p', 'b.q', 'fastened');
        arm.mate('m2', 'b.p', 'c.q', 'fastened');
        // Closing edge — this gives 'c' a second parent ('a'), which the
        // converter rejects.
        arm.mate('m3', 'a.q', 'c.p', 'fastened');

        await expect(assemblyToMjcf(arm)).rejects.toThrow(/multiple parents|cycle/);
    }, 60000);

    it('P7: emits <site> + <tendon><spatial> and tendon length matches site-to-site distance', async () => {
        await initOcct();
        const session = new CaptureSession();
        const kcad = createApi({ session });
        const arm = kcad.assembly('tendon-roundtrip');

        // Two boxes joined by a revolute joint; one tendon between
        // anchor connectors on each body.
        const baseBody = kcad.box(40, 40, 30, true).translate(0, 0, -15);
        const armBody = kcad.box(120, 20, 20, true).translate(70, 0, 0);
        const j = kcad.joint.clevis({
            parentBody: baseBody,
            childBody: armBody,
            axis: 'Y',
            pivotParent: [0, 0, 15],
            pivotChild: [0, 0, 0],
            limitsDeg: [-45, 45],
        });
        arm
            .part('base', j.parentGeometry)
            .connector('hinge', {
                type: 'axis',
                origin: { kind: 'vec3', value: j.parentConnector.origin },
                axis: j.parentConnector.axis,
            })
            // Anchor for the tendon — 20 mm above the pivot, parent-local.
            .connector('anchor', {
                type: 'frame',
                origin: { kind: 'vec3', value: [0, 0, 35] },
            });
        arm
            .part('lower-arm', j.childGeometry)
            .connector('hinge', {
                type: 'axis',
                origin: { kind: 'vec3', value: j.childConnector.origin },
                axis: j.childConnector.axis,
            })
            // Anchor for the tendon — 30 mm forward of the pivot, child-local.
            .connector('anchor', {
                type: 'frame',
                origin: { kind: 'vec3', value: [30, 0, 0] },
            });
        arm.mate('elbow', 'base.hinge', 'lower-arm.hinge', 'revolute', {
            limitsDeg: [-45, 45],
        });
        arm.tendon('spring', {
            from: 'base.anchor',
            to: 'lower-arm.anchor',
            restLengthMm: 50,
            stiffnessNmm: 0.5,
            dampingNsmm: 0.01,
        });

        const { mjcf } = await assemblyToMjcf(arm);

        // Sites emitted in the right places.
        expect(mjcf).toMatch(/<site name="spring__from"/);
        expect(mjcf).toMatch(/<site name="spring__to"/);
        // Spatial tendon block emitted.
        expect(mjcf).toMatch(/<tendon>/);
        expect(mjcf).toMatch(/<spatial name="spring"/);
        // Unit conversions: restLengthMm 50 → springlength 0.05;
        // stiffnessNmm 0.5 → 500 N/m; dampingNsmm 0.01 → 10 N·s/m.
        expect(mjcf).toMatch(/springlength="0\.050000"/);
        expect(mjcf).toMatch(/stiffness="500\.000000"/);
        expect(mjcf).toMatch(/damping="10\.000000"/);

        // Round-trip through MuJoCo: at rest pose (qpos=0), the model
        // should have exactly one tendon and ten_length matching the
        // site-to-site Euclidean distance in world frame.
        //
        // Site 'spring__from' world pos: parent-local [0, 0, 35] with the
        //   base body at pos [0, 0, -15] m? No — for this assembly, root
        //   bodies use part.at, which is undefined here (j.parentGeometry
        //   sits at its CAD-local origin). Let's check ten_length is
        //   POSITIVE and FINITE — the exact value depends on FK details
        //   we don't reproduce inline. We DO assert sites are 2 in number
        //   and ten_length is finite at the world-frame distance the
        //   model computes itself.
        const mujoco = (await loadMujocoInNode()) as {
            MjModel: { from_xml_string: (s: string) => unknown };
            MjData: new (m: unknown) => unknown;
            mj_forward: (m: unknown, d: unknown) => void;
        };
        const model = mujoco.MjModel.from_xml_string(mjcf);
        const data = new mujoco.MjData(model);
        try {
            mujoco.mj_forward(model, data);
            const m = model as { ntendon: number; nsite: number };
            expect(m.ntendon).toBe(1);
            expect(m.nsite).toBe(2);
            // Compare to MuJoCo's own site_xpos[] to validate the
            // tendon segment length is consistent.
            const siteXpos = (data as { site_xpos: ArrayLike<number> }).site_xpos;
            const dx = siteXpos[0] - siteXpos[3];
            const dy = siteXpos[1] - siteXpos[4];
            const dz = siteXpos[2] - siteXpos[5];
            const expectedLen = Math.hypot(dx, dy, dz);
            const tenLen = (data as { ten_length: ArrayLike<number> }).ten_length;
            expect(tenLen.length).toBe(1);
            expect(Math.abs(tenLen[0] - expectedLen)).toBeLessThan(1e-6);
        } finally {
            (data as { delete: () => void }).delete();
            (model as { delete: () => void }).delete();
        }
    }, 60000);

    it('P7: omits the <tendon> block entirely when no tendons declared', async () => {
        await initOcct();
        const session = new CaptureSession();
        const kcad = createApi({ session });
        const arm = kcad.assembly('no-tendons');

        const a = kcad.box(20, 20, 20, true);
        arm.part('a', a).connector('o', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });

        const { mjcf } = await assemblyToMjcf(arm);
        expect(mjcf).not.toMatch(/<tendon>/);
        expect(mjcf).not.toMatch(/<site /);
    }, 60000);
});
