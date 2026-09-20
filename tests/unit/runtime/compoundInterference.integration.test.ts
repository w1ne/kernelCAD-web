import { describe, it, expect, beforeAll } from 'vitest';
import { checkInterference } from '../../../src/agent/script-runtime/checkInterference';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

describe('compound interference (real OCCT)', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('reports scope compound for a disjoint two-solid union', async () => {
    const r = await checkInterference({
      code: `
        const a = box(10, 10, 10);
        const b = box(10, 10, 10).translate(20, 0, 0);
        return a.union(b);
      `,
      fileName: 'compound.kcad.ts',
    });
    expect(r.scope).toBe('compound');
    expect(r.partCount).toBe(2);
    expect(r.pairs).toHaveLength(0);
  });

  it('reports an overlapping pair inside a compound with real volumes', async () => {
    const r = await checkInterference({
      code: `
        const arm = assembly('t');
        arm.part('a', box(20, 20, 20), { at: [0, 0, 0] });
        arm.part('b', box(20, 20, 20).translate(10, 10, 10), { at: [0, 0, 0] });
        return arm.model().toCompound();
      `,
      fileName: 'overlap-compound.kcad.ts',
    });
    expect(r.scope).toBe('compound');
    expect(r.partCount).toBe(2);
    expect(r.pairs).toHaveLength(1);
    expect(r.pairs[0].a).toBe('solid[0]');
    expect(r.pairs[0].b).toBe('solid[1]');
    expect(r.pairs[0].volumeMm3).toBeCloseTo(1000, 0);
  });

  it('keeps scope none for a single solid', async () => {
    const r = await checkInterference({
      code: `return box(10, 10, 10);`,
      fileName: 'single.kcad.ts',
    });
    expect(r.scope).toBe('none');
    expect(r.partCount).toBe(0);
  });
});
