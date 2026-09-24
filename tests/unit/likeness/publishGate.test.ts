// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import {
  assertLikenessPublishReady,
  LIKENESS_GATE_REQUIRED,
  LIKENESS_PUBLISH_BLOCKED,
  sourceRequiresAutomotiveLikeness,
} from '../../../src/agent/likeness/publishGate';
import { REQUIRED_AUTOMOTIVE_STILL_CODES } from '../../../src/agent/likeness/bodyLikeness';

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
}));

describe('sourceRequiresAutomotiveLikeness', () => {
  it('detects cookbook / berlinetta cues', () => {
    expect(sourceRequiresAutomotiveLikeness('// automotive-body-envelope')).toBe(true);
    expect(sourceRequiresAutomotiveLikeness('berlinetta body loft')).toBe(true);
    expect(sourceRequiresAutomotiveLikeness('box(10,10,10)')).toBe(false);
  });
});

describe('assertLikenessPublishReady', () => {
  it('is a no-op when likeness is not required', () => {
    const out = assertLikenessPublishReady({ source: 'box(1,1,1)' });
    expect(out.required).toBe(false);
    expect(out.successClaimable).toBe(true);
  });

  it('fails closed when profile set but body missing', () => {
    const out = assertLikenessPublishReady({ likenessProfile: 'automotive' });
    expect(out.required).toBe(true);
    expect(out.successClaimable).toBe(false);
    expect(out.diagnostics.some((d) => d.code === LIKENESS_GATE_REQUIRED)).toBe(true);
  });

  it('blocks publish when likeness fails', () => {
    const out = assertLikenessPublishReady({
      likenessProfile: 'automotive',
      body: { min: [0, -40, 120], max: [400, 40, 200] },
      wheels: WHEELS,
      stillVerdicts: PASSING_STILLS,
    });
    expect(out.successClaimable).toBe(false);
    expect(out.diagnostics.some((d) => d.code === LIKENESS_PUBLISH_BLOCKED)).toBe(true);
  });

  it('allows success when publishReady', () => {
    const out = assertLikenessPublishReady({
      likenessProfile: 'automotive',
      body: BODY,
      wheels: WHEELS,
      stillVerdicts: PASSING_STILLS,
    });
    expect(out.successClaimable).toBe(true);
    expect(out.likeness?.publishReady).toBe(true);
  });
});
