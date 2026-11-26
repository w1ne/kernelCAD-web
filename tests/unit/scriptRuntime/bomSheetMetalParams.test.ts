// tests/unit/scriptRuntime/bomSheetMetalParams.test.ts
//
// #1789 follow-up: the reported reproducer also checks a param override
// (default 80, overridden to 110). Studio applies an edit by rewriting the
// source and re-running the script, so this exercises the same path via
// `updateModelParams` and confirms the BOM measures the edited flat blank.
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildModel } from '../../../src/composition/buildModel';
import { updateModelParams } from '../../../src/modeling/paramUpdate';
import { computeBom } from '../../../src/agent/script-runtime/bom';
import type { Assembly } from '../../../src/modeling/capture/assembly';

const PARAMETRIC_BRACKET = `
  const w = param('width', 80, { min: 40, max: 140 });
  const p = path().moveTo(0, 0).lineTo(w, 0).lineTo(w, 30).lineTo(0, 30).close();
  const blank = sheetMetal(p, { thickness: 2, kFactor: 0.38 }).bend({ atX: w - 22 }, -90, 3);
  const arm = assembly('sm-repro');
  arm.part('bracket', blank, { material: 'mild-steel' });
  return arm.model();
`;

describe('computeBom sheet-metal params (#1789)', () => {
  beforeAll(async () => {
    await initOcct();
  }, 60000);

  it('measures the overridden width after updateModelParams rewrites the source', async () => {
    const model = await buildModel({ code: PARAMETRIC_BRACKET, fileName: 'sm-repro.kcad.ts' });
    const { model: updated } = await updateModelParams(model, [{ name: 'width', value: 110 }]);

    const assemblies = updated.session.assemblies as Map<string, Assembly>;
    const arm = assemblies.values().next().value;
    expect(arm).toBeDefined();
    const bom = await computeBom(arm!, updated.session);

    const row = bom.rows.find((candidate) => candidate.name === 'bracket');
    expect(row).toBeDefined();
    expect(row!.bboxMm.max[0] - row!.bboxMm.min[0]).toBeCloseTo(110, 3);
    expect(row!.bboxMm.max[1] - row!.bboxMm.min[1]).toBeCloseTo(30, 3);
    expect(row!.bboxMm.max[2] - row!.bboxMm.min[2]).toBeCloseTo(2, 3);
  }, 120000);
});
