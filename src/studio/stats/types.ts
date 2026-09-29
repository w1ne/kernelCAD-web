// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Shape of GET /api/v1/admin/stats (kernelCAD-server lib/adminStats.ts).
// Every database section is null when its read failed; `read_failures` says
// which. Per-day arrays align with `days` (UTC, oldest first).

export type StatsWindow = '7d' | '28d' | '90d';
export const STATS_WINDOWS: readonly StatsWindow[] = ['7d', '28d', '90d'];

export type ClientBucket = 'claude' | 'chatgpt' | 'codex' | 'claude_code' | 'antigravity' | 'other';

export interface ClientConnections {
  client: ClientBucket | string;
  connected_accounts: number;
  grants_in_window: number;
  registrations: number;
  registrations_granted: number;
}

export interface Growth {
  signups: number[];
  accounts_total: number;
  connected_accounts_total: number;
  connected_accounts_new: number;
  by_client: ClientConnections[];
}

export interface RetentionCell {
  eligible: number;
  returned: number;
}

export interface Cohort {
  week: string;
  size: number;
  activated: number;
  d1: RetentionCell;
  d7: RetentionCell;
  d30: RetentionCell;
}

export interface Activity {
  active_accounts: number;
  active_by_day: number[];
  projects_owned: number[];
  projects_anonymous: number[];
  revisions: number[];
  cohorts: Cohort[];
}

export interface GenerationFailure {
  status: string;
  reason: string;
  stage: string;
  count: number;
}

export interface Generations {
  total: number;
  by_status: Record<string, number>;
  by_day: Record<string, number[]>;
  failures: GenerationFailure[];
  duration_ms: { p50: number | null; p95: number | null } | null;
  prompt_tokens: number;
  completion_tokens: number;
  cost_usd: number;
}

export interface McpTool {
  tool: string;
  calls: number;
  tool_errors: number;
  exceptions: number;
  refused: number;
  p50_ms: number | null;
  p95_ms: number | null;
}

export interface Mcp {
  calls: number;
  errors: number;
  latency_ms: { p50: number | null; p95: number | null } | null;
  calls_by_day: number[];
  errors_by_day: number[];
  tools: McpTool[];
  clients: Array<{ client: string; calls: number; errors: number }>;
  diagnostics: Array<{ tool: string; code: string; count: number }>;
}

export interface Money {
  active_by_tier: Record<string, number>;
  past_due: number;
  checkouts_completed: number;
  cancellations: number;
  payment_failures: number;
}

export interface ExportFormatCounters {
  total: number;
  ok: number;
  warning: number;
  rejected: number;
  failed: number;
  aborted: number;
  byClass: Record<string, number>;
}

export interface UptimeSummary {
  from: string | null;
  to: string | null;
  uptime_pct: number | null;
  checks: Array<{ check: string; uptime_pct: number | null; p50_ms: number | null; p95_ms: number | null }>;
  incidents: number;
  blips: number;
  deploys: number;
}

export interface ReadFailure {
  source: string;
  section: string;
  code: string;
}

export interface AdminStats {
  window: StatsWindow;
  generated_at: string;
  days: string[];
  definitions: Record<string, string>;
  excluded: { accounts: number; dogfood_title_prefix: string; note: string };
  growth: Growth | null;
  activity: Activity | null;
  generations: Generations | null;
  mcp: Mcp | null;
  money: Money | null;
  exports: {
    source: 'process';
    since: string;
    note: string;
    formats: Record<string, ExportFormatCounters>;
    durationMs: { samples: number; p50: number; p95: number; max: number };
  };
  health: {
    commit: string;
    process_started_at: string;
    pool: {
      workers: number;
      busy: number;
      queue_depth: number;
      respawns: number;
      recycles: number;
      kills: Record<string, number>;
      rss_mb: number[];
      warm: boolean;
    };
    uptime: UptimeSummary | null;
    uptime_configured: boolean;
  };
  read_failures: ReadFailure[];
}
