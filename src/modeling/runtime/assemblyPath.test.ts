// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';
import { checkAssemblyPathMeshes, type AssemblyPathPart } from './assemblyPath';
import { trianglesCollideAlong, type Triangle } from './assemblyPathSweep';
import { classifySolidPoint } from './assemblyPathContainment';
import { TriangleBvh, type DfmMesh } from './dfm/meshBvh';
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
    it('does not treat a distant tangential ray hit as tetrahedron containment', () => {
        const tetrahedron: AssemblyPathPart = { name: 'tetrahedron', mesh: { vertices: [0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2], triangles: [0, 2, 1, 0, 1, 3, 0, 3, 2, 1, 2, 3] } };
        const result = peg([box('outside', [-1, 1, 1], [.1, 1.1, 1.1]), tetrahedron]);
        expect(result.validDirections).toContainEqual([0, 1, 0]);
    });
    it('keeps positive sub-nanometer surface contact distinct from zero-only departure', () => {
        const moving: Triangle = [[1, 0, 0], [1, 1, 0], [1, 0, 1]];
        const foil: Triangle = moving.map(p => [p[0] - 5e-10, p[1], p[2]]) as Triangle;
        expect(trianglesCollideAlong(moving, foil, [-1, 0, 0], 2)).toBe(true);
        expect(trianglesCollideAlong(moving, moving, [-1, 0, 0], 2)).toBe(false);
    });
    it('blocks removal through thin positive initial overlap', () => {
        const result = peg([box('moving', [0, 0, 0], [1, 1, 1]), box('foil', [1 - 5e-10, -1, -1], [1 + 5e-10, 2, 2])]);
        expect(result.directions.find(d => d.direction[0] === -1)?.blockingParts).toEqual(['foil']);
    });
    it('prunes spatially separated dense components through the BVH', () => {
        const components = Array.from({ length: 768 }, (_, i) => box(`a${i}`, [3 * i, 0, 0], [3 * i + 1, 1, 1]));
        const offset = components.map((_, i) => box(`b${i}`, [3 * i + 1.5, 3, 0], [3 * i + 2.5, 4, 1]));
        const result = checkAssemblyPathMeshes([combine('a', components), combine('b', offset)], { disassemblyOrder: true });
        expect(result.stuckParts).toEqual([]);
        expect(result.parts.every(p => p.removable)).toBe(true);
    }, 15_000);
    it('charges containment work against the total budget on dense interleaved solids', () => {
        const a = Array.from({ length: 256 }, (_, i) => box(`a${i}`, [3 * i, 0, 0], [3 * i + 1, 1, 1]));
        const b = a.map((_, i) => box(`b${i}`, [3 * i + 1.5, .5, 0], [3 * i + 2.5, 1.5, 1]));
        expect(() => checkAssemblyPathMeshes([combine('a', a), combine('b', b)], { disassemblyOrder: true })).toThrow(/total work budget/);
    }, 15_000);
    it('interrupts BVH construction when its shared budget is exhausted', () => {
        const mesh = combine('dense', Array.from({ length: 64 }, (_, i) => box(String(i), [3 * i, 0, 0], [3 * i + 1, 1, 1]))).mesh;
        let work = 0;
        expect(() => new TriangleBvh(mesh, (amount = 1) => { work += amount; if (work > 5000)
            throw new Error('build budget exhausted'); })).toThrow('build budget exhausted');
    });
    it('bounds a dense empty spatial query by visited nodes rather than all triangles', () => {
        const parts = Array.from({ length: 2048 }, (_, i) => box(`b${i}`, [3 * i, 0, 0], [3 * i + 1, 1, 1]));
        const bvh = new TriangleBvh(combine('dense', parts).mesh);
        let work = 0;
        const hits = [...bvh.overlappingTriangles({ min: [1.1, 0, 0], max: [1.2, 1, 1] }, () => { if (++work > 100)
                throw new Error('unbounded spatial query'); })];
        expect(hits).toEqual([]);
        expect(work).toBeLessThan(100);
    });
    it('classifies oriented cavity shells without filling the void', () => {
        const outer=box('outer',[-2,-2,-2],[2,2,2]), cavity=box('cavity',[-1,-1,-1],[1,1,1]);
        const reversed:number[]=[];
        for(let i=0;i<cavity.mesh.triangles.length;i+=3) reversed.push(cavity.mesh.triangles[i],cavity.mesh.triangles[i+2],cavity.mesh.triangles[i+1]);
        const mesh=combine('hollow',[outer,{name:'cavity',mesh:{...cavity.mesh,triangles:reversed}}]).mesh;
        const vertices=(i:number): [number,number,number]=>[mesh.vertices[3*i],mesh.vertices[3*i+1],mesh.vertices[3*i+2]];
        const triangles:Triangle[]=[];
        for(let i=0;i<mesh.triangles.length;i+=3) triangles.push([vertices(mesh.triangles[i]),vertices(mesh.triangles[i+1]),vertices(mesh.triangles[i+2])]);
        expect(classifySolidPoint([0,0,0],triangles,()=>{})).toBe('outside');
        expect(classifySolidPoint([1.5,0,0],triangles,()=>{})).toBe('inside');
        expect(classifySolidPoint([-2,0,0],triangles,()=>{})).toBe('boundary');
    });
    it('fails closed on containment below floating-point surface resolution', () => {
        expect(()=>checkAssemblyPathMeshes([box('near-surface',[.3,.3,1e-17],[.4,.4,.1]),box('solid',[0,0,0],[1,1,1])])).toThrow(/numerically ambiguous/);
    });
    it('fails closed when finite sweep inputs overflow intermediate axes', () => {
        const a:Triangle=[[0,0,0],[1e200,0,0],[0,1,0]];
        const b:Triangle=[[2e200,0,0],[3e200,0,0],[2e200,1,0]];
        expect(()=>trianglesCollideAlong(a,b,[1,0,0],3e200)).toThrow(/non-finite/);
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
