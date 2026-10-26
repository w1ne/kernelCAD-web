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
        expect(p).toHaveProperty('stability');
        expect(p).toHaveProperty('fixtures');
        expect(p).toHaveProperty('contactToleranceMm');
        expect(p).toHaveProperty('gravity');
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
    it('plans the gearbox with two subassemblies, helical bolts, tool reach and a press fit', async () => {
        const result = await checkAssemblyPathTool({ file: 'examples/assemblies/assembly-sequence-gearbox.kcad.ts', sequence: true });
        if ('error' in result)
            throw new Error(result.error);
        const steps = result.sequence!.steps;
        expect(steps).toHaveLength(19);
        const unitSteps = steps.filter(step => step.adds[0].startsWith('subassembly-'));
        expect(unitSteps.map(step => step.adds[0])).toEqual(['subassembly-2-gear-c', 'subassembly-1-gear-a']);
        for (const unit of unitSteps) {
            const inside = steps.filter(step => step.subassembly === unit.adds[0]);
            expect(inside.length).toBeGreaterThan(1);
            expect(inside[inside.length - 1]).toBe(unit);
        }
        const leaves = steps.flatMap(step => step.adds).filter(name => !name.startsWith('subassembly-'));
        expect([...leaves].sort()).toEqual([
            'base', 'bolt-a', 'bolt-b', 'bolt-c', 'bolt-d', 'cover',
            'gear-a', 'gear-b', 'gear-c', 'gear-d', 'input-shaft', 'output-shaft',
            'post-a', 'post-b', 'post-c', 'post-d', 'tool-clearance-rib',
        ]);
        expect(result.sequence?.unknown).toEqual([]);
        expect(steps.every((step, index) => step.index === index + 1)).toBe(true);
        expect(result.model).toMatchObject({ rigidParts: true, gravity: 'not-modelled' });
        expect(result.model.motionModels).toEqual(expect.arrayContaining(['straight-line-translation', 'helical-screw', 'requires-force']));
        expect(result.model.toolReach).toBe('swept-envelope');

        const bolts = steps.filter(step => step.adds[0].startsWith('bolt-'));
        expect(bolts).toHaveLength(4);
        expect(bolts.every(step => step.motion === 'helical')).toBe(true);
        expect(bolts.every(step => step.fastener?.pitchMm === 0.7)).toBe(true);
        const blocked = steps.find(step => step.adds[0] === 'bolt-a');
        expect(blocked?.tool).toMatchObject({ status: 'tool-blocked', blockers: ['tool-clearance-rib'] });
        expect(result.sequence?.toolBlocked).toEqual([
            expect.objectContaining({ fastener: 'bolt-a', blockers: ['tool-clearance-rib'] }),
        ]);

        const press = steps.find(step => step.adds[0] === 'gear-a');
        expect(press).toMatchObject({ motion: 'requires-force', requiresForce: { kind: 'press' } });
        expect(result.sequence?.requiresForce).toEqual([{ part: 'gear-a', kind: 'press' }]);
        expect(result.requirements?.entries).toEqual(expect.arrayContaining([
            expect.objectContaining({ name: 'assembly.toolReach.bolt-a', source: 'assembly', status: 'fail' }),
            expect.objectContaining({ name: 'assembly.requiresForce.gear-a', source: 'assembly', status: 'not-evaluated' }),
        ]));
        expect(result.requirements?.ok).toBe(false);
        expect(result.ok).toBe(false);
    }, 60_000);
    it('flags a cantilever placed before its support with approximate stability', async () => {
        const result = await checkAssemblyPathTool({
            file: 'examples/assemblies/assembly-stability-bracket.kcad.ts',
            sequence: true,
            stability: true,
        });
        if ('error' in result)
            throw new Error(result.error);
        expect(result.sequence?.steps.map(step => step.adds[0])).toEqual(['z-cantilever', 'base', 'a-support']);
        expect(result.sequence?.steps[0]).toMatchObject({ stability: 'needs-hold' });
        expect(result.sequence?.steps[2]).toMatchObject({ stability: 'stable', heldBy: ['base'] });
        expect(result.sequence?.needsHold).toEqual([
            expect.objectContaining({
                part: 'z-cantilever',
                status: 'needs-hold',
                reason: 'center-of-mass-outside-support-polygon',
                supports: ['base'],
            }),
        ]);
        expect(result.model.gravity).toBe('approximate-support-projection');
        expect(result.model.stability).toMatchObject({
            model: 'approximate-support-projection',
            gravity: [0, 0, -1],
            seed: ['base'],
            seedSource: 'inferred-lowest-parts',
        });
        expect(result.ok).toBe(false);
    }, 60_000);
    it('turns a fixed connect into a subassembly candidate', async () => {
        const code = "const a=assembly('fixedcluster');const p=a.part('base',box(4,4,1),{connectors:{seat:{origin:[0,0,0]}}});const q=a.part('top',box(4,4,1).translate(0,0,1),{connectors:{mount:{origin:[0,0,0]}}});a.connect('bond',p.connector('seat'),q.connector('mount'));return a.model();";
        const result = await checkAssemblyPathTool({ code, sequence: true });
        if ('error' in result)
            throw new Error(result.error);
        expect(result.sequence?.steps.map(step => step.adds[0])).toEqual(['top', 'base', 'subassembly-1-base']);
        expect(result.sequence?.steps.every(step => step.subassembly === 'subassembly-1-base')).toBe(true);
    });
    it('derives helical pitch and a default tool envelope from a catalog fastener mate', async () => {
        const code = "const a=assembly('fastener-meta');const plate=a.part('plate',box(20,20,2).translate(0,0,-1));const screw=a.part('screw',await lib.part({family:'socket-head-cap-screw',thread:'M3',lengthMm:8,detail:'envelope'}),{at:[0,0,10]});plate.connector('seat',{type:'frame',origin:{kind:'vec3',value:[0,0,10]},normal:[0,0,1]});a.mate('screw-seat','screw.head-bearing','plate.seat','fastened',{fastener:{part:'screw',axis:[0,0,1]}});return a.model();";
        const result = await checkAssemblyPathTool({ code, sequence: true });
        if ('error' in result)
            throw new Error(result.error);
        const screw = result.parts.find(part => part.part === 'screw');
        expect(screw?.state).toMatchObject({ kind: 'removable', motion: 'helical' });
        expect(screw?.fastener).toMatchObject({ pitchMm: 0.5, standard: 'ISO 4762' });
        expect(screw?.toolReach).toMatchObject({ status: 'clear', tool: { kind: 'cylinder', label: 'hex-key' } });
        expect(result.model.toolReach).toBe('swept-envelope');
        expect(result.sequence?.steps.find(step => step.adds[0] === 'screw')).toMatchObject({
            motion: 'helical',
            fastener: { pitchMm: 0.5 },
        });
    }, 60_000);
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
    it('rejects P2 fastener/fit metadata on a moving mate', async () => {
        const code = "const a=assembly('bad-fit');const p=a.part('base',box(2,2,2));const q=a.part('arm',box(2,2,2));p.connector('h',{type:'axis',origin:{kind:'vec3',value:[0,0,0]},axis:[0,0,1]});q.connector('h',{type:'axis',origin:{kind:'vec3',value:[0,0,0]},axis:[0,0,1]});a.mate('hinge','base.h','arm.h','revolute',{fit:{kind:'press',part:'arm'}});return a.model();";
        const result = await checkAssemblyPathTool({ code });
        expect(result).toMatchObject({ ok: false, errorCode: 'feature.invalid-args' });
        if (!('error' in result))
            throw new Error('expected an error');
        expect(result.error).toContain("a 'fastened' mate");
    });
    it('fails closed for missing and ambiguous assemblies and invalid scripts', async () => {
        expect(await checkAssemblyPathTool({ code, assembly: 'missing' })).toMatchObject({ ok: false, errorCode: 'feature.invalid-args' });
        expect(await checkAssemblyPathTool({ code: 'return box(1,1,1);' })).toMatchObject({ ok: false, errorCode: 'feature.invalid-args' });
        expect(await checkAssemblyPathTool({ code: "const a=assembly('first');a.part('one',box(1,1,1));a.model();const b=assembly('second');b.part('two',box(1,1,1));return b.model();" })).toMatchObject({ ok: false, errorCode: 'feature.invalid-args' });
        expect(await checkAssemblyPathTool({ code: 'this is invalid' })).toMatchObject({ ok: false });
    });
});
