// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../kernel/backends/occt/occtBackend';
import { runAndExport } from './export';

beforeAll(async () => { await initOcct(); });

describe('single-shape STEP validity', () => {
  it('exports a valid box without validity diagnostics', async () => {
    const result = await runAndExport({
      fileName: 'valid-box.kcad.ts',
      format: 'step',
      code: 'return box(10, 10, 10);',
    });

    expect(result.bytes.byteLength).toBeGreaterThan(0);
    expect(result.diagnostics.map(d => d.code)).not.toContain('export.mesh.not-watertight');
    expect(result.diagnostics.map(d => d.code)).not.toContain('export.brep.invalid');
  });

  it('reports a face-sharing compound while retaining STEP bytes', async () => {
    const result = await runAndExport({
      fileName: 'touching-compound.kcad.ts',
      format: 'step',
      code: `
        const arm = assembly('touching-compound');
        arm.part('left', box(10, 10, 10));
        arm.part('right', box(10, 10, 10).translate(10, 0, 0));
        return arm.model().toCompound();
      `,
    });

    expect(result.bytes.byteLength).toBeGreaterThan(0);
    expect(result.diagnostics.map(d => d.code)).toContain('export.mesh.not-watertight');
  });

  it('skips validity diagnostics when verification is disabled', async () => {
    const result = await runAndExport({
      fileName: 'touching-compound-no-verify.kcad.ts',
      format: 'step',
      options: { format: 'step', verify: false },
      code: `
        const arm = assembly('touching-compound');
        arm.part('left', box(10, 10, 10));
        arm.part('right', box(10, 10, 10).translate(10, 0, 0));
        return arm.model().toCompound();
      `,
    });

    expect(result.bytes.byteLength).toBeGreaterThan(0);
    expect(result.diagnostics.map(d => d.code)).not.toContain('export.mesh.not-watertight');
    expect(result.diagnostics.map(d => d.code)).not.toContain('export.brep.invalid');
  });
});
