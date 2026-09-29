// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback, useEffect, useState } from 'react';
import { listMyProjects } from '../../funnel/lib/apiClient';
import { findNewProject, WATCH_INTERVAL_MS, WATCH_LIMIT_MS, type WatchState } from './firstModelWatch';

type ListProjects = () => Promise<ReadonlyArray<{ slug: string; title: string; updated_at: string }>>;

/**
 * Poll the signed-in user's projects until one saved after the watch started
 * appears, for at most WATCH_LIMIT_MS. `restart` starts a new watch window.
 */
export function useFirstModelWatch(signedIn: boolean, list: ListProjects = listMyProjects) {
  const [since, setSince] = useState(() => Date.now());
  const [result, setResult] = useState<WatchState>({ kind: 'watching', elapsedMs: 0 });

  useEffect(() => {
    if (!signedIn) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async (): Promise<void> => {
      let next: WatchState;
      try {
        const found = findNewProject(await list(), since);
        const elapsedMs = Date.now() - since;
        next = found
          ? { kind: 'found', project: found }
          : elapsedMs >= WATCH_LIMIT_MS
            ? { kind: 'timeout' }
            : { kind: 'watching', elapsedMs };
      } catch (e) {
        next = { kind: 'error', message: e instanceof Error ? e.message : String(e) };
      }
      if (stopped) return;
      setResult(next);
      if (next.kind === 'watching') timer = setTimeout(() => void tick(), WATCH_INTERVAL_MS);
    };
    void tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [signedIn, since, list]);

  const restart = useCallback(() => {
    setResult({ kind: 'watching', elapsedMs: 0 });
    setSince(Date.now());
  }, []);
  const state: WatchState = signedIn ? result : { kind: 'signed_out' };
  return { state, since, restart };
}
