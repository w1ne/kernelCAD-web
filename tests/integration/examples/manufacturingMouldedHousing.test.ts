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
    const moulding = report?.moulding?.[0].result;
    expect(moulding).toBeDefined();
    expect(moulding!.verdict).toBe('pass');
    expect(moulding!.undercut.areaMm2).toBe(0);
    expect(moulding!.draft.checkedFaces).toBeGreaterThan(0);
    expect(moulding!.draft.minDraftDeg).toBeGreaterThanOrEqual(moulding!.settings.minDraftDeg);
    expect(Number.isFinite(moulding!.walls.thinnestMm)).toBe(true);
    expect(moulding!.walls.thinnestMm).toBeGreaterThanOrEqual(moulding!.settings.minWallMm);
    expect(moulding!.walls.violations).toEqual([]);
    expect(moulding!.unmeasured.some(item => /draft|wall thickness/i.test(item))).toBe(false);
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
    expect(result.params.find(param => param.name === 'length')).toMatchObject({ min: 70, max: 120 });
    expect(result.params.find(param => param.name === 'width')).toMatchObject({ min: 45, max: 90 });
    expect(result.params.find(param => param.name === 'height')).toMatchObject({ min: 20, max: 40 });
    expect(result.params.find(param => param.name === 'wall')).toMatchObject({ min: 2, max: 2.5 });
  }, 120_000);

  it('sizes the cored board-screw pilots as an editable interface', async () => {
    const code = await readFile('examples/manufacturing-showcase/moulded-housing.kcad.ts', 'utf8');
    const params = await paramsListTool({ file: 'examples/manufacturing-showcase/moulded-housing.kcad.ts' });
    expect(params.params.find(param => param.name === 'boardScrewPilotDia')).toMatchObject({ min: 2, max: 2.2 });

    const volumes: number[] = [];
    for (const diameter of [2, 2.2]) {
      const candidate = code.replace("param('boardScrewPilotDia', 2.1", `param('boardScrewPilotDia', ${diameter}`);
      const result = await evaluateScriptTool({ code: candidate, skipMechanismCheck: true });
      expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
      volumes.push(result.sceneSummary!.volume);
    }
    expect(volumes[1]).toBeLessThan(volumes[0]!);
  }, 120_000);

  it('adds measurable drafted structural rib stock to the housing', async () => {
    const code = await readFile('examples/manufacturing-showcase/moulded-housing.kcad.ts', 'utf8');
    const start = code.indexOf('// BEGIN STRUCTURAL RIBS');
    const end = code.indexOf('// END STRUCTURAL RIBS');
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const withoutRibs = code.slice(0, start) + code.slice(end + '// END STRUCTURAL RIBS'.length);

    const [ribbed, plain] = await Promise.all([
      evaluateScriptTool({ code, skipMechanismCheck: true }),
      evaluateScriptTool({ code: withoutRibs, skipMechanismCheck: true }),
    ]);
    expect(ribbed.ok, JSON.stringify(ribbed.diagnostics)).toBe(true);
    expect(plain.ok, JSON.stringify(plain.diagnostics)).toBe(true);
    expect(ribbed.sceneSummary?.volume).toBeGreaterThan(plain.sceneSummary!.volume + 500);
  }, 120_000);
  it('passes the molding DFM gate at the combined minimum and maximum parameters', async () => {
    const code = await readFile('examples/manufacturing-showcase/moulded-housing.kcad.ts', 'utf8');
    const variants = [
      { draftDeg: 1, length: 70, width: 45, height: 20, wall: 2 },
      { draftDeg: 5, length: 120, width: 90, height: 40, wall: 2.5 },
    ];
    for (const variant of variants) {
      const candidate = code
        .replace("param('draftDeg', 1.5", `param('draftDeg', ${variant.draftDeg}`)
        .replace("param('length', 80", `param('length', ${variant.length}`)
        .replace("param('width', 50", `param('width', ${variant.width}`)
        .replace("param('height', 25", `param('height', ${variant.height}`)
        .replace("param('wall', 2", `param('wall', ${variant.wall}`);
      const model = await buildModel({ fileName: `moulded-housing-${variant.draftDeg}.kcad.ts`, code: candidate });
      expect(model.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
      const report = await runDfmChecksOnModel(model);
      expect(report?.moulding?.[0].result.verdict, JSON.stringify({
        variant,
        diagnostics: report?.diagnostics.map(diagnostic => ({ code: diagnostic.code, message: diagnostic.message })),
      })).toBe('pass');
    }
  }, 180_000);

  it('changes wall stock while preserving the drafted outer envelope', async () => {
    const code = await readFile('examples/manufacturing-showcase/moulded-housing.kcad.ts', 'utf8');
    const volumes: number[] = [];
    for (const wall of [2, 2.5]) {
      const candidate = code.replace("param('wall', 2", `param('wall', ${wall}`);
      const result = await evaluateScriptTool({ code: candidate, skipMechanismCheck: true });
      expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
      expect(result.sceneSummary?.size[0]).toBeCloseTo(81.309, 2);
      expect(result.sceneSummary?.size[1]).toBeCloseTo(51.309, 2);
      volumes.push(result.sceneSummary!.volume);
    }
    expect(volumes[1]).toBeGreaterThan(volumes[0]!);
  }, 120_000);
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
