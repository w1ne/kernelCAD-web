// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import type { GeometryResult } from '../../shared/worker/geometryEngine';
import { filterGeometriesForFocusTarget } from '../components/viewer/controllers/focusTarget';

function geometry(name: string | undefined): GeometryResult {
    return {
        faces: [
            {
                vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
                normal: [0, 0, 1],
            },
        ],
        assemblyPartName: name,
    };
}

describe('filterGeometriesForFocusTarget', () => {
    it('returns geometries whose assemblyPartName matches any focus id', () => {
        const bracket = geometry('bracket');
        const shaft = geometry('shaft');
        const cover = geometry('cover');

        expect(filterGeometriesForFocusTarget(
            [bracket, shaft, cover],
            { ids: ['bracket', 'cover'], source: 'validity-diagnostic' },
        )).toEqual([bracket, cover]);
    });

    it('returns an empty list when no geometry names match', () => {
        expect(filterGeometriesForFocusTarget(
            [geometry('shaft')],
            { ids: ['bracket', 'cover'], source: 'validity-suggestion' },
        )).toEqual([]);
    });

    it('ignores unnamed geometries', () => {
        expect(filterGeometriesForFocusTarget(
            [geometry(undefined), geometry('cover')],
            { ids: ['cover'], source: 'validity-diagnostic' },
        )).toEqual([geometry('cover')]);
    });
});
