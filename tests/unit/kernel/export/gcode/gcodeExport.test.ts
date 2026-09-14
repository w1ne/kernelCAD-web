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
