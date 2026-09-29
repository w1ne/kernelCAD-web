// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// workers/uptime-monitor/src/alerts.ts
//
// The alert state machine, pure: (state, result) -> (state, notice?).
//
//   - A check alerts after `failAfter` failed runs in a row (2 for checks, 3
//     for healthz latency), once.
//   - While it stays down, only a reminder every REMIND_EVERY_MS.
//   - The first passing run after an alert sends one recovery notice.
//   - A single failed run that passes next time sends nothing.

export const FAIL_AFTER = 2;
export const LATENCY_FAIL_AFTER = 3;
export const LATENCY_LIMIT_MS = 5_000;
export const REMIND_EVERY_MS = 2 * 60 * 60 * 1000;

export interface AlertState {
  /** Failed runs in a row; 0 when the last run passed. */
  fails: number;
  /** Time of the first failure of the current streak. */
  since?: number;
  lastError?: string;
  /** True once the alert email for this streak went out. */
  alerted: boolean;
  /** Time of the last alert or reminder email for this streak. */
  notifiedAt?: number;
  lastOkAt?: number;
  lastRunAt?: number;
}

export type NoticeKind = 'alert' | 'reminder' | 'recovery';

export interface Notice {
  kind: NoticeKind;
  checkId: string;
  error?: string;
  since: number;
  at: number;
  /** Failed runs in the streak (alert, reminder). */
  fails: number;
}

export function initialState(): AlertState {
  return { fails: 0, alerted: false };
}

export function step(
  prev: AlertState | undefined,
  checkId: string,
  ok: boolean,
  error: string | undefined,
  at: number,
  failAfter = FAIL_AFTER,
): { state: AlertState; notice?: Notice } {
  const s = prev ?? initialState();
  if (ok) {
    const state: AlertState = { fails: 0, alerted: false, lastOkAt: at, lastRunAt: at };
    if (s.alerted) {
      return { state, notice: { kind: 'recovery', checkId, since: s.since ?? at, at, fails: s.fails } };
    }
    return { state };
  }
  const fails = s.fails + 1;
  const since = s.fails === 0 || s.since === undefined ? at : s.since;
  const state: AlertState = { ...s, fails, since, lastError: error, lastRunAt: at };
  if (!s.alerted && fails >= failAfter) {
    state.alerted = true;
    state.notifiedAt = at;
    return { state, notice: { kind: 'alert', checkId, error, since, at, fails } };
  }
  if (s.alerted && s.notifiedAt !== undefined && at - s.notifiedAt >= REMIND_EVERY_MS) {
    state.notifiedAt = at;
    return { state, notice: { kind: 'reminder', checkId, error, since, at, fails } };
  }
  return { state };
}

/**
 * Undo the notice's effect on the state when the email could not be sent, so
 * the next run tries again. A lost recovery is not retried: the check is up.
 */
export function unsend(state: AlertState, notice: Notice, prev: AlertState | undefined): AlertState {
  if (notice.kind === 'alert') return { ...state, alerted: false, notifiedAt: undefined };
  if (notice.kind === 'reminder') return { ...state, notifiedAt: prev?.notifiedAt };
  return state;
}

/** The healthz latency pseudo-check: fails when healthz answered but slower than the limit. */
export function latencyVerdict(healthzLatencyMs: number): { ok: boolean; error?: string } {
  if (healthzLatencyMs > LATENCY_LIMIT_MS) {
    return { ok: false, error: `healthz took ${(healthzLatencyMs / 1000).toFixed(1)} s (limit ${LATENCY_LIMIT_MS / 1000} s)` };
  }
  return { ok: true };
}
