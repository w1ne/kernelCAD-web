// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { mapPool } from './pool';

describe('mapPool', () => {
  it('preserves result order', async () => {
    const out = await mapPool([3, 1, 2], 2, async (n) => n * 10);
    expect(out).toEqual([30, 10, 20]);
  });

  it('never exceeds the concurrency limit', async () => {
    let active = 0;
    let peak = 0;
    await mapPool(Array.from({ length: 10 }, (_, i) => i), 3, async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      return true;
    });
    expect(peak).toBeLessThanOrEqual(3);
    expect(peak).toBeGreaterThan(1);
  });

  it('propagates a worker error', async () => {
    await expect(
      mapPool([1, 2], 2, async (n) => {
        if (n === 1) throw new Error('boom');
        return n;
      }),
    ).rejects.toThrow('boom');
  });

  it('handles an empty input', async () => {
    expect(await mapPool([], 4, async () => 1)).toEqual([]);
  });

  it('rejects invalid limits', async () => {
    await expect(mapPool([1], 0, async () => 1)).rejects.toThrow(/limit/);
    await expect(mapPool([1], Number.NaN, async () => 1)).rejects.toThrow(/limit/);
  });

  it('passes the index and tolerates a limit larger than the input', async () => {
    expect(await mapPool(['a', 'b'], 10, async (_item, i) => i)).toEqual([0, 1]);
  });
});
