// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../kernel/backends/occt/occtBackend';
import { runAndExport } from './export';

beforeAll(async () => {
    await initOcct();
});

const PLATE = [
    'const plate = box(60, 40, 5);',
    'const drill = (x, y) => cylinder(7, 1.7).translate(x, y, -1);',
    'return plate.subtract(drill(7, 7), drill(53, 7), drill(7, 33), drill(53, 33));',
].join('\n');

const L_BRACKET = [
    'const blank = path().moveTo(0, 0).lineTo(100, 0).lineTo(100, 60).lineTo(0, 60).close();',
    'const sheet = sheetMetal(blank, { thickness: 2, kFactor: 0.38 });',
    'return sheet.bend({ atX: 50 }, 90, 2);',
].join('\n');

async function dxf(code: string) {
    return runAndExport({ code, fileName: 'part.kcad.ts', format: 'dxf', options: { format: 'dxf' } });
}

describe('DXF export sheet facts', () => {
    it('reports the thickness of a flat plate and no bends', async () => {
        const made = await dxf(PLATE);
        expect(made.bytes.length).toBeGreaterThan(0);
        expect(made.sheet?.bendCount).toBe(0);
        expect(made.sheet?.thicknessMm).toBeCloseTo(5, 6);
    });

    it('reports the sheet thickness and bend count of a bent sheet-metal part', async () => {
        const made = await dxf(L_BRACKET);
        expect(made.sheet).toEqual({ thicknessMm: 2, bendCount: 1 });
    });

    it('reports nothing for a cross-section, which is not a sheet', async () => {
        const made = await runAndExport({
            code: 'return box(20, 20, 20);',
            fileName: 'cube.kcad.ts',
            format: 'dxf',
            options: { format: 'dxf', section: { axis: 'z', at: 10 } },
        });
        expect(made.bytes.length).toBeGreaterThan(0);
        expect(made.sheet).toBeUndefined();
    });
});

describe('MCP export tool sheet facts', () => {
    it('returns the sheet thickness and bend count with a DXF export', async () => {
        const { mkdtemp, rm } = await import('node:fs/promises');
        const { tmpdir } = await import('node:os');
        const { join } = await import('node:path');
        const { exportModelTool } = await import('../mcp/tools/exportModel');
        const dir = await mkdtemp(join(tmpdir(), 'kc-sheet-'));
        try {
            const out = await exportModelTool({ code: L_BRACKET, output_path: join(dir, 'bracket.dxf'), format: 'dxf' });
            expect(out.ok).toBe(true);
            expect(out.sheet).toEqual({ thickness_mm: 2, bend_count: 1 });
        } finally {
            await rm(dir, { recursive: true, force: true });
        }
    });
});
