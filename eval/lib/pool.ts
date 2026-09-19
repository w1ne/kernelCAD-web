// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

/**
 * Bounded-concurrency map. Results keep input order. Rejects with the first
 * worker rejection; on rejection, in-flight and queued items are not cancelled
 * and runners may keep processing until they finish. Callers are responsible
 * for catching per-item errors when item isolation is required.
 */
export async function mapPool<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error(`mapPool: limit must be an integer >= 1, got ${limit}`);
  }
  const results = new Array<R>(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}
