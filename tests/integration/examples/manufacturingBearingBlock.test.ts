// SPDX-License-Identifier: MIT
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';

describe('machined bearing block', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);
  it('has a through clearance bore and a shallow bearing seat plus four mounting holes', async () => {
    const result = await evaluateScriptTool({ file: 'examples/manufacturing-showcase/bearing-block.kcad.ts', skipMechanismCheck: true });
    expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
    expect(result.sceneSummary?.size[0]).toBeCloseTo(80, 4);
    expect(result.sceneSummary?.size[1]).toBeCloseTo(50, 4);
    expect(result.sceneSummary?.size[2]).toBeCloseTo(18, 4);
    // Exact 7 mm counterbore depth; the boolean tool may overshoot outside
    // the top face but must not extend the floor into the finished part.
    const depth = 7;
    const expected = 80*50*18 - Math.PI * (4.25**2 * (18 - depth) + 11**2 * depth + 4 * 2.75**2 * 18);
    expect(result.sceneSummary?.volume).toBeCloseTo(expected, 1);
  }, 120_000);
});
