// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { describe, expect, it } from 'vitest';
import { classifyEditPromotion } from './editPromotion';
import { inspectedFixture } from './editPromotion.fixtureReports';

describe('229 fixture-backed edit promotion', () => {
  it('accepts the real edit that reduces the lone horizontal bore to 10 mm', () => {
    const result = classifyEditPromotion({
      request: 'Decrease the diameter of the lone horizontal bore from 15mm to 10mm.',
      before: inspectedFixture('229-in'),
      after: inspectedFixture('229-out10'),
    });
    expect(result).toMatchObject({ status: 'accepted', classification: 'edited' });
  });

  it('rejects the real candidate that stopped at 20 mm', () => {
    const result = classifyEditPromotion({
      request: 'Decrease the diameter of the lone horizontal bore from 15mm to 10mm.',
      before: inspectedFixture('229-in'),
      after: inspectedFixture('229-out20'),
    });
    expect(result).toMatchObject({ status: 'failed', classification: 'wrong-magnitude' });
    expect(result.reason).toContain('10');
  });
});
