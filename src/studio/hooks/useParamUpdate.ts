// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback, useEffect, useMemo, useRef } from 'react';

/** Single param edit accepted by `updateParam` on the geometry context. */
export type ParamEdit = { name: string; value: number | boolean };

/** Shape of the raw `updateParam` plumbed through `GeometryContext` →
 *  `useRecomputeResult`. May be `undefined` before the session token has
 *  resolved (e.g. on first paint), so callers should tolerate a no-op. */
export type UpdateParamFn = (edits: ParamEdit[]) => Promise<void>;

export interface UseParamUpdateOptions {
  /** Default debounce window for `commitDebounced` in milliseconds. The
   *  recommended value for slider/scrub UIs is 100 ms (10 FPS) — enough
   *  to ride a drag without flooding the kernel with one relower per
   *  pointer-move. `0` disables debouncing and fires immediately. */
  debounceMs?: number;
  /** Source tag included in the default error log. Pass the component
   *  name so console output is bisectable: `useParamUpdate({ source: 'JointsTab' })`. */
  source?: string;
  /** Custom error sink. Replaces the default `console.warn` behavior.
   *  Receives the rejection and the edits that failed. */
  onError?: (err: unknown, edits: ParamEdit[]) => void;
}

export interface ParamUpdater {
  /** Fire `edits` immediately. Flushes any pending debounced edits first
   *  so commits arrive in author order. Errors route through `onError`. */
  commit: (edits: ParamEdit[]) => void;
  /** Coalesce `edits` with other in-flight debounced edits (per-name
   *  last-wins) and fire one batch after `debounceMs`. `debounceMs`
   *  defaults to the hook option. Trailing-edge only — the first call
   *  does not fire immediately. */
  commitDebounced: (edits: ParamEdit[], debounceMs?: number) => void;
  /** Fire any pending debounced edits right now and clear the timer. */
  flush: () => void;
}

/** Centralizes the `updateParam(...).catch(console.warn)` pattern that
 *  was being copy-pasted across every interactive tab (ParamsTab numeric,
 *  ParamsTab bool, JointsTab joint sliders). Adds a debounced variant for
 *  scrub/slider hot paths so dragging doesn't fire one POST + one relower
 *  per pointer-move.
 *
 *  Usage:
 *    const { commit, commitDebounced } = useParamUpdate(updateParam, { source: 'JointsTab' });
 *    // pointer move:
 *    onChange={(v) => commitDebounced([{ name, value: v }])}
 *    // pointer up / blur:
 *    onCommit={(v) => commit([{ name, value: v }])}
 */
export function useParamUpdate(
  updateParam: UpdateParamFn | undefined,
  opts: UseParamUpdateOptions = {},
): ParamUpdater {
  const { debounceMs: defaultDebounce = 100, source, onError: userOnError } = opts;

  // Stash callbacks in refs so the returned `commit` / `commitDebounced`
  // identities stay stable across renders. Consumers pass them into
  // event handlers; an unstable identity would invalidate their memos.
  // Ref-sync runs in a layout effect so the refs read by `commit` and
  // `commitDebounced` (both invoked from user events, never during render)
  // see the most recent props without making the callback identities
  // depend on those props.
  const updateRef = useRef(updateParam);
  const onErrorRef = useRef<UseParamUpdateOptions['onError']>(userOnError);
  const sourceRef = useRef(source);
  useEffect(() => { updateRef.current = updateParam; });
  useEffect(() => { onErrorRef.current = userOnError; });
  useEffect(() => { sourceRef.current = source; });

  // Per-name last-wins coalesce buffer. A single debounced flush sends
  // one batch containing the most recent value per param name.
  const pendingRef = useRef<Map<string, ParamEdit>>(new Map());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleError = useCallback((err: unknown, edits: ParamEdit[]) => {
    if (onErrorRef.current) { onErrorRef.current(err, edits); return; }
    const tag = sourceRef.current ? `[${sourceRef.current}] ` : '';
    console.warn(`${tag}updateParam failed`, err, edits);
  }, []);

  const fire = useCallback((edits: ParamEdit[]) => {
    if (edits.length === 0) return;
    const fn = updateRef.current;
    if (!fn) return;
    fn(edits).catch((err: unknown) => handleError(err, edits));
  }, [handleError]);

  const flush = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (pendingRef.current.size === 0) return;
    const batch = [...pendingRef.current.values()];
    pendingRef.current.clear();
    fire(batch);
  }, [fire]);

  const commit = useCallback((edits: ParamEdit[]) => {
    if (pendingRef.current.size > 0) flush();
    fire(edits);
  }, [fire, flush]);

  const commitDebounced = useCallback((edits: ParamEdit[], debounceMs?: number) => {
    const ms = debounceMs ?? defaultDebounce;
    if (ms <= 0) { fire(edits); return; }
    for (const e of edits) pendingRef.current.set(e.name, e);
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      const batch = [...pendingRef.current.values()];
      pendingRef.current.clear();
      fire(batch);
    }, ms);
  }, [defaultDebounce, fire]);

  // Drop pending edits on unmount. We do NOT auto-flush: by the time a
  // tab unmounts the GeometryContext that owns `updateParam` may be
  // tearing down too, and firing into a closing fetch path produces
  // confusing aborted-request warnings. Callers that care about the
  // trailing value should bind `flush` to pointer-up / blur explicitly.
  useEffect(() => {
    // Capture the ref'd Map at mount so the cleanup clears the same instance
    // (the ref object identity is stable, so this is behaviour-equivalent — it
    // just satisfies react-hooks/exhaustive-deps' ref-in-cleanup check).
    const pending = pendingRef.current;
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      pending.clear();
    };
  }, []);

  return useMemo(() => ({ commit, commitDebounced, flush }), [commit, commitDebounced, flush]);
}
