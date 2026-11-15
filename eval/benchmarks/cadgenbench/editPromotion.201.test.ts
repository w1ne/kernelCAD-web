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
});
