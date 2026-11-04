// SPDX-License-Identifier: MIT
import { readFile } from 'node:fs/promises';
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildModel } from '../../../src/modeling/buildModel';
import { runDfmChecksOnModel } from '../../../src/modeling/runtime/dfm/runDfmChecks';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';
import { paramsListTool } from '../../../src/agent/mcp/tools/paramsList';

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
  it('offers only draft values inside the declared molding DFM range', async () => {
    const result = await paramsListTool({ file: 'examples/manufacturing-showcase/moulded-housing.kcad.ts' });
    const draft = result.params.find(param => param.name === 'draftDeg');
    expect(draft).toMatchObject({ min: 1, max: 5 });
    expect(result.params.find(param => param.name === 'width')).toMatchObject({ min: 70, max: 120 });
    expect(result.params.find(param => param.name === 'height')).toMatchObject({ min: 20, max: 40 });
  }, 120_000);
  it('passes the molding DFM gate at the combined minimum and maximum parameters', async () => {
    const code = await readFile('examples/manufacturing-showcase/moulded-housing.kcad.ts', 'utf8');
    const variants = [
      { draftDeg: 1, width: 70, height: 20 },
      { draftDeg: 5, width: 120, height: 40 },
    ];
    for (const variant of variants) {
      const candidate = code
        .replace("param('draftDeg', 1.5", `param('draftDeg', ${variant.draftDeg}`)
        .replace("param('width', 80", `param('width', ${variant.width}`)
        .replace("param('height', 25", `param('height', ${variant.height}`);
      const model = await buildModel({ fileName: `moulded-housing-${variant.draftDeg}.kcad.ts`, code: candidate });
      expect(model.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
      const report = await runDfmChecksOnModel(model);
      expect(report?.moulding?.[0].result.verdict).toBe('pass');
    }
  }, 180_000);
  it('rejects draft input below the declared minimum before geometry build', async () => {
    const code = await readFile('examples/manufacturing-showcase/moulded-housing.kcad.ts', 'utf8');
    const belowMinimum = code.replace("param('draftDeg', 1.5", "param('draftDeg', 0.5");
    await expect(buildModel({ fileName: 'moulded-housing-below-minimum.kcad.ts', code: belowMinimum }))
      .rejects.toThrow(/param\('draftDeg'\).*requires a number/);
  }, 120_000);
  it('detects an inward-drafted trapped core as a moulding undercut', async () => {
    const code = (await readFile('examples/manufacturing-showcase/moulded-housing.kcad.ts', 'utf8'))
      .replaceAll('draftDeg.negate()', 'draftDeg');
    const model = await buildModel({ fileName: 'moulded-housing-inward-core.kcad.ts', code });
    const report = await runDfmChecksOnModel(model);
    expect(report?.moulding?.[0].result.verdict).toBe('fail');
    expect(report?.moulding?.[0].result.undercut.areaMm2).toBeGreaterThan(0);
    expect(report?.diagnostics.some(diagnostic => diagnostic.code === 'dfm.moulding.undercut')).toBe(true);
  }, 120_000);
});
