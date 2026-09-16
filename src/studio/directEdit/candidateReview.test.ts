// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it, vi } from 'vitest';
import { reviewCandidate } from './candidateReview';

const review = (pairs: Array<{ volumeMm3: number }>, ok = true) =>
  ({ ok, diagnostics: [], rawInterferencePairs: pairs }) as never;

describe('reviewCandidate', () => {
  it('computes the validity delta from interference volumes', async () => {
    const evaluate = vi.fn(async () => review([{ volumeMm3: 3.5 }], false));
    const result = await reviewCandidate({
      source: 'return box(1,1,1);',
      script: 'examples/demo.kcad.ts',
      baseline: review([{ volumeMm3: 3.5 }, { volumeMm3: 1.5 }], false),
      evaluate,
    });
    expect(result.ok).toBe(true);
    expect(result.reviewed).toBe(true);
    expect(result.review).not.toBeNull();
    expect(result.delta).toEqual({
      fromInterferences: 2,
      toInterferences: 1,
      fromVolumeMm3: 5,
      toVolumeMm3: 3.5,
      fromOk: false,
      toOk: false,
    });
  });

  it('computes a zeroed delta from the reviews when the channel is present but empty', async () => {
    const evaluate = vi.fn(async () => review([], true));
    const result = await reviewCandidate({
      source: 'return box(1,1,1);',
      script: 'examples/demo.kcad.ts',
      baseline: review([], false),
      evaluate,
    });
    expect(result.ok).toBe(true);
    expect(result.reviewed).toBe(true);
    expect(result.delta).toEqual({
      fromInterferences: 0,
      toInterferences: 0,
      fromVolumeMm3: 0,
      toVolumeMm3: 0,
      fromOk: false,
      toOk: true,
    });
  });

  it('reports evaluation failure without a delta', async () => {
    const evaluate = vi.fn(async () => { throw new Error('worker exploded'); });
    const result = await reviewCandidate({ source: 'x', script: 'examples/demo.kcad.ts', baseline: null, evaluate });
    expect(result.ok).toBe(false);
    expect(result.reviewed).toBe(false);
    expect(result.error).toMatch(/worker exploded/);
    expect(result.review).toBeNull();
    expect(result.delta).toBeNull();
  });

  it('succeeds without evidence when the review has no interference channel', async () => {
    // The no-assembly shape: the endpoint reports ok:false with NO error
    // diagnostics (a valid single-body candidate), and there is no
    // rawInterferencePairs key at all.
    const evaluate = vi.fn(async () => ({ ok: false, diagnostics: [] }) as never);
    const result = await reviewCandidate({ source: 'x', script: 'examples/demo.kcad.ts', baseline: null, evaluate });
    expect(result.ok).toBe(true);
    expect(result.reviewed).toBe(false);
    expect(result.review).not.toBeNull();
    expect(result.delta).toBeNull();
  });
});
