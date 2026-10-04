// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/designLoopConsensus.ts
//
// design_loop `consensus: true` — best-of-N by geometric consensus
// (arXiv 2608.09706). The attempts are N independent candidates for the SAME
// goal, not a repair sequence: every attempt is reviewed (stopOnPass is
// ignored), every script is executed, candidates without a valid solid are
// dropped, and the one whose geometry agrees most with the others (medoid by
// symmetric Chamfer distance, same model frame) is selected. Ties go to more
// gates passed, then the shorter script. The selected candidate then decides
// ok / finalAttemptId / nextActionPrompt. Candidates are parallel, so the
// convergence-stall check does not apply.

import type { ConsensusResult } from '../../loop/consensus';
import type { RevisionAssist } from '../../loop/revisionAssist';
import { selectScriptsByConsensus } from './consensusCandidates';

export interface DesignLoopConsensus extends ConsensusResult {
  /** Attempt id of the selected candidate (absent when none was valid). */
  chosenAttemptId?: string;
}

/** The attempt-result fields consensus reads (structural, so this module
 *  does not import designLoop.ts). */
interface ReviewedAttempt {
  id: string;
  ok: boolean;
  functional: boolean;
  qualityOk: boolean;
  passedChecks: readonly string[];
  nextActionPrompt: string;
  revisionAssist?: RevisionAssist;
}

/** Gates an attempt passed — the consensus tie-break. Review ok, quality ok,
 *  plus each fitness check that passed. */
export function attemptGatesPassed(attempt: ReviewedAttempt): number {
  return (attempt.functional ? 1 : 0) + (attempt.qualityOk ? 1 : 0) + attempt.passedChecks.length;
}

/** Execute every attempt script and select by geometric consensus. */
export async function selectDesignLoopConsensus(
  inputs: ReadonlyArray<{ file?: string; code?: string }>,
  attempts: readonly ReviewedAttempt[],
): Promise<DesignLoopConsensus> {
  const selection = await selectScriptsByConsensus(
    inputs.map((attempt, index) => ({
      id: attempts[index].id,
      file: attempt.file,
      code: attempt.code,
      gatesPassed: attemptGatesPassed(attempts[index]),
    })),
  );
  return {
    ...selection,
    ...(selection.chosenIndex !== null ? { chosenAttemptId: attempts[selection.chosenIndex].id } : {}),
  };
}

/** The design_loop output fields the selected candidate decides. */
export function consensusDecision(
  consensus: DesignLoopConsensus,
  attempts: readonly ReviewedAttempt[],
): {
  ok: boolean;
  finalAttemptId?: string;
  nextActionPrompt?: string;
  revisionAssist?: RevisionAssist;
  consensus: DesignLoopConsensus;
} {
  const chosen = consensus.chosenIndex !== null ? attempts[consensus.chosenIndex] : undefined;
  if (chosen === undefined) {
    return {
      ok: false,
      nextActionPrompt: `${consensus.reason} Fix the candidates so at least one produces a valid solid, then rerun design_loop with consensus: true.`,
      consensus,
    };
  }
  return {
    ok: chosen.ok,
    ...(chosen.ok ? { finalAttemptId: chosen.id } : {}),
    ...(chosen.revisionAssist !== undefined ? { revisionAssist: chosen.revisionAssist } : {}),
    nextActionPrompt: chosen.ok
      ? undefined
      : `Consensus selected attempt '${chosen.id}'. ${consensus.reason}\n\n${chosen.nextActionPrompt}`,
    consensus,
  };
}
