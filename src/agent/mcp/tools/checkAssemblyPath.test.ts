// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';
import { checkAssemblyPathTool } from './checkAssemblyPath';
import { verifyTool } from './verify';
import { inspectionVerificationToolEntries } from '../registry/inspectionVerificationTools';
const code = "const a=assembly('path');a.part('peg',box(2,2,3));a.part('housing',box(6,6,5).translate(-2,-2,-1).subtract(box(2.2,2.2,6).translate(-.1,-.1,-.1)));return a.model();";
describe('assembly path MCP check', () => {
    it('publishes the verify schema', () => {
        const p = inspectionVerificationToolEntries.find(e => e.definition.name === 'verify')!.definition.inputSchema.properties as Record<string, {
            enum?: string[];
        }>;
        expect(p.check.enum).toContain('assembly-path');
        expect(p).toHaveProperty('directions');
        expect(p).toHaveProperty('disassemblyOrder');
        expect(p).toHaveProperty('sequence');
        expect(p).toHaveProperty('threadedFasteners');
    });
    it('evaluates real assembly code through verify', async () => {
        const result = await verifyTool({ check: 'assembly-path', code, assembly: 'path' }) as Awaited<ReturnType<typeof checkAssemblyPathTool>>;
        if ('error' in result)
            throw new Error(result.error);
        expect(result).toMatchObject({ source: 'local', basis: 'continuous-triangle-mesh' });
        expect(Array.isArray(result.limitations)).toBe(true);
        if ('parts' in result)
            expect(result.parts.find(p => p.part === 'peg')?.validDirections).toEqual([[0, 0, 1]]);
        else
            throw new Error(result.error);
    });
    it('checks a cylindrical peg in a real lowered blind bore', async () => {
        const bore = "const a=assembly('bore');a.part('peg',cylinder(3,1));a.part('housing',box(6,6,5).translate(-3,-3,-1).subtract(cylinder(6,1.1).translate(0,0,-.1)));return a.model();";
        const result = await checkAssemblyPathTool({ code: bore });
        if ('error' in result)
            throw new Error(result.error);
        expect(result.parts[0].validDirections).toEqual([[0, 0, 1]]);
    });
    it('plans the twelve-part gearbox with two mate-derived subassemblies at top level and recursively inside', async () => {
        const result = await checkAssemblyPathTool({ file: 'examples/assemblies/assembly-sequence-gearbox.kcad.ts', sequence: true });
        if ('error' in result)
            throw new Error(result.error);
        const steps = result.sequence!.steps;
        expect(steps).toHaveLength(14);
        const unitSteps = steps.filter(step => step.adds[0].startsWith('subassembly-'));
        expect(unitSteps.map(step => step.adds[0])).toEqual(['subassembly-2-gear-c', 'subassembly-1-gear-a']);
        for (const unit of unitSteps) {
            const inside = steps.filter(step => step.subassembly === unit.adds[0]);
            expect(inside.length).toBeGreaterThan(1);
            expect(inside[inside.length - 1]).toBe(unit);
        }
        const leaves = steps.flatMap(step => step.adds).filter(name => !name.startsWith('subassembly-'));
        expect([...leaves].sort()).toEqual([
            'base', 'cover', 'gear-a', 'gear-b', 'gear-c', 'gear-d',
            'input-shaft', 'output-shaft', 'post-a', 'post-b', 'post-c', 'post-d',
        ]);
        expect(result.sequence?.unknown).toEqual([]);
        expect(steps.every((step, index) => step.index === index + 1)).toBe(true);
        expect(result.model).toMatchObject({ rigidParts: true, gravity: 'not-modelled' });
    }, 60_000);
    it('turns a fixed connect into a subassembly candidate', async () => {
        const code = "const a=assembly('fixedcluster');const p=a.part('base',box(4,4,1),{connectors:{seat:{origin:[0,0,0]}}});const q=a.part('top',box(4,4,1).translate(0,0,1),{connectors:{mount:{origin:[0,0,0]}}});a.connect('bond',p.connector('seat'),q.connector('mount'));return a.model();";
        const result = await checkAssemblyPathTool({ code, sequence: true });
        if ('error' in result)
            throw new Error(result.error);
        expect(result.sequence?.steps.map(step => step.adds[0])).toEqual(['top', 'base', 'subassembly-1-base']);
        expect(result.sequence?.steps.every(step => step.subassembly === 'subassembly-1-base')).toBe(true);
    });
    it('detects a catalog threaded fastener as unknown: non-straight-path', async () => {
        const code = "const a=assembly('fastener-sequence');a.part('screw',await lib.part({family:'socket-head-cap-screw',thread:'M3',lengthMm:8,detail:'envelope'}));a.part('plate',box(20,20,2).translate(0,0,10));return a.model();";
        const result = await checkAssemblyPathTool({ code, sequence: true });
        if ('error' in result)
            throw new Error(result.error);
        const screw = result.parts.find(p => p.part === 'screw');
        expect(screw?.state).toEqual({ kind: 'unknown', reason: 'non-straight-path' });
        expect(result.sequence?.unknown).toContain('screw');
        expect(result.sequence?.steps.map(s => s.adds[0])).not.toContain('screw');
    }, 60_000);
    it('fails closed for missing and ambiguous assemblies and invalid scripts', async () => {
        expect(await checkAssemblyPathTool({ code, assembly: 'missing' })).toMatchObject({ ok: false, errorCode: 'feature.invalid-args' });
        expect(await checkAssemblyPathTool({ code: 'return box(1,1,1);' })).toMatchObject({ ok: false, errorCode: 'feature.invalid-args' });
        expect(await checkAssemblyPathTool({ code: "const a=assembly('first');a.part('one',box(1,1,1));a.model();const b=assembly('second');b.part('two',box(1,1,1));return b.model();" })).toMatchObject({ ok: false, errorCode: 'feature.invalid-args' });
        expect(await checkAssemblyPathTool({ code: 'this is invalid' })).toMatchObject({ ok: false });
    });
});
