// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it, vi } from 'vitest';
import { reviewCandidate } from './candidateReview';

const review = (pairs: Array<{ volumeMm3: number }>, ok = true) =>
  ({ ok, diagnostics: [], rawInterferencePairs: pairs }) as never;

describe('reviewCandidate', () => {
  it('computes the validity delta from interference volumes', async () => {
    const evaluate = vi.fn(async () => ({ features: [], params: {}, review: review([{ volumeMm3: 3.5 }], false) }) as never);
    const result = await reviewCandidate({
      source: 'return box(1,1,1);',
      baseline: review([{ volumeMm3: 3.5 }, { volumeMm3: 1.5 }], false),
      evaluate,
    });
    expect(result.ok).toBe(true);
    expect(result.delta).toEqual({
      fromInterferences: 2,
      toInterferences: 1,
      fromVolumeMm3: 5,
      toVolumeMm3: 3.5,
      fromOk: false,
      toOk: false,
    });
  });

  it('reports evaluation failure without a payload', async () => {
    const evaluate = vi.fn(async () => { throw new Error('worker exploded'); });
    const result = await reviewCandidate({ source: 'x', baseline: null, evaluate });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/worker exploded/);
    expect(result.delta.toInterferences).toBe(0);
  });
});
