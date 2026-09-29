// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// workers/uptime-monitor/src/store.ts
//
// Where the monitor keeps its history and alert state. D1Store is the prod
// store (tables in migrations/0001_uptime.sql); MemoryStore backs the tests
// and the local one-shot script.

import type { AlertState } from './alerts';
import type { HealthDetail } from './checks';

export interface ResultRow {
  ts: number;
  checkId: string;
  ok: boolean;
  latencyMs: number;
  error?: string;
  detail?: HealthDetail;
}

export interface Deploy {
  at: number;
  from: string;
  to: string;
}

export interface Meta {
  lastRunAt?: number;
  /** Commit of the last healthz answer, whatever its verdict. */
  commit?: string;
  /** The last passing healthz: when, and its pool numbers. */
  lastGood?: { at: number; detail: HealthDetail };
  lastDeploy?: Deploy;
  /** UTC day (YYYY-MM-DD) the last daily summary covered up to. */
  lastSummaryDay?: string;
}

export interface Store {
  addResults(rows: ResultRow[]): Promise<void>;
  resultsSince(ts: number): Promise<ResultRow[]>;
  /** The latest row per check id. */
  latest(): Promise<ResultRow[]>;
  getStates(): Promise<Record<string, AlertState>>;
  putStates(states: Record<string, AlertState>): Promise<void>;
  getMeta(): Promise<Meta>;
  putMeta(meta: Meta): Promise<void>;
  prune(beforeTs: number): Promise<void>;
}

/** The subset of the D1 binding the store uses. */
export interface D1Like {
  prepare(sql: string): D1StatementLike;
  batch(statements: D1StatementLike[]): Promise<unknown>;
}
export interface D1StatementLike {
  bind(...values: unknown[]): D1StatementLike;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<unknown>;
}

interface DbRow {
  ts: number;
  check_id: string;
  ok: number;
  latency_ms: number;
  error: string | null;
  detail: string | null;
}

function fromDb(r: DbRow): ResultRow {
  const row: ResultRow = { ts: r.ts, checkId: r.check_id, ok: r.ok === 1, latencyMs: r.latency_ms };
  if (r.error) row.error = r.error;
  if (r.detail) {
    try {
      row.detail = JSON.parse(r.detail) as HealthDetail;
    } catch {
      // A malformed detail only loses the pool numbers of that row.
    }
  }
  return row;
}

const STATES_KEY = 'states';
const META_KEY = 'meta';

export class D1Store implements Store {
  private readonly db: D1Like;
  constructor(db: D1Like) {
    this.db = db;
  }

  async addResults(rows: ResultRow[]): Promise<void> {
    if (!rows.length) return;
    const stmt = this.db.prepare(
      'INSERT INTO uptime_results (ts, check_id, ok, latency_ms, error, detail) VALUES (?, ?, ?, ?, ?, ?)',
    );
    await this.db.batch(
      rows.map((r) =>
        stmt.bind(r.ts, r.checkId, r.ok ? 1 : 0, Math.round(r.latencyMs), r.error ?? null, r.detail ? JSON.stringify(r.detail) : null),
      ),
    );
  }

  async resultsSince(ts: number): Promise<ResultRow[]> {
    const { results } = await this.db
      .prepare('SELECT ts, check_id, ok, latency_ms, error, detail FROM uptime_results WHERE ts >= ? ORDER BY ts, check_id')
      .bind(ts)
      .all<DbRow>();
    return results.map(fromDb);
  }

  async latest(): Promise<ResultRow[]> {
    const { results } = await this.db
      .prepare(
        'SELECT r.ts, r.check_id, r.ok, r.latency_ms, r.error, r.detail FROM uptime_results r ' +
          'JOIN (SELECT check_id, MAX(ts) AS ts FROM uptime_results GROUP BY check_id) m ' +
          'ON r.check_id = m.check_id AND r.ts = m.ts ORDER BY r.check_id',
      )
      .all<DbRow>();
    return results.map(fromDb);
  }

  private async getKey<T>(key: string, fallback: T): Promise<T> {
    const row = await this.db.prepare('SELECT value FROM uptime_state WHERE key = ?').bind(key).first<{ value: string }>();
    if (!row) return fallback;
    try {
      return JSON.parse(row.value) as T;
    } catch {
      return fallback;
    }
  }

  private async putKey(key: string, value: unknown): Promise<void> {
    await this.db
      .prepare('INSERT INTO uptime_state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .bind(key, JSON.stringify(value))
      .run();
  }

  getStates(): Promise<Record<string, AlertState>> {
    return this.getKey(STATES_KEY, {});
  }
  putStates(states: Record<string, AlertState>): Promise<void> {
    return this.putKey(STATES_KEY, states);
  }
  getMeta(): Promise<Meta> {
    return this.getKey(META_KEY, {});
  }
  putMeta(meta: Meta): Promise<void> {
    return this.putKey(META_KEY, meta);
  }

  async prune(beforeTs: number): Promise<void> {
    await this.db.prepare('DELETE FROM uptime_results WHERE ts < ?').bind(beforeTs).run();
  }
}

export class MemoryStore implements Store {
  rows: ResultRow[] = [];
  states: Record<string, AlertState> = {};
  meta: Meta = {};

  async addResults(rows: ResultRow[]): Promise<void> {
    this.rows.push(...structuredClone(rows));
  }
  async resultsSince(ts: number): Promise<ResultRow[]> {
    return structuredClone(this.rows.filter((r) => r.ts >= ts));
  }
  async latest(): Promise<ResultRow[]> {
    const by = new Map<string, ResultRow>();
    for (const r of this.rows) {
      const cur = by.get(r.checkId);
      if (!cur || r.ts >= cur.ts) by.set(r.checkId, r);
    }
    return structuredClone([...by.values()].sort((a, b) => a.checkId.localeCompare(b.checkId)));
  }
  async getStates(): Promise<Record<string, AlertState>> {
    return structuredClone(this.states);
  }
  async putStates(states: Record<string, AlertState>): Promise<void> {
    this.states = structuredClone(states);
  }
  async getMeta(): Promise<Meta> {
    return structuredClone(this.meta);
  }
  async putMeta(meta: Meta): Promise<void> {
    this.meta = structuredClone(meta);
  }
  async prune(beforeTs: number): Promise<void> {
    this.rows = this.rows.filter((r) => r.ts >= beforeTs);
  }
}
