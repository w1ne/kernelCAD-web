// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Live bill of materials for the current Studio model, from the dev
// `/__kernelcad/bom` endpoint (a thin delegate to `inspect({ of: 'bom' })`).
// The browser cannot compute this itself: rows carry capture-time fields
// (`process` / `processSource`) that the export-side lowerer drops.
//
// Addressing parity with the Studio's own mesh/review fetch: on a `?script=`
// session the viewport renders the pooled node session built from that file,
// and `useMeshFetch` addresses the review as `?script=<studioScript>`
// (plus the session token). The BOM request mirrors that `script` param, so
// the server resolves the same file and anchors `scriptDir` to its directory
// — `lib.fromSTEP('parts/…')` resolves identically in the viewport evaluation
// and the BOM panel. Without a `?script=` (plain editor / hosted) there is no
// file to address, so the request falls back to `POST { source }` — see the
// parity-limit comment in `fetchBom`.
//
// One kernel evaluation runs per (script context, source) key: subscribers
// that mount while a fetch is in flight (the Parts tab nests the Order
// sheet) share it instead of starting a second full evaluation, and the
// shared request is aborted only when its last live subscriber unmounts.

import { useEffect, useState } from 'react';
import { apiCall, rewritePath } from '../api/apiBase';
import type { BomRow, BomTotals } from '../../agent/script-runtime/bom';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';

export interface BomState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  rows: BomRow[];
  totals: BomTotals | null;
  diagnostics: CompilerDiagnostic[];
  error?: string;
}

const IDLE_BOM_STATE: BomState = { status: 'idle', rows: [], totals: null, diagnostics: [] };
const LOADING_BOM_STATE: BomState = { status: 'loading', rows: [], totals: null, diagnostics: [] };

/** The identity of one BOM evaluation: the script context + the source text.
 *  The script context is part of the key because the same source text under
 *  a different `?script=` can resolve relative assets differently. */
function bomKey(source: string, script: string | null | undefined): string {
  return `${script ?? ''}\u0000${source}`;
}

/** Ready results only, keyed by `bomKey`, so the Parts tab, the Order sheet
 *  and remounts share one kernel evaluation. Insertion-order bounded: once
 *  more than `BOM_CACHE_MAX_ENTRIES` keys are held, the oldest is evicted.
 *  Failures are not pinned — a remount retries. Tests share this module
 *  cache; see `clearBomCache`. */
const bomCache = new Map<string, BomState>();
const BOM_CACHE_MAX_ENTRIES = 16;

function bomCacheSet(key: string, state: BomState): void {
  bomCache.set(key, state);
  // Map iteration is insertion order, so the first key is always the oldest.
  while (bomCache.size > BOM_CACHE_MAX_ENTRIES) {
    const oldest = bomCache.keys().next().value;
    if (oldest === undefined) return;
    bomCache.delete(oldest);
  }
}

/** In-flight evaluations, keyed exactly like `bomCache`. `subscribers` counts
 *  the live hooks sharing this request (mounted via `useBom`). */
interface InFlightBom {
  promise: Promise<BomState>;
  controller: AbortController;
  subscribers: number;
}

const bomInFlight = new Map<string, InFlightBom>();

/** Start (or join) the shared fetch for `key`. The module-level side owns the
 *  outcome: on success it writes the settled cache even when every subscriber
 *  has already left (an orphaned fetch that was not aborted), exactly like
 *  the previous per-hook fetch did. */
function startBomFetch(key: string, source: string, script: string | null | undefined): InFlightBom {
  const controller = new AbortController();
  const entry: InFlightBom = { controller, subscribers: 0, promise: Promise.resolve(LOADING_BOM_STATE) };
  entry.promise = fetchBom(source, script, controller.signal).then(
    (next) => {
      if (bomInFlight.get(key) === entry) bomInFlight.delete(key);
      bomCacheSet(key, next);
      return next;
    },
    (err: unknown) => {
      if (bomInFlight.get(key) === entry) bomInFlight.delete(key);
      throw err;
    },
  );
  bomInFlight.set(key, entry);
  return entry;
}

/** Drop every cached BOM. Tests share one module cache (mirrors
 *  `clearStoredMeshCache` in `scriptSource.ts`). In-flight requests are torn
 *  down by their subscribers' effect cleanup, not here. */
export function clearBomCache(): void {
  bomCache.clear();
}

interface BomEndpointPayload {
  ok?: unknown;
  rows?: unknown;
  totals?: unknown;
  diagnostics?: unknown;
  error?: unknown;
}

function isAbortError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'name' in err
    && (err as { name?: unknown }).name === 'AbortError';
}

function isBomTotals(value: unknown): value is BomTotals {
  if (typeof value !== 'object' || value === null) return false;
  const totals = value as { partCount?: unknown; uniquePartCount?: unknown; totalMassG?: unknown };
  return typeof totals.partCount === 'number'
    && typeof totals.uniquePartCount === 'number'
    && (typeof totals.totalMassG === 'number' || totals.totalMassG === null);
}

async function fetchBom(source: string, script: string | null | undefined, signal: AbortSignal): Promise<BomState> {
  const { base, headers } = await apiCall();
  const init: RequestInit = script
    ? { headers, signal }
    : {
        // Parity limit (the endpoint's POST branch): it never reads a
        // `script` query param and calls `inspectBomTool({ code })` with no
        // scriptDir, so relative asset paths resolve from the dev server's
        // cwd — unlike the mesh/review POST paths, which anchor them (repo
        // examples root / the script's directory). Same class of limit as
        // the review direct-edit POST when its `script` does not resolve.
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ source }),
        signal,
      };
  const response = await fetch(
    rewritePath(script ? `/__kernelcad/bom?script=${encodeURIComponent(script)}` : '/__kernelcad/bom', base),
    init,
  );
  const payload = await response.json().catch(() => null) as BomEndpointPayload | null;
  if (!response.ok) {
    const message = typeof payload?.error === 'string' ? payload.error : `HTTP ${response.status}`;
    throw new Error(message);
  }
  // A compile failure comes back as a 200 `{ ok: false, error }` (the tool's
  // contract) — discriminate on `ok` exactly like the endpoint does.
  if (!payload || payload.ok !== true) {
    const message = typeof payload?.error === 'string' ? payload.error : 'BOM endpoint returned an unexpected payload.';
    throw new Error(message);
  }
  if (!Array.isArray(payload.rows)) throw new Error('BOM endpoint did not return rows.');
  return {
    status: 'ready',
    rows: payload.rows as BomRow[],
    totals: isBomTotals(payload.totals) ? payload.totals : null,
    diagnostics: Array.isArray(payload.diagnostics) ? payload.diagnostics as CompilerDiagnostic[] : [],
  };
}

/**
 * Fetch the BOM for `source` while `enabled`. `script` is the Studio's
 * current `?script=` param (`currentStudioScript()`): pass it to address the
 * BOM by script — exact parity with the viewport's pooled-session evaluation
 * of that file. Pass `null`/omit to POST the given `source` instead (edited
 * code without a resolvable script context).
 *
 * Subscribers with the same `bomKey` share one in-flight evaluation, aborted
 * only when the last of them unmounts. State is written only from the fetch
 * callbacks (`react-hooks/set-state-in-effect`); `idle` / `loading` are
 * derived at render from `active`, the module cache and the last settled
 * result (itself keyed by `bomKey`).
 */
export function useBom(source: string, enabled: boolean, script?: string | null): BomState {
  const [settled, setSettled] = useState<{ key: string; state: BomState } | null>(null);
  const active = enabled && source.trim().length > 0;

  useEffect(() => {
    if (!active) return undefined;
    const key = bomKey(source, script);
    // A ready result is shared through the module cache (tab + sheet +
    // remounts): no refetch.
    if (bomCache.has(key)) return undefined;
    const entry = bomInFlight.get(key) ?? startBomFetch(key, source, script);
    entry.subscribers += 1;
    let cancelled = false;
    entry.promise.then(
      (next) => {
        if (cancelled) return;
        setSettled({ key, state: next });
      },
      (err: unknown) => {
        if (cancelled || isAbortError(err)) return;
        setSettled({
          key,
          state: {
            status: 'error',
            rows: [],
            totals: null,
            diagnostics: [],
            error: err instanceof Error ? err.message : String(err),
          },
        });
      },
    );
    return () => {
      cancelled = true;
      entry.subscribers -= 1;
      // Refcounted abort: the shared request dies only when its last live
      // subscriber leaves; earlier departures just stop listening. The
      // identity check keeps a late cleanup from aborting a newer entry for
      // the same key.
      if (entry.subscribers <= 0 && bomInFlight.get(key) === entry) {
        bomInFlight.delete(key);
        entry.controller.abort();
      }
    };
  }, [active, source, script]);

  if (!active) return IDLE_BOM_STATE;
  const key = bomKey(source, script);
  const cached = bomCache.get(key);
  if (cached) return cached;
  if (settled && settled.key === key) return settled.state;
  return LOADING_BOM_STATE;
}
