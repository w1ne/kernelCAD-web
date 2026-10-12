import { describe, expect, it } from 'vitest';
import { buildModel, buildModelFromFile, updateModelParams } from '../../../src/modeling/buildModel';
import type { OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';

describe('buildModel', () => {
  it.each(['union', 'subtract', 'intersect'])('%s with no cutters owns its transformed backend independently', async (op) => {
    let model = await buildModel({
      fileName: 'independent-motion.kcad.ts',
      code: `
        const shift = param('shift', 0, { min: 0, max: 10 });
        const base = box(10, 10, 10, true);
        return base.${op}().translate(shift, 0, 0);
      `,
    });
    expect(model.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    const base = model.session.cachedShapes.get(model.records[0].id) as OcctBackend;
    const originalBounds = base.boundingBox();
    expect(originalBounds.min[0]).toBeCloseTo(-5);
    expect(model.tailShape).not.toBe(base);
    for (const value of [10, 0, 5]) {
      const update = await updateModelParams(model, [{ name: 'shift', value }]);
      model = update.model;
      expect(update.result.skipped).toContain(model.records[0].id);
      expect(model.session.cachedShapes.get(model.records[0].id)).toBe(base);
      expect(base.boundingBox()).toEqual(originalBounds);
      const moved = model.tailShape as OcctBackend;
      expect(moved.boundingBox().min[0]).toBeCloseTo(value - 5);
      expect(moved.volume()).toBeCloseTo(1000);
      expect(model.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    }
  });

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

  it('surfaces file read failures from buildModelFromFile', async () => {
    await expect(buildModelFromFile({ file: '/tmp/kernelcad-missing-file.kcad.ts' }))
      .rejects.toThrow();
  });

  it('returns recompute diagnostics when lowering fails', async () => {
    const model = await buildModel({
      fileName: 'bad.kcad.ts',
      code: `
        const plate = box(10, 10, 2);
        const bad = plate.fillet(9999);
        return bad;
      `,
    });

    expect(model.records.length).toBeGreaterThan(0);
    expect(model.diagnostics.some(d => d.severity === 'error')).toBe(true);
    expect(model.tailShape).toBeUndefined();
  });

  it('captures build warnings on the returned model and session', async () => {
    const model = await buildModel({
      fileName: 'warning.kcad.ts',
      code: `
        const addCablePort = param('addCablePort', false);
        const profile = path()
          .moveTo(-4, -2)
          .lineTo(4, -2)
          .lineTo(4, 2)
          .lineTo(-4, 2)
          .close();
        const plate = box(40, 20, 4);
        const port = plate.cutout(profile, {
          face: 'front',
          depth: 'through',
          enabled: addCablePort,
          name: 'cablePort',
        });
        const rounded = port.fillet(0.5, { face: 'cablePort.wall' });
        return rounded;
      `,
    });

    expect(model.warnings.some(w => w.hint === 'face-ref.skipped-by-param')).toBe(true);
    expect(model.session.warnings.some(w => w.hint === 'face-ref.skipped-by-param')).toBe(true);
  });

  it('updates params through the headless boundary and preserves relower metadata', async () => {
    const model = await buildModel({
      fileName: 'edit.kcad.ts',
      code: `
        const w = param('w', 20);
        const plate = box(w, 10, 2);
        const rounded = plate.fillet(0.5);
        return rounded;
      `,
    });

    const updated = await updateModelParams(model, [{ name: 'w', value: 30 }]);

    expect(updated.model.session).toBe(model.session);
    expect(updated.result.shape).toBe(updated.model.tailShape);
    expect(updated.result.relowered.length).toBeGreaterThan(0);
    expect(updated.model.session.paramTable.get('w').value).toBe(30);
  });
});
