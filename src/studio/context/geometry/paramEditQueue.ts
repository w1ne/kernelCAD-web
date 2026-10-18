// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/context/geometry/paramEditQueue.ts
//
// One in-flight + one trailing coalescing queue for stateless param edits.
// A slider drag submits the full accumulated override map per batch; without
// coalescing every batch fires its own mesh request, so a slow build answers
// with a value the user has already replaced. This queue keeps at most one
// request in flight and folds every submit that arrives meanwhile into a
// single pending map (last value per param name), fired once when the
// in-flight request settles — the same policy the pooled session's
// `params.update` endpoint applies server-side.

import type { ParamEditValues } from './paramEditsForMesh';

export interface ParamEditQueue {
  /** Queue or replace the pending edit map; resolves when the request that
   *  carried these values settles (for a coalesced value: the trailing one). */
  submit(edits: ParamEditValues): Promise<void>;
  /** In-flight + pending counts (tests + telemetry). */
  stats(): { inFlight: boolean; pending: boolean };
  /** Stop accepting; drop the pending batch (the in-flight run continues). */
  dispose(): void;
}

interface Settler {
  resolve: () => void;
  reject: (err: unknown) => void;
}

export function createParamEditQueue(run: (edits: ParamEditValues) => Promise<void>): ParamEditQueue {
  let inFlight = false;
  let disposed = false;
  let pending: ParamEditValues | null = null;
  let inFlightSettlers: Settler[] = [];
  let pendingSettlers: Settler[] = [];

  const resolveAll = (settlers: Settler[]): void => {
    for (const settler of settlers) settler.resolve();
  };

  const rejectAll = (settlers: Settler[], err: unknown): void => {
    for (const settler of settlers) settler.reject(err);
  };

  // Settle the finished run, then start the coalesced trailing batch (if one
  // is pending and the queue is still live). `in-flight` is cleared first so
  // a submit racing this hand-off joins the fresh pending batch.
  const finish = (err: unknown, failed: boolean): void => {
    inFlight = false;
    const finished = inFlightSettlers;
    inFlightSettlers = [];
    const next = pending;
    const nextSettlers = pendingSettlers;
    pending = null;
    pendingSettlers = [];
    if (failed) rejectAll(finished, err);
    else resolveAll(finished);
    if (next !== null && !disposed) start(next, nextSettlers);
    // A disposed queue dropped the batch: resolve its submits as no-ops so
    // awaiting callers cannot hang (the replacement queue carries the work).
    else resolveAll(nextSettlers);
  };

  const start = (edits: ParamEditValues, settlers: Settler[]): void => {
    inFlight = true;
    inFlightSettlers = settlers;
    let result: Promise<void>;
    try {
      result = run(edits);
    } catch (err) {
      finish(err, true);
      return;
    }
    result.then(
      () => finish(undefined, false),
      (err: unknown) => finish(err, true),
    );
  };

  return {
    submit(edits: ParamEditValues): Promise<void> {
      return new Promise<void>((resolve, reject) => {
        if (disposed) {
          resolve();
          return;
        }
        const settler = { resolve, reject };
        if (inFlight) {
          pending = { ...(pending ?? {}), ...edits };
          pendingSettlers.push(settler);
          return;
        }
        start(edits, [settler]);
      });
    },

    stats(): { inFlight: boolean; pending: boolean } {
      return { inFlight, pending: pending !== null && !disposed };
    },

    dispose(): void {
      disposed = true;
      pending = null;
      const dropped = pendingSettlers;
      pendingSettlers = [];
      resolveAll(dropped);
    },
  };
}
