// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { expect, it } from 'vitest';
import { buildModel, updateModelParams } from '../../../src/modeling/buildModel';
import { STARTERS, studioStarterCode } from '../../../src/studio/start/starterModels';
for (const starter of STARTERS) {
  it(`${starter.name} builds and resizes through Studio's kernel`, async () => {
    const model = await buildModel({ fileName: `${starter.id}.kcad.ts`, code: studioStarterCode(starter) });
    expect(model.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(model.tailShape).toBeDefined();
    const updated = await updateModelParams(model, [{ name: 'width', value: 120 }]);
    expect(updated.model.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    const bounds = updated.model.tailShape!.boundingBox();
    expect(bounds.max[0] - bounds.min[0]).toBeCloseTo(120, 3);
  });
}
