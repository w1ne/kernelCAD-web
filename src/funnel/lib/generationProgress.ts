// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { GenerateEvent, GenerationPartial } from './generateClient';

/**
 * The step list for a hosted-agent run, built from the streamed events.
 * Steps are done / current / pending. The server's `progress` stages map
 * onto four user-facing steps; "fixing" is part of building the geometry.
 */

export type StepState = 'done' | 'current' | 'pending';

export interface ProgressStep {
  readonly id: string;
  readonly label: string;
  readonly state: StepState;
  /** What the current step is doing right now ("Fixing error 2"). */
  readonly detail?: string;
}

const STEPS: ReadonlyArray<{ id: string; label: string; stages: readonly string[] }> = [
  { id: 'plan', label: 'Plan the part', stages: ['planning'] },
  { id: 'code', label: 'Write the model code', stages: ['writing_code'] },
  { id: 'build', label: 'Build the geometry', stages: ['evaluating', 'fixing'] },
  { id: 'check', label: 'Check the model', stages: ['verifying'] },
];

function stepIndexOf(stage: string): number {
  return STEPS.findIndex((s) => s.stages.includes(stage));
}

/** Current step and its detail line, from the events so far. */
export function generationSteps(events: readonly GenerateEvent[]): ProgressStep[] {
  let current = 0;
  let detail: string | undefined;
  for (const e of events) {
    if (e.kind === 'progress') {
      const i = stepIndexOf(e.stage);
      // Stages only move forward; an unknown stage keeps the step and shows its message.
      if (i > current) current = i;
      detail = e.message;
    } else if (e.kind === 'attached') {
      detail = 'Joined the same run that was already in progress';
    }
  }
  return STEPS.map((s, i) => ({
    id: s.id,
    label: s.label,
    state: i < current ? 'done' : i === current ? 'current' : 'pending',
    ...(i === current && detail ? { detail } : {}),
  }));
}

/** Server-reported elapsed time of the latest progress event, if any. */
export function serverElapsedMs(events: readonly GenerateEvent[]): number | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.kind === 'progress') return e.elapsedMs;
  }
  return null;
}

const CHECK_NAMES: Record<string, string> = {
  interference: 'interference check',
  evaluate: 'build check',
  verify: 'verification',
};

/** One plain sentence for a partial result: what did not get checked. */
export function partialSummary(partial: GenerationPartial): string {
  if (partial.unverified.length === 0) return 'The run stopped early. The model builds, but it was not fully checked.';
  const names = partial.unverified.map((u) => CHECK_NAMES[u] ?? u.replace(/_/g, ' '));
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return `The run stopped early. The model builds, but these did not run or did not pass: ${list}.`;
}
