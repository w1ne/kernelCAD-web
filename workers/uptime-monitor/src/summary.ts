// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// workers/uptime-monitor/src/summary.ts
//
// The daily summary maths, pure: 24 h of result rows -> uptime per check,
// incidents with durations, latency p50/p95, pool kills / respawns, server
// restarts and deploys.

import { FAIL_AFTER } from './alerts';
import type { Deploy, ResultRow } from './store';

export interface CheckSummary {
  checkId: string;
  runs: number;
  okRuns: number;
  /** Percent of passing runs, 0..100; null when the check never ran. */
  uptimePct: number | null;
  p50Ms: number | null;
  p95Ms: number | null;
}

export interface Incident {
  checkId: string;
  start: number;
  /** First passing run after the streak; undefined while still down. */
  end?: number;
  durationMs: number;
  runs: number;
  error?: string;
}

export interface PoolSummary {
  kills: number;
  killsByCause: Record<string, number>;
  respawns: number;
  /** Times the pool counters went down: the API process restarted. */
  serverRestarts: number;
  maxRssMb: number | null;
}

export interface DailySummary {
  from: number;
  to: number;
  checks: CheckSummary[];
  /** Failure streaks long enough to alert (FAIL_AFTER runs or more). */
  incidents: Incident[];
  /** Single failed runs that passed on the next run. */
  blips: number;
  pool: PoolSummary;
  deploys: Deploy[];
}

/** Nearest-rank percentile of `values` (unsorted), or null when empty. */
export function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.max(1, Math.ceil((p / 100) * sorted.length));
  return sorted[Math.min(rank, sorted.length) - 1]!;
}

function byCheck(rows: ResultRow[]): Map<string, ResultRow[]> {
  const m = new Map<string, ResultRow[]>();
  for (const r of [...rows].sort((a, b) => a.ts - b.ts)) {
    const list = m.get(r.checkId) ?? [];
    list.push(r);
    m.set(r.checkId, list);
  }
  return m;
}

/** Failure streaks of one check's chronological rows. */
export function streaks(rows: ResultRow[], to: number): Incident[] {
  const out: Incident[] = [];
  let cur: Incident | undefined;
  for (const r of rows) {
    if (!r.ok) {
      if (!cur) cur = { checkId: r.checkId, start: r.ts, durationMs: 0, runs: 0, error: r.error };
      cur.runs++;
    } else if (cur) {
      cur.end = r.ts;
      cur.durationMs = r.ts - cur.start;
      out.push(cur);
      cur = undefined;
    }
  }
  if (cur) {
    cur.durationMs = to - cur.start;
    out.push(cur);
  }
  return out;
}

/**
 * Pool counter deltas over chronological healthz rows. The counters are per
 * process, so a drop means the process restarted; the new value is then all
 * new kills since that restart.
 */
export function poolDeltas(rows: ResultRow[]): PoolSummary {
  const s: PoolSummary = { kills: 0, killsByCause: {}, respawns: 0, serverRestarts: 0, maxRssMb: null };
  let prev: ResultRow['detail'];
  for (const r of rows) {
    const d = r.detail;
    if (!d) continue;
    const rss = d.rssMb.length ? Math.max(...d.rssMb) : null;
    if (rss !== null) s.maxRssMb = Math.max(s.maxRssMb ?? 0, rss);
    if (prev) {
      const reset = d.kills < prev.kills || d.respawns < prev.respawns;
      if (reset) s.serverRestarts++;
      s.respawns += reset ? d.respawns : d.respawns - prev.respawns;
      for (const [cause, n] of Object.entries(d.killsByCause)) {
        const before = reset ? 0 : (prev.killsByCause[cause] ?? 0);
        const delta = Math.max(0, n - before);
        if (delta) s.killsByCause[cause] = (s.killsByCause[cause] ?? 0) + delta;
      }
      s.kills += reset ? d.kills : Math.max(0, d.kills - prev.kills);
    }
    prev = d;
  }
  return s;
}

/** Commit changes seen in chronological healthz rows. */
export function deploysIn(rows: ResultRow[]): Deploy[] {
  const out: Deploy[] = [];
  let commit: string | undefined;
  for (const r of rows) {
    const c = r.detail?.commit;
    if (!c || c === 'unknown') continue;
    if (commit !== undefined && c !== commit) out.push({ at: r.ts, from: commit, to: c });
    commit = c;
  }
  return out;
}

export function summarize(rows: ResultRow[], from: number, to: number, checkIds: string[]): DailySummary {
  const inWindow = rows.filter((r) => r.ts >= from && r.ts < to);
  const grouped = byCheck(inWindow);
  const checks: CheckSummary[] = checkIds.map((id) => {
    const list = grouped.get(id) ?? [];
    const okRuns = list.filter((r) => r.ok).length;
    const latencies = list.map((r) => r.latencyMs);
    return {
      checkId: id,
      runs: list.length,
      okRuns,
      uptimePct: list.length ? (okRuns / list.length) * 100 : null,
      p50Ms: percentile(latencies, 50),
      p95Ms: percentile(latencies, 95),
    };
  });
  const incidents: Incident[] = [];
  let blips = 0;
  for (const id of checkIds) {
    for (const st of streaks(grouped.get(id) ?? [], to)) {
      if (st.runs >= FAIL_AFTER) incidents.push(st);
      else if (st.end !== undefined) blips++;
      else incidents.push(st); // a fresh failure still open at the end of the window
    }
  }
  incidents.sort((a, b) => a.start - b.start);
  const health = grouped.get('healthz') ?? [];
  return { from, to, checks, incidents, blips, pool: poolDeltas(health), deploys: deploysIn(health) };
}

// ---------------------------------------------------------------------------
// Formatting (shared with the alert emails)
// ---------------------------------------------------------------------------

export function iso(ts: number): string {
  return new Date(ts).toISOString().replace('.000Z', 'Z');
}

export function duration(ms: number): string {
  const m = Math.round(ms / 60_000);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h} h ${m % 60} min`;
}

function ms(v: number | null): string {
  return v === null ? '-' : `${v} ms`;
}

export function shortSha(sha: string): string {
  return sha.slice(0, 12);
}

export function formatSummary(s: DailySummary, nameOf: (id: string) => string): { subject: string; text: string } {
  const measured = s.checks.filter((c) => c.uptimePct !== null);
  const worst = measured.length ? Math.min(...measured.map((c) => c.uptimePct!)) : null;
  const lines: string[] = [];
  lines.push(`kernelCAD prod, ${iso(s.from)} to ${iso(s.to)}`, '');
  lines.push('Uptime per check (runs, uptime, p50, p95):');
  for (const c of s.checks) {
    const up = c.uptimePct === null ? 'no runs' : `${c.uptimePct.toFixed(2)}%`;
    lines.push(`  ${nameOf(c.checkId)}: ${c.runs} runs, ${up}, p50 ${ms(c.p50Ms)}, p95 ${ms(c.p95Ms)}`);
  }
  lines.push('', `Incidents (${FAIL_AFTER}+ failed runs in a row): ${s.incidents.length}`);
  for (const i of s.incidents) {
    const end = i.end === undefined ? 'still down' : `to ${iso(i.end)}`;
    lines.push(`  ${nameOf(i.checkId)}: ${iso(i.start)} ${end}, ${duration(i.durationMs)}, ${i.runs} runs. ${i.error ?? ''}`.trimEnd());
  }
  lines.push(`Single failed runs that passed next time: ${s.blips}`);
  const causes = Object.entries(s.pool.killsByCause).map(([k, n]) => `${k} ${n}`).join(', ');
  lines.push('', 'OCCT pool:');
  lines.push(`  kills: ${s.pool.kills}${causes ? ` (${causes})` : ''}`);
  lines.push(`  worker respawns: ${s.pool.respawns}`);
  lines.push(`  API process restarts (counters reset): ${s.pool.serverRestarts}`);
  lines.push(`  max worker RSS: ${s.pool.maxRssMb === null ? '-' : `${s.pool.maxRssMb} MB`}`);
  lines.push('', `Deploys seen: ${s.deploys.length}`);
  for (const d of s.deploys) lines.push(`  ${iso(d.at)}: ${shortSha(d.from)} -> ${shortSha(d.to)}`);
  const head = worst === null ? 'no data' : `worst ${worst.toFixed(2)}%`;
  return {
    subject: `[kernelCAD daily] ${head}, ${s.incidents.length} incident(s), ${s.deploys.length} deploy(s)`,
    text: lines.join('\n'),
  };
}
