// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/script-runtime/exportDetachedMaterial.test.ts
//
// The export seam is what the CADGenBench gate reads. A subtract that severs
// material leaves a watertight STEP whose solids all pass BRepCheck, so the
// only way the edit is refused is the detached-material guard here. Pin that
// it stays fatal and that an ordinary pocket is untouched.
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../kernel/backends/occt/occtBackend';
import { runAndExport } from './export';

beforeAll(async () => { await initOcct(); });

describe('export detached-material guard', () => {
  it('refuses a subtract that left a piece of material floating', async () => {
    const result = await runAndExport({
      fileName: 'detached.kcad.ts',
      format: 'step',
      code: `
        const bar = box(10, 10, 40);
        return bar.subtract(box(30, 30, 5).translate(0, 0, 17.5));
      `,
    });

    const diagnostic = result.diagnostics.find((d) => d.code === 'feature.boolean.detached-material');
    expect(diagnostic?.severity).toBe('error');
    expect(diagnostic?.message).toMatch(/2 separate solids/);
    expect(result.bytes.length).toBe(0);
  });

  it('exports a pocket that removes material without severing the body', async () => {
    const result = await runAndExport({
      fileName: 'pocket.kcad.ts',
      format: 'step',
      code: `return box(20, 20, 20).subtract(cylinder(10, 3).translate(0, 0, 15));`,
    });

    expect(result.diagnostics.map((d) => d.code)).not.toContain('feature.boolean.detached-material');
    expect(result.bytes.length).toBeGreaterThan(0);
  });
});
