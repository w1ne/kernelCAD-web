import { describe, it, expect } from 'vitest';
import { buildModel } from '../../../src/modeling/buildModel';

describe('buildModel root shape (script return value)', () => {
  it('rootShape follows the returned shape, not the last-created record', async () => {
    const model = await buildModel({
      code: `
        const main = box(10, 10, 10, true);
        const decoy = box(1, 1, 1, true).translate(100, 100, 100);
        return main;
      `,
      fileName: 'root-shape.kcad.ts',
    });
    expect(model.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(model.rootId).toBeDefined();
    expect(model.rootId).not.toBe(model.tailId);
    const bb = model.rootShape!.boundingBox();
    expect(bb.min[0]).toBeCloseTo(-5, 3);
    expect(bb.max[0]).toBeCloseTo(5, 3);
    // The trap this fix closes: the tail is the decoy.
    const tailBb = model.tailShape!.boundingBox();
    expect(tailBb.max[0]).toBeGreaterThan(50);
  });

  it('falls back to the tail when the script returns nothing lowerable', async () => {
    const model = await buildModel({ code: 'box(2, 2, 2, true);', fileName: 'no-return.kcad.ts' });
    expect(model.rootId).toBe(model.tailId);
    expect(model.rootShape).toBe(model.tailShape);
  });

  it('resolves a returned Scene to its solvedAssembly record', async () => {
    const model = await buildModel({
      code: `
        const asm = assembly('a');
        const p = asm.part('body', box(10, 10, 10, true));
        p.connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
        const scene = asm.solvedModel({});
        const decoy = box(1, 1, 1, true).translate(200, 200, 200);
        return scene;
      `,
      fileName: 'scene-root.kcad.ts',
    });
    expect(model.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(model.rootId).not.toBe(model.tailId);   // tail is the decoy
    expect(model.rootShape).toBeDefined();
  });
});
