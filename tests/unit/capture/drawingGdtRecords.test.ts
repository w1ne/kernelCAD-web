// tests/unit/capture/drawingGdtRecords.test.ts
//
// `shape.datum()` / `shape.tolerance()` capture: virtual records bound to the
// shape they were declared on, eager validation (feature.invalid-args), and
// the upstream-binding rule the drawing exporter uses to collect them.
import { describe, it, expect } from 'vitest';
import { runScript } from '../../../src/modeling/runtime/runScript';
import { collectDrawingDeclarations } from '../../../src/modeling/runtime/drawingDeclarations';

async function capture(code: string) {
  return runScript({ code, fileName: 'gdt.kcad.ts' });
}

async function captureError(code: string): Promise<{ code?: string; message: string }> {
  try {
    await capture(code);
  } catch (e) {
    return e as { code?: string; message: string };
  }
  throw new Error('expected capture to throw');
}

describe('shape.datum / shape.tolerance capture', () => {
  it('registers virtual records on the declaring shape and returns the same shape', async () => {
    const run = await capture(`
      const plate = box(80, 50, 10);
      const same = plate
        .datum('A', { atZ: 0 })
        .tolerance({ type: 'flatness', value: 0.05, face: { atZ: 0 } });
      if (same !== plate) throw new Error('datum/tolerance must return the same shape');
      return plate;
    `);
    const datum = run.records.find(r => r.kind === 'drawingDatum')!;
    const tol = run.records.find(r => r.kind === 'drawingTolerance')!;
    expect(datum.metadata).toEqual({ virtual: true, label: 'A', face: { atZ: 0 } });
    expect(tol.metadata).toEqual({ virtual: true, type: 'flatness', value: 0.05, face: { atZ: 0 }, datums: [] });
    const plateId = run.records.find(r => r.kind === 'box')!.id;
    expect(datum.inputs.shape).toEqual({ kind: 'feature', id: plateId });
  });

  it.each([
    [`box(1, 1, 1).datum('a', { atZ: 0 })`, "label must be one or two capital letters"],
    [`box(1, 1, 1).datum('I', { atZ: 0 })`, "label must be one or two capital letters"],
    [`box(1, 1, 1).datum('A', 'top')`, 'face must be a FaceQuery object'],
    [`const b = box(1, 1, 1).datum('A', { atZ: 0 }); b.datum('A', { atZ: 1 })`, "'A' is already declared"],
    [`box(1, 1, 1).tolerance({ type: 'roundness', value: 0.1, face: { atZ: 0 } })`, 'type must be one of'],
    [`box(1, 1, 1).tolerance({ type: 'position', value: 0, edge: { atZ: 0 } })`, 'value must be a positive finite number'],
    [`box(1, 1, 1).tolerance({ type: 'position', value: 0.1 })`, 'exactly one of the two is required'],
    [`box(1, 1, 1).tolerance({ type: 'position', value: 0.1, face: { atZ: 0 }, edge: { atZ: 0 } })`, 'exactly one of the two is required'],
    [`box(1, 1, 1).tolerance({ type: 'flatness', value: 0.1, face: { atZ: 0 }, datums: ['A'] })`, 'must be empty for flatness'],
    [`box(1, 1, 1).tolerance({ type: 'position', value: 0.1, face: { atZ: 0 }, datums: ['A', 'A'] })`, 'must not repeat a letter'],
    [`box(1, 1, 1).tolerance({ type: 'position', value: 0.1, face: { atZ: 0 }, modifier: 'L' })`, 'modifier must be one of'],
  ])('rejects %s with feature.invalid-args', async (body, fragment) => {
    const err = await captureError(`${body}; return box(1, 1, 1);`);
    expect(err.code).toBe('feature.invalid-args');
    expect(err.message).toContain(fragment);
  });

  it('collects declarations bound to the exported shape or anything upstream of it, not unrelated bodies', async () => {
    const run = await capture(`
      let plate = box(80, 50, 10).datum('A', { atZ: 0 });
      plate = plate.subtract(cylinder(12, 3).translate(40, 25, -1));
      plate.tolerance({ type: 'position', value: 0.05, modifier: '⌀', edge: { ofCurveType: 'CIRCLE', near: [40, 25, 10] }, datums: ['A'] });
      const other = box(5, 5, 5).datum('B', { atZ: 0 });
      return plate;
    `);
    const target = (run.returnValue as { id: string }).id;
    const decl = collectDrawingDeclarations(run.records, target);
    expect(decl.datums).toEqual([{ label: 'A', face: { atZ: 0 } }]);
    expect(decl.tolerances).toEqual([{
      type: 'position', value: 0.05, modifier: '⌀',
      edge: { ofCurveType: 'CIRCLE', near: [40, 25, 10] }, datums: ['A'],
    }]);
  });
});
