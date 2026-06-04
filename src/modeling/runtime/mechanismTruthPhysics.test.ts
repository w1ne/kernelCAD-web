// src/modeling/runtime/mechanismTruthPhysics.test.ts
//
// Tests for criteria 5 (static equilibrium) + 6 (drop-on-release) of
// the physics-grounded loop. These run MuJoCo, so they're tagged with
// a generous timeout.

import { describe, expect, it } from 'vitest';
import { CaptureSession } from '../capture/captureSession';
import { createApi } from '../api';
import type { Assembly } from '../capture/assembly';
import { checkMechanismTruth } from './mechanismTruth';
import { initOcct } from '../../kernel/backends/occt/occtBackend';

function makeArm(name = 'rig'): { arm: Assembly; kcad: ReturnType<typeof createApi> } {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    return { arm: kcad.assembly(name), kcad };
}

describe('mechanism truth — physics gate (P6, criteria 5 + 6)', () => {
    it('fully-fastened assembly (no DOFs) skips physics cleanly', async () => {
        // A box stack with a single fastened mate. nq=0 in MuJoCo, so the
        // physics check has nothing to do — should return no failures.
        await initOcct();
        const { arm, kcad } = makeArm('fastened-stack');
        const baseBody = kcad.box(40, 40, 10, true);
        const basePart = arm.part('base', baseBody);
        basePart.connector('top', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 5] } });
        const topBody = kcad.box(30, 30, 10, true);
        const topPart = arm.part('top', topBody);
        topPart.connector('bottom', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
        arm.mate('weld', 'base.top', 'top.bottom', 'fastened');

        const result = await checkMechanismTruth(arm, { physicsCheck: true });
        const physicsFailures = result.failures.filter((f) =>
            f.code === 'mechanism.unstable-under-gravity' || f.code === 'mechanism.drops-on-release',
        );
        expect(physicsFailures).toEqual([]);
    }, 60000);

    it('single revolute joint with NO brake correctly fails the drop-test', async () => {
        // A bare hinge with one swinging arm and no spring/actuator.
        // Under gravity from rest, the arm falls about the hinge — this
        // is exactly what criterion 6 should catch.
        await initOcct();
        const { arm, kcad } = makeArm('bare-hinge');
        const baseBody = kcad.box(40, 40, 30, true).translate(0, 0, -15);
        const armBody = kcad.box(120, 20, 20, true).translate(70, 0, 0);
        const j = kcad.joint.clevis({
            parentBody: baseBody,
            childBody: armBody,
            axis: 'Y',
            pivotParent: [0, 0, 15],
            pivotChild: [0, 0, 0],
            limitsDeg: [-90, 90],
        });
        const parent = arm.part('base', j.parentGeometry);
        parent.connector('hinge', {
            type: 'axis',
            origin: { kind: 'vec3', value: j.parentConnector.origin },
            axis: j.parentConnector.axis,
        });
        const child = arm.part('arm', j.childGeometry);
        child.connector('hinge', {
            type: 'axis',
            origin: { kind: 'vec3', value: j.childConnector.origin },
            axis: j.childConnector.axis,
        });
        arm.mate('elbow', 'base.hinge', 'arm.hinge', 'revolute', {
            limitsDeg: [-90, 90],
        });

        const result = await checkMechanismTruth(arm, { physicsCheck: true });
        const dropFailures = result.failures.filter((f) => f.code === 'mechanism.drops-on-release');
        expect(dropFailures.length).toBeGreaterThan(0);
        // Failure must name the elbow joint (the only joint in the model).
        expect(dropFailures[0].message).toContain('elbow');
    }, 60000);

    it('opts.physicsCheck=false (default) does NOT run physics', async () => {
        // The same bare hinge as above, but without physics → no drop-test
        // failure. Only kinematic criteria run.
        await initOcct();
        const { arm, kcad } = makeArm('bare-hinge-no-physics');
        const baseBody = kcad.box(40, 40, 30, true).translate(0, 0, -15);
        const armBody = kcad.box(120, 20, 20, true).translate(70, 0, 0);
        const j = kcad.joint.clevis({
            parentBody: baseBody,
            childBody: armBody,
            axis: 'Y',
            pivotParent: [0, 0, 15],
            pivotChild: [0, 0, 0],
            limitsDeg: [-90, 90],
        });
        const parent = arm.part('base', j.parentGeometry);
        parent.connector('hinge', {
            type: 'axis',
            origin: { kind: 'vec3', value: j.parentConnector.origin },
            axis: j.parentConnector.axis,
        });
        const child = arm.part('arm', j.childGeometry);
        child.connector('hinge', {
            type: 'axis',
            origin: { kind: 'vec3', value: j.childConnector.origin },
            axis: j.childConnector.axis,
        });
        arm.mate('elbow', 'base.hinge', 'arm.hinge', 'revolute', {
            limitsDeg: [-90, 90],
        });

        const result = await checkMechanismTruth(arm); // no opts → default
        const physicsFailures = result.failures.filter((f) =>
            f.code === 'mechanism.unstable-under-gravity' || f.code === 'mechanism.drops-on-release',
        );
        expect(physicsFailures).toEqual([]);
    }, 60000);
});
