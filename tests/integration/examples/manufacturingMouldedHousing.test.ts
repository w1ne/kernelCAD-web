// SPDX-License-Identifier: MIT
import { readFile } from 'node:fs/promises';
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildModel } from '../../../src/modeling/buildModel';
import { runDfmChecksOnModel } from '../../../src/modeling/runtime/dfm/runDfmChecks';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';

describe('moulded housing base', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);
  it('checks the actual housing for draft, wall thickness and undercuts', async () => {
    const code = await readFile('examples/manufacturing-showcase/moulded-housing.kcad.ts', 'utf8');
    const model = await buildModel({ fileName: 'moulded-housing.kcad.ts', code });
    expect(model.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    const report = await runDfmChecksOnModel(model);
    expect(report?.moulding?.[0].result.verdict).toBe('pass');
    expect(report?.moulding?.[0].result.undercut.areaMm2).toBe(0);
    expect(report?.moulding?.[0].result.draft.minDraftDeg).toBeGreaterThanOrEqual(1);
  }, 120_000);
  it('includes cored mounting posts in addition to the moulded shell', async () => {
    const result = await evaluateScriptTool({ file: 'examples/manufacturing-showcase/moulded-housing.kcad.ts', skipMechanismCheck: true });
    expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
    expect(result.sceneSummary?.volume).toBeGreaterThan(20_500);
    expect(result.sceneSummary?.size[0]).toBeCloseTo(81.309, 2);
    expect(result.sceneSummary?.size[1]).toBeCloseTo(51.309, 2);
    expect(result.sceneSummary?.size[2]).toBeCloseTo(25, 2);
  }, 120_000);
});
