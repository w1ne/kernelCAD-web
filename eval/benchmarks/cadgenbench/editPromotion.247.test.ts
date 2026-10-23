// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { describe, expect, it } from 'vitest';
import { classifyEditPromotion } from './editPromotion';
import { inspectedFixture } from './editPromotion.fixtureReports';

describe('247 fixture-backed edit promotion', () => {
  it('accepts the real edit that enlarges the 298 mm central bore to 310 mm and keeps the 188 mm bore', () => {
    const result = classifyEditPromotion({
      request: 'Increase the diameter of the central bore to 310mm.',
      before: inspectedFixture('247-in'),
      after: inspectedFixture('247-out'),
    });
    expect(result).toMatchObject({
      status: 'accepted',
      classification: 'edited',
      holeCountBefore: 14,
      holeCountAfter: 14,
    });
  });
});
