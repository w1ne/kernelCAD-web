// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Shape of GET /api/v1/admin/stats (kernelCAD-server lib/adminStats.ts).
// Every database section is null when its read failed; `read_failures` says
// which. Per-day arrays align with `days` (UTC, oldest first).
//
// Fields marked "v2" come from the server's admin_stats_measurement()
// (migration 20261005160000). An older server omits them; the page then
// says the number uses the old definition instead of guessing.

export type StatsWindow = '7d' | '28d' | '90d';
export const STATS_WINDOWS: readonly StatsWindow[] = ['7d', '28d', '90d'];

export type ClientBucket = 'claude' | 'chatgpt' | 'codex' | 'claude_code' | 'antigravity' | 'other';

export interface ClientConnections {
  client: ClientBucket | string;
  connected_accounts: number;
  grants_in_window: number;
  registrations: number;
  registrations_granted: number;
  /** Accounts that ever got a grant, expired ones included. Absent on an older server. */
  connected_accounts_ever?: number;
}

export interface Growth {
  signups: number[];
  accounts_total: number;
  connected_accounts_total: number;
  connected_accounts_new: number;
  /** Accounts that ever got a grant, expired ones included. Absent on an older server. */
  connected_accounts_ever?: number;
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
  /** v2: reason/stage are recorded since this day; older failed rows show reason 'legacy'. */
  instrumented_since?: string | null;
  /** v2: failed rows in the window from before instrumentation, without a reason. */
  legacy_unrecorded?: number;
  duration_ms: { p50: number | null; p95: number | null } | null;
  prompt_tokens: number;
  completion_tokens: number;
  cost_usd: number;
}

export interface McpTool {
  tool: string;
  calls: number;
  /** v2: the tool refused the caller's model. Not an error. */
  rejected?: number;
  tool_errors: number;
  exceptions: number;
  refused: number;
  p50_ms: number | null;
  p95_ms: number | null;
}

export interface Mcp {
  /** 2 = user traffic only, rejections apart from errors. Absent = old definition (all traffic, rejections are errors). */
  version?: number;
  /** v2: first day the tool-call table has data (YYYY-MM-DD). */
  data_since?: string | null;
  calls: number;
  /** tool_error + exception (v2: real failures only). */
  errors: number;
  ok?: number;
  rejected?: number;
  tool_errors?: number;
  exceptions?: number;
  refused?: number;
  /** v2: calls left out of every number: our uptime monitor and directory / scanner probes. */
  excluded?: { monitor: number; probe: number };
  latency_ms: { p50: number | null; p95: number | null } | null;
  calls_by_day: number[];
  errors_by_day: number[];
  rejected_by_day?: number[];
  tools: McpTool[];
  clients: Array<{ client: string; calls: number; errors: number; rejected?: number }>;
  diagnostics: Array<{ tool: string; code: string; count: number; outcome?: string }>;
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

export interface UptimeCheck {
  check: string;
  /** Latest run passed (monitor /status). */
  ok_now?: boolean | null;
  latency_ms?: number | null;
  /** Over the summary window (monitor /summary). */
  uptime_pct: number | null;
  p50_ms: number | null;
  p95_ms: number | null;
}

export interface UptimeSummary {
  from: string | null;
  to: string | null;
  window_days?: number | null;
  /** Passing runs / runs over the summary window, percent; null when the monitor has no /summary yet. */
  uptime_pct: number | null;
  passing_now?: number | null;
  total_now?: number | null;
  last_run_at?: string | null;
  checks: UptimeCheck[];
  incidents: number;
  blips: number;
  deploys: number;
}

export interface ExportsPersisted {
  studio_data_since: string | null;
  mcp_data_since: string | null;
  studio: {
    formats: Record<string, Omit<ExportFormatCounters, 'byClass'>>;
    duration_ms: { p50: number | null; p95: number | null } | null;
  } | null;
  mcp: { calls: number; ok: number; rejected: number; errors: number; refused: number } | null;
}

export const OAUTH_STEPS = ['auth_shown', 'login_completed', 'consent', 'grant'] as const;
export type OAuthStep = (typeof OAUTH_STEPS)[number];

export interface OAuthFunnel {
  by_client: Array<{ client: string; steps: Partial<Record<OAuthStep, { attempts: number; people: number }>> }>;
  login_methods?: Record<string, number> | Array<{ method: string; count: number }>;
}

/** Quota hit -> checkout -> paid. Counts only; accounts are distinct people. */
export interface Funnel {
  quota_hits?: number;
  quota_hit_accounts?: number;
  quota_hits_by_surface?: Record<string, number>;
  quota_hits_by_tool?: Record<string, number>;
  checkout_started?: number;
  checkout_started_accounts?: number;
  checkout_after_quota_hit_accounts?: number;
  paid_after_checkout_accounts?: number;
  checkouts_completed?: number;
  checkouts_expired?: number;
}

export interface MeshStats {
  success_rate: number | null;
  served_rate?: number | null;
  p50_ms?: number | null;
  p95_ms?: number | null;
  cache_hit_rate?: number | null;
  /** Per day, aligned with `days`; null where a day had no meshes. */
  success_rate_by_day?: Array<number | null>;
  top_errors?: Array<{ code?: string; error?: string; count: number }>;
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
  /** Newer server sections; null = read failed or migration not applied, absent = older server. */
  oauth_funnel?: OAuthFunnel | null;
  funnel?: Funnel | null;
  mesh?: MeshStats | null;
  /** Accounts that ever got a grant, expired ones included. */
  connected_accounts_ever?: number | null;
  exports: {
    source: 'process';
    since: string;
    note: string;
    formats: Record<string, ExportFormatCounters>;
    durationMs: { samples: number; p50: number; p95: number; max: number };
  };
  /** v2: export outcomes from the database (Studio export_events + MCP export calls). */
  exports_persisted?: ExportsPersisted | null;
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
    /** Since-restart Studio mesh counters (fallback while `mesh` is null). */
    mesh?: Record<string, unknown> | null;
  };
  read_failures: ReadFailure[];
}
