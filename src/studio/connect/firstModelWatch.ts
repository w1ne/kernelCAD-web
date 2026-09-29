// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

/**
 * "Did it work?" for /connect. The page cannot see inside the user's agent,
 * but it can see the result that matters: a model saved to the account. So
 * the check watches the user's projects for one saved after the page opened.
 */

/** How often the check lists the user's projects. */
export const WATCH_INTERVAL_MS = 5_000;
/** People connect in their first 10 minutes or never; stop polling after that. */
export const WATCH_LIMIT_MS = 10 * 60_000;

export interface WatchedProject {
  readonly slug: string;
  readonly title: string;
  readonly updated_at: string;
}

/**
 * The most recent project saved at or after `sinceMs`, or null. Rows with an
 * unreadable timestamp never count, so a bad row cannot fake a success.
 */
export function findNewProject<T extends WatchedProject>(rows: readonly T[], sinceMs: number): T | null {
  let best: T | null = null;
  let bestAt = -Infinity;
  for (const row of rows) {
    const at = Date.parse(row.updated_at);
    if (!Number.isFinite(at) || at < sinceMs) continue;
    if (at > bestAt) {
      best = row;
      bestAt = at;
    }
  }
  return best;
}

export type WatchState =
  | { readonly kind: 'signed_out' }
  | { readonly kind: 'watching'; readonly elapsedMs: number }
  | { readonly kind: 'found'; readonly project: WatchedProject }
  | { readonly kind: 'timeout' }
  | { readonly kind: 'error'; readonly message: string };
