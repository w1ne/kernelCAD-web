// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { describe, expect, it } from 'vitest';
import { classifyEditPromotion } from './editPromotion';
import { inspectedFixture } from './editPromotion.fixtureReports';

describe('206 fixture-backed edit promotion', () => {
  it('accepts the real edit that removes exactly the three requested holes', () => {
    const result = classifyEditPromotion({
      request:
        'On the furthest face of the part in the -Y direction, lying on the XZ plane, there are three holes with centerlines parallel to the Y axis. Remove these three holes.',
      before: inspectedFixture('206-in'),
      after: inspectedFixture('206-out'),
    });
    expect(result).toMatchObject({
      status: 'accepted',
      classification: 'edited',
      holeCountBefore: 22,
      holeCountAfter: 19,
    });
  });
});
