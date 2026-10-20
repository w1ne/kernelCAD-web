// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/mjcfPhysicsContacts.test.ts
//
// P11 Slice 1 proof-of-life test: two interpenetrating cubes, hinged so
// MuJoCo treats them as a single connected tree, must produce `ncon > 0`
// contacts at rest pose. Before Slice 1, MJCF emitted `<inertial>` only
// and MuJoCo reported `ncon === 0` regardless of overlap — drop-tests
// "passed" on geometry that physically intersected. This test fails the
// moment collision-mesh emission regresses.
//
// Spec:  docs/specs/2026-06-03-physics-loop-P11-collision-aware-mujoco.md
// Plan:  docs/plans/2026-06-03-physics-loop-P11-slice-1-collision-geom-emission.md

import { describe, expect, it } from 'vitest';
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

describe('P11 Slice 1 — MuJoCo sees collision contacts on non-adjacent interpenetrating bodies', () => {
    it('three-body chain with A↔C overlap reports ncon > 0; joint-adjacent A↔B and B↔C excluded', async () => {
        // Build a three-cube chain A — hinge — B — hinge — C where:
        //   - A and B are joint-adjacent (one revolute mate)
        //   - B and C are joint-adjacent (one revolute mate)
        //   - A and C are NOT directly mated. C is folded back so its
        //     mesh overlaps A — the genuine "two unconnected bodies
        //     interpenetrate" case that Slice 1's collision emission
        //     must detect.
        //
        // Adjacent-pair contact (A↔B, B↔C) is excluded via the
        // `<contact><exclude>` block — that's the standard MJCF
        // robotics idiom for kinematic chains, without which clevis
        // fork-tongue overlaps generate enormous spurious contact
        // forces and kick the simulation apart on the first integrator
        // step. The interpenetration we DO want flagged is A↔C, which
        // stays in MuJoCo's contact set and produces `ncon > 0`.
        await initOcct();
        const session = new CaptureSession();
        const kcad = createApi({ session });
        const arm = kcad.assembly('three-cube-chain');

        // Three 40 mm cubes. Hinges chain them along +X; the second
        // hinge's pose folds C back toward A so the two cubes
        // physically share a slab of geometry.
        const cubeA = kcad.box(40, 40, 40, true);
        const cubeB = kcad.box(40, 40, 40, true);
        const cubeC = kcad.box(40, 40, 40, true);
        const jAB = kcad.joint.clevis({
            parentBody: cubeA,
            childBody: cubeB,
            axis: 'Y',
            pivotParent: [20, 0, 0],
            pivotChild: [-20, 0, 0],
            limitsDeg: [-180, 180],
        });
        const jBC = kcad.joint.clevis({
            parentBody: jAB.childGeometry,
            childBody: cubeC,
            axis: 'Y',
            pivotParent: [20, 0, 0],
            pivotChild: [-20, 0, 0],
            limitsDeg: [-180, 180],
        });
        arm.part('a', jAB.parentGeometry).connector('hingeAB', {
            type: 'axis',
            origin: { kind: 'vec3', value: jAB.parentConnector.origin },
            axis: jAB.parentConnector.axis,
        });
        arm.part('b', jBC.parentGeometry)
            .connector('hingeAB', {
                type: 'axis',
                origin: { kind: 'vec3', value: jAB.childConnector.origin },
                axis: jAB.childConnector.axis,
            })
            .connector('hingeBC', {
                type: 'axis',
                origin: { kind: 'vec3', value: jBC.parentConnector.origin },
                axis: jBC.parentConnector.axis,
            });
        arm.part('c', jBC.childGeometry).connector('hingeBC', {
            type: 'axis',
            origin: { kind: 'vec3', value: jBC.childConnector.origin },
            axis: jBC.childConnector.axis,
        });
        // Pose: AB hinge straight (0°), BC hinge folded back 180°.
        // Result in world frame: A at x≈0, B at x≈40, C folded back to
        // x≈0 — A and C cubes overlap deeply.
        arm.mate('hingeAB', 'a.hingeAB', 'b.hingeAB', 'revolute', {
            pose: 0,
            limitsDeg: [-180, 180],
        });
        arm.mate('hingeBC', 'b.hingeBC', 'c.hingeBC', 'revolute', {
            pose: 180,
            limitsDeg: [-180, 180],
        });

        const { mjcf } = await assemblyToMjcf(arm);

        // Sanity-check the MJCF carries the collision surface and the
        // canonical robotics-MJCF `<contact><exclude>` block.
        expect(mjcf).toMatch(/<asset>/);
        expect(mjcf).toMatch(/<mesh name="part-a"/);
        expect(mjcf).toMatch(/<mesh name="part-b"/);
        expect(mjcf).toMatch(/<mesh name="part-c"/);
        expect(mjcf).toMatch(/<geom type="mesh" mesh="part-a"/);
        expect(mjcf).toMatch(/<geom type="mesh" mesh="part-b"/);
        expect(mjcf).toMatch(/<geom type="mesh" mesh="part-c"/);
        expect(mjcf).toMatch(/<contact>/);
        expect(mjcf).toMatch(/<exclude body1="a" body2="b"\/>/);
        expect(mjcf).toMatch(/<exclude body1="b" body2="c"\/>/);
        // A↔C must NOT be excluded — that's the pair we want flagged.
        expect(mjcf).not.toMatch(/<exclude body1="a" body2="c"\/>/);

        // The mesh vertex stream is in millimetres; the emitter tags
        // every `<mesh>` with `scale="0.001 0.001 0.001"` so MuJoCo
        // rescales it into its metre world. Assert the scale is present —
        // without it the collision hull is 1000× oversized.
        expect(mjcf).toMatch(/<mesh name="part-a" scale="0\.001 0\.001 0\.001"/);

        // Parse through MuJoCo and check contact count at rest pose.
        const mujoco = (await loadMujocoInNode()) as {
            MjModel: { from_xml_string: (s: string) => unknown };
            MjData: new (m: unknown) => unknown;
            mj_forward: (m: unknown, d: unknown) => void;
        };
        const model = mujoco.MjModel.from_xml_string(mjcf);
        const data = new mujoco.MjData(model);
        try {
            mujoco.mj_forward(model, data);
            const ncon = Number((data as { ncon: number }).ncon);
            expect(ncon).toBeGreaterThan(0);

            // Penetration-depth sanity: the two 40 mm cubes overlap by at
            // most their own ~0.04 m extent, so every contact distance must
            // be physically bounded. A mm/metre unit slip would make the
            // hull 1000× oversized and report penetrations of tens of
            // METRES — this bound catches that regression even though
            // `ncon > 0` alone does not (the oversized cubes overlap too).
            const contacts = (data as {
                contact: { get: (i: number) => { dist: number } };
            }).contact;
            for (let i = 0; i < ncon; i++) {
                expect(Math.abs(contacts.get(i).dist)).toBeLessThan(0.1);
            }
        } finally {
            (data as { delete: () => void }).delete();
            (model as { delete: () => void }).delete();
        }
    }, 60000);

});
