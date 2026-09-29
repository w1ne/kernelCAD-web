// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// workers/uptime-monitor/src/alerts.test.ts
//
// The alert state machine: 2 in a row, one alert, 2-hourly reminders, one
// recovery, and no email for a single blip.

import { describe, it, expect } from 'vitest';
import { REMIND_EVERY_MS, latencyVerdict, step, unsend, type AlertState, type Notice } from './alerts';

const MIN = 60_000;

/** Feed a sequence of verdicts 5 minutes apart; return the notices. */
function feed(seq: boolean[], failAfter?: number, t0 = 0): { notices: Notice[]; state?: AlertState } {
  let state: AlertState | undefined;
  const notices: Notice[] = [];
  seq.forEach((ok, i) => {
    const out = step(state, 'mcp', ok, ok ? undefined : `err${i}`, t0 + i * 5 * MIN, failAfter);
    state = out.state;
    if (out.notice) notices.push(out.notice);
  });
  return { notices, state };
}

describe('alert state machine', () => {
  it('a single failure that passes next run sends nothing', () => {
    expect(feed([true, false, true, false, true]).notices).toEqual([]);
  });

  it('alerts on the 2nd failure in a row, once', () => {
    const { notices, state } = feed([true, false, false, false, false]);
    expect(notices).toEqual([{ kind: 'alert', checkId: 'mcp', error: 'err2', since: 5 * MIN, at: 10 * MIN, fails: 2 }]);
    expect(state).toMatchObject({ fails: 4, since: 5 * MIN, alerted: true, notifiedAt: 10 * MIN, lastError: 'err4' });
  });

  it('sends one recovery with the down time when it passes again', () => {
    const { notices, state } = feed([false, false, false, true, true]);
    expect(notices.map((n) => n.kind)).toEqual(['alert', 'recovery']);
    expect(notices[1]).toMatchObject({ since: 0, at: 15 * MIN, fails: 3 });
    expect(state).toEqual({ fails: 0, alerted: false, lastOkAt: 20 * MIN, lastRunAt: 20 * MIN });
  });

  it('reminds every 2 hours while down, not more often', () => {
    // 6 h of failures at 5-minute runs.
    const seq = Array.from({ length: 6 * 12 + 1 }, () => false);
    const { notices } = feed(seq);
    expect(notices.map((n) => n.kind)).toEqual(['alert', 'reminder', 'reminder']);
    expect(notices[1]!.at - notices[0]!.at).toBe(REMIND_EVERY_MS);
    expect(notices[2]!.at - notices[1]!.at).toBe(REMIND_EVERY_MS);
    expect(notices.every((n) => n.since === 0)).toBe(true);
  });

  it('a new streak after recovery alerts again with a new since', () => {
    const { notices } = feed([false, false, true, false, false]);
    expect(notices.map((n) => [n.kind, n.since])).toEqual([
      ['alert', 0],
      ['recovery', 0],
      ['alert', 15 * MIN],
    ]);
  });

  it('latency needs 3 slow runs in a row', () => {
    expect(feed([false, false, true, false, false], 3).notices).toEqual([]);
    expect(feed([false, false, false], 3).notices.map((n) => n.kind)).toEqual(['alert']);
    expect(latencyVerdict(5_000).ok).toBe(true);
    expect(latencyVerdict(5_001)).toEqual({ ok: false, error: 'healthz took 5.0 s (limit 5 s)' });
  });

  it('unsend lets the next run retry a failed alert email', () => {
    const a = step(undefined, 'mcp', false, 'e', 0);
    const b = step(a.state, 'mcp', false, 'e', 5 * MIN);
    expect(b.notice?.kind).toBe('alert');
    const reverted = unsend(b.state, b.notice!, a.state);
    const c = step(reverted, 'mcp', false, 'e', 10 * MIN);
    expect(c.notice).toMatchObject({ kind: 'alert', since: 0, fails: 3 });
  });
});
