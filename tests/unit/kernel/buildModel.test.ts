import { describe, expect, it } from 'vitest';
import { buildModel } from '../../../src/kernel/buildModel';

describe('buildModel', () => {
  it('builds source into a session, records, shapes, tail shape, and cache', async () => {
    const model = await buildModel({
      fileName: 'plate.kcad.ts',
      code: `
        const w = param('w', 20);
        const plate = box(w, 10, 2);
        return plate;
      `,
    });

    expect(model.records.map(r => r.kind)).toEqual(['box']);
    expect(model.tailId).toBe(model.records.at(-1)?.id);
    expect(model.tailShape).toBeDefined();
    expect(model.shapes.get(model.tailId!)).toBe(model.tailShape);
    expect(model.session.cachedShapes.get(model.tailId!)).toBe(model.tailShape);
    expect(model.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
  });
});
