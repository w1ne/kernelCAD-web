// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { describe, expect, it } from 'vitest';
import { classifyEditPromotion } from './editPromotion';
import { inspectedFixture } from './editPromotion.fixtureReports';

const REQUEST =
  'The inner and outer circular edges of the furthest surface in the -X direction are both chamfered. Change these edges to be filleted, with radius 3mm.';

describe('208 fixture-backed edit promotion', () => {
  it('accepts the real edit that replaces both 1 mm chamfers with 3 mm fillets', () => {
    const result = classifyEditPromotion({
      request: REQUEST,
      before: inspectedFixture('208-in'),
      after: inspectedFixture('208-out'),
    });
    expect(result).toMatchObject({
      status: 'accepted',
      classification: 'edited',
      faceDelta: 0,
      holeCountBefore: 25,
      holeCountAfter: 25,
    });
    expect(result.volumeDeltaMm3).toBeCloseTo(-476.85, 1);
  });

  it('rejects the old no-op candidate that left the chamfers in place', () => {
    const result = classifyEditPromotion({
      request: REQUEST,
      before: inspectedFixture('208-in'),
      after: inspectedFixture('208-out-noop'),
    });
    expect(result).toMatchObject({
      status: 'failed',
      classification: 'no-op',
      faceDelta: 0,
      holeCountBefore: 25,
      holeCountAfter: 25,
    });
  });
});
