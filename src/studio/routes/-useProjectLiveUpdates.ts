// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchProjectBySlug,
  postProjectRender,
  setProjectPrivacy,
  PRIVATE_REQUIRES_PAID,
  type ProjectRow,
} from '../../funnel/lib/apiClient';
import { shouldApplyProjectUpdate } from '../../funnel/lib/liveProject';
import { captureViewerPngBase64 } from '../components/viewer/captureViewerPng';
import { isHistoricalPin, readRequestedVersion } from './-shareRevision';

/** Where the initial row load stands:
 *  - `loading`: the row request is in flight.
 *  - `slow`: still in flight after {@link LOAD_SLOW_MS}; keep waiting, but
 *    tell the visitor and offer a retry.
 *  - `ready`: the row loaded.
 *  - `not_found`: the server answered with no row (missing slug, or a private
 *    row the visitor cannot read — row-level security hides both alike).
 *  - `timeout`: no answer after {@link LOAD_TIMEOUT_MS}. A late answer still
 *    moves the state to `ready` / `not_found`.
 *  - `error`: the request failed; `err` holds the message. */
export type LoadState = 'loading' | 'slow' | 'ready' | 'not_found' | 'timeout' | 'error';

/** After this long without an answer the page says the load is slow. */
export const LOAD_SLOW_MS = 4_000;
/** After this long without an answer the page gives up and offers a retry. */
export const LOAD_TIMEOUT_MS = 20_000;

export interface ProjectLiveUpdates {
  project: ProjectRow | null;
  err: string | null;
  loadState: LoadState;
  /** Re-run the initial project load (after an error or a timeout). */
  retry: () => void;
  liveCode: string | undefined;
  lastLiveUpdate: Date | null;
  handleRestored: (code: string) => void;
  privacyBusy: boolean;
  upgradeNeeded: boolean;
  handleTogglePrivacy: () => void;
}

/** Subscribe to the project's SSE channel and apply monotonic refetches.
 *  Extracted from useProjectLiveUpdates; the effect body is unchanged. */
function useProjectEventStream(
  slug: string,
  versionRef: { current: number | null },
  setLiveCode: (value: string | undefined) => void,
  setLastLiveUpdate: (value: Date | null) => void,
): void {
  useEffect(() => {
    let disposed = false;
    // Guarded refetch: the SSE payload carries only the version; fetch the row
    // and apply it monotonically (re-check after the await — an in-flight fetch
    // must not overwrite a newer update).
    const refetchAndApply = (incomingVersion: number | null) => {
      if (!shouldApplyProjectUpdate(versionRef.current, incomingVersion)) return;
      fetchProjectBySlug(slug)
        .then((p) => {
          if (disposed || !p) return;
          if (!shouldApplyProjectUpdate(versionRef.current, p.version ?? null)) return;
          versionRef.current = p.version ?? versionRef.current;
          setLiveCode(p.current_code);
          setLastLiveUpdate(new Date());
        })
        .catch(() => {});
    };
    const base = import.meta.env.VITE_API_BASE_URL ?? '';
    const es = new EventSource(`${base}/api/v1/projects/${encodeURIComponent(slug)}/events`);
    let hadError = false;
    es.addEventListener('update', (ev) => {
      let version: number | null = null;
      try { version = JSON.parse((ev as MessageEvent).data)?.version ?? null; } catch { /* malformed frame — refetch applies unguarded */ }
      refetchAndApply(version);
    });
    es.addEventListener('open', () => {
      // After an auto-reconnect, catch anything missed while disconnected.
      if (hadError) { hadError = false; refetchAndApply(null); }
    });
    es.addEventListener('error', () => { hadError = true; });
    return () => { disposed = true; es.close(); };
  }, [slug, versionRef, setLiveCode, setLastLiveUpdate]);
}

/** Capture-and-upload loop for the hosted backend. Extracted from
 *  useProjectLiveUpdates; the effect body is unchanged. */
// Render-to-image for web Claude: the hosted backend has no browser, so this
// open tab captures its own WebGL canvas and uploads it; an agent then fetches
// the stored image via get_latest_render.
//
// Capture only once the render has SETTLED. A fixed delay grabs an empty /
// unframed frame, because meshing + the camera-fit tween finish well after the
// project metadata loads. Instead we poll the canvas and upload the first
// frame that is stable (two consecutive grabs of ~equal size) — i.e. after the
// model is meshed and the camera has stopped moving. Re-armed on initial load
// (project) and after each live update (lastLiveUpdate). Strictly
// fire-and-forget: a failed capture/upload must never break the viewer.
function useSettledRenderCapture(
  slug: string,
  project: ProjectRow | null,
  lastLiveUpdate: Date | null,
): void {
  useEffect(() => {
    if (!project) return;
    // A `?version=N` pin of an older revision is not the project's latest
    // model; uploading its frame would replace the agent-visible render.
    if (typeof window !== 'undefined' && isHistoricalPin(project, readRequestedVersion(window.location.search ?? ''))) return;
    const FIRST_DELAY_MS = 1000; // let the first paint happen before sampling
    const POLL_MS = 600;
    const MAX_TRIES = 25; // ~15s ceiling, then give up silently
    const MIN_PNG_LEN = 2000; // skip a blank/near-empty canvas
    const STABLE_FRAC = 0.02; // ≤2% size change between grabs == settled
    let disposed = false;
    let timer: number | undefined;
    let prevLen = 0;
    let tries = 0;

    const poll = () => {
      if (disposed) return;
      tries++;
      let png: string | null = null;
      try { png = captureViewerPngBase64(); } catch { png = null; }
      if (png && png.length > MIN_PNG_LEN) {
        const settled = prevLen > 0 && Math.abs(png.length - prevLen) <= prevLen * STABLE_FRAC;
        if (settled) {
          postProjectRender(slug, png).catch(() => {});
          return; // done — captured the settled frame
        }
        prevLen = png.length;
      }
      if (tries < MAX_TRIES) timer = window.setTimeout(poll, POLL_MS);
    };

    timer = window.setTimeout(poll, FIRST_DELAY_MS);
    return () => {
      disposed = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [slug, project, lastLiveUpdate]);
}

/** Load one row by key with a bounded wait: a missing row resolves to
 *  `not_found` at once, a hung request to `slow` and then `timeout`, so a page
 *  never shows "Loading…" forever. `enabled: false` skips the request (the
 *  caller already knows the key is invalid). Shared by /p/:slug and /g/:genId. */
export function useBoundedLoad<T>(
  key: string,
  load: (key: string) => Promise<T | null>,
  enabled = true,
) {
  // Each request has a token; a result for an older token (a previous key or
  // attempt) reads as `loading`, so no state reset is needed in the effect.
  const [attempt, setAttempt] = useState(0);
  const token = `${attempt}:${key}`;
  const [result, setResult] = useState<BoundedLoadResult<T>>(() => pendingResult<T>(''));

  useEffect(() => {
    if (!enabled) return undefined;
    let disposed = false;
    let settled = false;
    const mark = (loadState: LoadState) => () => {
      if (!disposed && !settled) setResult({ ...pendingResult<T>(token), loadState });
    };
    const slowTimer = window.setTimeout(mark('slow'), LOAD_SLOW_MS);
    const timeoutTimer = window.setTimeout(mark('timeout'), LOAD_TIMEOUT_MS);
    const settle = (next: BoundedLoadResult<T>) => {
      if (disposed) return;
      settled = true;
      window.clearTimeout(slowTimer);
      window.clearTimeout(timeoutTimer);
      setResult(next);
    };
    load(key).then(
      (row) => settle({ token, row, err: null, loadState: row ? 'ready' : 'not_found' }),
      (e) => settle({ token, row: null, err: String(e), loadState: 'error' }),
    );
    return () => {
      disposed = true;
      window.clearTimeout(slowTimer);
      window.clearTimeout(timeoutTimer);
    };
  }, [token, key, load, enabled]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const setRow = useCallback((update: (row: T | null) => T | null) => {
    setResult((r) => ({ ...r, row: update(r.row) }));
  }, []);

  const current = result.token === token ? result : pendingResult<T>(token);
  return { row: current.row, setRow, err: current.err, loadState: current.loadState, retry };
}

interface BoundedLoadResult<T> {
  token: string;
  row: T | null;
  err: string | null;
  loadState: LoadState;
}

function pendingResult<T>(token: string): BoundedLoadResult<T> {
  return { token, row: null, err: null, loadState: 'loading' };
}

/** Project row loading, live SSE updates, and the owner privacy toggle for the
 *  /p/:slug viewer. */
export function useProjectLiveUpdates(slug: string): ProjectLiveUpdates {
  const {
    row: project,
    setRow: setProject,
    err,
    loadState,
    retry,
  } = useBoundedLoad(slug, fetchProjectBySlug);
  const [privacyBusy, setPrivacyBusy] = useState(false);
  const [upgradeNeeded, setUpgradeNeeded] = useState(false);
  const [liveCode, setLiveCode] = useState<string | undefined>();
  const [lastLiveUpdate, setLastLiveUpdate] = useState<Date | null>(null);
  const versionRef = useRef<number | null>(null);

  // Seed the version guard from the initial fetch.
  useEffect(() => {
    if (project) versionRef.current = project.version ?? null;
  }, [project]);

  useProjectEventStream(slug, versionRef, setLiveCode, setLastLiveUpdate);

  useSettledRenderCapture(slug, project, lastLiveUpdate);

  // Owner-only privacy toggle: public_unlisted <-> private. Making a project
  // private is Pro-gated server-side; a 403 surfaces the upgrade CTA instead.
  const handleTogglePrivacy = useCallback(async () => {
    setPrivacyBusy(true);
    setUpgradeNeeded(false);
    try {
      const next = project?.privacy === 'private' ? 'public_unlisted' : 'private';
      const { privacy } = await setProjectPrivacy(slug, next);
      setProject(p => (p ? { ...p, privacy } : p));
    } catch (e) {
      if (String(e).includes(PRIVATE_REQUIRES_PAID)) setUpgradeNeeded(true);
      // else: transient — leave the button available to retry.
    } finally {
      setPrivacyBusy(false);
    }
  }, [slug, project?.privacy, setProject]);

  // A server-side revision restore changes the project's current_code. Push it
  // through the same liveCode/lastLiveUpdate path the SSE updates use so the 3D
  // viewer re-renders to the restored revision immediately, and bump the
  // version guard so a stale in-flight SSE refetch can't clobber it.
  const handleRestored = useCallback((code: string) => {
    if (versionRef.current != null) versionRef.current += 1;
    setLiveCode(code);
    setLastLiveUpdate(new Date());
  }, []);

  return {
    project,
    err,
    loadState,
    retry,
    liveCode,
    lastLiveUpdate,
    handleRestored,
    privacyBusy,
    upgradeNeeded,
    handleTogglePrivacy,
  };
}
