// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { describe, expect, it } from 'vitest';
import { classifyEditPromotion } from './editPromotion';
import { inspectedFixture } from './editPromotion.fixtureReports';

// Task 201 pilot, 15 Nov 2026 (#1402): a broad +X/-X `offsetFaces` passed
// STEP validity, and the classifier accepted it as `edited`.
describe('201 fixture-backed edit promotion', () => {
  it('does not accept the real wall offset that added 18 faces', () => {
    const result = classifyEditPromotion({
      request:
        'For each of the four non-circular pockets on the +X side of the central bore, bring their walls (faces with long axis along Y) inward by 6mm.',
      before: inspectedFixture('201-in'),
      after: inspectedFixture('201-out'),
    });
    expect(result).toMatchObject({
      status: 'unknown',
      classification: 'locality-unverified',
      faceDelta: 18,
      holeCountBefore: 28,
      holeCountAfter: 28,
    });
  });

  // `lib.fromSTEP('./input.step')` returned unchanged and exported to STEP.
  // Import healing moves the volume by +59.9 mm³ (0.0024 %), about 12 % of
  // the 0.02 % tolerance, so an untouched candidate must still read as no-op.
  it('rejects the real import/export round trip with no edit as a no-op', () => {
    const result = classifyEditPromotion({
      request:
        'For each of the four non-circular pockets on the +X side of the central bore, bring their walls (faces with long axis along Y) inward by 6mm.',
      before: inspectedFixture('201-in'),
      after: inspectedFixture('201-out-roundtrip'),
    });
    expect(result).toMatchObject({
      status: 'failed',
      classification: 'no-op',
      faceDelta: 0,
      bboxDeltaMm: 0,
      holeCountBefore: 28,
      holeCountAfter: 28,
    });
    expect(result.volumeDeltaMm3).toBeCloseTo(59.9, 1);
    expect(Math.abs(result.volumeDeltaMm3)).toBeLessThan(result.volumeToleranceMm3 / 5);
  });
});
