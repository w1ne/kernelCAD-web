import { describe, it, expect, beforeAll } from 'vitest';
import { runScript } from '../../../src/modeling/runtime/runScript';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

describe('runScript', () => {
  beforeAll(async () => { await initOcct(); });

  it('runs a script and returns captured features', async () => {
    const code = `
      const w = param('width', 10, { min: 1, max: 100 });
      const b = box(w, 20, 30);
      return b;
    `;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    expect(result.records).toHaveLength(1);
    expect(result.records[0].kind).toBe('box');
    // x is now a symbolic Param (paramRef='width'), evaluated populated
    // by the dispatcher pre-resolve — but capture-time evaluated holds 0
    // (placeholder) since pre-resolve runs only at lower time.
    expect(result.records[0].params.x.paramRef).toBe('width');
    expect(result.paramTable.list().map(e => e.name)).toContain('width');
  });

  it('captures multi-feature scripts in order', async () => {
    const code = `
      const a = box(10, 10, 10);
      const b = cylinder(10, 5).translate(5, 5, 0);
      return a.subtract(b);
    `;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    expect(result.records).toHaveLength(3);
    expect(result.records.map(r => r.kind)).toEqual(['box', 'cylinder', 'boolean']);
  });
});
