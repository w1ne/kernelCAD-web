// SPDX-License-Identifier: MIT
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';
import { reviewCadTool } from '../../../src/agent/mcp/tools/reviewCad';
import { readFile } from 'node:fs/promises';

describe('printed electronics enclosure', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);
  it('builds a hollow base and separate fitted cover', async () => {
    const result = await evaluateScriptTool({ file: 'examples/manufacturing-showcase/electronics-enclosure.kcad.ts', skipMechanismCheck: true });
    expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
    expect(result.parts?.count).toBe(2);
    expect(result.sceneSummary?.size[0]).toBeCloseTo(100, 3);
    expect(result.sceneSummary?.size[1]).toBeCloseTo(70, 3);
    expect(result.sceneSummary?.volume).toBeLessThan(100 * 70 * 37.5 / 2);
    // The locating lip contributes material inside the box without changing
    // the outer envelope. A plain lid without the lip is below this bound.
    expect(result.sceneSummary?.volume).toBeGreaterThan(72_000);
  }, 120_000);
  it('keeps PCB posts clear of lid bosses at the combined minimum footprint and maximum wall', async () => {
    const code = (await readFile('examples/manufacturing-showcase/electronics-enclosure.kcad.ts', 'utf8'))
      .replace("param('length', 100", "param('length', 80")
      .replace("param('width', 70", "param('width', 60")
      .replace("param('height', 35", "param('height', 20")
      .replace("param('wall', 2.5", "param('wall', 5");
    expect(code).toContain("param('length', 80, { min: 80");
    expect(code).toContain("param('width', 60, { min: 60");
    const result = await evaluateScriptTool({ code, skipMechanismCheck: true });
    expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
    expect(result.sceneSummary?.size[0]).toBeCloseTo(80, 3);
    expect(result.sceneSummary?.size[1]).toBeCloseTo(60, 3);
    const review = await reviewCadTool({ code, includeInterference: true });
    expect(review.ok, JSON.stringify(review.diagnostics)).toBe(true);
    if (review.ok) expect(review.rawInterferencePairs).toEqual([]);
  }, 120_000);
});
