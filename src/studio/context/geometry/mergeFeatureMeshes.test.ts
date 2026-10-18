// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { emptyMergeState, mergeFeatureMeshes } from './mergeFeatureMeshes';

const f = (id: string, fp?: string) => ({
    featureId: id, featureKind: 'box', predecessors: [], faces: [],
    ...(fp === undefined ? {} : { fingerprint: fp }),
});

describe('mergeFeatureMeshes', () => {
    it('full replace without a trailer', () => {
        const { state } = mergeFeatureMeshes(null, [f('a', '1'), f('b', '2')]);
        expect(state.order).toEqual(['a', 'b']);
        expect(state.fingerprints.get('a')).toBe('1');
        const next = mergeFeatureMeshes(state, [f('c', '3')]);
        expect(next.state.order).toEqual(['c']);
        expect(next.changed).toBe(true);
    });

    it('keeps unchanged, replaces changed in place, appends new, drops removed', () => {
        const { state } = mergeFeatureMeshes(null, [f('a', '1'), f('b', '2'), f('c', '3')]);
        const merged = mergeFeatureMeshes(state, [f('b', '2b'), f('d', '4')], { unchangedIds: ['a'], removedIds: ['c'] });
        expect(merged.changed).toBe(true);
        expect(merged.state.order).toEqual(['a', 'b', 'd']);
        expect(merged.state.fingerprints.get('b')).toBe('2b');
        expect(merged.state.meshes.has('c')).toBe(false);
    });

    it('reports changed=false when fingerprints and order are unchanged', () => {
        const { state } = mergeFeatureMeshes(null, [f('a', '1'), f('b', '2')]);
        const merged = mergeFeatureMeshes(state, [f('b', '2')], { unchangedIds: ['a'], removedIds: [] });
        expect(merged.changed).toBe(false);
        expect(merged.state.order).toEqual(['a', 'b']);
    });

    it('handles removals-only partials', () => {
        const { state } = mergeFeatureMeshes(null, [f('a', '1'), f('b', '2')]);
        const merged = mergeFeatureMeshes(state, [], { unchangedIds: ['a'], removedIds: ['b'] });
        expect(merged.state.order).toEqual(['a']);
        expect(merged.changed).toBe(true);
    });

    it('throws on an unknown unchanged id', () => {
        const { state } = mergeFeatureMeshes(null, [f('a', '1')]);
        expect(() => mergeFeatureMeshes(state, [], { unchangedIds: ['zzz'], removedIds: [] }))
            .toThrow(/unknown unchanged id zzz/);
    });

    it('treats a missing incoming fingerprint as changed and does not claim to hold it', () => {
        const { state } = mergeFeatureMeshes(null, [f('a', '1')]);
        const merged = mergeFeatureMeshes(state, [f('a')], { unchangedIds: [], removedIds: [] });
        expect(merged.changed).toBe(true);
        expect(merged.state.fingerprints.has('a')).toBe(false);
    });

    it('returns the same meshes for unchanged features (no copies)', () => {
        const { state } = mergeFeatureMeshes(null, [f('a', '1')]);
        const merged = mergeFeatureMeshes(state, [], { unchangedIds: ['a'], removedIds: [] });
        expect(merged.state.meshes.get('a')).toBe(state.meshes.get('a'));
    });
});

describe('emptyMergeState', () => {
    it('starts empty', () => {
        const state = emptyMergeState();
        expect(state.order).toEqual([]);
        expect(state.meshes.size).toBe(0);
        expect(state.fingerprints.size).toBe(0);
    });
});
