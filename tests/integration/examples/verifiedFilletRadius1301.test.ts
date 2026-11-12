// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// A repair hint may call a fillet radius feasible only after the same-edge
// kernel probe has built it. The drafting-review mounting plate is the part:
// its clean corner fillet must stay quiet, and a seeded oversized fillet on
// those same vertical edges must not advertise half the edge length.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { whyDidThisFailTool } from '../../../src/agent/mcp/tools/whyDidThisFail';
import { evaluateAndBuildScript } from '../../../src/composition/scriptEvaluation';

const PLATE = 'examples/drafting-review/mounting-plate.kcad.ts';

function errorCodes(diagnostics: readonly { severity: string; code: string }[]): string[] {
  return diagnostics.filter(d => d.severity === 'error').map(d => d.code);
}

describe('verified repair radius on the drafting-review mounting plate', () => {
  it('labels a fillet radius feasible only when that radius builds on the same edges', async () => {
    const source = readFileSync(PLATE, 'utf8');
    const clean = await evaluateAndBuildScript({ file: PLATE });
    expect(clean.evaluation.exitCode).toBe(0);
    expect(clean.evaluation.featureHealth).toEqual([]);
    expect(clean.evaluation.diagnostics.filter(d =>
      d.code === 'feature.edge-feature.short-edges-skipped'
      || d.code === 'feature.kernel-failed'
      || d.severity === 'warn',
    )).toEqual([]);

    const seeded = source.replace('.fillet(6,', '.fillet(40,');
    expect(seeded).toContain(
      ".fillet(40, q.edge(q.createdBy(stock.id)).and(q.withLabel('corner')))"
    );
    const why = await whyDidThisFailTool({ code: seeded });
    expect(why.ok).toBe(true);
    expect(why.candidates?.[0]?.code).toBe('feature.edge-feature.short-edges-skipped');
    const labeled = why.candidates?.map(c => c.evidence.maxFeasibleValueMm);
    expect(labeled?.every(value => value === labeled[0])).toBe(true);
    const max = labeled?.[0];
    expect(typeof max).toBe('number');
    // Half of the 12 mm vertical edges is 6. That ceiling is not a build.
    expect(max).toBeGreaterThan(6);
    expect(max).toBeLessThan(40);

    const built = await evaluateAndBuildScript({
      code: `return box(100, 70, 12).fillet(${max}, { parallel: [0, 0, 1] });`,
    });
    expect(errorCodes(built.evaluation.diagnostics)).toEqual([]);
    expect(built.model?.rootShape).toBeDefined();

    const above = await evaluateAndBuildScript({
      code: `return box(100, 70, 12).fillet(${Number(max) + 1}, { parallel: [0, 0, 1] });`,
    });
    expect(errorCodes(above.evaluation.diagnostics).some(code =>
      code === 'feature.edge-feature.short-edges-skipped' || code === 'feature.kernel-failed',
    )).toBe(true);

    const retried = seeded.replace('.fillet(40,', `.fillet(${max},`);
    const again = await evaluateAndBuildScript({ code: retried });
    expect(errorCodes(again.evaluation.diagnostics)).not.toContain(
      'feature.edge-feature.short-edges-skipped',
    );
    expect(again.evaluation.exitCode).toBe(0);
    expect(again.evaluation.featureHealth).toEqual([]);
  }, 60_000);
});
