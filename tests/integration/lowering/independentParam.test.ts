// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { buildModel, updateModelParams } from '../../../src/modeling/buildModel';
import { measureParamResponses } from '../../../src/modeling/paramMeasure';

describe('param edit skips an independent solid', () => {
  it('re-lowers the body and leaves the knob cached', async () => {
    const model = await buildModel({
      fileName: 'independent.kcad.ts',
      code: `
        const width = param('width', 10, { min: 1, max: 40 });
        param('unused', 1, { min: 0, max: 5 });
        const body = box(width, 10, 10);
        const knob = box(4, 4, 4);
        return [body, knob];
      `,
    });
    const boxes = model.records.filter((record) => record.kind === 'box');
    expect(boxes.length).toBeGreaterThanOrEqual(2);
    const body = boxes.find((record) => (record.metadata as { paramRefs?: string[] } | undefined)?.paramRefs?.includes('width'));
    const knob = boxes.find((record) => record !== body);
    expect(body).toBeDefined();
    expect(knob).toBeDefined();

    const updated = await updateModelParams(model, [{ name: 'width', value: 20 }]);
    expect(updated.result.relowered).toContain(body!.id);
    expect(updated.result.skipped).toContain(knob!.id);
    expect(model.session.paramTable.get('width').value).toBe(20);

    const restored = await updateModelParams(updated.model, [{ name: 'width', value: 10 }]);
    const responses = await measureParamResponses(restored.model);
    expect(responses.width).toBe('local');
    expect(responses.unused).toBe('heavy');
    expect(restored.model.session.paramTable.get('width').value).toBe(10);
  }, 120_000);
});
