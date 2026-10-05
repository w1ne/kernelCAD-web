// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// A realistic GET /api/v1/admin/stats payload (7 days) for /stats tests.
import type { AdminStats } from '../../stats/types';

const DAYS = ['2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27', '2026-09-28', '2026-09-29'];

const DEFINITIONS: AdminStats['definitions'] = {
    activity: 'An account is active on a UTC day when …',
    returned: 'Returned by Dn: activity on at least 2 distinct UTC days …',
    registration: 'Registration: an OAuth dynamic client registration in the window …',
    mcp_error: 'MCP error: outcome tool_error or exception.',
  };

const GROWTH: AdminStats['growth'] = {
    signups: [50, 61, 58, 70, 44, 39, 12],
    accounts_total: 1440,
    connected_accounts_total: 386,
    connected_accounts_new: 71,
    by_client: [
      { client: 'other', connected_accounts: 9, grants_in_window: 2, registrations: 4, registrations_granted: 2 },
      { client: 'claude', connected_accounts: 240, grants_in_window: 40, registrations: 180, registrations_granted: 45 },
      { client: 'chatgpt', connected_accounts: 90, grants_in_window: 20, registrations: 30, registrations_granted: 22 },
      { client: 'claude_code', connected_accounts: 47, grants_in_window: 9, registrations: 12, registrations_granted: 10 },
    ],
  };

const ACTIVITY: AdminStats['activity'] = {
    active_accounts: 212,
    active_by_day: [40, 52, 47, 60, 38, 33, 15],
    projects_owned: [20, 25, 22, 30, 18, 15, 5],
    projects_anonymous: [8, 9, 7, 11, 6, 4, 2],
    revisions: [120, 140, 131, 160, 90, 80, 30],
    cohorts: [
      { week: '2026-09-21', size: 334, activated: 250,
        d1: { eligible: 322, returned: 97 }, d7: { eligible: 50, returned: 21 }, d30: { eligible: 0, returned: 0 } },
    ],
  };

const GENERATIONS: AdminStats['generations'] = {
    total: 100,
    by_status: { done: 70, done_partial: 10, timeout: 8, llm_failed: 7, gate_failed: 5 },
    by_day: {
      done: [10, 12, 9, 11, 10, 12, 6],
      done_partial: [1, 2, 1, 2, 1, 2, 1],
      timeout: [1, 1, 1, 2, 1, 1, 1],
      llm_failed: [1, 1, 1, 1, 1, 1, 1],
      gate_failed: [1, 1, 0, 1, 1, 1, 0],
    },
    failures: [
      { status: 'timeout', reason: 'timeout', stage: 'planning', count: 8 },
      { status: 'llm_failed', reason: 'provider_error', stage: 'llm', count: 7 },
      { status: 'gate_failed', reason: 'gate_failed', stage: 'verifying', count: 5 },
    ],
    duration_ms: { p50: 42_000, p95: 180_000 },
    prompt_tokens: 3_200_000,
    completion_tokens: 410_000,
    cost_usd: 18.42,
  };

const MCP: AdminStats['mcp'] = {
    calls: 5000,
    errors: 150,
    latency_ms: { p50: 180, p95: 4200 },
    calls_by_day: [700, 720, 690, 800, 750, 800, 540],
    errors_by_day: [20, 21, 18, 25, 22, 26, 18],
    tools: [
      { tool: 'evaluate_script', calls: 2400, tool_errors: 100, exceptions: 5, refused: 3, p50_ms: 900, p95_ms: 6000 },
      { tool: 'lookup_api', calls: 1200, tool_errors: 0, exceptions: 0, refused: 0, p50_ms: 20, p95_ms: 80 },
      { tool: 'export', calls: 300, tool_errors: 30, exceptions: 15, refused: 0, p50_ms: 3000, p95_ms: 20000 },
    ],
    clients: [
      { client: 'chatgpt', calls: 1500, errors: 60 },
      { client: 'claude', calls: 3500, errors: 90 },
    ],
    diagnostics: [{ tool: 'evaluate_script', code: 'E_SKETCH_OPEN', count: 60 }],
  };

const MONEY: AdminStats['money'] = {
    active_by_tier: { standard: 5, pro: 2 },
    past_due: 1,
    checkouts_completed: 3,
    cancellations: 1,
    payment_failures: 2,
  };

const EXPORTS: AdminStats['exports'] = {
    source: 'process',
    since: '2026-09-29T08:00:00.000Z',
    note: 'In-process counters since the server process started.',
    formats: {
      step: { total: 40, ok: 38, warning: 1, rejected: 0, failed: 1, aborted: 0, byClass: { internal: 1 } },
      dxf: { total: 10, ok: 6, warning: 0, rejected: 4, failed: 0, aborted: 0, byClass: { 'dxf-non-planar': 4 } },
    },
    durationMs: { samples: 45, p50: 900, p95: 4000, max: 9000 },
  };

const HEALTH: AdminStats['health'] = {
    commit: '0123456789abcdef0123456789abcdef01234567',
    process_started_at: '2026-09-29T08:00:00.000Z',
    pool: { workers: 2, busy: 1, queue_depth: 0, respawns: 1, recycles: 3,
      kills: { memory: 1, time: 0, crash: 0, cancelled: 2 }, rss_mb: [512, 640], warm: true },
    uptime: {
      from: '2026-09-28T10:00:00.000Z', to: '2026-09-29T10:00:00.000Z', uptime_pct: 99.65,
      checks: [{ check: 'api-healthz', uptime_pct: 99.3, p50_ms: 120, p95_ms: 400 }],
      incidents: 1, blips: 2, deploys: 1,
    },
    uptime_configured: true,
  };

export function adminStatsFixture(overrides: Partial<AdminStats> = {}): AdminStats {
  return {
    window: '7d',
    generated_at: '2026-09-29T10:00:00.000Z',
    days: DAYS,
    definitions: DEFINITIONS,
    excluded: { accounts: 2, dogfood_title_prefix: '[dogfood]', note: 'MCP tool calls include our own traffic.' },
    growth: GROWTH,
    activity: ACTIVITY,
    generations: GENERATIONS,
    mcp: MCP,
    money: MONEY,
    exports: EXPORTS,
    health: HEALTH,
    read_failures: [],
    ...overrides,
  };
}

export const NEWER_SECTIONS: Partial<AdminStats> = {
  connected_accounts_ever: 520,
  oauth_funnel: {
    by_client: [
      { client: 'claude', steps: {
        auth_shown: { attempts: 400, people: 300 }, login_completed: { attempts: 200, people: 180 },
        consent: { attempts: 150, people: 140 }, grant: { attempts: 120, people: 110 } } },
    ],
    login_methods: { google: 90, password: 40 },
  },
  funnel: {
    quota_hits: 30, quota_hit_accounts: 12, quota_hits_by_surface: { generate: 20, mcp: 10 }, quota_hits_by_tool: { export: 10 },
    checkout_started: 8, checkout_started_accounts: 6, checkout_after_quota_hit_accounts: 4,
    paid_after_checkout_accounts: 2, checkouts_completed: 2, checkouts_expired: 3,
  },
  mesh: {
    success_rate: 0.97, served_rate: 0.99, p50_ms: 800, p95_ms: 6000, cache_hit_rate: 0.4,
    success_rate_by_day: [1, 0.9, 0.95, null, 1, 0.97, 0.99],
    top_errors: [{ code: 'mesh.timeout', count: 7 }],
  },
};
