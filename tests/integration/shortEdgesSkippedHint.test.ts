// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The partial-success `short-edges-skipped` warning must describe what the
// lowerer did. A 40 mm box and a separate 2 mm box take `fillet(3)` only on
// the large box: the kernel rejects the full selection, the 12 short edges
// are skipped and the 12 long ones are rounded. Before, the hint said the
// edges "got skipped so the rest could chamfer" on a fillet, and that the
// blend solver rejects every radius above half the edge length.

import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../src/modeling/runtime/runScript';
import { RecomputeEngine } from '../../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../src/modeling/backends/occt/occtLowerer';
import type { CompilerDiagnostic } from '../../src/shared/diagnostics/diagnostic';

async function diagnosticsOf(code: string): Promise<CompilerDiagnostic[]> {
  const run = await runScript({ code, fileName: 'short-edges.kcad.ts' });
  const engine = new RecomputeEngine(createOcctLowerer(run.session));
  const result = await engine.run(run.records, { paramTable: run.paramTable });
  return [...(result.diagnostics ?? [])];
}

beforeAll(async () => { await initOcct(); }, 120_000);

describe('short-edges-skipped partial-success hint', () => {
  for (const op of ['fillet', 'chamfer'] as const) {
    it(`${op}: says the full selection was rejected and the long edges were rounded`, async () => {
      const diags = await diagnosticsOf(
        `return box(40, 40, 10).union(box(2, 2, 2).translate(100, 0, 0)).${op}(3);`,
      );
      const warn = diags.find((d) => d.code === 'feature.edge-feature.short-edges-skipped');
      expect(warn?.severity).toBe('warn');
      expect(warn?.message).toContain('skipped 12 of 24 target edges');
      expect(warn?.hint).toContain('rejected the fillet/chamfer on the full selection');
      expect(warn?.hint).toContain('Edge length alone does not set the limit');
      expect(warn?.hint).not.toContain('so the rest could chamfer');
      expect(warn?.hint).not.toContain('half the target edge length');
    }, 120_000);
  }
});
