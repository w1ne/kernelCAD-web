// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import {
  evaluateBodyLikeness,
  REQUIRED_AUTOMOTIVE_STILL_CODES,
} from '../../../src/agent/likeness/bodyLikeness';

const BODY = { min: [0, -40, 20] as const, max: [400, 40, 100] as const };
const WHEELS = [
  { center: [60, -30, 30] as const, radius: 30 },
  { center: [60, 30, 30] as const, radius: 30 },
  { center: [340, -30, 30] as const, radius: 30 },
  { center: [340, 30, 30] as const, radius: 30 },
];

const PASSING_STILLS = REQUIRED_AUTOMOTIVE_STILL_CODES.map((code) => ({
  code,
  passed: true,
  finding: `Concrete ortho observation for ${code}: cue present and matches reference.`,
  view: 'side' as const,
}));

describe('evaluateBodyLikeness', () => {
  it('passes when wheels sit under body and stills are concrete', () => {
    const out = evaluateBodyLikeness({
      body: BODY,
      wheels: WHEELS,
      stillVerdicts: PASSING_STILLS,
    });
    expect(out.ok).toBe(true);
    expect(out.publishReady).toBe(true);
    expect(out.diagnostics).toHaveLength(0);
  });

  it('fails floating body (rocker far above tire top)', () => {
    const out = evaluateBodyLikeness({
      body: { min: [0, -40, 120], max: [400, 40, 200] },
      wheels: WHEELS,
      stillVerdicts: PASSING_STILLS,
    });
    expect(out.ok).toBe(false);
    expect(out.checks.find((c) => c.code === 'body-over-wheels-z')?.passed).toBe(false);
    expect(out.diagnostics.some((d) => d.code === 'reference.likeness.auto-failed')).toBe(true);
  });

  it('fails when stills are missing', () => {
    const out = evaluateBodyLikeness({ body: BODY, wheels: WHEELS });
    expect(out.ok).toBe(false);
    expect(out.diagnostics.some((d) => d.code === 'reference.likeness.stills-incomplete')).toBe(true);
  });

  it('fails thin still findings even when passed:true', () => {
    const out = evaluateBodyLikeness({
      body: BODY,
      wheels: WHEELS,
      stillVerdicts: REQUIRED_AUTOMOTIVE_STILL_CODES.map((code) => ({
        code,
        passed: true,
        finding: 'ok',
      })),
    });
    expect(out.ok).toBe(false);
    expect(out.diagnostics.some((d) => d.code === 'reference.likeness.still-failed')).toBe(true);
  });

  it('can skip stills when requireStills:false (auto-only)', () => {
    const out = evaluateBodyLikeness({
      body: BODY,
      wheels: WHEELS,
      requireStills: false,
    });
    expect(out.ok).toBe(true);
  });

  it('flags cabin forward of mid-wheelbase when cabin provided', () => {
    const out = evaluateBodyLikeness({
      body: BODY,
      wheels: WHEELS,
      cabin: { min: [20, -20, 60], max: [80, 20, 95] },
      stillVerdicts: PASSING_STILLS,
    });
    expect(out.checks.find((c) => c.code === 'cabin-aft-auto')?.passed).toBe(false);
    expect(out.ok).toBe(false);
  });
});
