// tests/integration/export/exportFiltersVirtual.test.ts
//
// Slice A Task 11 regression: STL/STEP exporters route through the script's
// `return` value (or the last lowered record), so a leading referenceImage()
// must not leak triangles into the output. The capture path marks the record
// with `metadata.virtual = true` and the OCCT lowerer's `referenceImage` arm
// returns no backend, so the box silently wins.

import { describe, it, expect, beforeAll } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

// 16-byte PNG header: 8-byte magic + a placeholder chunk. Enough to satisfy
// captureSession's existsSync + extension check; imageDimensions silently
// returns (0, 0) when the IHDR can't be parsed (no diagnostic).
const PNG_HEADER = Buffer.from(
  '89504e470d0a1a0a' + // PNG magic
  '0000000d49484452', // 13-byte chunk length + 'IHDR'
  'hex',
);

describe('export filters virtual records', () => {
  beforeAll(async () => { await initOcct(); });

  it('STL of `referenceImage; return box(...)` contains only the box (12 triangles)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'kcad-export-virtual-stl-'));
    writeFileSync(join(dir, 'ref.png'), PNG_HEADER);
    const code = `
      referenceImage('./ref.png', { plane: 'xz' });
      return box(10, 10, 10);
    `;
    const r = await runAndExport({
      code,
      fileName: join(dir, 'script.kcad.ts'),
      format: 'stl',
      scriptDir: dir,
    });
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(r.bytes.length).toBeGreaterThan(84); // > STL header
    // Binary STL: header is 80 bytes, triangle count at offset 80 (uint32 LE).
    // A box has 6 faces × 2 triangles = 12. If the referenceImage plane leaked
    // into the export, the count would be 14 (12 + 2 plane triangles).
    const triangleCount = Buffer.from(r.bytes.buffer, r.bytes.byteOffset, r.bytes.byteLength).readUInt32LE(80);
    expect(triangleCount).toBe(12);
  });

  it('STEP of `referenceImage; return box(...)` produces a valid ISO-10303 file', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'kcad-export-virtual-step-'));
    writeFileSync(join(dir, 'ref.png'), PNG_HEADER);
    const code = `
      referenceImage('./ref.png', { plane: 'xy' });
      return box(20, 20, 20);
    `;
    const r = await runAndExport({
      code,
      fileName: join(dir, 'script.kcad.ts'),
      format: 'step',
      scriptDir: dir,
    });
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const text = new TextDecoder().decode(r.bytes);
    expect(text).toContain('ISO-10303');
    // STEP entity-naming convention: no `referenceImage_` ids should appear.
    expect(text).not.toMatch(/referenceImage/i);
  });

  it('exporting a virtual record directly via feature_id surfaces an error diagnostic', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'kcad-export-virtual-id-'));
    writeFileSync(join(dir, 'ref.png'), PNG_HEADER);
    const code = `
      referenceImage('./ref.png', { plane: 'xy' });
      return box(10, 10, 10);
    `;
    // Captured ids are kind-prefixed (`referenceImage_1`, `box_1`, ...).
    // Pointing the exporter directly at the virtual record must fail rather
    // than emit an empty STL silently.
    const r = await runAndExport({
      code,
      fileName: join(dir, 'script.kcad.ts'),
      format: 'stl',
      feature_id: 'referenceImage_1',
      scriptDir: dir,
    });
    expect(r.bytes.length).toBe(0);
    expect(r.diagnostics.some((d) => d.severity === 'error')).toBe(true);
    expect(r.diagnostics.some((d) => d.code === 'export.virtual-record')).toBe(true);
  });
});
