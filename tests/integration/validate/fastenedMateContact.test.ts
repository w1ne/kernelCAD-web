// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// A fastened mate whose two parts do not touch is a broken assembly on every
// surface, including the cheap ones. The DRAW-01 negative control (an ear nut
// fastened 2.5 mm above its lid) passed the default `kernelcad validate` while
// `restPoseMateGaps` caught it when called directly.

import { describe, expect, it } from 'vitest';
import { runValidateCli } from '../../../src/agent/cli/commands/validate';
import { reviewCadTool } from '../../../src/agent/mcp/tools/reviewCad';
import { probeAssemblies } from '../../../src/modeling/runtime/mechanismProbe';
import { buildModelFromFile } from '../../../src/modeling/buildModel';
import type { Assembly } from '../../../src/modeling/capture/assembly';

const GAP = 'tests/fixtures/mate-contact/fastened-gap.kcad.ts';
const FLUSH = 'tests/fixtures/mate-contact/fastened-flush.kcad.ts';
const NESTED = 'tests/fixtures/mate-contact/fastened-nested.kcad.ts';

function mateGapCodes(diags: ReadonlyArray<{ code?: string }> | undefined): string[] {
  return (diags ?? []).map((d) => d.code ?? '').filter((c) => c === 'mechanism.mate-gap');
}

async function validate(file: string, includeInterference: boolean) {
  return runValidateCli({ file, json: true, includeInterference, epsilon: 0.01, physical: false, includePhysics: false });
}

describe('fastened mate contact', () => {
  it('default validate fails a fastened mate with a 2.5 mm gap', async () => {
    const r = await validate(GAP, false);
    expect(r.exitCode).toBe(2);
    expect(r.mechanism).toBe('broken');
    expect(mateGapCodes(r.mechanismFailures)).toEqual(['mechanism.mate-gap']);
    expect(r.mechanismFailures?.[0]?.message).toContain('2.50 mm apart');
  }, 120_000);

  it('default validate passes a flush fastened mate', async () => {
    const r = await validate(FLUSH, false);
    expect(r.exitCode).toBe(0);
    expect(mateGapCodes(r.mechanismFailures)).toEqual([]);
  }, 120_000);

  it('a part buried in its mate counts as touching (no false gap)', async () => {
    const r = await validate(NESTED, false);
    expect(mateGapCodes(r.mechanismFailures)).toEqual([]);
  }, 120_000);

  it('full validate reports the gap once', async () => {
    const r = await validate(GAP, true);
    expect(r.exitCode).toBe(2);
    expect(mateGapCodes(r.mechanismFailures)).toEqual(['mechanism.mate-gap']);
  }, 120_000);

  it('cheap review_cad (no pose envelope) fails the gap and passes flush', async () => {
    const gap = await reviewCadTool({ file: GAP, includePoseEnvelope: false });
    expect(gap.ok).toBe(false);
    expect(gap.mechanism).toBe('broken');
    expect(mateGapCodes(gap.mechanismFailures)).toEqual(['mechanism.mate-gap']);
    const flush = await reviewCadTool({ file: FLUSH, includePoseEnvelope: false });
    expect(mateGapCodes(flush.mechanismFailures)).toEqual([]);
  }, 120_000);

  it('the evaluate mechanism probe fails the gap and passes flush', async () => {
    for (const [file, broken] of [[GAP, true], [FLUSH, false]] as const) {
      const model = await buildModelFromFile({ file });
      const probe = await probeAssemblies(Array.from(model.session.assemblies.values()) as Assembly[]);
      expect(probe.mechanism === 'broken').toBe(broken);
      expect(mateGapCodes(probe.failures)).toEqual(broken ? ['mechanism.mate-gap'] : []);
    }
  }, 120_000);
});
