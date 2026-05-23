import { describe, it, expect, beforeAll } from 'vitest';
import { runAndExport, type ExportOptions } from '../../../src/agent/script-runtime/export';
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

  it('rejects dxf format in Slice A skeleton with the not-implemented diagnostic', async () => {
    const code = 'return box(10, 10, 10);';
    const result = await runAndExport({ code, fileName: 'demo.kcad.ts', format: 'dxf' });
    expect(result.bytes.length).toBe(0);
    expect(result.diagnostics.find(d => d.code === 'export.dxf.not-implemented')).toBeDefined();
  });

  it('rejects 3mf format in Slice A skeleton with the not-implemented diagnostic', async () => {
    const code = 'return box(10, 10, 10);';
    const result = await runAndExport({ code, fileName: 'demo.kcad.ts', format: '3mf' });
    expect(result.bytes.length).toBe(0);
    expect(result.diagnostics.find(d => d.code === 'export.3mf.not-implemented')).toBeDefined();
  });

  it('rejects glb format in Slice A skeleton with the not-implemented diagnostic', async () => {
    const code = 'return box(10, 10, 10);';
    const result = await runAndExport({ code, fileName: 'demo.kcad.ts', format: 'glb' });
    expect(result.bytes.length).toBe(0);
    expect(result.diagnostics.find(d => d.code === 'export.glb.not-implemented')).toBeDefined();
  });

  it('rejects urdf / srdf / sdf-gazebo in Slice A with the per-format not-implemented diagnostic', async () => {
    const src = 'return box(10, 10, 10);';
    for (const format of ['urdf', 'srdf', 'sdf-gazebo'] as const) {
      const result = await runAndExport({ code: src, fileName: 'demo.kcad.ts', format });
      expect(result.bytes.length).toBe(0);
      const diagCode = `export.${format}.not-implemented` as const;
      expect(result.diagnostics.find(d => d.code === diagCode)).toBeDefined();
    }
  });

  it('fires export.options-format-mismatch when options.format does not match top-level format', async () => {
    const code = 'return box(10, 10, 10);';
    const result = await runAndExport({
      code,
      fileName: 'demo.kcad.ts',
      format: 'stl',
      options: { format: 'glb' } as unknown as ExportOptions,
    });
    expect(result.diagnostics.find(d => d.code === 'export.options-format-mismatch')).toBeDefined();
  });
});
