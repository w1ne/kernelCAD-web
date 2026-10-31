// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Native pdf-drawing sheets (auto-dimensioned, with datum and tolerance frames)
// read back by drawing_to_cad to the right volume and size. Each part here was
// misread before the view and blind-hole fixes this test guards.
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
vi.setConfig({ testTimeout: 120_000 });
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { judge, runPart, type CorpusPart } from '../../../scripts/drawingRoundTripScorecard';

const init = initOcct();
const corpus = JSON.parse(readFileSync(new URL('../../../assets/reference-parts/scorecard.json', import.meta.url), 'utf8')) as { parts: CorpusPart[] };
const part = (id: string): CorpusPart => corpus.parts.find((p) => p.id === id)!;

describe('drawing_to_cad on kernelCAD pdf-drawing sheets', () => {
  it.each([
    ['rectangular-block'],
    ['plate-blind-hole'],
    ['cone-frustum-revolve'],
    ['annular-cylinder'],
    ['stepped-shaft-revolve'],
  ])('%s rebuilds to the analytic volume and size', async (id) => {
    await init;
    const r = await runPart(part(id));
    expect(r.status, r.detail).toBe('PASS');
  });

  it('judges by volume and sorted extents', () => {
    const expected = { volumeMm3: 1000, bbox: { min: [0, 0, 0], max: [10, 10, 10] } };
    expect(judge(expected, { volumeMm3: 1000.5, bbox: { min: [5, 5, 5], max: [15, 15, 15] } }).status).toBe('PASS');
    expect(judge(expected, { volumeMm3: 1020, bbox: expected.bbox }).status).toBe('WRONG');
  });
});
