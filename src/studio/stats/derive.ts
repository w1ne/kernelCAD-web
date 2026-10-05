// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Pure helpers that turn the /api/v1/admin/stats payload into what the page
// shows. A value whose source section failed is `null` ("unknown"), never 0.

import type { AdminStats, ExportFormatCounters, ExportsPersisted, Generations, Mcp, McpTool, RetentionCell } from './types';

export function sum(xs: readonly number[] | undefined): number {
  return (xs ?? []).reduce((a, b) => a + b, 0);
}

/** n / d as a 0..1 ratio, or null when d is 0 (nothing to divide). */
export function ratio(n: number, d: number): number | null {
  return d > 0 ? n / d : null;
}

export function fmtPct(r: number | null, digits = 0): string {
  return r === null ? '—' : `${(r * 100).toFixed(digits)}%`;
}

export function fmtInt(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 10_000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString('en-US');
}

export function fmtMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '—';
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`;
}

const CLIENT_LABELS: Record<string, string> = {
  claude: 'Claude',
  chatgpt: 'ChatGPT',
  codex: 'Codex',
  claude_code: 'Claude Code',
  antigravity: 'Antigravity',
  other: 'Other',
};

export function clientLabel(bucket: string): string {
  return CLIENT_LABELS[bucket] ?? bucket;
}

/** Fixed client order, so a client keeps its row across windows. */
export function clientOrder(bucket: string): number {
  const i = Object.keys(CLIENT_LABELS).indexOf(bucket);
  return i === -1 ? 99 : i;
}

const PARTIAL = new Set(['done_partial']);
const NOT_FINISHED = new Set(['running']);

/** Hosted-agent runs per day grouped into done / partial / failed. */
export function generationGroups(g: Generations, days: number): { done: number[]; partial: number[]; failed: number[] } {
  const zero = () => Array.from({ length: days }, () => 0);
  const out = { done: zero(), partial: zero(), failed: zero() };
  for (const [status, series] of Object.entries(g.by_day)) {
    if (NOT_FINISHED.has(status)) continue;
    const target = status === 'done' ? out.done : PARTIAL.has(status) ? out.partial : out.failed;
    series.forEach((n, i) => { if (i < days) target[i] += n; });
  }
  return out;
}

/** done / finished runs (running excluded; done_partial is not done). */
export function generationSuccess(g: Generations | null): number | null {
  if (!g) return null;
  let finished = 0;
  for (const [status, n] of Object.entries(g.by_status)) if (!NOT_FINISHED.has(status)) finished += n;
  return ratio(g.by_status['done'] ?? 0, finished);
}

export function toolErrors(t: McpTool): number {
  return t.tool_errors + t.exceptions;
}

/** Tools with at least one error, most errors first. */
export function failingTools(tools: readonly McpTool[], limit = 10): McpTool[] {
  return tools
    .filter(t => toolErrors(t) > 0)
    .sort((a, b) => toolErrors(b) - toolErrors(a) || b.calls - a.calls || a.tool.localeCompare(b.tool))
    .slice(0, limit);
}

export function exportTotals(formats: Record<string, Omit<ExportFormatCounters, 'byClass'>>): { total: number; succeeded: number } {
  let total = 0;
  let succeeded = 0;
  for (const c of Object.values(formats)) {
    total += c.total;
    succeeded += c.ok + c.warning;
  }
  return { total, succeeded };
}

/**
 * Persisted export success (server v2): Studio ok + warning and MCP ok over
 * those plus Studio failed and MCP errors. Rejections (an invalid model),
 * client aborts and refusals are counted apart, not as failures.
 */
export function persistedExportTotals(p: ExportsPersisted): { succeeded: number; failed: number; rejected: number; total: number } {
  let succeeded = 0;
  let failed = 0;
  let rejected = 0;
  let total = 0;
  for (const c of Object.values(p.studio?.formats ?? {})) {
    succeeded += c.ok + c.warning;
    failed += c.failed;
    rejected += c.rejected;
    total += c.total;
  }
  if (p.mcp) {
    succeeded += p.mcp.ok;
    failed += p.mcp.errors;
    rejected += p.mcp.rejected;
    total += p.mcp.calls;
  }
  return { succeeded, failed, rejected, total };
}

/**
 * Calls that ran: v2 leaves refused calls (auth, rate limit, quota) out of
 * the failure and rejection denominators; the old section has no split.
 */
export function attemptedCalls(m: Mcp): number {
  return isMcpV2(m) ? m.calls - (m.refused ?? 0) : m.calls;
}

/** True when the MCP section uses the corrected definition (user traffic, rejections apart). */
export function isMcpV2(m: Mcp | null): boolean {
  return m?.version === 2;
}

/**
 * "since YYYY-MM-DD" when the data starts after the window's first day,
 * otherwise "last N days". Days are UTC labels, oldest first.
 */
export function dataWindow(since: string | null | undefined, days: readonly string[]): string {
  const first = days[0];
  if (since && first && since > first) return `since ${since}`;
  return `last ${days.length} day${days.length === 1 ? '' : 's'}`;
}

export function retentionRate(cell: RetentionCell): number | null {
  return ratio(cell.returned, cell.eligible);
}

export interface Kpi {
  key: string;
  label: string;
  value: string;
  /** Second line: what the number is measured over, or why it is unknown. */
  note: string;
  /** One line: what counts. */
  definition: string;
  unknown: boolean;
}

function unknownKpi(key: string, label: string, definition: string): Kpi {
  return { key, label, value: '—', note: 'read failed', definition, unknown: true };
}

function accountKpis(s: AdminStats): Kpi[] {
  const dSignups = 'New accounts created, internal accounts excluded.';
  const dActive = 'Accounts with a revision, a hosted run or an MCP token issued.';
  const dConnected = s.definitions['connected'] ?? 'Accounts with a stored OAuth grant, any client.';
  const dPaying = 'Active or trialing subscriptions now.';
  const g = s.growth;
  return [
    g ? { key: 'signups', label: 'Sign-ups', value: fmtInt(sum(g.signups)), note: `${fmtInt(g.accounts_total)} accounts total`, definition: dSignups, unknown: false }
      : unknownKpi('signups', 'Sign-ups', dSignups),
    s.activity
      ? { key: 'active', label: 'Active accounts', value: fmtInt(s.activity.active_accounts), note: dataWindow(null, s.days), definition: dActive, unknown: false }
      : unknownKpi('active', 'Active accounts', dActive),
    g ? { key: 'connected', label: 'Connected agents', value: fmtInt(g.connected_accounts_total), note: `${(g.connected_accounts_ever ?? s.connected_accounts_ever) != null ? `${fmtInt(g.connected_accounts_ever ?? s.connected_accounts_ever)} ever · ` : ''}+${fmtInt(g.connected_accounts_new)} new in window`, definition: dConnected, unknown: false }
      : unknownKpi('connected', 'Connected agents', dConnected),
    s.money
      ? { key: 'paying', label: 'Paying', value: fmtInt(sum(Object.values(s.money.active_by_tier))), note: 'active subscriptions', definition: dPaying, unknown: false }
      : unknownKpi('paying', 'Paying', dPaying),
  ];
}

function generationKpi(s: AdminStats): Kpi {
  const d = 'Hosted runs that finished done / all finished runs (partial is not done).';
  return s.generations
    ? { key: 'gen', label: 'Hosted-agent success', value: fmtPct(generationSuccess(s.generations)), note: `${fmtInt(s.generations.total)} runs`, definition: d, unknown: false }
    : unknownKpi('gen', 'Hosted-agent success', d);
}

function mcpKpis(s: AdminStats): Kpi[] {
  const m = s.mcp;
  const v2 = isMcpV2(m);
  const dMcp = v2
    ? 'Calls that ran where the tool failed (tool error or server exception). Refused calls, model rejections, the uptime monitor and probes are not counted.'
    : 'Old server definition: all traffic, model rejections counted as errors.';
  const dRejected = 'Calls where the tool worked and refused the model: diagnostics, a review verdict, a union guard.';
  if (!m) return [unknownKpi('mcp', 'MCP failure rate', dMcp), unknownKpi('rejected', 'Model rejection rate', dRejected)];
  const win = dataWindow(m.data_since, s.days);
  return [
    { key: 'mcp', label: 'MCP failure rate', value: fmtPct(ratio(m.errors, attemptedCalls(m)), 1), note: `${fmtInt(m.calls)} ${v2 ? 'user ' : ''}calls · ${win}`, definition: dMcp, unknown: false },
    v2
      ? { key: 'rejected', label: 'Model rejection rate', value: fmtPct(ratio(m.rejected ?? 0, attemptedCalls(m)), 1), note: `${fmtInt(m.rejected ?? 0)} rejected · ${win}`, definition: dRejected, unknown: false }
      : { key: 'rejected', label: 'Model rejection rate', value: '—', note: 'server not updated', definition: dRejected, unknown: false },
  ];
}

function exportKpi(s: AdminStats): Kpi {
  const p = s.exports_persisted;
  if (p) {
    const ex = persistedExportTotals(p);
    return {
      key: 'exports', label: 'Export success',
      value: fmtPct(ratio(ex.succeeded, ex.succeeded + ex.failed)),
      note: `${fmtInt(ex.total)} exports, ${fmtInt(ex.rejected)} rejected · Studio ${dataWindow(p.studio_data_since, s.days)}, MCP ${dataWindow(p.mcp_data_since, s.days)}`,
      definition: 'Studio + MCP exports that produced a file / those that finished; invalid-model rejections and aborts not counted.',
      unknown: false,
    };
  }
  const ex = exportTotals(s.exports.formats);
  return {
    key: 'exports', label: 'Export success', value: fmtPct(ratio(ex.succeeded, ex.total)), note: `${fmtInt(ex.total)} since restart`,
    definition: 'Old server: Studio exports on one container since its last restart; MCP exports not counted.', unknown: false,
  };
}

function uptimeKpi(s: AdminStats): Kpi {
  const d = 'External monitor every 5 min: passing check runs / all runs.';
  const u = s.health.uptime;
  if (!s.health.uptime_configured) return { key: 'uptime', label: 'Uptime', value: '—', note: 'monitor not configured', definition: d, unknown: false };
  if (!u) return unknownKpi('uptime', 'Uptime', d);
  const now = u.passing_now != null && u.total_now != null ? `${u.passing_now}/${u.total_now}` : null;
  if (u.uptime_pct !== null) {
    const note = [u.window_days ? `last ${u.window_days} d` : 'monitor window', now ? `${now} passing now` : null].filter(Boolean).join(' · ');
    return { key: 'uptime', label: 'Uptime', value: `${u.uptime_pct.toFixed(2)}%`, note, definition: d, unknown: false };
  }
  return {
    key: 'uptime', label: 'Uptime', value: now ?? '—',
    note: now ? 'checks passing now; no % until the monitor serves /summary' : 'no data',
    definition: d, unknown: false,
  };
}

export function kpis(s: AdminStats): Kpi[] {
  return [...accountKpis(s), generationKpi(s), ...mcpKpis(s), exportKpi(s), uptimeKpi(s)];
}

/** A clean axis maximum (1, 2, 2.5, 5 × 10^n) at or above `v`. */
export function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}
