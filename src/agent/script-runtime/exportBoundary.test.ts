// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { EXPORT_FORMATS, runAndExport, type ExportFormat } from './export';

describe('foundation export boundary', () => {
  it('rejects removed formats before model evaluation', async () => {
    expect(EXPORT_FORMATS).toContain('step');
    expect(EXPORT_FORMATS).toContain('stl');
    expect(EXPORT_FORMATS).toContain('bom-json');
    expect(EXPORT_FORMATS).not.toContain('order-pack');
    await expect(runAndExport({ fileName: 'boundary.kcad.ts', code: 'throw new Error("must not evaluate")', format: 'order-pack' as ExportFormat }))
      .rejects.toThrow('Unsupported export format: order-pack');
  });
});
