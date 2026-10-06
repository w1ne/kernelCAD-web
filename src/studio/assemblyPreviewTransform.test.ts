// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { computeAssemblyPreviewTransform } from './assemblyPreviewTransform';
import type { JointPoseSnapshot } from './adapters/featureRecordsToMates';
import type { GeometryResult } from '../shared/worker/geometryEngine';

function snap(type: 'prismatic' | 'revolute', pose: number): JointPoseSnapshot {
    return {
        mate: { name: 'joint', a: 'base.axis', b: 'post.axis', type },
        pose,
        poseParamNames: ['height'],
        preview: {
            assemblyFeatureId: 'asm',
            parentPartName: 'base',
            childPartName: 'post',
            parentConnectorOrigin: [0, 0, 10],
            parentConnectorAxis: [0, 0, 1],
        },
    };
}

const base: GeometryResult = {
    faces: [],
    assemblyPartName: 'base',
    transform: new THREE.Matrix4().makeTranslation(0, 0, 5).toArray(),
};

const post: GeometryResult = {
    faces: [],
    assemblyPartName: 'post',
    transform: new THREE.Matrix4().makeTranslation(0, 0, 20).toArray(),
};

describe('computeAssemblyPreviewTransform', () => {
    it('moves a prismatic child by pose delta along the parent connector axis', () => {
        const preview = computeAssemblyPreviewTransform(snap('prismatic', 4), [base, post], 10);

        expect(preview?.partName).toBe('post');
        const moved = new THREE.Vector3(0, 0, 0).applyMatrix4(new THREE.Matrix4().fromArray(preview!.transform));
        expect(moved.toArray()).toEqual([0, 0, 26]);
    });

    it('rotates a revolute child by pose delta around the parent connector origin', () => {
        const child: GeometryResult = {
            faces: [],
            assemblyPartName: 'post',
            transform: new THREE.Matrix4().makeTranslation(10, 0, 15).toArray(),
        };

        const preview = computeAssemblyPreviewTransform(snap('revolute', 0), [base, child], 90);
        const moved = new THREE.Vector3(0, 0, 0).applyMatrix4(new THREE.Matrix4().fromArray(preview!.transform));

        expect(moved.x).toBeCloseTo(0, 5);
        expect(moved.y).toBeCloseTo(10, 5);
        expect(moved.z).toBeCloseTo(15, 5);
    });
});

describe('computeAssemblyPreviewTransform on a real lowered assembly', () => {
    const code = (pose: number) => `
        const arm = assembly('two-link');
        const base = arm.part('base', box(20, 20, 6), { at: [10, 5, 0] });
        const link = arm.part('link', box(80, 10, 6), { at: [30, 0, 6] });
        base.connector('shoulder', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 6] }, axis: [0, 0, 1] });
        link.connector('shoulder', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        arm.mate('shoulder', 'base.shoulder', 'link.shoulder', 'revolute', { pose: ${pose}, limitsDeg: [-90, 90] });
        return arm.model();
    `;

    async function lowered(pose: number) {
        const { buildModel } = await import('../composition/buildModel');
        const { isSceneBackend } = await import('../kernel/backends/sceneBackend');
        const model = await buildModel({ code: code(pose), fileName: 'preview.kcad.ts' });
        const scene = model.rootShape;
        if (!isSceneBackend(scene)) throw new Error('expected a scene');
        return { model, scene };
    }

    it('pivots around the parent connector when the parent part has a non-zero at', async () => {
        const { initOcct } = await import('../kernel/backends/occt/occtBackend');
        const { extractJointSnapshots } = await import('./adapters/featureRecordsToMates');
        await initOcct();
        const rest = await lowered(0);
        const target = await lowered(30);
        const geometries: GeometryResult[] = rest.scene.parts.map((p) => ({
            faces: [],
            assemblyPartName: p.name,
            transform: [...p.worldTransform.toMat4()],
        }));
        const snapshot = extractJointSnapshots(rest.model.records, rest.model.session.paramTable)
            .find((s) => s.mate.name === 'shoulder');
        if (!snapshot) throw new Error('no shoulder snapshot');

        const preview = computeAssemblyPreviewTransform(snapshot, geometries, 30);
        const got = new THREE.Matrix4().fromArray(preview!.transform);
        const want = new THREE.Matrix4().fromArray([...target.scene.parts[1].worldTransform.toMat4()]);
        for (const p of [[0, 0, 0], [80, 10, 6]] as const) {
            const a = new THREE.Vector3(...p).applyMatrix4(got);
            const b = new THREE.Vector3(...p).applyMatrix4(want);
            expect(a.distanceTo(b)).toBeLessThan(1e-6);
        }
    }, 120_000);
});
