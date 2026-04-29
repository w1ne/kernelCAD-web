import { describe, it, expect, beforeAll } from 'vitest';
import { runScript } from '../../../src/script-runtime/runScript';
import { initOcct } from '../../../src/backends/occt/occtBackend';

describe('runScript', () => {
  beforeAll(async () => { await initOcct(); });

  it('runs a script and returns captured features', async () => {
    const code = `
      const w = param('Width', 10, { unit: 'mm' });
      const b = box(w, 20, 30);
      return b;
    `;
    const result = await runScript({ code, fileName: 'test.kcad.ts' });
    expect(result.records).toHaveLength(1);
    expect(result.records[0].kind).toBe('box');
    expect(result.records[0].params.x.evaluated).toBe(10);
    expect(result.params.list()).toContain('Width');
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
