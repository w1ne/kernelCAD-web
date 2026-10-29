// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/script-runtime/exportUnionIntegrity.test.ts
//
// `evaluate` has always gated every `union()` (union.disconnected /
// union.member-overlap). `export` is also a scored seam — the CADGenBench
// harness reads its diagnostics — and used to skip the guard, so a fuse that
// left its operands as separate solids exported a watertight STEP and was
// accepted even though the edit never fused. This test pins the guard onto
// the export path.
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../kernel/backends/occt/occtBackend';
import { runAndExport } from './export';

beforeAll(async () => { await initOcct(); });

describe('export union integrity', () => {
  it('flags a union whose operands never fused', async () => {
    const result = await runAndExport({
      fileName: 'floating-union.kcad.ts',
      format: 'step',
      code: `
        const base = box(20, 20, 10);
        const tab = box(10, 10, 10).translate(40, 0, 0);
        return base.union(tab);
      `,
    });

    const codes = result.diagnostics.map((d) => d.code);
    expect(codes).toContain('union.disconnected');
    expect(result.diagnostics.find((d) => d.code === 'union.disconnected')?.severity).not.toBe('info');
  });

  it('does not flag a union that fused into one body', async () => {
    const result = await runAndExport({
      fileName: 'overlapping-union.kcad.ts',
      format: 'step',
      code: `
        const base = box(20, 20, 10);
        const tab = box(10, 10, 10).translate(15, 0, 0);
        return base.union(tab);
      `,
    });

    expect(result.diagnostics.map((d) => d.code)).not.toContain('union.disconnected');
  });
});
