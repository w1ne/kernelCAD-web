// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { runScript } from '../runtime/runScript';
import { collectDrawingDeclarations } from '../runtime/drawingDeclarations';

async function records(code: string) {
  return runScript({ code, fileName: 'dim.kcad.ts' });
}

describe('shape.dimension()', () => {
  it('captures a virtual drawingDimension record bound to the shape', async () => {
    const run = await records(`
      const plate = box(40, 20, 10).dimension({ kind: 'linear', from: [0,0,0], to: [40,0,0], label: 'L' });
      return plate;`);
    const dims = run.records.filter(r => r.kind === 'drawingDimension');
    expect(dims).toHaveLength(1);
    expect(dims[0]!.metadata).toMatchObject({ virtual: true, kind: 'linear', label: 'L' });
  });

  it('reaches the declarations of a downstream body', async () => {
    const run = await records(`
      const plate = box(40, 20, 10).dimension({ kind: 'diameter', edge: { ofCurveType: 'CIRCLE' } });
      return plate.subtract(cylinder(2.5, 20).translate(10, 10, -5));`);
    const target = (run.returnValue as { id: string }).id;
    const dims = collectDrawingDeclarations(run.records, target).dimensions;
    expect(dims).toHaveLength(1);
    expect(dims[0]).not.toHaveProperty('virtual');
  });

  it.each([
    [`{ kind: 'linear', from: [0,0,0] }`, 'to'],
    [`{ kind: 'diameter' }`, 'edge'],
    [`{ kind: 'volume', edge: {} }`, 'kind'],
    [`{ kind: 'linear', from: [0,0], to: [1,1,1] }`, 'from'],
  ])('rejects %s at capture (field %s)', async (spec, field) => {
    await expect(records(`return box(1,1,1).dimension(${spec});`))
      .rejects.toThrow(new RegExp(`dimension: ${field}`));
  });
});
