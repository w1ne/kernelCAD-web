// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// `runAndExport({ format: 'gcode' })` coverage: the bed-size gate runs
// before the slicer is invoked (no process spawn on an oversized part),
// and the slicer-unavailable path fails closed with a diagnostic (never a
// placeholder gcode file). Real end-to-end slicing (when a slicer CLI is
// actually installed) is covered by the example under `examples/`.
import { describe, it, expect, beforeAll } from 'vitest';
import { runAndExport } from '../../../../../src/agent/script-runtime/export';
import { detectSlicer } from '../../../../../src/kernel/export/gcode/slicerCli';

beforeAll(async () => {
  const { initOcct } = await import('../../../../../src/kernel/backends/occt/occtBackend');
  await initOcct();
}, 60000);

describe('gcode export — bed-size gate', () => {
  it('fails closed with export.gcode.exceeds-bed for a part larger than the printer bed, without invoking the slicer', async () => {
    const result = await runAndExport({
      code: 'return box(300, 300, 300);',
      fileName: 'big.kcad.ts',
      format: 'gcode',
    });
    expect(result.bytes.length).toBe(0);
    const diag = result.diagnostics.find(d => d.code === 'export.gcode.exceeds-bed');
    expect(diag).toBeDefined();
    expect(diag?.severity).toBe('error');
    expect(diag?.message).toMatch(/exceeds the 'generic-fdm' bed/);
  }, 30000);

  it('bed-gates in the dfmSpec FDM build orientation, not as modeled', async () => {
    // 260 x 20 x 10 lying down exceeds the 220 mm bed in x; standing on its
    // end ('+x' up, .rotateY(-90)) it is 10 x 20 x 260 and exceeds the 250 mm
    // build height instead — the gate reports the placed extents.
    const asModeled = await runAndExport({
      code: 'return box(260, 20, 10);',
      fileName: 'long.kcad.ts',
      format: 'gcode',
    });
    expect(asModeled.diagnostics.find(d => d.code === 'export.gcode.exceeds-bed')?.message)
      .toMatch(/260\.0x20\.0x10\.0mm exceeds/);

    const standing = await runAndExport({
      code: "dfmSpec({ process: 'fdm', buildDirection: '+x' });\nreturn box(260, 20, 10);",
      fileName: 'long-standing.kcad.ts',
      format: 'gcode',
    });
    expect(standing.bytes.length).toBe(0);
    expect(standing.diagnostics.find(d => d.code === 'export.gcode.exceeds-bed')?.message)
      .toMatch(/10\.0x20\.0x260\.0mm in its dfmSpec build orientation \(\.rotateY\(-90\)\) exceeds/);
  }, 60000);

  it.skipIf(detectSlicer() === undefined)('slices in the dfmSpec FDM build orientation (real slicer)', async () => {
    const slice = (header: string) => runAndExport({
      code: `${header}\nreturn box(60, 20, 10);`,
      fileName: 'oriented.kcad.ts',
      format: 'gcode',
    });
    const flat = await slice('');
    const standing = await slice("dfmSpec({ process: 'fdm', buildDirection: '+x' });");
    expect(flat.gcodeStats?.maxZMm).toBeCloseTo(10, 0);
    expect(standing.gcodeStats?.maxZMm).toBeCloseTo(60, 0);
  }, 180000);

  it('passes the bed-size gate for a part within bounds (only fails downstream if no slicer is installed)', async () => {
    const result = await runAndExport({
      code: 'return box(20, 20, 20);',
      fileName: 'small.kcad.ts',
      format: 'gcode',
    });
    const exceedsBed = result.diagnostics.find(d => d.code === 'export.gcode.exceeds-bed');
    expect(exceedsBed).toBeUndefined();
    if (detectSlicer() === undefined) {
      const unavailable = result.diagnostics.find(d => d.code === 'export.gcode.slicer-unavailable');
      expect(unavailable).toBeDefined();
      expect(result.bytes.length).toBe(0);
    } else {
      expect(result.bytes.length).toBeGreaterThan(0);
      expect(result.gcodeStats?.layerCount).toBeGreaterThan(0);
    }
  }, 60000);
});
