// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { GateVerdict } from './types';

function severityRank(verdict: GateVerdict): number {
  const code = verdict.code ?? '';
  if (code.startsWith('mechanism.')) return 0;
  if (verdict.gate === 'interference' || code.startsWith('interference')) return 1;
  if (code.startsWith('feature.') || verdict.gate === 'evaluate') return 2;
  return 3;
}

function renderRootCause(verdict: GateVerdict): string {
  const parts: string[] = [];
  parts.push(`ROOT CAUSE — ${verdict.code ?? verdict.gate}: ${verdict.message}`);
  if (verdict.locus) parts.push(`  locus: ${verdict.locus}`);
  if (typeof verdict.margin === 'number') parts.push(`  margin: ${verdict.margin}`);
  if (verdict.hint) parts.push(`  fix: ${verdict.hint}`);
  return parts.join('\n');
}

function renderSecondary(verdict: GateVerdict): string {
  const tag = verdict.code ?? verdict.gate;
  const locus = verdict.locus ? ` (${verdict.locus})` : '';
  return `- ${tag}${locus}: ${verdict.message}`;
}

/**
 * Build a typed, root-cause-first repair prompt from gate verdicts.
 * Picks the highest-severity failing verdict as the root cause (rendered first
 * with code, locus, margin, hint); lists the rest compactly. No transcript replay.
 * Returns '' when nothing failed.
 */
export function buildRepairPrompt(verdicts: GateVerdict[]): string {
  const failing = verdicts.filter((v) => !v.ok);
  if (failing.length === 0) return '';
  const ranked = [...failing].sort((a, b) => severityRank(a) - severityRank(b));
  const [root, ...rest] = ranked;
  const lines: string[] = [];
  lines.push(renderRootCause(root));
  if (rest.length > 0) {
    lines.push('');
    lines.push('Other gate failures (likely downstream of the root cause):');
    for (const verdict of rest) lines.push(renderSecondary(verdict));
  }
  lines.push('');
  lines.push('Fix the root cause; keep the rest of the model unchanged. Return the full corrected script.');
  return lines.join('\n');
}
