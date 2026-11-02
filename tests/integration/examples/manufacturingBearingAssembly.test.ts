// SPDX-License-Identifier: MIT
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';
import { reviewCadTool } from '../../../src/agent/mcp/tools/reviewCad';

describe('mounted bearing and shaft', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);
  it('builds the housing, bearing, retainer and shaft as separate parts', async () => {
    const result = await evaluateScriptTool({ file: 'examples/manufacturing-showcase/bearing-shaft-assembly.kcad.ts', skipMechanismCheck: true });
    expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
    expect(result.parts?.count).toBe(4);
    expect(result.parts?.names).toEqual(expect.arrayContaining(['housing', 'bearing', 'retainer', 'shaft']));
  }, 120_000);
  it('reviews the limited shaft rotation without interference or mechanical errors', async () => {
    const result = await reviewCadTool({
      file: 'examples/manufacturing-showcase/bearing-shaft-assembly.kcad.ts',
      includeInterference: true, includePoseEnvelope: true,
    });
    expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
    expect(result.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
  }, 120_000);
});
