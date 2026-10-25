// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';
import { checkAssemblyPathMeshes, type AssemblyPathPart } from './assemblyPath';

function box(name: string, min: number[], max: number[]): AssemblyPathPart {
    const vertices = [0, 1, 2, 3, 4, 5, 6, 7].flatMap(i => [i & 1 ? max[0] : min[0], i & 2 ? max[1] : min[1], i & 4 ? max[2] : min[2]]);
    const triangles = [0, 2, 3, 0, 3, 1, 4, 5, 7, 4, 7, 6, 0, 1, 5, 0, 5, 4, 2, 6, 7, 2, 7, 3, 0, 4, 6, 0, 6, 2, 1, 3, 7, 1, 7, 5];
    return { name, mesh: { vertices, triangles } };
}

function combine(name: string, parts: AssemblyPathPart[]): AssemblyPathPart {
    const mesh = { vertices: [] as number[], triangles: [] as number[] };
    for (const part of parts) {
        const offset = mesh.vertices.length / 3;
        mesh.vertices.push(...part.mesh.vertices);
        mesh.triangles.push(...part.mesh.triangles.map(index => index + offset));
    }
    return { name, mesh };
}

/** A base with a left pedestal, a lower shelf and a tall post. The cantilever
 *  rests only on the pedestal; the narrow support sits on the shelf under its
 *  free end but is built after it. */
function cantileverAssembly(): AssemblyPathPart[] {
    return [
        combine('base', [
            box('pedestal', [-2, -2, 0], [2, 2, 2]),
            box('shelf', [1.9, -2, 0], [12, 2, 1]),
            box('post', [-2, -2, 0], [-1.5, -1.5, 3.5]),
        ]),
        box('z-cantilever', [-1, -1, 2.01], [12, 1, 3.0]),
        box('a-support', [11.5, -1, 1.01], [11.6, 1, 1.99]),
    ];
}

function stepOf(result: ReturnType<typeof checkAssemblyPathMeshes>, part: string) {
    return result.sequence?.steps.find(step => step.adds.includes(part));
}

describe('approximate static stability', () => {
    it('passes a part resting over the inferred base and records its support', () => {
        const result = checkAssemblyPathMeshes([
            box('base', [-4, -4, 0], [4, 4, 1]),
            box('block', [-1, -1, 1], [1, 1, 2]),
        ], { sequence: true, stability: true });
        expect(result.sequence?.needsHold).toBeUndefined();
        expect(stepOf(result, 'block')).toMatchObject({ stability: 'stable', heldBy: ['base'] });
        expect(result.model.gravity).toBe('approximate-support-projection');
        expect(result.model.stability).toMatchObject({
            model: 'approximate-support-projection',
            gravity: [0, 0, -1],
            seed: ['base'],
            seedSource: 'inferred-lowest-parts',
            massBasis: 'uniform-density-mesh-volume',
        });
        expect(result.ok).toBe(true);
    });

    it('flags a cantilever placed before its support as needs-hold', () => {
        const result = checkAssemblyPathMeshes(cantileverAssembly(), { sequence: true, stability: true });
        expect(result.sequence?.steps.map(step => step.adds[0])).toEqual(['z-cantilever', 'base', 'a-support']);
        expect(stepOf(result, 'z-cantilever')).toMatchObject({ stability: 'needs-hold' });
        expect(stepOf(result, 'z-cantilever')?.heldBy).toBeUndefined();
        expect(result.sequence?.needsHold).toEqual([
            expect.objectContaining({
                part: 'z-cantilever',
                status: 'needs-hold',
                reason: 'center-of-mass-outside-support-polygon',
                supports: ['base'],
            }),
        ]);
        expect(result.sequence?.needsHold?.[0].supportPolygon?.length).toBeGreaterThanOrEqual(2);
        expect(result.ok).toBe(false);
    });

    it('honours declared fixtures and rejects an unknown fixture name', () => {
        const declared = checkAssemblyPathMeshes(cantileverAssembly(), {
            sequence: true,
            stability: true,
            fixtures: ['base'],
        });
        expect(declared.model.stability).toMatchObject({ seed: ['base'], seedSource: 'declared-fixtures' });
        expect(declared.sequence?.needsHold?.[0]).toMatchObject({ part: 'z-cantilever', supports: ['base'] });
        expect(() => checkAssemblyPathMeshes(cantileverAssembly(), {
            sequence: true,
            stability: true,
            fixtures: ['missing'],
        })).toThrow(/unknown part/);
    });

    it('accepts a beam over a support polygon formed by two stable parts', () => {
        const result = checkAssemblyPathMeshes([
            box('base-a', [-6, -2, 0], [-4, 2, 1]),
            box('base-b', [4, -2, 0], [6, 2, 1]),
            box('beam', [-5, -1, 1], [5, 1, 2]),
        ], { sequence: true, stability: true });
        expect(stepOf(result, 'beam')).toMatchObject({
            stability: 'stable',
            heldBy: ['base-a', 'base-b'],
        });
        expect(result.sequence?.needsHold).toBeUndefined();
    });

    it('follows the declared gravity direction and re-seeds the base', () => {
        const downZ = checkAssemblyPathMeshes(cantileverAssembly(), { sequence: true, stability: true });
        const upZ = checkAssemblyPathMeshes(cantileverAssembly(), {
            sequence: true,
            stability: true,
            gravity: [0, 0, 1],
        });
        const downX = checkAssemblyPathMeshes(cantileverAssembly(), {
            sequence: true,
            stability: true,
            gravity: [1, 0, 0],
        });
        expect(downZ.model.stability?.gravity).toEqual([0, 0, -1]);
        expect(upZ.model.stability?.gravity).toEqual([0, 0, 1]);
        expect(upZ.sequence?.needsHold?.[0]).toMatchObject({
            part: 'z-cantilever',
            reason: 'no-support-below-center-of-mass',
        });
        expect(downX.sequence?.needsHold).toBeUndefined();
        expect(downX.model.stability?.seed).toContain('z-cantilever');
    });

    it('is deterministic for the same input', () => {
        const first = checkAssemblyPathMeshes(cantileverAssembly(), { sequence: true, stability: true });
        const second = checkAssemblyPathMeshes(cantileverAssembly(), { sequence: true, stability: true });
        expect(second.sequence).toEqual(first.sequence);
        expect(second.model).toEqual(first.model);
    });

    it('leaves the model and steps untouched when stability is not requested', () => {
        const result = checkAssemblyPathMeshes(cantileverAssembly(), { sequence: true });
        expect(result.model.gravity).toBe('not-modelled');
        expect(result.model.stability).toBeUndefined();
        expect(result.sequence?.needsHold).toBeUndefined();
        expect(result.sequence?.steps.every(step => step.stability === undefined && step.heldBy === undefined)).toBe(true);
    });
});
