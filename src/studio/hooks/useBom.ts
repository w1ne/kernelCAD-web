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

/** Ready results only, keyed by source text, so the Parts tab, the Order
 *  sheet and remounts share one kernel evaluation. Failures are not pinned —
 *  a remount retries. Tests share this module cache; see `clearBomCache`. */
const bomCache = new Map<string, BomState>();

/** Drop every cached BOM. Tests share one module cache (mirrors
 *  `clearStoredMeshCache` in `scriptSource.ts`). */
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
    totals: (payload.totals as BomTotals | undefined) ?? null,
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
 * State is written only from the fetch callbacks (`react-hooks/set-state-in-effect`);
 * `idle` / `loading` are derived at render from `active`, the module cache
 * and the last settled result.
 */
export function useBom(source: string, enabled: boolean, script?: string | null): BomState {
  const [settled, setSettled] = useState<{ source: string; state: BomState } | null>(null);
  const active = enabled && source.trim().length > 0;

  useEffect(() => {
    if (!active) return undefined;
    // A ready result is shared through the module cache (tab + sheet +
    // remounts): no refetch.
    if (bomCache.has(source)) return undefined;
    let cancelled = false;
    const controller = new AbortController();
    fetchBom(source, script, controller.signal)
      .then((next) => {
        if (cancelled) return;
        bomCache.set(source, next);
        setSettled({ source, state: next });
      })
      .catch((err: unknown) => {
        if (cancelled || isAbortError(err)) return;
        setSettled({
          source,
          state: {
            status: 'error',
            rows: [],
            totals: null,
            diagnostics: [],
            error: err instanceof Error ? err.message : String(err),
          },
        });
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [active, source, script]);

  if (!active) return IDLE_BOM_STATE;
  const cached = bomCache.get(source);
  if (cached) return cached;
  if (settled && settled.source === source) return settled.state;
  return LOADING_BOM_STATE;
}
