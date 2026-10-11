// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// review_cad output de-duplication (FIX-05).
//
// The review pipeline reports every finding up to three times: the full
// diagnostic in `diagnostics` / `mechanismFailures`, again as
// `fitness.blockingReasons[].evidence` (plus message + repairHint), and again
// as prose in `suggestedRepairPrompt` / `repairContext.blockingReasons`. For
// an agent that is ~3x the tokens for the same facts.
//
// At the MCP boundary each finding is stated ONCE, in `diagnostics` (id
// `d<n>`) or `mechanismFailures` (id `m<n>`); everything else refers to it by
// id + code. The internal pipeline result (design_loop, Studio) is unchanged.

import type { MechanismBlockingReason, MechanismFitnessResult } from '../../modeling/mates/mechanismFitness';
import type { ReviewCadOutput } from './reviewPipeline';

/** A blocking reason that points at the diagnostic stating it. */
export interface ReviewFindingRef {
  readonly code: string;
  /** Id of the entry in `diagnostics` (d<n>) or `mechanismFailures` (m<n>). */
  readonly ref: string;
}

export type CompactBlockingReason = MechanismBlockingReason | ReviewFindingRef;

export type CompactFitness = Omit<MechanismFitnessResult, 'blockingReasons'> & {
  readonly blockingReasons: readonly CompactBlockingReason[];
};

type CompactVariant<O> = O extends { fitness: MechanismFitnessResult }
  ? Omit<O, 'fitness'> & { fitness: CompactFitness }
  : Omit<O, 'fitness'> & { fitness?: CompactFitness };

export type CompactReviewCadOutput = ReviewCadOutput extends infer O ? (O extends unknown ? CompactVariant<O> : never) : never;

interface Finding {
  readonly id: string;
  readonly code: string;
  readonly severity?: string;
  readonly sampleName?: string;
}

const MAX_PROMPT_FACTS = 8;

/** Assign ids; map each original diagnostic object to its id. */
function indexFindings<T extends { readonly code: string }>(
  list: readonly T[] | undefined,
  prefix: string,
  ids: Map<object, string>,
): Array<T & { id: string }> | undefined {
  if (list === undefined) return undefined;
  return list.map((d, i) => {
    const id = `${prefix}${i + 1}`;
    ids.set(d, id);
    return { id, ...d };
  });
}

function findingOf(entry: { readonly id: string; readonly code: string }): Finding {
  const extra = entry as { severity?: unknown; sampleName?: unknown };
  return {
    id: entry.id,
    code: entry.code,
    ...(typeof extra.severity === 'string' ? { severity: extra.severity } : {}),
    ...(typeof extra.sampleName === 'string' && extra.sampleName ? { sampleName: extra.sampleName } : {}),
  };
}

/** The diagnostic a blocking reason was built from, by identity. */
function refFor(reason: MechanismBlockingReason, ids: ReadonlyMap<object, string>): string | undefined {
  const evidence = reason.evidence;
  return typeof evidence === 'object' && evidence !== null ? ids.get(evidence) : undefined;
}

function compactReasons(
  reasons: readonly MechanismBlockingReason[],
  ids: ReadonlyMap<object, string>,
): CompactBlockingReason[] {
  return reasons.map((reason) => {
    const ref = refFor(reason, ids);
    return ref === undefined ? reason : { code: reason.code, ref };
  });
}

/** Distinct codes first, then remaining findings, capped — one line per id. */
function selectPromptFacts(candidates: readonly Finding[]): Finding[] {
  const out: Finding[] = [];
  const codes = new Set<string>();
  const seen = new Set<string>();
  for (const pass of [true, false]) {
    for (const f of candidates) {
      if (out.length === MAX_PROMPT_FACTS) return out;
      if (seen.has(f.id) || (pass && codes.has(f.code))) continue;
      out.push(f);
      seen.add(f.id);
      codes.add(f.code);
    }
  }
  return out;
}

function promptFactLine(f: Finding): string {
  return `- ${f.code}: see ${f.id}${f.sampleName ? ` [${f.sampleName}]` : ''}`;
}

/** Inline (un-referenced) blocking reasons keep their text: nothing else states it. */
function inlineReasonLine(reason: MechanismBlockingReason): string {
  return `- ${reason.code}: ${reason.message} Hint: ${reason.repairHint}`;
}

function buildPromptBody(
  reasons: readonly CompactBlockingReason[],
  findings: readonly Finding[],
): string[] {
  const byId = new Map(findings.map((f) => [f.id, f]));
  const referenced: Finding[] = [];
  const inline: string[] = [];
  for (const reason of reasons) {
    if ('ref' in reason) referenced.push(byId.get(reason.ref) ?? { id: reason.ref, code: reason.code });
    else inline.push(inlineReasonLine(reason));
  }
  const actionable = findings.filter((f) => f.severity !== 'info');
  const facts = selectPromptFacts([...referenced, ...actionable]).map(promptFactLine);
  return [...inline, ...facts].slice(0, MAX_PROMPT_FACTS);
}

function buildCompactPrompt(
  out: ReviewCadOutput,
  reasons: readonly CompactBlockingReason[],
  findings: readonly Finding[],
): string {
  const fitness = out.fitness;
  const directive = fitness === undefined
    ? ''
    : `\nRepair mode: ${fitness.repairMode}\nDirective: ${fitness.repairDirective}\n`;
  const context = [
    out.repairContext.designGoal ? `Design goal: ${out.repairContext.designGoal}` : undefined,
    out.repairContext.preserveInterfaces.length > 0
      ? `Preserve interfaces: ${out.repairContext.preserveInterfaces.join(', ')}`
      : undefined,
  ].filter((line): line is string => line !== undefined);
  const designBlock = context.length === 0 ? '' : `\n${context.join('\n')}\n`;
  const body = buildPromptBody(reasons, findings);
  return `Repair the kernelCAD script using these deterministic review facts ` +
    `(message + hint for each id are in diagnostics[] (d<n>) / mechanismFailures[] (m<n>)):` +
    `${directive}${designBlock}\n${body.join('\n')}`;
}

/**
 * State each review finding once and reference it by id everywhere else.
 * Returns `out` itself when there is nothing to de-duplicate.
 */
export function compactReviewOutput(out: ReviewCadOutput): CompactReviewCadOutput {
  const hasFindings = out.diagnostics.length > 0 || (out.mechanismFailures?.length ?? 0) > 0;
  if (!hasFindings && out.fitness === undefined) return out as unknown as CompactReviewCadOutput;

  const ids = new Map<object, string>();
  const diagnostics = indexFindings(out.diagnostics, 'd', ids) ?? [];
  const mechanismFailures = indexFindings(out.mechanismFailures, 'm', ids);
  const findings = [...diagnostics, ...(mechanismFailures ?? [])].map(findingOf);
  const reasons = out.fitness === undefined ? [] : compactReasons(out.fitness.blockingReasons, ids);
  const repairContext = {
    ...out.repairContext,
    blockingReasons: reasons.map((r) => ('ref' in r ? `${r.code} (${r.ref})` : `${r.code}: ${r.message}`)),
  };
  const keepsPrompt = 'suggestedRepairPrompt' in out && out.errorCode === undefined;
  return {
    ...out,
    diagnostics,
    ...(mechanismFailures !== undefined ? { mechanismFailures } : {}),
    ...(out.fitness !== undefined ? { fitness: { ...out.fitness, blockingReasons: reasons } } : {}),
    repairContext,
    ...(keepsPrompt ? { suggestedRepairPrompt: buildCompactPrompt(out, reasons, findings) } : {}),
  } as unknown as CompactReviewCadOutput;
}
