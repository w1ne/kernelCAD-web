// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';
import { checkAssemblyPathMeshes, type AssemblyPathPart } from './assemblyPath';
import { trianglesCollideAlong, type Triangle } from './assemblyPathSweep';
import type { DfmMesh } from './dfm/meshBvh';
function box(name: string, min: number[], max: number[]): AssemblyPathPart {
    const vertices = [0, 1, 2, 3, 4, 5, 6, 7].flatMap(i => [i & 1 ? max[0] : min[0], i & 2 ? max[1] : min[1], i & 4 ? max[2] : min[2]]);
    const triangles = [0, 2, 3, 0, 3, 1, 4, 5, 7, 4, 7, 6, 0, 1, 5, 0, 5, 4, 2, 6, 7, 2, 7, 3, 0, 4, 6, 0, 6, 2, 1, 3, 7, 1, 7, 5];
    return { name, mesh: { vertices, triangles } };
}
function combine(name: string, parts: AssemblyPathPart[]): AssemblyPathPart {
    const mesh: {
        vertices: number[];
        triangles: number[];
    } = { vertices: [], triangles: [] };
    for (const p of parts) {
        const offset = mesh.vertices.length / 3;
        mesh.vertices.push(...p.mesh.vertices);
        mesh.triangles.push(...p.mesh.triangles.map(i => i + offset));
    }
    return { name, mesh };
}
function pocket(cap = false): AssemblyPathPart[] {
    const walls = [box('left', [-3, -3, -1], [-1.1, 3, 4]), box('right', [1.1, -3, -1], [3, 3, 4]), box('front', [-1.1, -3, -1], [1.1, -1.1, 4]), box('back', [-1.1, 1.1, -1], [1.1, 3, 4]), box('floor', [-1.1, -1.1, -1], [1.1, 1.1, -.1])];
    if (cap)
        walls.push(box('cap', [-3, -3, 4.1], [3, 3, 5]));
    return [box('peg', [-1, -1, 0], [1, 1, 3]), combine('housing', walls)];
}
const peg = (parts: AssemblyPathPart[]) => checkAssemblyPathMeshes(parts).parts[0];
describe('assembly path continuous mesh sweep', () => {
    it('removes a peg from a blind pocket only along +Z', () => {
        expect(peg(pocket()).validDirections).toEqual([[0, 0, 1]]);
        expect(peg(pocket()).directions.filter(d => !d.clear).every(d => d.blockingParts.includes('housing'))).toBe(true);
    });
    it('reports a captured part and a stuck set', () => {
        const result = checkAssemblyPathMeshes(pocket(true), { disassemblyOrder: true });
        expect(result.parts.every(p => !p.removable)).toBe(true);
        expect(result.stuckParts).toEqual(['peg', 'housing']);
    });
    it('cannot tunnel through a thin obstacle between endpoints', () => {
        const p = peg([box('moving', [0, 0, 0], [1, 1, 1]), box('foil', [2.001, -1, -1], [2.002, 2, 2])]);
        expect(p.directions.find(d => d.direction[0] === 1)?.blockingParts).toEqual(['foil']);
    });
    it('detects initial containment', () => {
        expect(peg([box('inside', [0, 0, 0], [1, 1, 1]), box('solid', [-2, -2, -2], [2, 2, 2])]).removable).toBe(false);
    });
    it('allows departure from starting face contact', () => {
        const p = peg([box('moving', [0, 0, 0], [1, 1, 1]), box('floor', [-2, -2, -1], [2, 2, 0])]);
        expect(p.validDirections).toContainEqual([0, 0, 1]);
        expect(p.directions.find(d => d.direction[2] === -1)?.blockingParts).toEqual(['floor']);
    });
    it('allows departure from side contact without confusing contact with containment', () => {
        const result = peg([box('moving', [0, 0, 0], [1, 1, 1]), box('right', [1, 0, 0], [2, 1, 1])]);
        expect(result.validDirections).toContainEqual([-1, 0, 0]);
        expect(result.directions.find(d => d.direction[0] === 1)?.blockingParts).toEqual(['right']);
    });
    it('tests an extra diagonal direction when all cardinal directions are blocked', () => {
        const parts = [box('moving', [-.2, -.2, -.2], [.2, .2, .2])];
        for (let axis = 0; axis < 3; axis++)
            for (const sign of [-1, 1]) {
                const center = [0, 0, 0];
                center[axis] = sign * 2;
                parts.push(box(`${axis}:${sign}`, center.map(v => v - .4), center.map(v => v + .4)));
            }
        const result = checkAssemblyPathMeshes(parts, { directions: [[1, 1, 0]] }).parts[0];
        expect(result.directions.slice(0, 6).every(d => !d.clear)).toBe(true);
        expect(result.directions[6].clear).toBe(true);
    });
    it('normalizes and deduplicates explicit directions', () => {
        const result = checkAssemblyPathMeshes([box('one', [0, 0, 0], [1, 1, 1])], { directions: [[2, 2, 0], [1, 1, 0], [3, 0, 0]] });
        expect(result.parts[0].directions).toHaveLength(7);
        expect(result.parts[0].directions[6].direction[0]).toBeCloseTo(Math.SQRT1_2);
        expect(result.parts[0].directions[6].direction[1]).toBeCloseTo(Math.SQRT1_2);
    });
    it('rechecks freed parts after removing a lid', () => {
        const parts = pocket();
        parts.splice(1, 0, box('lid', [-3, -3, 4.1], [3, 3, 5]));
        const result = checkAssemblyPathMeshes(parts, { disassemblyOrder: true });
        expect(result.parts[0].removable).toBe(false);
        expect(result.removalOrder?.map(p => p.part)).toEqual(['lid', 'peg', 'housing']);
        expect(result.stuckParts).toEqual([]);
    });
    it.each([[[0, 0, 0]], [[NaN, 1, 0]], [[Infinity, 0, 0]]])('rejects invalid directions %j', directions => {
        expect(() => checkAssemblyPathMeshes(pocket(), { directions: directions as [
                number,
                number,
                number
            ][] })).toThrow();
    });
    it('does not discard a small speed over long travel', () => {
        const a: Triangle = [[0, 0, 0], [1, 0, 0], [0, 1, 0]];
        const b: Triangle = [[2000, 1.0000005, 0], [2001, 1.0000005, 0], [2000, 2.0000005, 0]];
        expect(trianglesCollideAlong(a, b, [1, 5e-10, 0], 2001)).toBe(true);
    });
    it('rejects duplicated and zero-volume faces', () => {
        expect(() => checkAssemblyPathMeshes([{ name: 'flat', mesh: { vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0], triangles: [0, 1, 2, 0, 1, 2] } }])).toThrow();
        expect(() => checkAssemblyPathMeshes([{ name: 'flat-tetrahedron', mesh: { vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0], triangles: [0, 2, 1, 0, 1, 3, 1, 2, 3, 2, 0, 3] } }])).toThrow();
    });
    it('rejects a zero-volume disconnected component beside a valid solid', () => {
        const flat: AssemblyPathPart = { name: 'flat', mesh: { vertices: [3, 0, 0, 4, 0, 0, 3, 1, 0, 4, 1, 0], triangles: [0, 2, 1, 0, 1, 3, 1, 2, 3, 2, 0, 3] } };
        expect(() => checkAssemblyPathMeshes([combine('mixed', [box('solid', [0, 0, 0], [1, 1, 1]), flat])])).toThrow();
    });
    it('rejects empty or malformed meshes and duplicate names', () => {
        expect(() => checkAssemblyPathMeshes([])).toThrow();
        expect(() => checkAssemblyPathMeshes([{ name: 'bad', mesh: { vertices: [], triangles: [] } as DfmMesh }])).toThrow();
        expect(() => checkAssemblyPathMeshes([box('same', [0, 0, 0], [1, 1, 1]), box('same', [2, 2, 2], [3, 3, 3])])).toThrow();
    });
});
