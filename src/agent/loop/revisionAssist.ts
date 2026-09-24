// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Structured revision assist for design_loop.
//
// Honest scope: we do NOT claim full autonomous CAD rewrite. When failure
// diagnostics have a mechanical repair_script candidate (boolean miss, oversized
// fillet, …), we surface concrete patches and optionally auto-apply the first
// accepted candidate. For production/complex goals we fail closed on
// stacked-primitive toys and point at Adam cookbooks.

import type { DiagnosticCode } from '../../shared/diagnostics/diagnostic';
import { formatPatchDiff } from '../repair/applyPatch';
import { REPAIRABLE_CODES } from '../repair/candidates';
import { repairScriptTool } from '../mcp/tools/repairScript';

export const STACKED_PRIMITIVE_TOY_CODE = 'assembly.quality.stacked-primitive-toy';
export const MISSING_FILLET_CODE = 'assembly.quality.missing-fillet';

const PRODUCTION_GOAL_RE =
  /\b(real|production|complex|enclosure|gearbox|bearing\s*hous|housings?|robot[\s-]?arm|machined|manufactur|cobot)\b/i;

const REPAIRABLE_SET = new Set<string>(REPAIRABLE_CODES);

export interface DesignLoopReviewFact {
  code: string;
  severity: string;
  message: string;
  hint?: string;
}

export interface RevisionHint {
  code: string;
  summary: string;
  /** Cookbook id or short authoring steer. */
  suggestedChange?: string;
}

export interface SuggestedPatch {
  id: string;
  diagnosticCode: string;
  summary: string;
  predictedEffect: string;
  diff: string;
  evidence: Record<string, string | number>;
}

export interface RevisionAssist {
  /** What we actually did — never pretend full autonomous CAD rewrite. */
  mode: 'hints-only' | 'suggested-patches' | 'auto-applied-candidate';
  honesty: string;
  hints: RevisionHint[];
  suggestedPatches?: SuggestedPatch[];
  autoApplied?: {
    candidateId: string;
    diagnosticCode: string;
    suggestedCode: string;
    diff: string;
  };
  nextTool?: {
    name: 'repair_script' | 'lookup_cookbook' | 'why_did_this_fail';
    args: Record<string, unknown>;
  };
}

export function isProductionIntentGoal(goal: string): boolean {
  return PRODUCTION_GOAL_RE.test(goal);
}

function countPattern(source: string, pattern: RegExp): number {
  return source.match(pattern)?.length ?? 0;
}

/**
 * Fail-closed quality facts for prompts tagged complex/production: stacked
 * box unions without manufacturing-intent ops (fillet / shell / cavity subtract).
 * Mechanism scripts (assembly + mate) are excluded — use box-fragment-clutter.
 */
export function stackedPrimitiveToyFacts(
  source: string,
  goal: string,
  allowReviewWarnings: readonly string[],
): DesignLoopReviewFact[] {
  if (!isProductionIntentGoal(goal)) return [];
  if (allowReviewWarnings.includes(STACKED_PRIMITIVE_TOY_CODE)) return [];

  const hasMechanism = /\bassembly\s*\(/.test(source) && /\.mate\s*\(/.test(source);
  if (hasMechanism) return [];

  const boxCount = countPattern(source, /\bbox\s*\(/g);
  const unionCount = countPattern(source, /\.union\s*\(/g);
  const hasFillet = /\.fillet\s*\(/.test(source);
  const hasShell = /\.shell\s*\(/.test(source);
  const hasSubtract = /\.subtract\s*\(/.test(source) || /\.cutout\s*\(/.test(source);
  const looksStacked = boxCount >= 3 && unionCount >= 2;
  const manufacturingIntent = hasFillet || hasShell || hasSubtract;

  if (!looksStacked || manufacturingIntent) return [];

  return [{
    code: STACKED_PRIMITIVE_TOY_CODE,
    severity: 'warning',
    message:
      `Production/complex goal but script looks like a stacked-primitive toy ` +
      `(${boxCount} box(), ${unionCount} .union()) with no fillet/shell/subtract cavity.`,
    hint:
      `${STACKED_PRIMITIVE_TOY_CODE} — lookup_cookbook("multi-feature machined housing") and ` +
      `rewrite with param()s, wall cavity (subtract), bosses/holes, and fillet. ` +
      `Do not ship union-of-stacked-primitives for real/production/enclosure/gearbox prompts.`,
  }];
}

/**
 * Housing/enclosure production goals should carry edge blends. Missing fillet
 * with a cavity subtract is a common Adam-gap failure mode.
 */
export function missingFilletFacts(
  source: string,
  goal: string,
  allowReviewWarnings: readonly string[],
): DesignLoopReviewFact[] {
  if (!isProductionIntentGoal(goal)) return [];
  if (allowReviewWarnings.includes(MISSING_FILLET_CODE)) return [];
  if (/\bassembly\s*\(/.test(source)) return [];
  if (/\.fillet\s*\(/.test(source) || /\.chamfer\s*\(/.test(source)) return [];
  const hasSubtract = /\.subtract\s*\(/.test(source) || /\.cutout\s*\(/.test(source);
  if (!hasSubtract) return [];
  if (!/\b(hous|enclosure|gearbox|bearing|machined)\b/i.test(goal)) return [];

  return [{
    code: MISSING_FILLET_CODE,
    severity: 'warning',
    message:
      'Production housing/enclosure script has a cavity subtract but no fillet/chamfer — manufacturing-intent edges are missing.',
    hint:
      `${MISSING_FILLET_CODE} — add return body.fillet(<r>, { parallel: [0,0,1] }) (or selective edge filters). ` +
      `See cookbook multi-feature-machined-housing.`,
  }];
}

function cookbookHintsForGoal(goal: string, facts: readonly DesignLoopReviewFact[]): RevisionHint[] {
  const hints: RevisionHint[] = [];
  if (facts.some((f) => f.code === STACKED_PRIMITIVE_TOY_CODE || f.code === MISSING_FILLET_CODE)) {
    hints.push({
      code: 'cookbook.machined-housing',
      summary: 'Replace stacked primitives with manufacturing-intent BREP.',
      suggestedChange: 'lookup_cookbook("multi-feature machined housing")',
    });
  }
  if (
    isProductionIntentGoal(goal) &&
    /\b(robot|arm|mechanism|cobot|multi-?body)\b/i.test(goal)
  ) {
    hints.push({
      code: 'cookbook.mechanism-proportions',
      summary: 'Use real machine-element proportions (plates, towers, yokes — not sticks).',
      suggestedChange: 'lookup_cookbook("multi-body mechanism real proportions")',
    });
  }
  for (const fact of facts) {
    if (fact.code.startsWith('feature.') || fact.hint) {
      hints.push({
        code: fact.code,
        summary: fact.message,
        suggestedChange: fact.hint,
      });
    }
  }
  return hints.slice(0, 8);
}

function diagnosticCodes(diagnostics: readonly { code: string }[]): string[] {
  return diagnostics.map((d) => d.code);
}

export function hasRepairableDiagnostic(diagnostics: readonly { code: string }[]): boolean {
  return diagnostics.some((d) => REPAIRABLE_SET.has(d.code));
}

const HONESTY_BASE =
  'Revision assist returns actionable patches/hints for the agent to apply. ' +
  'It does not autonomously rewrite full CAD models; complex redesign stays agent-driven via nextActionPrompt + cookbooks.';

function cookbookNextTool(
  hints: readonly RevisionHint[],
): RevisionAssist['nextTool'] | undefined {
  if (hints.some((h) => h.code === 'cookbook.machined-housing')) {
    return { name: 'lookup_cookbook', args: { query: 'multi-feature machined housing' } };
  }
  if (hints.some((h) => h.code === 'cookbook.mechanism-proportions')) {
    return { name: 'lookup_cookbook', args: { query: 'multi-body mechanism real proportions' } };
  }
  return undefined;
}

function hintsOnlyAssist(hints: RevisionHint[]): RevisionAssist | undefined {
  if (hints.length === 0) return undefined;
  const nextTool = cookbookNextTool(hints);
  return {
    mode: 'hints-only',
    honesty: HONESTY_BASE,
    hints,
    ...(nextTool !== undefined ? { nextTool } : {}),
  };
}

function patchesFromRepair(
  repair: Awaited<ReturnType<typeof repairScriptTool>>,
): SuggestedPatch[] {
  return (repair.candidates ?? []).slice(0, 3).map((c) => ({
    id: c.id,
    diagnosticCode: c.code,
    summary: c.summary,
    predictedEffect: c.predictedEffect,
    diff: formatPatchDiff(c.patch),
    evidence: c.evidence,
  }));
}

function repairScriptNextTool(
  diagnosticId: string | undefined,
): NonNullable<RevisionAssist['nextTool']> {
  return {
    name: 'repair_script',
    args: { diagnostic: diagnosticId ?? 'first-error', strategy: 'try-all' },
  };
}

function autoAppliedAssist(
  repair: Awaited<ReturnType<typeof repairScriptTool>>,
  hints: RevisionHint[],
  fallbackCode: string,
  suggestedPatches: SuggestedPatch[],
): RevisionAssist {
  const applied = repair.applied!;
  const code = repair.target?.code ?? fallbackCode;
  return {
    mode: 'auto-applied-candidate',
    honesty:
      HONESTY_BASE +
      ' Auto-applied one bounded repair_script candidate after re-evaluation cleared the target diagnostic.',
    hints: [
      ...hints,
      {
        code,
        summary: `Auto-applied candidate ${applied}; use suggestedCode as the next design_loop attempt.`,
      },
    ],
    suggestedPatches,
    autoApplied: {
      candidateId: applied,
      diagnosticCode: code,
      suggestedCode: repair.new_code!,
      diff: repair.diff ?? suggestedPatches[0]?.diff ?? '',
    },
    nextTool: repairScriptNextTool(repair.target?.id),
  };
}

function suggestedPatchesAssist(
  repair: Awaited<ReturnType<typeof repairScriptTool>>,
  hints: RevisionHint[],
  suggestedPatches: SuggestedPatch[],
): RevisionAssist {
  return {
    mode: 'suggested-patches',
    honesty:
      HONESTY_BASE +
      ' Concrete AST-anchored patches below were derived from geometry; apply via repair_script or hand-edit.',
    hints,
    suggestedPatches,
    nextTool: repairScriptNextTool(repair.target?.id),
  };
}

function noCandidateAssist(
  repair: Awaited<ReturnType<typeof repairScriptTool>>,
  hints: RevisionHint[],
): RevisionAssist | undefined {
  if (hints.length === 0 && repair.target === undefined) return undefined;
  return {
    mode: 'hints-only',
    honesty:
      HONESTY_BASE +
      (repair.candidateReason !== undefined
        ? ` repair_script: ${repair.candidateReason}`
        : ' No automatic candidate for this diagnostic — revise from nextActionPrompt.'),
    hints: hints.length > 0
      ? hints
      : [{
          code: repair.target?.code ?? 'repair',
          summary: repair.candidateReason ?? repair.error ?? 'No automatic patch; revise manually.',
        }],
    nextTool: {
      name: 'why_did_this_fail',
      args: { diagnostic: repair.target?.id ?? 'first-error' },
    },
  };
}

function assistFromRepairResult(
  repair: Awaited<ReturnType<typeof repairScriptTool>>,
  hints: RevisionHint[],
  fallbackCode: string,
): RevisionAssist | undefined {
  const suggestedPatches = patchesFromRepair(repair);
  if (repair.ok && repair.new_code !== undefined && repair.applied !== undefined) {
    return autoAppliedAssist(repair, hints, fallbackCode, suggestedPatches);
  }
  if (suggestedPatches.length > 0) {
    return suggestedPatchesAssist(repair, hints, suggestedPatches);
  }
  return noCandidateAssist(repair, hints);
}

/**
 * Build structured revision assist for a failing design_loop attempt.
 *
 * - Always: cookbook / quality hints for production goals and review facts.
 * - When repairable feature diagnostics are present: call repair_script
 *   (try-all, max 2) and attach suggested patches; if a candidate clears the
 *   diagnostic, include autoApplied.suggestedCode for the next attempt.
 */
export async function buildRevisionAssist(input: {
  source: string;
  goal: string;
  reviewFacts: readonly DesignLoopReviewFact[];
  diagnostics: readonly { code: string }[];
  /** When false, only emit hints (no repair_script). Default true. */
  autoRevise?: boolean;
}): Promise<RevisionAssist | undefined> {
  const hints = cookbookHintsForGoal(input.goal, input.reviewFacts);
  const repairable = hasRepairableDiagnostic(input.diagnostics);
  const autoRevise = input.autoRevise !== false;

  if (!repairable || !autoRevise) return hintsOnlyAssist(hints);

  const codes = diagnosticCodes(input.diagnostics).filter((c) => REPAIRABLE_SET.has(c));
  const repair = await repairScriptTool({
    code: input.source,
    strategy: 'try-all',
    max_attempts: 2,
  });
  return assistFromRepairResult(repair, hints, codes[0] ?? 'repair');
}

/** Append a short revisionAssist steer onto nextActionPrompt. */
export function appendRevisionAssistPrompt(
  prompt: string,
  assist: RevisionAssist | undefined,
): string {
  if (assist === undefined) return prompt;
  const lines: string[] = [
    '',
    'Revision assist (structured — prefer over guessing):',
    `- mode: ${assist.mode}`,
    `- ${assist.honesty}`,
  ];
  if (assist.autoApplied !== undefined) {
    lines.push(
      `- AUTO-APPLIED candidate ${assist.autoApplied.candidateId} for ${assist.autoApplied.diagnosticCode}.`,
      '- Use revisionAssist.autoApplied.suggestedCode as the next attempt source.',
    );
  } else if (assist.suggestedPatches !== undefined && assist.suggestedPatches.length > 0) {
    lines.push('- Apply revisionAssist.suggestedPatches[0] (or call repair_script).');
    lines.push(`- Top patch: ${assist.suggestedPatches[0].summary}`);
  }
  for (const hint of assist.hints.slice(0, 3)) {
    lines.push(`- ${hint.code}: ${hint.summary}${hint.suggestedChange ? ` → ${hint.suggestedChange}` : ''}`);
  }
  if (assist.nextTool !== undefined) {
    lines.push(`- Next tool: ${assist.nextTool.name}(${JSON.stringify(assist.nextTool.args)})`);
  }
  return `${prompt}\n${lines.join('\n')}`;
}

export function isRepairableDiagnosticCode(code: string): code is DiagnosticCode {
  return REPAIRABLE_SET.has(code);
}
