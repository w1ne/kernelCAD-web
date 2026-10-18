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

export interface ParamEditQueue<T> {
  /** Queue or replace the pending edit map; resolves with the value of the
   *  run that carried these values (for a coalesced value: the trailing
   *  run's), or `null` when the batch was dropped (dispose/replacement). */
  submit(edits: ParamEditValues): Promise<T | null>;
  /** In-flight + pending counts (tests + telemetry). */
  stats(): { inFlight: boolean; pending: boolean };
  /** Stop accepting; drop the pending batch (the in-flight run continues). */
  dispose(): void;
}

interface Settler<T> {
  resolve: (value: T | null) => void;
  reject: (err: unknown) => void;
}

/** The finished run's outcome in settled shape: its value, or the error its
 *  submits are rejected with. */
type RunOutcome<T> = { ok: true; value: T } | { ok: false; err: unknown };

export function createParamEditQueue<T>(run: (edits: ParamEditValues) => Promise<T>): ParamEditQueue<T> {
  let inFlight = false;
  let disposed = false;
  let pending: ParamEditValues | null = null;
  let inFlightSettlers: Settler<T>[] = [];
  let pendingSettlers: Settler<T>[] = [];

  const settleAll = (settlers: Settler<T>[], outcome: RunOutcome<T>): void => {
    for (const settler of settlers) {
      if (outcome.ok) settler.resolve(outcome.value);
      else settler.reject(outcome.err);
    }
  };

  /** Resolve a batch that never ran as dropped (null). Locked choice: a
   *  replaced queue's own in-flight run still resolves its submitters with
   *  its value — the upstream revision check discards it as stale — while a
   *  batch that was pending at dispose never runs and has nothing to hand
   *  back. */
  const dropAll = (settlers: Settler<T>[]): void => {
    for (const settler of settlers) settler.resolve(null);
  };

  // Settle the finished run, then start the coalesced trailing batch (if one
  // is pending and the queue is still live). `in-flight` is cleared first so
  // a submit racing this hand-off joins the fresh pending batch.
  const finish = (outcome: RunOutcome<T>): void => {
    inFlight = false;
    const finished = inFlightSettlers;
    inFlightSettlers = [];
    const next = pending;
    const nextSettlers = pendingSettlers;
    pending = null;
    pendingSettlers = [];
    settleAll(finished, outcome);
    if (next !== null && !disposed) start(next, nextSettlers);
    // A disposed queue dropped the batch: resolve its submits as dropped so
    // awaiting callers cannot hang (the replacement queue carries the work).
    else dropAll(nextSettlers);
  };

  const start = (edits: ParamEditValues, settlers: Settler<T>[]): void => {
    inFlight = true;
    inFlightSettlers = settlers;
    let result: Promise<T>;
    try {
      result = run(edits);
    } catch (err) {
      finish({ ok: false, err });
      return;
    }
    result.then(
      (value) => finish({ ok: true, value }),
      (err: unknown) => finish({ ok: false, err }),
    );
  };

  return {
    submit(edits: ParamEditValues): Promise<T | null> {
      return new Promise<T | null>((resolve, reject) => {
        if (disposed) {
          resolve(null);
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
      return { inFlight, pending: pending !== null };
    },

    dispose(): void {
      disposed = true;
      pending = null;
      const dropped = pendingSettlers;
      pendingSettlers = [];
      dropAll(dropped);
    },
  };
}
