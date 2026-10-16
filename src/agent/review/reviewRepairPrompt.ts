// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/review/reviewRepairPrompt.ts
//
// The suggested repair prompt review_cad returns: bounded repair facts from
// the review diagnostics plus the design context. Split out of reviewPipeline.ts.

import { type MechanismBlockingReason, type MechanismFitnessResult } from '../../modeling/mates/mechanismFitness';
import type { ReviewCadInput, ReviewDiagnostic } from './reviewPipeline';

interface RepairFactCandidate {
  code: string;
  fact: string;
}

function collectRepairFactCandidates(
  blockingReasons: readonly MechanismBlockingReason[],
  diagnostics: readonly ReviewDiagnostic[],
): RepairFactCandidate[] {
  // Filter out non-actionable informational diagnostics. The prompt has a
  // bounded evidence budget, so make room for every distinct blocker before
  // repeating lower-level instances of the same diagnostic code.
  const actionableDiagnostics = diagnostics.filter((d) =>
    'severity' in d ? d.severity !== 'info' : true,
  );
  return [
    ...blockingReasons.map((reason) => ({
      code: reason.code,
      fact: `- ${reason.code}: ${reason.message} Hint: ${reason.repairHint}`,
    })),
    ...actionableDiagnostics.map((diagnostic) => {
      const scoped = 'sampleName' in diagnostic && diagnostic.sampleName
        ? ` [${diagnostic.sampleName}]`
        : '';
      return {
        code: diagnostic.code,
        fact: `- ${diagnostic.code}${scoped}: ${diagnostic.message} Hint: ${diagnostic.hint}`,
      };
    }),
  ];
}

function selectBoundedRepairFacts(factCandidates: readonly RepairFactCandidate[]): string[] {
  const facts: string[] = [];
  const includedCodes = new Set<string>();
  const includedFacts = new Set<string>();

  // First pass: a concise causal map. A missing transmission, for example,
  // must remain visible even when several support diagnostics precede it.
  for (const candidate of factCandidates) {
    if (facts.length === 8) break;
    if (includedCodes.has(candidate.code)) continue;
    facts.push(candidate.fact);
    includedCodes.add(candidate.code);
    includedFacts.add(candidate.fact);
  }
  // Second pass: add mate- or pose-specific detail when the bounded prompt
  // still has room, without repeating the same evidence verbatim.
  for (const candidate of factCandidates) {
    if (facts.length === 8) break;
    if (includedFacts.has(candidate.fact)) continue;
    facts.push(candidate.fact);
    includedFacts.add(candidate.fact);
  }
  return facts;
}

function buildRepairDirective(fitness: MechanismFitnessResult | undefined): string {
  return fitness === undefined
    ? ''
    : `\nRepair mode: ${fitness.repairMode}\nDirective: ${fitness.repairDirective}\n`;
}

function buildDesignContextBlock(
  input?: Pick<ReviewCadInput, 'designGoal' | 'preserveInterfaces'>,
): string {
  const designContext = [
    input?.designGoal ? `Design goal: ${input.designGoal}` : undefined,
    input?.preserveInterfaces?.length ? `Preserve interfaces: ${input.preserveInterfaces.join(', ')}` : undefined,
  ].filter((line): line is string => line !== undefined);
  return designContext.length === 0 ? '' : `\n${designContext.join('\n')}\n`;
}

export function buildSuggestedRepairPrompt(
  diagnostics: readonly ReviewDiagnostic[],
  fitness?: MechanismFitnessResult,
  input?: Pick<ReviewCadInput, 'designGoal' | 'preserveInterfaces'>,
): string {
  const blockingReasons = fitness?.blockingReasons ?? [];
  if (diagnostics.length === 0 && blockingReasons.length === 0) {
    return 'No structured diagnostics were produced. Re-run review_cad after returning an assembly scene from the script.';
  }
  const factCandidates = collectRepairFactCandidates(blockingReasons, diagnostics);
  const facts = selectBoundedRepairFacts(factCandidates);
  const repairDirective = buildRepairDirective(fitness);
  const designBlock = buildDesignContextBlock(input);
  return `Repair the kernelCAD script using these deterministic review facts:${repairDirective}${designBlock}\n${facts.join('\n')}`;
}
