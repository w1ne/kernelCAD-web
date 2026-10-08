// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { initOcct } from '../kernel/backends/occt/occtBackend';
import { OcctLowerer } from '../modeling/backends/occt/occtLowerer';
import { RecomputeEngine } from '../modeling/compute/recomputeEngine';
import { runScript } from '../modeling/runtime/runScript';
import { wordsToGeometry } from './wordsToGeometry';

const EXAMPLES = [
    '60x40x5 mm bracket with 4 M3 mounting holes',
    'Hex-cap bolt M8x30',
    'L-bracket 100x60x2 mm, 90° fold along x=50',
] as const;

describe('wordsToGeometry', () => {
    it('turns the generate-page examples into parametric scripts', () => {
        const plate = wordsToGeometry(EXAMPLES[0]);
        const bolt = wordsToGeometry(EXAMPLES[1]);
        const bracket = wordsToGeometry(EXAMPLES[2]);
        expect(plate.ok).toBe(true);
        expect(bolt.ok).toBe(true);
        expect(bracket.ok).toBe(true);
        if (!plate.ok || !bolt.ok || !bracket.ok) return;
        expect(plate.source).toContain("param('width', 60");
        expect(plate.source).toContain("param('holeD', 3.4");
        expect(plate.source).toContain('return plate.subtract');
        expect(bolt.source).toContain("param('thread', 8");
        expect(bolt.source).toContain("param('length', 30");
        expect(bolt.source).toContain('return head.union(shank)');
        expect(bracket.source).toContain('sheetMetal(blank');
        expect(bracket.source).toContain('bend({ atX: 50 }, 90, 2)');
    });

    it('refuses a prompt that is not a plate, bolt, or L-bracket', () => {
        expect(wordsToGeometry('')).toMatchObject({ ok: false, code: 'words.empty' });
        expect(wordsToGeometry('a walking robot with five fingers')).toMatchObject({ ok: false, code: 'words.unsupported' });
        expect(wordsToGeometry('60x40x5 mm plate with 3 M3 holes')).toMatchObject({ ok: false, code: 'words.unsupported' });
        expect(wordsToGeometry('60x40x5 mm plate with three 4 mm holes')).toMatchObject({ ok: false, code: 'words.unsupported' });
        expect(wordsToGeometry('60x40x5 mm plate with holes')).toMatchObject({ ok: false, code: 'words.unsupported' });
    });

    it('captures geometry for each generate-page example', async () => {
        for (const prompt of EXAMPLES) {
            const made = wordsToGeometry(prompt);
            expect(made.ok, prompt).toBe(true);
            if (!made.ok) continue;
            const captured = await runScript({ code: made.source, fileName: 'words.kcad.ts' });
            expect(captured.records.length, prompt).toBeGreaterThan(0);
        }
    });

    it('lowers each example to a solid', async () => {
        await initOcct();
        const engine = new RecomputeEngine(new OcctLowerer());
        for (const prompt of EXAMPLES) {
            const made = wordsToGeometry(prompt);
            if (!made.ok) throw new Error(made.message);
            const { records, paramTable } = await runScript({ code: made.source, fileName: 'words.kcad.ts' });
            const lowered = await engine.run(records, { paramTable });
            const errors = lowered.diagnostics.filter((item) => item.severity === 'error');
            expect(errors, prompt).toEqual([]);
        }
    });
});
