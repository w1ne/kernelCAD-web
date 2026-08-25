// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// The KC-06 model, as `featureRecords`: two parts ("base", "arm") joined by
// one revolute joint, in BOTH declaration vocabularies.
//
//   `jointPrimitiveModelRecords()` — what `assembly().part(...)` +
//   `asm.revolute(...)` + `asm.solvedModel(...)` captures: one
//   `assemblyJoint` record per joint, plus the pose map on the
//   `solvedAssembly` record. `metadata.mates` is ABSENT — joint primitives
//   live in `Assembly.__joints()`, never in `__mates()`.
//
//   `mateModelRecords()` — what `asm.mate(...)` captures: no `assemblyJoint`
//   record, the joint shows up as `metadata.mates` on `solvedAssembly`.
//
// Shapes mirror `buildAssemblyJointFeatureSpec` /
// `buildSolvedAssemblyFeatureSpec` in
// `src/modeling/capture/assemblyFeatureRecords.ts`.
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import type { Param } from '../../../shared/intent/types';

function record(partial: Partial<FeatureRecord> & Pick<FeatureRecord, 'id' | 'kind'>): FeatureRecord {
    return {
        inputs: {},
        params: {},
        transforms: [],
        suppressed: false,
        ...partial,
    };
}

function part(id: string, partName: string, assemblyName = 'rig'): FeatureRecord {
    return record({
        id,
        kind: 'assemblyPart',
        inputs: { shape: { kind: 'feature', id: `${id}-shape` } },
        metadata: { assemblyName, partName },
    });
}

/** A pose bound to a param table entry, as capture encodes a ParamRef:
 *  `evaluated` stays 0 and the real value is looked up by `paramRef`. */
function paramRefPose(name: string): Param {
    return { expression: name, unit: 'deg', evaluated: 0, paramRef: name };
}

export function jointPrimitiveModelRecords(): FeatureRecord[] {
    return [
        part('p-base', 'base'),
        part('p-arm', 'arm'),
        record({
            id: 'j-elbow',
            kind: 'assemblyJoint',
            inputs: {
                a: { kind: 'feature', id: 'p-base' },
                b: { kind: 'feature', id: 'p-arm' },
            },
            metadata: {
                assemblyName: 'rig',
                jointName: 'elbow',
                jointKind: 'revolute',
                axis: [0, 0, 1],
                origin: [0, 0, 10],
                limitsDeg: [-90, 90],
            },
        }),
        record({
            id: 'solved',
            kind: 'solvedAssembly',
            inputs: {
                part_0: { kind: 'feature', id: 'p-base' },
                part_1: { kind: 'feature', id: 'p-arm' },
                joint_0: { kind: 'feature', id: 'j-elbow' },
            },
            metadata: {
                assemblyName: 'rig',
                partIds: ['p-base', 'p-arm'],
                jointIds: ['j-elbow'],
                poses: { elbow: { kind: 'scalar', value: paramRefPose('elbowDeg') } },
            },
        }),
    ];
}

export function mateModelRecords(): FeatureRecord[] {
    return [
        part('p-base', 'base'),
        part('p-arm', 'arm'),
        record({
            id: 'solved',
            kind: 'solvedAssembly',
            inputs: {
                part_0: { kind: 'feature', id: 'p-base' },
                part_1: { kind: 'feature', id: 'p-arm' },
            },
            metadata: {
                assemblyName: 'rig',
                partIds: ['p-base', 'p-arm'],
                jointIds: [],
                poses: { elbow: { kind: 'scalar', value: paramRefPose('elbowDeg') } },
                mates: [
                    {
                        name: 'elbow',
                        a: 'base.top',
                        b: 'arm.bottom',
                        type: 'revolute',
                        pose: { kind: 'scalar', value: paramRefPose('elbowDeg') },
                        limitsDeg: [-90, 90],
                    },
                ],
            },
        }),
    ];
}
