// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/render/animationFraming.test.ts

import { describe, expect, it } from 'vitest';
import { FRAME_LOCK_PAD, padBounds, unionBounds } from '../../../src/agent/render/animationFraming';

describe('animation framing', () => {
  it('unions every pose so a later reach cannot fall outside the frame', () => {
    const union = unionBounds([
      { min: [0, 0, 0], max: [10, 20, 30] },
      { min: [-40, 5, -2], max: [8, 12, 80] },
    ]);
    expect(union).toEqual({ min: [-40, 0, -2], max: [10, 20, 80] });
  });

  it('pads about the centre', () => {
    expect(padBounds({ min: [0, 0, 0], max: [10, 20, 30] }, 2)).toEqual({
      min: [-5, -10, -15],
      max: [15, 30, 45],
    });
  });

  it('pulls the camera in, because the union box is looser than the silhouette', () => {
    expect(FRAME_LOCK_PAD).toBeGreaterThan(0.5);
    expect(FRAME_LOCK_PAD).toBeLessThan(1);
  });

  it('returns undefined for no poses', () => {
    expect(unionBounds([])).toBeUndefined();
  });
});
