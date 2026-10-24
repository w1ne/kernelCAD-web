// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Integration (real OCCT): a selector that an edit re-binds to a different
// face is reported, not silently applied; one whose face only resized is not.
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../kernel/backends/occt/occtBackend';
import { buildModel, rebuildModelIncremental } from './buildModel';
import { evaluateScriptTool } from '../agent/mcp/tools/evaluateScript';
import { setParamValueTool } from '../agent/mcp/tools/setParamValue';
import { evaluateAndBuildScript } from './scriptEvaluation';
import { updateModelParams } from '../modeling/paramUpdate';

beforeAll(async () => { await initOcct(); }, 60_000);

// A plate with a boss whose width follows the plate. The selector asks for an
// up-facing face of 700..900 mm^2. At w=30 that is the plate's top (800); at
// w=50 the plate top has grown to 1200 and the boss top (800) is the match.
const script = (w: number) => `
const w = param('w', ${w}, { min: 20, max: 60 });
const plate = box(w, 40, 6);
const boss = box(w.subtract(10), 20, 10).translate(5, 10, 6);
return plate.union(boss).fillet(1, { face: { byNormal: 'Z', minArea: 700, maxArea: 900 } });
`;

const bindingCodes = (diagnostics: ReadonlyArray<{ code: string }>) =>
  diagnostics.map((d) => d.code).filter((c) => c.startsWith('selector.'));

describe('selector binding drift (set_param path)', () => {
  it('reports selector.binding-changed when widening the plate moves the fillet target to another face', async () => {
    const model = await buildModel({ code: script(30), fileName: 'drift.kcad.ts' });
    expect(model.selections).toHaveLength(1);
    expect(model.selections[0]!.fingerprints[0]).toMatchObject({ entityKind: 'face', geomType: 'PLANE', producer: 'box_1' });

    const { model: wide } = await updateModelParams(model, [{ name: 'w', value: 50 }]);
    const changed = wide.diagnostics.filter((d) => d.code === 'selector.binding-changed');
    expect(changed).toHaveLength(1);
    expect(changed[0]).toMatchObject({ severity: 'warn', featureId: 'fillet_1' });
    expect(changed[0]!.message).toContain('box_1');
    expect(changed[0]!.message).toContain('box_2');
    expect(wide.selections[0]!.fingerprints[0]!.producer).toBe('box_2');
  }, 120_000);

  it('reports only selector.binding-moved when the edit merely resizes the bound face', async () => {
    const model = await buildModel({ code: script(30), fileName: 'drift.kcad.ts' });
    const { model: resized } = await updateModelParams(model, [{ name: 'w', value: 34 }]);
    expect(bindingCodes(resized.diagnostics)).toEqual(['selector.binding-moved']);
    const moved = resized.diagnostics.find((d) => d.code === 'selector.binding-moved')!;
    expect(moved.severity).toBe('info');
    expect(moved.message).toMatch(/area 800 -> 880/);
  }, 120_000);

  it('is silent when nothing the selector bound to changed', async () => {
    const model = await buildModel({ code: script(30), fileName: 'drift.kcad.ts' });
    const { model: same } = await updateModelParams(model, [{ name: 'w', value: 30 }]);
    expect(bindingCodes(same.diagnostics)).toEqual([]);
  }, 120_000);
});

describe('selector binding drift (re-evaluation with a baseline)', () => {
  it('exposes selections on the evaluation and compares a later one against them', async () => {
    const first = await evaluateAndBuildScript({ code: script(30) });
    expect(first.evaluation.selections).toHaveLength(1);
    expect(bindingCodes(first.evaluation.diagnostics)).toEqual([]);

    const second = await evaluateAndBuildScript({ code: script(50), baseline: first.evaluation.selections });
    expect(bindingCodes(second.evaluation.diagnostics)).toEqual(['selector.binding-changed']);
    expect(second.evaluation.exitCode).toBe(0);
  }, 120_000);

  it('ignores a baseline selection whose feature or selector text no longer exists', async () => {
    const first = await evaluateAndBuildScript({ code: script(30) });
    const edited = script(50).replace('maxArea: 900', 'maxArea: 950');
    const second = await evaluateAndBuildScript({ code: edited, baseline: first.evaluation.selections });
    expect(bindingCodes(second.evaluation.diagnostics)).toEqual([]);
  }, 120_000);
});

describe('selector binding drift (agent tools)', () => {
  it('rebuildModelIncremental compares a code edit against the previous build', async () => {
    const prev = await buildModel({ code: script(30), fileName: 'drift.kcad.ts' });
    const next = await rebuildModelIncremental(prev, { code: script(50), fileName: 'drift.kcad.ts' });
    expect(bindingCodes(next.diagnostics)).toEqual(['selector.binding-changed']);
  }, 120_000);

  it('set_param after an evaluate_script reports the re-bound selector', async () => {
    const first = await evaluateScriptTool({ code: script(30) });
    expect(first.selections).toHaveLength(1);
    const edited = await setParamValueTool({ code: script(30), param_name: 'w', new_value: 50 });
    expect(bindingCodes(edited.diagnostics ?? [])).toEqual(['selector.binding-changed']);
  }, 120_000);
});

describe('selector syntaxes report through one record', () => {
  it('records lineage, @kc ref and query selectors with their authored text', async () => {
    const code = `
const a = box(40, 30, 10).fillet(1, { face: 'top' });
const b = box(40, 30, 10).fillet(1, '@kc[box_2/face/top]');
const c = box(40, 30, 10).fillet(1, { face: { byNormal: 'Z' } });
return a;`;
    const model = await buildModel({ code, fileName: 'syntax.kcad.ts' });
    const bySyntax = Object.fromEntries(model.selections.map((s) => [s.syntax, s]));
    expect(Object.keys(bySyntax).sort()).toEqual(['lineage', 'query', 'topoRef']);
    expect(bySyntax.lineage!.selectorText).toBe('top');
    expect(bySyntax.topoRef!.selectorText).toBe('@kc[box_2/face/top]');
    expect(bySyntax.query!.selectorText).toBe('{"byNormal":"Z"}');
    for (const s of model.selections) {
      expect(s.fingerprints[0]).toMatchObject({ entityKind: 'face', geomType: 'PLANE', role: 'top' });
    }
  }, 120_000);
});
