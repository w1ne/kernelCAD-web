// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, beforeAll } from 'vitest';
import { runScript } from '../../../src/modeling/runtime/runScript';
import { RecomputeEngine } from '../../../src/modeling/compute/recomputeEngine';
import { OcctLowerer } from '../../../src/modeling/backends/occt/occtLowerer';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { flattenPatternWithHoles } from '../../../src/modeling/sheetMetalFlatPattern';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';
import type { FeatureRecord } from '../../../src/shared/intent/featureRecord';
import type { ParamTable } from '../../../src/shared/runtime/paramTable';

const PROFILE = "path().moveTo(0, 0).lineTo(110, 0).lineTo(110, 60).lineTo(0, 60).close()";

async function capture(code: string) {
  return runScript({ code, fileName: 'sheet-metal-params.kcad.ts' });
}

async function lower(records: readonly FeatureRecord[], paramTable?: ParamTable) {
  const engine = new RecomputeEngine(new OcctLowerer());
  return engine.run(records, paramTable ? { paramTable } : undefined);
}

const errorCodes = (diagnostics: ReadonlyArray<{ code: string; severity: string }>) =>
  diagnostics.filter(d => d.severity === 'error').map(d => d.code);

// Issue #1763: a symbolic param() stores `evaluated: 0` at capture time, so
// validating `.evaluated` rejected every param-driven sheet-metal part.
describe('sheetMetal(profile, opts) accepts param() arguments', () => {
  it('accepts a param() thickness and keeps the symbolic reference', async () => {
    const { records } = await capture(`
      const profile = ${PROFILE};
      const t = param('Thick', 2, { unit: 'mm' });
      return sheetMetal(profile, { thickness: t, kFactor: 0.38 });
    `);
    const rec = records.find(r => r.kind === 'sheetMetal')!;
    expect(rec.params.thickness.paramRef).toBe('Thick');
    expect(rec.params.thickness.unit).toBe('mm');
  });

  it('accepts a param() kFactor', async () => {
    const { records } = await capture(`
      const profile = ${PROFILE};
      const k = param('KF', 0.38);
      return sheetMetal(profile, { thickness: 2, kFactor: k });
    `);
    const rec = records.find(r => r.kind === 'sheetMetal')!;
    expect(rec.params.kFactor.paramRef).toBe('KF');
  });

  it('rejects a thickness param() whose value is not positive', async () => {
    const run = capture(`
      const profile = ${PROFILE};
      const t = param('Thick', 0, { unit: 'mm' });
      return sheetMetal(profile, { thickness: t, kFactor: 0.38 });
    `);
    await expect(run).rejects.toMatchObject({
      code: 'feature.invalid-args',
      message: expect.stringContaining('opts.thickness'),
    });
  });

  it('rejects an out-of-range kFactor param() instead of validating 0', async () => {
    const run = capture(`
      const profile = ${PROFILE};
      const k = param('KF', 1.5);
      return sheetMetal(profile, { thickness: 2, kFactor: k });
    `);
    await expect(run).rejects.toMatchObject({ code: 'feature.sheetMetal.kfactor-invalid' });
  });

  it('validates the kFactor param() range against its resolved value, not the placeholder', async () => {
    const run = capture(`
      const profile = ${PROFILE};
      const k = param('KF', -0.1);
      return sheetMetal(profile, { thickness: 2, kFactor: k });
    `);
    await expect(run).rejects.toMatchObject({ code: 'feature.sheetMetal.kfactor-invalid' });
  });
});

describe('Shape.bend(edgeRef, angle, radius) accepts param() arguments', () => {
  it('accepts a param() inner radius', async () => {
    const { records } = await capture(`
      const profile = ${PROFILE};
      const r = param('BendR', 3, { unit: 'mm' });
      return sheetMetal(profile, { thickness: 2, kFactor: 0.38 }).bend({ atX: 55 }, 90, r);
    `);
    const bend = records.find(r => r.kind === 'sheetMetalBend')!;
    expect(bend.params.radius.paramRef).toBe('BendR');
  });

  it('accepts a param() bend angle', async () => {
    const { records } = await capture(`
      const profile = ${PROFILE};
      const a = param('BendA', 90, { unit: 'deg' });
      return sheetMetal(profile, { thickness: 2, kFactor: 0.38 }).bend({ atX: 55 }, a, 3);
    `);
    const bend = records.find(r => r.kind === 'sheetMetalBend')!;
    expect(bend.params.angle.paramRef).toBe('BendA');
  });

  it('rejects a bend radius param() whose value is not positive', async () => {
    const run = capture(`
      const profile = ${PROFILE};
      const r = param('BendR', 0, { unit: 'mm' });
      return sheetMetal(profile, { thickness: 2, kFactor: 0.38 }).bend({ atX: 55 }, 90, r);
    `);
    await expect(run).rejects.toMatchObject({
      code: 'feature.invalid-args',
      message: expect.stringContaining('radius'),
    });
  });

  it('carries a param() bend line into the record as a resolved coordinate', async () => {
    const { records } = await capture(`
      const profile = ${PROFILE};
      const x = param('BendX', 55, { unit: 'mm' });
      return sheetMetal(profile, { thickness: 2, kFactor: 0.38 }).bend({ atX: x }, 90, 3);
    `);
    const bend = records.find(r => r.kind === 'sheetMetalBend')!;
    const edges = bend.inputs.edges as { ref: { kind: string; query: { atX: { paramRef?: string; evaluated: number } } } };
    expect(edges.ref.kind).toBe('query');
    expect(edges.ref.query.atX.paramRef).toBe('BendX');
    // Seeded from the param table at capture, so a lowering run that does
    // not refresh params still sees the authored bend line.
    expect(edges.ref.query.atX.evaluated).toBe(55);
  });
});

describe('param-driven sheet-metal parts lower and re-validate', () => {
  beforeAll(async () => { await initOcct(); }, 120000);

  const NUMERIC = `
    const profile = ${PROFILE};
    return sheetMetal(profile, { thickness: 2, kFactor: 0.38 }).bend({ atX: 55 }, 90, 3);
  `;

  const PARAMETRIC = `
    const profile = ${PROFILE};
    const t = param('Thick', 2, { unit: 'mm' });
    const k = param('KF', 0.38);
    const r = param('BendR', 3, { unit: 'mm' });
    const a = param('BendA', 90, { unit: 'deg' });
    const x = param('BendX', 55, { unit: 'mm' });
    return sheetMetal(profile, { thickness: t, kFactor: k }).bend({ atX: x }, a, r);
  `;

  it('lowers to the same solid as the numeric-literal part', async () => {
    const numeric = await capture(NUMERIC);
    const numericRun = await lower(numeric.records);
    expect(errorCodes(numericRun.diagnostics)).toEqual([]);
    const baseline = numericRun.shapes.get(numeric.records[numeric.records.length - 1]!.id)!;
    const baselineVolume = baseline.volume();
    expect(baselineVolume).toBeGreaterThan(0);

    const parametric = await capture(PARAMETRIC);
    const parametricRun = await lower(parametric.records, parametric.session.paramTable);
    expect(errorCodes(parametricRun.diagnostics)).toEqual([]);
    const bent = parametricRun.shapes.get(parametric.records[parametric.records.length - 1]!.id)!;
    expect(bent.volume()).toBeCloseTo(baselineVolume, 6);
  }, 120000);

  it('follows a thickness slider on re-lower', async () => {
    const unbent = `
      const profile = path().moveTo(0, 0).lineTo(110, 0).lineTo(110, 60).lineTo(0, 60).close();
      const t = param('Thick', 2, { unit: 'mm' });
      return sheetMetal(profile, { thickness: t, kFactor: 0.38 });
    `;
    const run = await capture(unbent);
    const first = await lower(run.records, run.session.paramTable);
    expect(errorCodes(first.diagnostics)).toEqual([]);
    const id = run.records[run.records.length - 1]!.id;
    expect(first.shapes.get(id)!.volume()).toBeCloseTo(110 * 60 * 2, 6);

    run.session.paramTable.set('Thick', 3);
    const second = await lower(run.records, run.session.paramTable);
    expect(errorCodes(second.diagnostics)).toEqual([]);
    expect(second.shapes.get(id)!.volume()).toBeCloseTo(110 * 60 * 3, 6);
  }, 120000);

  it('rejects a thickness param() updated to zero with a named diagnostic', async () => {
    const run = await capture(`
      const profile = ${PROFILE};
      const t = param('Thick', 2, { unit: 'mm' });
      return sheetMetal(profile, { thickness: t, kFactor: 0.38 });
    `);
    run.session.paramTable.set('Thick', 0);
    const result = await lower(run.records, run.session.paramTable);
    const failure = result.diagnostics.find(d => d.severity === 'error');
    expect(failure?.code).toBe('feature.invalid-args');
    expect(failure?.message).toContain('opts.thickness');
  }, 120000);

  it('rejects a kFactor param() updated out of range with its own code', async () => {
    const run = await capture(`
      const profile = ${PROFILE};
      const k = param('KF', 0.38);
      return sheetMetal(profile, { thickness: 2, kFactor: k });
    `);
    run.session.paramTable.set('KF', 1.5);
    const result = await lower(run.records, run.session.paramTable);
    expect(errorCodes(result.diagnostics)).toContain('feature.sheetMetal.kfactor-invalid');
  }, 120000);

  it('rejects a bend radius param() updated to zero with a named diagnostic', async () => {
    const run = await capture(PARAMETRIC);
    run.session.paramTable.set('BendR', 0);
    const result = await lower(run.records, run.session.paramTable);
    const failure = result.diagnostics.find(d => d.severity === 'error');
    expect(failure?.code).toBe('feature.invalid-args');
    expect(failure?.message).toContain('radius');
  }, 120000);

  it('rejects a bend angle param() updated to a non-finite value', async () => {
    const run = await capture(PARAMETRIC);
    run.session.paramTable.set('BendA', Number.NaN);
    const result = await lower(run.records, run.session.paramTable);
    const failure = result.diagnostics.find(d => d.severity === 'error');
    expect(failure?.code).toBe('feature.invalid-args');
    expect(failure?.message).toContain('angle');
  }, 120000);

  it('moves the bend when the bend-line param() changes', async () => {
    const run = await capture(PARAMETRIC);
    const at55 = await lower(run.records, run.session.paramTable);
    expect(errorCodes(at55.diagnostics)).toEqual([]);
    const id = run.records[run.records.length - 1]!.id;
    const width55 = (() => { const bb = at55.shapes.get(id)!.boundingBox(); return bb.max[0] - bb.min[0]; })();

    run.session.paramTable.set('BendX', 20);
    const at20 = await lower(run.records, run.session.paramTable);
    expect(errorCodes(at20.diagnostics)).toEqual([]);
    const width20 = (() => { const bb = at20.shapes.get(id)!.boundingBox(); return bb.max[0] - bb.min[0]; })();
    expect(width20).not.toBeCloseTo(width55, 3);
  }, 120000);

  it('flattens a param-driven part with the bend line from the param', async () => {
    const run = await capture(PARAMETRIC);
    const lowered = await lower(run.records, run.session.paramTable);
    const region = await flattenPatternWithHoles(run.records, undefined, lowered.shapes, run.session.paramTable);
    expect(region.outer.length).toBeGreaterThan(2);
    expect(region.bendLines).toHaveLength(1);
    expect(region.bendLines[0]!.start[0]).toBeCloseTo(55, 6);
    expect(region.bendLines[0]!.radius).toBeCloseTo(3, 6);

    run.session.paramTable.set('BendX', 20);
    const moved = await lower(run.records, run.session.paramTable);
    const movedRegion = await flattenPatternWithHoles(run.records, undefined, moved.shapes, run.session.paramTable);
    expect(movedRegion.bendLines[0]!.start[0]).toBeCloseTo(20, 6);
  }, 120000);

  it('evaluates Shape.bend with param() for radius via evaluateScriptTool (#1818)', async () => {
    const build = (radiusMm: number) => `
      const thickness = param('thickness', 2.5, { min: 1.0, max: 5.0, step: 0.5 });
      const bendAngle = param('bendAngle', 90, { min: 30, max: 135, step: 5 });
      const bendRadius = param('bendRadius', ${radiusMm}, { min: 1.0, max: 6.0, step: 0.5 });
      const profile = path().moveTo(0, 0).lineTo(130, 0).lineTo(130, 84).lineTo(0, 84).close();
      const blank = sheetMetal(profile, { thickness, kFactor: 0.38 });
      return blank.bend({ atX: 50 }, bendAngle, bendRadius);
    `;
    const r3 = await evaluateScriptTool({ code: build(3.0) });
    expect(r3.ok).toBe(true);
    expect(r3.diagnostics.filter(d => d.severity === 'error')).toEqual([]);

    const r6 = await evaluateScriptTool({ code: build(6.0) });
    expect(r6.ok).toBe(true);
    expect(r6.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(r3.sceneSummary.size).not.toBeNull();
    expect(r6.sceneSummary.size).not.toBeNull();
    expect(r6.sceneSummary.size).not.toEqual(r3.sceneSummary.size);
  }, 120000);
});
