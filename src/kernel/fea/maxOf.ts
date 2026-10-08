// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

/** Maximum of a numeric array without spreading it onto the call stack
 *  (`Math.max(...a)` throws RangeError past ~100k elements). -Infinity when empty. */
export function maxOf(values: ArrayLike<number>): number {
  let m = -Infinity;
  for (let i = 0; i < values.length; i++) if (values[i] > m) m = values[i];
  return m;
}
