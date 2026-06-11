// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** Monotonic guard for realtime project updates: drop stale/duplicate events.
 *  Null versions (legacy rows / oversized-payload refetch) always apply. */
export function shouldApplyProjectUpdate(current: number | null | undefined, incoming: number | null | undefined): boolean {
  if (current == null || incoming == null) return true;
  return incoming > current;
}
