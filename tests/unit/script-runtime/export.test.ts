import { describe, it, expect, beforeAll } from 'vitest';
import { runAndExport } from '../../../src/script-runtime/export';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

describe('runAndExport', () => {
  beforeAll(async () => { await initOcct(); });

  it('exports STL for the demo script', async () => {
    const code = `
      const base = box(20, 20, 20);
      const hole = cylinder(20, 5).translate(10, 10, 0);
      return base.subtract(hole);
    `;
    const result = await runAndExport({ code, fileName: 'demo.kcad.ts', format: 'stl' });
    expect(result.bytes.length).toBeGreaterThan(84);
    expect(result.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
  });

  it('exports STEP for the demo script', async () => {
    const code = `
      const base = box(10, 10, 10);
      return base;
    `;
    const result = await runAndExport({ code, fileName: 'demo.kcad.ts', format: 'step' });
    const text = new TextDecoder().decode(result.bytes);
    expect(text).toContain('ISO-10303');
    expect(result.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
  });
});
