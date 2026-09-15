// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Pins the FDM printability example so it cannot rot. `examples/print-prep/`
// ships a wall hook that fails the check as modeled and its oriented twin
// that passes; the numbers and the recommended rotation quoted in the file
// headers must match what `kernelcad dfm` really prints.

import { describe, it, expect, beforeAll } from 'vitest';
import { join, resolve } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { dfmScript } from '../../../src/agent/cli/commands/dfm';

const EXAMPLE_DIR = join(resolve(__dirname, '../../..'), 'examples/print-prep');

beforeAll(async () => { await initOcct(); }, 60000);

describe('examples/print-prep — wall hook', () => {
  it('fails as modeled on the arm overhang and recommends lying it on its side', async () => {
    const r = await dfmScript({ file: join(EXAMPLE_DIR, 'wall-hook.kcad.ts') });
    expect(r.exitCode).toBe(1);
    expect(r.diagnostics.map(d => d.code)).toEqual(['dfm.fdm.overhang-unsupported', 'dfm.fdm.tip-risk']);
    const overhang = r.diagnostics[0];
    expect(overhang.message).toContain('938.2 mm² of unsupported overhang in 1 region(s)');
    expect(overhang.message).toContain('@kc[fillet_1/face/bottom]');
    expect(overhang.hint).toContain(
      "Rotate -90° about Y (.rotateY(-90), or dfmSpec buildDirection: '+x'): unsupported area drops from 938.2 to 0.0 mm².",
    );
    expect(r.summary).toBe(
      "DFM: 1 parts, 0 clearance pairs, 0 wall clusters, 0 voids, fdm[shape] '+z' up 938.2 mm² unsupported " +
        "(best '+x' 0.0 mm²) — FAIL",
    );
  }, 120000);

  it('passes in the recommended orientation', async () => {
    const r = await dfmScript({ file: join(EXAMPLE_DIR, 'wall-hook-on-side.kcad.ts') });
    expect(r.exitCode).toBe(0);
    expect(r.diagnostics).toEqual([]);
    expect(r.report?.fdm?.[0].result.orientation.sizeMm.z).toBeCloseTo(24, 6);
    expect(r.summary).toBe(
      "DFM: 1 parts, 0 clearance pairs, 0 wall clusters, 0 voids, fdm[shape] '+x' up 0.0 mm² unsupported " +
        "(best '+x' 0.0 mm²) — PASS",
    );
  }, 120000);
});
