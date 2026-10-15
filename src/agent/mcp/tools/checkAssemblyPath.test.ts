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
    it('fails closed for missing and ambiguous assemblies and invalid scripts', async () => {
        expect(await checkAssemblyPathTool({ code, assembly: 'missing' })).toMatchObject({ ok: false, errorCode: 'feature.invalid-args' });
        expect(await checkAssemblyPathTool({ code: 'return box(1,1,1);' })).toMatchObject({ ok: false, errorCode: 'feature.invalid-args' });
        expect(await checkAssemblyPathTool({ code: "const a=assembly('first');a.part('one',box(1,1,1));a.model();const b=assembly('second');b.part('two',box(1,1,1));return b.model();" })).toMatchObject({ ok: false, errorCode: 'feature.invalid-args' });
        expect(await checkAssemblyPathTool({ code: 'this is invalid' })).toMatchObject({ ok: false });
    });
});
