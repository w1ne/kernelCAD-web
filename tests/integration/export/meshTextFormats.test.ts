import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runAndExport } from '../../../src/agent/script-runtime/export';

describe('standalone OBJ and USD mesh exports', () => {
  beforeAll(async () => { await initOcct(); });

  it('exports a box as a structured Wavefront OBJ mesh', async () => {
    const result = await runAndExport({ code: 'return box(10, 20, 30);', fileName: 'box.kcad.ts', format: 'obj' });
    const text = new TextDecoder().decode(result.bytes);
    expect(result.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(text).toMatch(/^# kernelCAD OBJ mesh export/);
    expect(text).toContain('o part');
    expect(text).toMatch(/^v 0 0 0$/m);
    expect(text).toMatch(/^f \d+ \d+ \d+$/m);
  });

  it('exports a box as ASCII USD mesh with declared units and topology', async () => {
    const result = await runAndExport({ code: 'return box(10, 20, 30);', fileName: 'box.kcad.ts', format: 'usd' });
    const text = new TextDecoder().decode(result.bytes);
    expect(result.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(text).toMatch(/^#usda 1\.0/);
    expect(text).toContain('metersPerUnit = 0.001');
    expect(text).toContain('upAxis = "Z"');
    expect(text).toContain('def Mesh "part"');
    expect(text).toContain('int[] faceVertexCounts = [');
    expect(text).toContain('int[] faceVertexIndices = [');
  });

  it('preserves assembly part names and world-space positions in OBJ and USD', async () => {
    const code = `return assembly()
  .part('left', box(2, 2, 2))
  .part('right', box(2, 2, 2), { at: [8, 0, 0] })
  .model();`;
    const obj = new TextDecoder().decode((await runAndExport({ code, fileName: 'assembly.kcad.ts', format: 'obj' })).bytes);
    const usd = new TextDecoder().decode((await runAndExport({ code, fileName: 'assembly.kcad.ts', format: 'usd' })).bytes);
    expect(obj).toContain('o left');
    expect(obj).toContain('o right');
    expect(usd).toContain('def Mesh "left"');
    expect(usd).toContain('def Mesh "right"');
    expect(usd).toContain('(8, 0, 0)');
  });
});
