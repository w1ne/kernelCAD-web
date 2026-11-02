// SPDX-License-Identifier: MIT
import { readFile } from 'node:fs/promises';
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { flattenPatternTool } from '../../../src/agent/mcp/tools/flattenPattern';

describe('bent mounting bracket', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);
  it('unfolds with four mounting holes and a single bend line', async () => {
    const code = await readFile('examples/manufacturing-showcase/bent-mounting-bracket.kcad.ts', 'utf8');
    const result = await flattenPatternTool({ code });
    expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
    expect(result.region?.holes).toHaveLength(4);
    expect(result.region?.bendLines).toHaveLength(1);
    const centres: string[] = [];
    for (const loop of result.region!.holes) {
      const x = loop.map(p => p[0]);
      const y = loop.map(p => p[1]);
      expect(Math.max(...x) - Math.min(...x)).toBeCloseTo(5.5, 1);
      expect(Math.max(...y) - Math.min(...y)).toBeCloseTo(5.5, 1);
      centres.push(`${Math.round((Math.max(...x) + Math.min(...x)) / 2)},${Math.round((Math.max(...y) + Math.min(...y)) / 2)}`);
    }
    expect(centres.sort()).toEqual(['20,13', '20,37', '85,13', '85,37'].sort());
  }, 120_000);
});
