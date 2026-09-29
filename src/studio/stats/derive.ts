// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Pure helpers that turn the /api/v1/admin/stats payload into what the page
// shows. A value whose source section failed is `null` ("unknown"), never 0.

import type { AdminStats, ExportFormatCounters, Generations, McpTool, RetentionCell } from './types';

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

export function exportTotals(formats: Record<string, ExportFormatCounters>): { total: number; succeeded: number } {
  let total = 0;
  let succeeded = 0;
  for (const c of Object.values(formats)) {
    total += c.total;
    succeeded += c.ok + c.warning;
  }
  return { total, succeeded };
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
  unknown: boolean;
}

export function kpis(s: AdminStats): Kpi[] {
  const unknown = (key: string, label: string): Kpi => ({ key, label, value: '—', note: 'read failed', unknown: true });
  const out: Kpi[] = [];
  out.push(s.growth
    ? { key: 'signups', label: 'Sign-ups', value: fmtInt(sum(s.growth.signups)), note: `${fmtInt(s.growth.accounts_total)} accounts total`, unknown: false }
    : unknown('signups', 'Sign-ups'));
  out.push(s.activity
    ? { key: 'active', label: 'Active accounts', value: fmtInt(s.activity.active_accounts), note: 'any activity in window', unknown: false }
    : unknown('active', 'Active accounts'));
  out.push(s.growth
    ? { key: 'connected', label: 'Connected agents', value: fmtInt(s.growth.connected_accounts_total), note: `+${fmtInt(s.growth.connected_accounts_new)} new in window`, unknown: false }
    : unknown('connected', 'Connected agents'));
  out.push(s.money
    ? { key: 'paying', label: 'Paying', value: fmtInt(sum(Object.values(s.money.active_by_tier))), note: 'active subscriptions', unknown: false }
    : unknown('paying', 'Paying'));
  const gen = generationSuccess(s.generations);
  out.push(s.generations
    ? { key: 'gen', label: 'Hosted-agent success', value: fmtPct(gen), note: `${fmtInt(s.generations.total)} runs`, unknown: false }
    : unknown('gen', 'Hosted-agent success'));
  out.push(s.mcp
    ? { key: 'mcp', label: 'MCP error rate', value: fmtPct(ratio(s.mcp.errors, s.mcp.calls), 1), note: `${fmtInt(s.mcp.calls)} tool calls`, unknown: false }
    : unknown('mcp', 'MCP error rate'));
  const ex = exportTotals(s.exports.formats);
  out.push({ key: 'exports', label: 'Export success', value: fmtPct(ratio(ex.succeeded, ex.total)), note: `${fmtInt(ex.total)} since restart`, unknown: false });
  const up = s.health.uptime?.uptime_pct ?? null;
  out.push(!s.health.uptime_configured
    ? { key: 'uptime', label: 'Uptime', value: '—', note: 'monitor not configured', unknown: false }
    : s.health.uptime
      ? { key: 'uptime', label: 'Uptime', value: up === null ? '—' : `${up.toFixed(2)}%`, note: 'uptime monitor', unknown: false }
      : unknown('uptime', 'Uptime'));
  return out;
}
