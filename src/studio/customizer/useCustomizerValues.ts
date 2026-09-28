// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ParamValue } from '../../shared/runtime/paramTable';
import {
  defaultValues,
  readUrlValues,
  writeUrlValues,
  type CustomizerParam,
  type CustomizerValues,
} from './customizerParams';

export interface CustomizerValuesOptions {
  params: readonly CustomizerParam[];
  /** Re-run the model with these values. Rejects on a failed build. */
  execute: (values: CustomizerValues) => Promise<void>;
  debounceMs: number;
}

export interface CustomizerValuesState {
  values: CustomizerValues;
  setValue: (name: string, value: ParamValue) => void;
  /** Run a pending debounced edit now (slider release, Enter). */
  flush: () => void;
  reset: () => void;
  /** An edit is waiting for its debounce. */
  pending: boolean;
  runError: string | null;
  /** Shared-link values that were ignored, one line each. */
  ignoredUrlValues: string[];
}

function currentSearch(): string {
  return typeof window === 'undefined' ? '' : window.location.search;
}

function replaceUrl(params: readonly CustomizerParam[], values: CustomizerValues): void {
  if (typeof window === 'undefined') return;
  const { pathname, search, hash } = window.location;
  const nextSearch = writeUrlValues(search, params, values);
  if (nextSearch === search) return;
  window.history.replaceState(window.history.state, '', `${pathname}${nextSearch}${hash}`);
}

function differsFromDefaults(params: readonly CustomizerParam[], values: CustomizerValues): boolean {
  return params.some((param) => values[param.name] !== param.defaultValue);
}

/**
 * Owns the customizer's values: seeded from the declared defaults plus any
 * valid `?p.<name>=` values of a shared link, mirrored back into the URL on
 * every edit, and pushed to `execute` after a debounce. Never persists
 * anything beyond the URL of this tab.
 */
export function useCustomizerValues({ params, execute, debounceMs }: CustomizerValuesOptions): CustomizerValuesState {
  const [initial] = useState(() => {
    const fromUrl = readUrlValues(currentSearch(), params);
    return { values: { ...defaultValues(params), ...fromUrl.values }, ignored: fromUrl.ignored };
  });
  const [values, setValues] = useState<CustomizerValues>(initial.values);
  const [pending, setPending] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queued = useRef<CustomizerValues | null>(null);

  const run = useCallback((next: CustomizerValues) => {
    execute(next).then(
      () => setRunError(null),
      (err: unknown) => setRunError(err instanceof Error ? err.message : String(err)),
    );
  }, [execute]);

  const cancelTimer = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const flush = useCallback(() => {
    const next = queued.current;
    cancelTimer();
    queued.current = null;
    setPending(false);
    if (next) run(next);
  }, [cancelTimer, run]);

  // A shared link with a configuration builds it once on load, and the URL
  // drops the values that were ignored.
  useEffect(() => {
    replaceUrl(params, initial.values);
    if (differsFromDefaults(params, initial.values)) run(initial.values);
    return cancelTimer;
    // Mount only: `initial` is fixed for this component's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setValue = useCallback((name: string, value: ParamValue) => {
    const next = { ...values, [name]: value };
    setValues(next);
    replaceUrl(params, next);
    cancelTimer();
    queued.current = next;
    setPending(true);
    timer.current = setTimeout(flush, debounceMs);
  }, [values, params, cancelTimer, flush, debounceMs]);

  const reset = useCallback(() => {
    const next = defaultValues(params);
    cancelTimer();
    queued.current = null;
    setPending(false);
    setValues(next);
    replaceUrl(params, next);
    run(next);
  }, [params, cancelTimer, run]);

  return { values, setValue, flush, reset, pending, runError, ignoredUrlValues: initial.ignored };
}
