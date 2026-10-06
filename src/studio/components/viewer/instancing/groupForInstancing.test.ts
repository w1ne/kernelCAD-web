// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import type { GeometryResult } from '../../../../shared/worker/geometryEngine';
import { groupForInstancing, visibleEntries } from './groupForInstancing';

const g = (part: string, geometryId?: string, color = '#888888'): GeometryResult => ({
    faces: [], assemblyPartName: part, color, ...(geometryId !== undefined ? { geometryId } : {}),
});

const base = {
    itemNames: [] as (string | null)[],
    hiddenIds: [] as string[],
    selectedItemIds: [] as string[],
    sectionKeepWhole: new Set<string>(),
    selectedFaceShapeIndex: undefined as number | undefined,
};

describe('groupForInstancing', () => {
    it('groups >= 2 parts with the same geometry and appearance; leaves the rest single', () => {
        const geometries = [g('a', 'k1'), g('b', 'k1'), g('c', 'k1', '#ff0000'), g('d'), g('e', 'k2')];
        const { singles, groups } = groupForInstancing(visibleEntries({ ...base, geometries }));
        expect(groups).toHaveLength(1);
        expect(groups[0].members.map((m) => m.name)).toEqual(['a', 'b']);
        expect(singles.map((s) => s.name)).toEqual(['c', 'd', 'e']);
    });

    it('keeps today\'s rendering for scenes without geometryId (no groups)', () => {
        const geometries = [g('a'), g('b'), g('c')];
        const { singles, groups } = groupForInstancing(visibleEntries({ ...base, geometries }));
        expect(groups).toEqual([]);
        expect(singles.map((s) => s.shapeIndex)).toEqual([0, 1, 2]);
    });

    it('drops hidden instances and pulls the selected / face-selected instance out of its group', () => {
        const geometries = [g('a', 'k'), g('b', 'k'), g('c', 'k'), g('d', 'k'), g('e', 'k')];
        const entries = visibleEntries({
            ...base, geometries, hiddenIds: ['b'], selectedItemIds: ['c'], selectedFaceShapeIndex: 3,
        });
        const { singles, groups } = groupForInstancing(entries);
        expect(entries.map((e) => e.name)).toEqual(['a', 'c', 'd', 'e']);
        expect(groups[0].members.map((m) => m.name)).toEqual(['a', 'e']);
        expect(singles.map((s) => s.name)).toEqual(['c', 'd']);
        expect(singles[0].isSelected).toBe(true);
    });

    it('splits a group by section keep-whole state', () => {
        const geometries = [g('a', 'k'), g('b', 'k'), g('c', 'k'), g('d', 'k')];
        const { groups } = groupForInstancing(visibleEntries({ ...base, geometries, sectionKeepWhole: new Set(['a', 'b']) }));
        expect(groups.map((x) => x.members.map((m) => m.name))).toEqual([['a', 'b'], ['c', 'd']]);
        expect(groups[0].members[0].keepWhole).toBe(true);
    });

    it('keeps each member\'s own shapeIndex, part name and transform', () => {
        const geometries = [g('x'), { ...g('a', 'k'), transform: [1] }, g('b', 'k'), { ...g('c', 'k'), transform: [2] }];
        const { groups } = groupForInstancing(visibleEntries({ ...base, geometries }));
        expect(groups[0].members.map((m) => [m.shapeIndex, m.name, m.geometry.transform])).toEqual([
            [1, 'a', [1]], [2, 'b', undefined], [3, 'c', [2]],
        ]);
    });

    it('splits by material even when colour matches', () => {
        const metal: GeometryResult = { ...g('b', 'k'), material: { baseColor: '#888888', metalness: 1 } };
        const { singles, groups } = groupForInstancing(visibleEntries({ ...base, geometries: [g('a', 'k'), metal, g('c', 'k')] }));
        expect(groups[0].members.map((m) => m.name)).toEqual(['a', 'c']);
        expect(singles.map((s) => s.name)).toEqual(['b']);
    });
});
