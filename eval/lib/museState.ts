// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export type MusePhase = 'pending' | 'generated' | 'scored' | 'judged' | 'infra_error';

export interface CaseState {
  phase: MusePhase;
  attempts: number;
  tokens: { in: number; out: number };
  firstFailureCode?: string;
  /** Generation wall-clock, preserved so resumed scoring can report totals. */
  generationMs?: number;
  error?: string;
  protocol: string;
  updatedAt: string;
}

const PHASE_ORDER: Record<Exclude<MusePhase, 'infra_error'>, number> = {
  pending: 0,
  generated: 1,
  scored: 2,
  judged: 3,
};

export function statePath(caseDir: string): string {
  return join(caseDir, 'state.json');
}

export function writeState(caseDir: string, state: CaseState): void {
  const target = statePath(caseDir);
  const tmp = `${target}.tmp`;
  writeFileSync(tmp, JSON.stringify(state, null, 2));
  renameSync(tmp, target);
}

export function readState(caseDir: string): CaseState | null {
  const path = statePath(caseDir);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8')) as CaseState;
}

/** True when `phase` is at or past `target`. infra_error is never at-target. */
export function isAtLeast(phase: MusePhase, target: MusePhase): boolean {
  if (phase === 'infra_error' || target === 'infra_error') return false;
  return PHASE_ORDER[phase] >= PHASE_ORDER[target];
}
