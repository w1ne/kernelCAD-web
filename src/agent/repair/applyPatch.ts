// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Patch application with a hard region bound.
//
// A repair that can touch any line is just an edit; the value of the bound is
// that a failed repair cannot regress geometry the agent was not reasoning
// about. Both refusals are loud diagnostics rather than silent no-ops.

import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { HINT_TEMPLATES } from '../../shared/diagnostics/registry';
import { isWithinRegion } from './trace';
import type { CharRange, ScriptSpanIndex } from './scriptSpans';
import type { RepairPatch, RepairRegion } from './types';

export type ApplyPatchResult =
  | { ok: true; new_code: string }
  | { ok: false; diagnostic: CompilerDiagnostic };

/**
 * Splice `patch` into `code`, refusing anything that escapes `region` or whose
 * anchor text no longer matches.
 */
export function applyRepairPatch(
  code: string,
  patch: RepairPatch,
  region: RepairRegion,
): ApplyPatchResult {
  if (!isWithinRegion(region, patch.startLine, patch.endLine)) {
    return {
      ok: false,
      diagnostic: {
        target: 'export-occt',
        code: 'tool.repair.out-of-region',
        severity: 'error',
        message:
          `Patch targets lines ${patch.startLine}-${patch.endLine}, outside the repair region ` +
          `(${formatRegion(region)}). Refused.`,
        hint: HINT_TEMPLATES['tool.repair.out-of-region'].template,
      },
    };
  }

  const lines = code.split('\n');
  if (patch.startLine < 1 || patch.endLine > lines.length || patch.endLine < patch.startLine) {
    return { ok: false, diagnostic: driftDiagnostic(patch, '<out of range>') };
  }

  const actual = lines.slice(patch.startLine - 1, patch.endLine).join('\n');
  if (actual !== patch.before) {
    return { ok: false, diagnostic: driftDiagnostic(patch, actual) };
  }

  const replacement = patch.after.split('\n');
  lines.splice(patch.startLine - 1, patch.endLine - patch.startLine + 1, ...replacement);
  return { ok: true, new_code: lines.join('\n') };
}

/**
 * Build a line-anchored patch from a character-level rewrite.
 *
 * Candidate generators reason in character ranges (the exact argument to
 * change); the wire format is whole lines, so the agent reviewing a diff sees
 * the statement in context rather than a naked offset.
 */
export function patchFromCharEdit(
  spans: ScriptSpanIndex,
  chars: CharRange,
  replacement: string,
): RepairPatch | undefined {
  return patchFromCharEdits(spans, [{ chars, replacement }]);
}

/** Several character-level rewrites folded into ONE line-range patch. Used when
 *  a single fix has to touch two arguments of the same call (clamping both
 *  anchors, retargeting all three translate components). */
export function patchFromCharEdits(
  spans: ScriptSpanIndex,
  edits: ReadonlyArray<{ chars: CharRange; replacement: string }>,
): RepairPatch | undefined {
  if (edits.length === 0) return undefined;
  const startLine = Math.min(...edits.map(edit => spans.lineOf(edit.chars.start)));
  const endLine = Math.max(...edits.map(edit => spans.lineOf(edit.chars.end)));
  const lineChars = spans.charsOfLines({ startLine, endLine });
  if (lineChars === undefined) return undefined;

  const before = spans.text.slice(lineChars.start, lineChars.end);
  // Apply right-to-left so earlier offsets stay valid.
  const ordered = [...edits].sort((a, b) => b.chars.start - a.chars.start);
  let after = before;
  for (const edit of ordered) {
    const from = edit.chars.start - lineChars.start;
    const to = edit.chars.end - lineChars.start;
    if (from < 0 || to > after.length || to < from) return undefined;
    after = after.slice(0, from) + edit.replacement + after.slice(to);
  }
  if (after === before) return undefined;
  return { startLine, endLine, before, after };
}

/** Compact unified diff for one patch. */
export function formatPatchDiff(patch: RepairPatch): string {
  const beforeLines = patch.before.split('\n');
  const afterLines = patch.after.split('\n');
  const header = `@@ -${patch.startLine},${beforeLines.length} +${patch.startLine},${afterLines.length} @@`;
  return [
    header,
    ...beforeLines.map(line => `-${line}`),
    ...afterLines.map(line => `+${line}`),
  ].join('\n');
}

function driftDiagnostic(patch: RepairPatch, actual: string): CompilerDiagnostic {
  return {
    target: 'export-occt',
    code: 'tool.repair.source-drift',
    severity: 'error',
    message:
      `Lines ${patch.startLine}-${patch.endLine} no longer match the patch anchor. ` +
      `Expected ${JSON.stringify(patch.before)}, found ${JSON.stringify(actual)}.`,
    hint: HINT_TEMPLATES['tool.repair.source-drift'].template,
  };
}

function formatRegion(region: RepairRegion): string {
  if (region.ranges.length === 0) return 'empty';
  return region.ranges.map(r => `${r.startLine}-${r.endLine}`).join(', ');
}
