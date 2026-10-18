// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { __resetMeshMergeStatesForTests, mergeMeshPayload, meshMergeStateFor } from './meshMergeStore';

const HEX_A = '0123456789abcdef';

const f = (id: string, fingerprint: string) => ({
    featureId: id, featureKind: 'box', predecessors: [], faces: [], fingerprint,
});

describe('meshMergeStore', () => {
    beforeEach(() => __resetMeshMergeStatesForTests());
    afterEach(() => __resetMeshMergeStatesForTests());

    it('a full replace resets the store to the replaced source only', () => {
        mergeMeshPayload('source-a', { features: [f('a1', HEX_A)] });
        // A partial with no unchanged ids folds into a fresh entry for
        // `source-b` without clearing the store (only full payloads do).
        mergeMeshPayload('source-b', {
            features: [f('b1', HEX_A)],
            trailer: { unchangedIds: [], removedIds: [] },
        });
        expect(meshMergeStateFor('source-a')).not.toBeNull();
        expect(meshMergeStateFor('source-b')).not.toBeNull();

        mergeMeshPayload('source-c', { features: [f('c1', HEX_A)] });

        expect(meshMergeStateFor('source-a')).toBeNull();
        expect(meshMergeStateFor('source-b')).toBeNull();
        expect(meshMergeStateFor('source-c')?.order).toEqual(['c1']);
    });

    it('leaves the stored state untouched when a merge throws on an unknown unchanged id', () => {
        mergeMeshPayload('source-a', { features: [f('a1', HEX_A)] });

        expect(() => mergeMeshPayload('source-a', {
            features: [],
            trailer: { unchangedIds: ['ghost'], removedIds: [] },
        })).toThrow(/unknown unchanged id ghost/);

        const state = meshMergeStateFor('source-a');
        expect(state?.order).toEqual(['a1']);
        expect(state?.fingerprints.get('a1')).toBe(HEX_A);
    });

    it('__resetMeshMergeStatesForTests empties the store', () => {
        mergeMeshPayload('source-a', { features: [f('a1', HEX_A)] });
        expect(meshMergeStateFor('source-a')).not.toBeNull();

        __resetMeshMergeStatesForTests();

        expect(meshMergeStateFor('source-a')).toBeNull();
    });
});
