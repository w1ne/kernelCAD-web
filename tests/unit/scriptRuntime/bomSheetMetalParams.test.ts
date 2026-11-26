// tests/unit/scriptRuntime/bomSheetMetalParams.test.ts
//
// #1789 follow-up: the reported reproducer also checks a param override
// (default 80, overridden to 110). Studio applies an edit by rewriting the
// source and re-running the script, so this exercises the same path via
// `updateModelParams` and confirms the BOM measures the edited flat blank.
// Both sides are measured: the declared default keeps ParamRefs in the raw
// records, while the rewrite inlines 110, so a raw-record BOM reports a
// zero-width blank for the first and a stale 80 mm blank for the second.
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildModel } from '../../../src/composition/buildModel';
import { updateModelParams } from '../../../src/modeling/paramUpdate';
import { computeBom } from '../../../src/agent/script-runtime/bom';
import type { Assembly } from '../../../src/modeling/capture/assembly';
import type { BuiltModel } from '../../../src/modeling/buildModel';

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

  async function blankSizeMm(model: BuiltModel): Promise<[number, number, number]> {
    const assemblies = model.session.assemblies as Map<string, Assembly>;
    const arm = assemblies.values().next().value;
    expect(arm).toBeDefined();
    const bom = await computeBom(arm!, model.session);
    const row = bom.rows.find((candidate) => candidate.name === 'bracket');
    expect(row).toBeDefined();
    return row!.bboxMm.max.map((max, axis) => max - row!.bboxMm.min[axis]) as [number, number, number];
  }

  it('measures the overridden width after updateModelParams rewrites the source', async () => {
    // Control: the same source with its declared default must measure 80 mm,
    // so the 110 mm assertion below cannot pass on a stale or unapplied edit.
    const model = await buildModel({ code: PARAMETRIC_BRACKET, fileName: 'sm-repro.kcad.ts' });
    const [defaultX, defaultY, defaultZ] = await blankSizeMm(model);
    expect(defaultX).toBeCloseTo(80, 3);
    expect(defaultY).toBeCloseTo(30, 3);
    expect(defaultZ).toBeCloseTo(2, 3);

    const { model: updated } = await updateModelParams(model, [{ name: 'width', value: 110 }]);

    const [editedX, editedY, editedZ] = await blankSizeMm(updated);
    expect(editedX).toBeCloseTo(110, 3);
    expect(editedY).toBeCloseTo(30, 3);
    expect(editedZ).toBeCloseTo(2, 3);
  }, 120000);
});
