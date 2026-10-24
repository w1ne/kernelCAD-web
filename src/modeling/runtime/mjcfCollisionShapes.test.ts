// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/mjcfCollisionShapes.test.ts
//
// `part.collision([...])` replaces the single whole-part convex hull with one
// convex piece per shape, so a non-convex part has no phantom contact volume.

import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { CaptureSession } from '../capture/captureSession';
import { createModelingApi } from '../api';
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

// An L (base slab + upright wall) with a small cube resting in its inner
// corner. The cube lies inside the hull of the L but touches no material.
// MuJoCo excludes mate-adjacent pairs, so the cube hangs off a tiny anchor
// body instead of being mated to the L directly.
async function buildLAndCube(declarePieces: boolean) {
    await initOcct();
    const kcad = createModelingApi({ session: new CaptureSession() });
    const base = kcad.box(40, 20, 10, true).translate(20, 0, 5);
    const wall = kcad.box(10, 20, 40, true).translate(5, 0, 20);
    const l = kcad.union(base, wall);
    const axis = (origin: [number, number, number]) => ({
        type: 'axis' as const, origin: { kind: 'vec3' as const, value: origin }, axis: [0, 1, 0] as [number, number, number],
    });
    const arm = kcad.assembly('l-and-cube');
    const lRef = arm.part('ell', l).connector('pin', axis([-30, 0, 0]));
    if (declarePieces) lRef.collision([base, wall]);
    arm.part('anchor', kcad.box(2, 2, 2, true))
        .connector('pin', axis([0, 0, 0]))
        .connector('seat', axis([48, 0, 18]));
    arm.part('cube', kcad.box(8, 8, 8, true)).connector('seat', axis([0, 0, 0]));
    arm.mate('pin', 'ell.pin', 'anchor.pin', 'revolute', { pose: 0, limitsDeg: [-90, 90] });
    arm.mate('seat', 'anchor.seat', 'cube.seat', 'revolute', { pose: 0, limitsDeg: [-90, 90] });
    return arm;
}

describe('part.collision MJCF emission', () => {
    it('emits one mesh asset + geom per declared piece', async () => {
        const { mjcf } = await assemblyToMjcf(await buildLAndCube(true));
        expect(mjcf.match(/<mesh name="part-ell__c\d"/g)).toHaveLength(2);
        expect(mjcf.match(/<geom type="mesh" mesh="part-ell__c\d"/g)).toHaveLength(2);
        expect(mjcf).not.toMatch(/<mesh name="part-ell"/);
        // the undeclared part keeps its single hull
        expect(mjcf.match(/<mesh name="part-cube"/g)).toHaveLength(1);
        expect(mjcf.match(/<geom type="mesh" mesh="part-cube"/g)).toHaveLength(1);
    }, 60000);

    it('emits exactly one hull when no pieces are declared', async () => {
        const { mjcf } = await assemblyToMjcf(await buildLAndCube(false));
        expect(mjcf.match(/<mesh name="part-ell"/g)).toHaveLength(1);
        expect(mjcf.match(/<geom type="mesh" mesh="part-ell"/g)).toHaveLength(1);
        expect(mjcf).not.toMatch(/__c\d/);
    }, 60000);

    it('appends across calls and returns the part ref', async () => {
        await initOcct();
        const kcad = createModelingApi({ session: new CaptureSession() });
        const ref = kcad.assembly('x').part('p', kcad.box(10, 10, 10));
        expect(ref.collision([kcad.box(1, 1, 1)])).toBe(ref);
        ref.collision([kcad.box(2, 2, 2), kcad.box(3, 3, 3)]);
        expect(ref.collisionShapes).toHaveLength(3);
    });

    it('rejects an empty array and non-Shape entries', async () => {
        await initOcct();
        const kcad = createModelingApi({ session: new CaptureSession() });
        const ref = kcad.assembly('x').part('p', kcad.box(10, 10, 10));
        expect(() => ref.collision([])).toThrow(/part\.collision\(shapes\).*shapes/s);
        expect(() => ref.collision([kcad.box(1, 1, 1), 5 as never])).toThrow(/shapes\[1\]/);
        expect(() => ref.collision(undefined as never)).toThrow(/non-empty array/);
        expect(ref.collisionShapes).toHaveLength(0);
    });
});

describe.skipIf(!process.env.KCAD_SLOW)('part.collision in MuJoCo', () => {
    it('single hull contacts the cube in the L corner; convex pieces do not', async () => {
        const mujoco = (await loadMujocoInNode()) as {
            MjModel: { from_xml_string: (s: string) => unknown };
            MjData: new (m: unknown) => { ncon: number };
            mj_forward: (m: unknown, d: unknown) => void;
        };
        const ncon = async (declare: boolean): Promise<number> => {
            const { mjcf } = await assemblyToMjcf(await buildLAndCube(declare));
            const model = mujoco.MjModel.from_xml_string(mjcf);
            const data = new mujoco.MjData(model);
            try {
                mujoco.mj_forward(model, data);
                return Number(data.ncon);
            } finally {
                (data as unknown as { delete: () => void }).delete();
                (model as { delete: () => void }).delete();
            }
        };
        expect(await ncon(false)).toBeGreaterThan(0);
        expect(await ncon(true)).toBe(0);
    }, 60000);
});
