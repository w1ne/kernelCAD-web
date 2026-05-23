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
