// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../kernel/backends/occt/occtBackend';
import { callMcpTool } from '../toolRegistry';
import { fitModelToScanTool } from './fitModelToScan';
import { loadScanReferenceTool } from './loadScanReference';

const XYZ = new URL('../../../../tests/fixtures/scan/opening.xyz', import.meta.url);

describe('scan reference MCP tools', () => {
  beforeAll(async () => {
    await initOcct();
  }, 60_000);

  it('refuses a missing scan file', async () => {
    const missing = await loadScanReferenceTool({ file: 'tests/fixtures/scan/does-not-exist.ply' });
    expect(missing.ok).toBe(false);
    expect(missing.solid).toBe(false);
    expect(missing.errorCode).toBe('cli.invalid-args');
    expect(missing.error).toMatch(/not found/);
    expect(missing.disclaimer).toMatch(/not a BREP/i);
  });

  it('loads fixture bytes through the registry and refuses both file and data', async () => {
    const loaded = await callMcpTool('load_scan_reference', {
      data: readFileSync(XYZ).toString('base64'),
    }) as { ok: boolean; format?: string; point_count?: number; solid?: boolean };
    expect(loaded).toMatchObject({ ok: true, format: 'xyz', point_count: 8, solid: false });

    const both = await loadScanReferenceTool({ file: 'a.ply', data: 'AAAA' });
    expect(both.ok).toBe(false);
    expect(both.error).toMatch(/not both/);
  });

  it('fits a box to an inline scan bbox and to the XYZ fixture', async () => {
    const inline = await fitModelToScanTool({
      code: 'return box(10, 20, 30);',
      scan_bbox: { min_mm: [0, 0, 0], max_mm: [12, 22, 32] },
      requirement: { min_clearance_mm: 1 },
    });
    expect(inline.ok, inline.ok ? '' : inline.error).toBe(true);
    if (!inline.ok) return;
    expect(inline.model_bbox.size_mm.map(value => Math.round(value))).toEqual([10, 20, 30]);
    expect(inline.clearance_mm).toEqual([2, 2, 2]);
    expect(inline.translate_mm).toEqual([1, 1, 1]);
    expect(inline.requirement).toEqual({ min_clearance_mm: 1, pass: true });
    expect(inline.disclaimer).toMatch(/not a BREP/i);

    const fromFile = await fitModelToScanTool({
      code: 'return box(10, 20, 30);',
      scan_file: fileURLToPath(XYZ),
    });
    expect(fromFile.ok, fromFile.ok ? '' : fromFile.error).toBe(true);
    if (!fromFile.ok) return;
    expect(fromFile.scan_format).toBe('xyz');
    expect(fromFile.scan_point_count).toBe(8);
    expect(fromFile.clearance_mm).toEqual([2, 2, 2]);
  });

  it('refuses a fit with no scan and a missing model file', async () => {
    const noScan = await fitModelToScanTool({ code: 'return box(1, 1, 1);' });
    expect(noScan.ok).toBe(false);
    if (noScan.ok) return;
    expect(noScan.error).toMatch(/scan_file/);

    const missingModel = await fitModelToScanTool({
      file: 'tests/fixtures/scan/missing-model.kcad.ts',
      scan_bbox: { min: [0, 0, 0], max: [2, 2, 2] },
    });
    expect(missingModel.ok).toBe(false);
    if (missingModel.ok) return;
    expect(missingModel.errorCode).toBe('cli.invalid-args');
    expect(missingModel.error.length).toBeGreaterThan(0);
  });
});
