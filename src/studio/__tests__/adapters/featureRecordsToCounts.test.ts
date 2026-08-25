// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// KC-06 regression: the Validity panel reported `0 parts · 0 joints` for a
// model the Scene tab was listing, because `reviewToValidity` hardcoded both
// counts. These cover the counts recovered from the loaded model's records
// for BOTH joint vocabularies (joint primitives and mates).
import { describe, expect, it } from 'vitest';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import { countModelTopology } from '../../adapters/featureRecordsToCounts';
import {
    jointPrimitiveModelRecords,
    mateModelRecords,
} from '../fixtures/assemblyFeatureRecordFixtures';

describe('countModelTopology', () => {
    it('empty / null records → 0 parts, 0 joints', () => {
        expect(countModelTopology([])).toEqual({ partCount: 0, jointCount: 0 });
        expect(countModelTopology(null)).toEqual({ partCount: 0, jointCount: 0 });
    });

    it('joint-primitive model (2 parts, 1 revolute) reports 2 and 1', () => {
        expect(countModelTopology(jointPrimitiveModelRecords())).toEqual({
            partCount: 2,
            jointCount: 1,
        });
    });

    it('mate-built model (2 parts, 1 revolute mate) reports 2 and 1', () => {
        expect(countModelTopology(mateModelRecords())).toEqual({
            partCount: 2,
            jointCount: 1,
        });
    });

    it('does not double count a mate repeated across two solvedAssembly records', () => {
        const records = mateModelRecords();
        const solved = records.find((r) => r.kind === 'solvedAssembly');
        if (solved === undefined) throw new Error('fixture has no solvedAssembly record');
        const repeated: FeatureRecord[] = [...records, { ...solved, id: 'solved-2' }];
        expect(countModelTopology(repeated).jointCount).toBe(1);
    });

    it('counts same-named parts in two assemblies separately', () => {
        const records: FeatureRecord[] = [
            ...jointPrimitiveModelRecords(),
            {
                id: 'other-base',
                kind: 'assemblyPart',
                params: {},
                inputs: {},
                metadata: { assemblyName: 'gripper', partName: 'base' },
            },
        ];
        expect(countModelTopology(records).partCount).toBe(3);
    });
});
