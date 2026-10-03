// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Ranking regression for manufacturing intent. Usage triage 2026-10-03: agents
// asked for M-size threads, gears, sheet metal and print fits but the cookbook
// returned unrelated recipes, so they hand-built the geometry. Each query below
// is phrased the way users ask; the recipe that uses the real API must rank in
// the top 3 of the same search that MCP `lookup_cookbook` runs.
import { describe, it, expect } from 'vitest';
import { loadSnippets, search } from './index';

const CASES: Array<[query: string, expectedId: string]> = [
  ['M4 threaded hole in a 3D printed bracket', 'threaded-hole-tap-drill'],
  ['heat set insert hole for M3', 'heat-set-insert-pilot'],
  ['nut trap for M3 bolt', 'hex-nut-trap-bolt-clearance'],
  ['two meshing spur gears', 'involute-spur-gear-pair'],
  ['bent sheet metal bracket with flat pattern', 'sheet-metal-l-bracket-bend'],
  ['print clearance for a snap fit lid', 'fdm-fit-clearance-by-fit-type'],
  ['trace a shape from a photo', 'resolve-photo-trace-assumptions'],
];

describe('cookbook ranking — manufacturing intent reaches the real API', () => {
  const snippets = loadSnippets();

  for (const [query, expectedId] of CASES) {
    it(`"${query}" → ${expectedId} in top 3`, () => {
      const top3 = search(query, snippets, 3).map((h) => h.snippet.id);
      expect(top3).toContain(expectedId);
    });
  }

  it('the recipes use the API the routing table names, not a subtracted cylinder', () => {
    const body = (id: string) => snippets.find((s) => s.id === id)!.body;
    expect(body('threaded-hole-tap-drill')).toMatch(/thread:\s*\{\s*pitch/);
    expect(body('heat-set-insert-pilot')).toMatch(/\.holes?\(/);
    expect(body('hex-nut-trap-bolt-clearance')).toMatch(/\.cutout\(/);
    expect(body('involute-spur-gear-pair')).toContain('spurGear(');
    expect(body('sheet-metal-l-bracket-bend')).toMatch(/sheetMetal\([\s\S]*\.bend\(/);
    expect(body('fdm-fit-clearance-by-fit-type')).toMatch(/dfmSpec\(\{[\s\S]*process: 'fdm'/);
    for (const id of ['clearance-hole-through-plate', 'enclosure-lid-with-screw-bosses']) {
      expect(body(id)).toMatch(/\.holes?\(/);
      expect(body(id)).not.toMatch(/subtract\(\s*cylinder/);
    }
  });
});
