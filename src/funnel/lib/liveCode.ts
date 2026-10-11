// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { GenerateEvent } from './generateClient';

/**
 * The script the agent is writing, as the server streams it (`code` events).
 * One buffer per run: a new attempt (or `reset`) starts it over, other
 * chunks append. On `done` it becomes the final artifact's code.
 */
export interface LiveCode {
  /** The attempt the buffer belongs to (1 = first write, 2+ = a fix). */
  readonly attempt: number;
  readonly code: string;
  /** True once the run finished and `code` is the final artifact's script. */
  readonly final: boolean;
}

/** Fold one streamed event into the live code; events that carry no code leave it as is. */
export function reduceLiveCode(state: LiveCode | null, e: GenerateEvent): LiveCode | null {
  if (e.kind === 'code') {
    if (state === null || e.reset === true || e.attempt !== state.attempt || state.final) {
      return { attempt: e.attempt, code: e.delta, final: false };
    }
    return e.delta ? { ...state, code: state.code + e.delta } : state;
  }
  if (e.kind === 'done' && typeof e.artifact?.code === 'string') {
    return { attempt: state?.attempt ?? 1, code: e.artifact.code, final: true };
  }
  return state;
}

/** The live code after a sequence of events (no code events → null). */
export function liveCodeOf(events: readonly GenerateEvent[]): LiveCode | null {
  return events.reduce<LiveCode | null>(reduceLiveCode, null);
}

/** The live code view's heading: "Writing the script", or "Attempt 2 — fixing" on a retry. */
export function liveCodeHeading(live: LiveCode): string {
  if (live.final) return 'Final script';
  return live.attempt > 1 ? `Attempt ${live.attempt} — fixing` : 'Writing the script';
}
