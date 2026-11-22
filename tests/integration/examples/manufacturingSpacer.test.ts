// SPDX-License-Identifier: MIT
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';

describe('turned shoulder spacer', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);
  it('has a continuous 8.5 mm bore and a 3 mm thick shoulder', async () => {
    const result = await evaluateScriptTool({ file: 'examples/manufacturing-showcase/shoulder-spacer.kcad.ts', skipMechanismCheck: true });
    expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
    expect(result.sceneSummary?.size[0]).toBeCloseTo(30, 3);
    expect(result.sceneSummary?.size[1]).toBeCloseTo(30, 3);
    expect(result.sceneSummary?.size[2]).toBeCloseTo(25, 3);
    const expected = Math.PI * (15**2 * 3 + 10**2 * 22 - 4.25**2 * 25);
    expect(result.sceneSummary?.volume).toBeCloseTo(expected, 1);
  }, 120_000);
});
