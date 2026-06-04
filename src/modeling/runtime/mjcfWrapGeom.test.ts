// src/modeling/runtime/mjcfWrapGeom.test.ts
//
// P11 Slice 2 — MJCF emit for tendon wrap-geom routing. A part with a
// declared wrap geom emits a collision-OFF `<geom type="cylinder">`, and a
// tendon that references it emits a `<geom geom="...">` routing child
// between its two `<site>` endpoints inside the `<spatial>`. The whole
// thing must round-trip through MuJoCo's `MjModel.from_xml_string`.

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
        print: () => undefined,
        printErr: () => undefined,
    });
}

async function buildWrappedHinge() {
    await initOcct();
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('wrapped-hinge');

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
        .connector('springBase', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 20] } });
    arm
        .part('lower-arm', j.childGeometry)
        .connector('hinge', {
            type: 'axis',
            origin: { kind: 'vec3', value: j.childConnector.origin },
            axis: j.childConnector.axis,
        })
        .connector('springArm', { type: 'frame', origin: { kind: 'vec3', value: [120, 0, 12] } })
        // A wrap rail collinear with the arm's long (X) axis.
        .wrapGeom('armRail', { axis: [1, 0, 0], origin: [60, 0, 12], radius: 12, halfLengthMm: 60 });
    arm.mate('elbow', 'base.hinge', 'lower-arm.hinge', 'revolute', { limitsDeg: [-45, 45] });
    arm.tendon('balance', {
        from: 'base.springBase',
        to: 'lower-arm.springArm',
        restLengthMm: 40,
        stiffnessNmm: 0.6,
        wrapGeoms: [{ partName: 'lower-arm', wrapName: 'armRail' }],
    });
    return arm;
}

describe('assemblyToMjcf — wrap-geom routing (P11 Slice 2)', () => {
    it('emits a contact-OFF wrap cylinder + spatial routing child, round-trips through MuJoCo', async () => {
        const arm = await buildWrappedHinge();
        const { mjcf } = await assemblyToMjcf(arm);

        // Collision-OFF cylinder on the owning body.
        expect(mjcf).toMatch(
            /<geom name="wrap-lower-arm-armrail" type="cylinder" contype="0" conaffinity="0" group="3" fromto="[^"]+" size="0\.012000"\/>/,
        );
        // Routing child inside the spatial, flanked by the two endpoint sites.
        const spatial = mjcf.slice(mjcf.indexOf('<spatial'), mjcf.indexOf('</spatial>'));
        expect(spatial).toMatch(/<site site="balance__from"\/>/);
        expect(spatial).toMatch(/<geom geom="wrap-lower-arm-armrail"\/>/);
        expect(spatial).toMatch(/<site site="balance__to"\/>/);
        // Order: from-site, then wrap geom, then to-site.
        const iFrom = spatial.indexOf('balance__from');
        const iGeom = spatial.indexOf('wrap-lower-arm-armrail');
        const iTo = spatial.indexOf('balance__to');
        expect(iFrom).toBeLessThan(iGeom);
        expect(iGeom).toBeLessThan(iTo);

        // MuJoCo accepts the routed model.
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

    it('leaves straight tendons (no wrapGeoms) as plain two-site spatials', async () => {
        await initOcct();
        const session = new CaptureSession();
        const kcad = createApi({ session });
        const arm = kcad.assembly('straight');
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
            .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: j.parentConnector.origin }, axis: j.parentConnector.axis })
            .connector('sb', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 20] } });
        arm
            .part('lower-arm', j.childGeometry)
            .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: j.childConnector.origin }, axis: j.childConnector.axis })
            .connector('sa', { type: 'frame', origin: { kind: 'vec3', value: [120, 0, 12] } });
        arm.mate('elbow', 'base.hinge', 'lower-arm.hinge', 'revolute', { limitsDeg: [-45, 45] });
        arm.tendon('balance', { from: 'base.sb', to: 'lower-arm.sa', restLengthMm: 40, stiffnessNmm: 0.6 });

        const { mjcf } = await assemblyToMjcf(arm);
        expect(mjcf).not.toMatch(/type="cylinder"/);
        const spatial = mjcf.slice(mjcf.indexOf('<spatial'), mjcf.indexOf('</spatial>'));
        expect(spatial).not.toMatch(/<geom /);
        expect((spatial.match(/<site /g) ?? []).length).toBe(2);
    }, 60000);
});
