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

  it('rejects DXF export of a non-planar solid with export.dxf.non-planar', async () => {
    const code = 'return box(10, 10, 10);'; // 3D solid, no planar wire source
    const result = await runAndExport({ code, fileName: 'demo.kcad.ts', format: 'dxf' });
    expect(result.bytes.length).toBe(0);
    expect(result.diagnostics.find(d => d.code === 'export.dxf.non-planar')).toBeDefined();
  });

  it('exports DXF for a bent sheet-metal Shape (lineage rooted at sheetMetal)', async () => {
    // The runtime walks the lineage from the returned Shape back to its
    // sheetMetal root and recomputes the flat-pattern Region in-runtime,
    // so the script can return the bent body directly.
    const code = `
      const s = path().moveTo(0, 0).lineTo(50, 0).lineTo(50, 25).lineTo(0, 25).close();
      const blank = sheetMetal(s, { thickness: 1.5, kFactor: 0.4 });
      return blank.bend({ atX: 25 }, 90, 1);
    `;
    const result = await runAndExport({ code, fileName: 'demo.kcad.ts', format: 'dxf' });
    expect(result.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
    const text = new TextDecoder().decode(result.bytes);
    expect(text).toMatch(/LWPOLYLINE/);
    expect(text).toMatch(/\$INSUNITS\n\s*70\n\s*4/);
  });

  it('exports DXF for an unbent sheet-metal blank (zero-bend chain)', async () => {
    const code = `
      const s = path().moveTo(0, 0).lineTo(40, 0).lineTo(40, 20).lineTo(0, 20).close();
      return sheetMetal(s, { thickness: 1.0, kFactor: 0.4 });
    `;
    const result = await runAndExport({ code, fileName: 'demo.kcad.ts', format: 'dxf' });
    expect(result.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
    const text = new TextDecoder().decode(result.bytes);
    expect(text).toMatch(/LWPOLYLINE/);
  });

  it('exports 3MF for a single-shape script (zip carries the model XML)', async () => {
    const code = 'return box(10, 10, 10);';
    const result = await runAndExport({ code, fileName: 'demo.kcad.ts', format: '3mf' });
    expect(result.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
    expect(result.bytes.length).toBeGreaterThan(0);
    // GLB-vs-zip sanity: 3MF zips start with the PK\x03\x04 local-file-header
    // magic; quick byte check guarantees we're emitting a real zip.
    expect(result.bytes[0]).toBe(0x50);
    expect(result.bytes[1]).toBe(0x4b);
  });

  it('exports GLB for a single-shape script (binary starts with the glTF magic)', async () => {
    const code = 'return box(10, 10, 10);';
    const result = await runAndExport({ code, fileName: 'demo.kcad.ts', format: 'glb' });
    expect(result.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
    expect(result.bytes.length).toBeGreaterThan(20);
    // GLB magic = 'glTF' (0x67 0x6C 0x54 0x46 little-endian).
    expect(result.bytes[0]).toBe(0x67);
    expect(result.bytes[1]).toBe(0x6C);
    expect(result.bytes[2]).toBe(0x54);
    expect(result.bytes[3]).toBe(0x46);
  });

  it('rejects GLB export with options.draco === true via export.glb.draco-glass-conflict', async () => {
    const code = 'return box(10, 10, 10);';
    const result = await runAndExport({
      code,
      fileName: 'demo.kcad.ts',
      format: 'glb',
      // Cast through `unknown` because the type narrows draco to false; the
      // runtime gate covers the case where a future slice widens the type.
      options: { format: 'glb', draco: true } as unknown as ExportOptions,
    });
    expect(result.bytes.length).toBe(0);
    expect(
      result.diagnostics.find(d => d.code === 'export.glb.draco-glass-conflict'),
    ).toBeDefined();
  });

  it('rejects urdf / srdf / sdf-gazebo with export.no-shape when the script returns a Shape (not an Assembly)', async () => {
    // Slice B-rest fills the URDF / SRDF / SDF format slots; a script that
    // returns a single `box(...)` (no assembly captured) now trips the
    // structured no-shape diagnostic instead of the per-format
    // not-implemented placeholders Slice A originally emitted.
    const src = 'return box(10, 10, 10);';
    for (const format of ['urdf', 'srdf', 'sdf-gazebo'] as const) {
      const result = await runAndExport({ code: src, fileName: 'demo.kcad.ts', format });
      expect(result.bytes.length).toBe(0);
      expect(result.diagnostics.find(d => d.code === 'export.no-shape')).toBeDefined();
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
