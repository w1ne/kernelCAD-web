// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// `through` depth cast along the drill axis from the hole's own entry point.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, OcctBackend } from '../../../../src/kernel/backends/occt/occtBackend';
import { exitFromIntervals, firstExitDepth } from '../../../../src/kernel/backends/occt/holeExitDepth';

describe('exitFromIntervals', () => {
  it('returns where the material run that starts at the entry ends', () => {
    expect(exitFromIntervals([[0, 7], [15, 22]])).toBe(7);
    expect(exitFromIntervals([[-0.05, 3], [3, 5]])).toBe(5);
    expect(exitFromIntervals([[2, 5]])).toBeUndefined();
    expect(exitFromIntervals([])).toBeUndefined();
  });
});

describe('firstExitDepth', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('measures the material run along the axis and stops at the first exit', () => {
    // Two 4 mm plates stacked with a 6 mm gap: the bore from the top leaves
    // material after the first plate.
    const body = OcctBackend.box(20, 20, 4).union(OcctBackend.box(20, 20, 4).translate(0, 0, 10));
    expect(firstExitDepth(body, [10, 10, 14], [0, 0, -1])).toBeCloseTo(4, 6);
    // Off the body: no material along the axis.
    expect(firstExitDepth(body, [30, 10, 14], [0, 0, -1])).toBeUndefined();
  });
});
