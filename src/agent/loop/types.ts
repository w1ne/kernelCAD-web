// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { RuntimeMesh } from '../../kernel/backends/runtimeMesh';

export interface LoopMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** One gate's verdict. Typed so repair prompts can carry concrete evidence (W3 enriches margin/locus). */
export interface GateVerdict {
  gate: string; // 'evaluate' | 'interference' | 'mechanism' | ...
  ok: boolean;
  code?: string; // diagnostic code when failed, e.g. 'mechanism.interpenetration'
  message: string;
  hint?: string;
  margin?: number; // numeric distance-from-pass (e.g. mm³ over budget) — populated by W3
  locus?: string; // topological locus, e.g. 'partA∩partB' or a featureId — populated by W3
}

export interface GateReport {
  ok: boolean;
  verdicts: GateVerdict[];
}

/** Host-injected: runs the build-blocking gate suite on a written script file. */
export interface GateRunner {
  run(scriptPath: string): Promise<GateReport>;
}

export interface ClosedLoopInput {
  prompt: string;
  generate(
    messages: LoopMessage[],
    opts?: { variant?: number },
  ): Promise<{ text: string; tokensIn: number; tokensOut: number }>;
  gateRunner: GateRunner;
  extractScript(text: string): string | null;
  writeScript(code: string): Promise<string>; // writes the candidate, returns the scriptPath
  buildRepairPrompt?(verdicts: GateVerdict[]): string; // optional; W3 supplies the rich version. Default = simple join.
  maxAttempts?: number; // default 3
  /** Number of diverse candidates to sample on the FIRST attempt only. Default 1 (unchanged). */
  candidates?: number;
  /**
   * Oracle-as-selector. Scores a written candidate for cross-candidate ranking ONLY.
   * Returns [0,1], or null if unscoreable (selection falls back to gate stages).
   * MUST NOT influence repair prompts (anti-hack invariant).
   */
  scoreCandidate?(scriptPath: string, report: GateReport): Promise<number | null>;
  /**
   * Consensus-as-selector (verifier-free, arXiv 2608.09706). When set and
   * candidates > 1, the first-attempt winner is the geometric medoid of the
   * candidates (see consensus.ts) instead of the gate/oracle ranking; gate
   * stages passed only break ties. Returns the candidate's world-frame mesh,
   * or mesh: null with a reason when it produced no valid solid. Called right
   * after writeScript, like scoreCandidate. When no candidate is valid, the
   * gate/oracle ranking picks the winner.
   */
  candidateGeometry?(
    scriptPath: string,
    report: GateReport,
  ): Promise<{ mesh: RuntimeMesh | null; invalidReason?: string }>;
  onEvent?(e: ClosedLoopEvent): void;
}

export type ClosedLoopEvent =
  | { type: 'attempt'; n: number }
  | { type: 'gate_report'; report: GateReport }
  | { type: 'repair'; prompt: string }
  | {
      type: 'best_of_n';
      winnerIndex: number;
      candidates: { stagesPassed: number; oracleScore: number | null; meanDistanceMm?: number | null }[];
      /** Which ranking chose the winner. Absent on hosts that predate consensus. */
      selector?: 'gates-oracle' | 'consensus';
      /** Consensus explanation (selector === 'consensus'). */
      reason?: string;
    };

export type ClosedLoopResult =
  | {
      status: 'passed';
      scriptPath: string;
      finalText: string;
      attempts: number;
      tokensIn: number;
      tokensOut: number;
    }
  | {
      status: 'gate_failed';
      scriptPath: string;
      finalText: string;
      attempts: number;
      verdicts: GateVerdict[];
      tokensIn: number;
      tokensOut: number;
    }
  | { status: 'no_script'; attempts: number; tokensIn: number; tokensOut: number };

/** Default repair-prompt builder used when ClosedLoopInput.buildRepairPrompt is not supplied. */
export function defaultBuildRepairPrompt(verdicts: GateVerdict[]): string {
  return (
    'Diagnostics:\n' +
    verdicts
      .filter((v) => !v.ok)
      .map((v) => `- ${v.code ?? v.gate}: ${v.message}${v.hint ? ' (hint: ' + v.hint + ')' : ''}`)
      .join('\n') +
    '\nFix and return the full corrected script.'
  );
}
