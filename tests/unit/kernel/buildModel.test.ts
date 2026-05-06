import { describe, expect, it } from 'vitest';
import { buildModel, buildModelFromFile } from '../../../src/kernel/buildModel';

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
});
