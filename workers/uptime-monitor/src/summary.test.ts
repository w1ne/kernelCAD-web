// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// workers/uptime-monitor/src/summary.test.ts
//
// Daily summary maths: uptime, incidents with durations, percentiles, pool
// counter deltas across restarts, deploys.

import { describe, it, expect } from 'vitest';
import type { HealthDetail } from './checks';
import type { ResultRow } from './store';
import { formatSummary, percentile, poolDeltas, summarize } from './summary';

const MIN = 60_000;

function health(commit: string, kills: Record<string, number>, respawns: number, rss = [100, 200]): HealthDetail {
  return {
    commit,
    warm: true,
    workers: 2,
    busy: 0,
    queueDepth: 0,
    kills: Object.values(kills).reduce((a, b) => a + b, 0),
    killsByCause: kills,
    respawns,
    rssMb: rss,
  };
}

function row(checkId: string, i: number, ok: boolean, latencyMs = 100, detail?: HealthDetail): ResultRow {
  return { ts: i * 5 * MIN, checkId, ok, latencyMs, ...(ok ? {} : { error: `e${i}` }), ...(detail ? { detail } : {}) };
}

describe('daily summary maths', () => {
  it('percentile is nearest-rank', () => {
    expect(percentile([], 50)).toBeNull();
    expect(percentile([5], 95)).toBe(5);
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 50)).toBe(5);
    expect(percentile([10, 1, 9, 2, 8, 3, 7, 4, 6, 5], 95)).toBe(10);
    expect(percentile(Array.from({ length: 100 }, (_, i) => i + 1), 95)).toBe(95);
  });

  it('uptime, incidents with durations and blips', () => {
    // 10 runs: fail at 2,3,4 (incident, recovers at 5), blip at 7.
    const oks = [true, true, false, false, false, true, true, false, true, true];
    const rows = oks.map((ok, i) => row('mcp', i, ok, (i + 1) * 100));
    const s = summarize(rows, 0, 10 * 5 * MIN, ['mcp', 'web_app']);
    expect(s.checks[0]).toEqual({ checkId: 'mcp', runs: 10, okRuns: 6, uptimePct: 60, p50Ms: 500, p95Ms: 1000 });
    expect(s.checks[1]).toMatchObject({ checkId: 'web_app', runs: 0, uptimePct: null, p50Ms: null });
    expect(s.incidents).toEqual([{ checkId: 'mcp', start: 10 * MIN, end: 25 * MIN, durationMs: 15 * MIN, runs: 3, error: 'e2' }]);
    expect(s.blips).toBe(1);
  });

  it('an incident still open at the end runs to the window end', () => {
    const rows = [row('healthz', 0, true), row('healthz', 1, false), row('healthz', 2, false)];
    const s = summarize(rows, 0, 20 * MIN, ['healthz']);
    expect(s.incidents).toEqual([{ checkId: 'healthz', start: 5 * MIN, durationMs: 15 * MIN, runs: 2, error: 'e1' }]);
  });

  it('ignores rows outside the window', () => {
    const rows = [row('mcp', 0, false), row('mcp', 1, false), row('mcp', 2, true)];
    const s = summarize(rows, 10 * MIN, 20 * MIN, ['mcp']);
    expect(s.checks[0]).toMatchObject({ runs: 1, okRuns: 1, uptimePct: 100 });
    expect(s.incidents).toEqual([]);
  });

  it('pool deltas count kills and respawns across a process restart', () => {
    const rows = [
      row('healthz', 0, true, 100, health('a', { memory: 1, time: 5 }, 10, [300, 100])),
      row('healthz', 1, true, 100, health('a', { memory: 2, time: 7 }, 13, [700, 100])),
      // Process restart: counters reset.
      row('healthz', 2, true, 100, health('b', { memory: 0, time: 1 }, 1)),
      row('healthz', 3, true, 100, health('b', { memory: 0, time: 2 }, 2)),
    ];
    expect(poolDeltas(rows)).toEqual({
      kills: 1 + 2 + 1 + 1,
      killsByCause: { memory: 1, time: 4 },
      respawns: 3 + 1 + 1,
      serverRestarts: 1,
      maxRssMb: 700,
    });
    const s = summarize(rows, 0, DAY, ['healthz']);
    expect(s.deploys).toEqual([{ at: 10 * MIN, from: 'a', to: 'b' }]);
  });

  it('formats one readable email', () => {
    const rows = [
      row('healthz', 0, true, 120, health('a'.repeat(40), { memory: 0 }, 0)),
      row('healthz', 1, false, 20000),
      row('healthz', 2, false, 20000),
      row('healthz', 3, true, 130, health('b'.repeat(40), { memory: 1 }, 1)),
    ];
    const { subject, text } = formatSummary(summarize(rows, 0, DAY, ['healthz']), (id) => `name:${id}`);
    expect(subject).toBe('[kernelCAD daily] worst 50.00%, 1 incident(s), 1 deploy(s)');
    expect(text).toContain('name:healthz: 4 runs, 50.00%, p50 130 ms, p95 20000 ms');
    expect(text).toContain('name:healthz: 1970-01-01T00:05:00Z to 1970-01-01T00:15:00Z, 10 min, 2 runs. e1');
    expect(text).toContain('1970-01-01T00:15:00Z: aaaaaaaaaaaa -> bbbbbbbbbbbb');
    expect(text).toContain('API process restarts (counters reset): 0');
  });
});

const DAY = 24 * 60 * MIN;
