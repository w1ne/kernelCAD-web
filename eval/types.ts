// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Shared types for the eval harness. No runtime code here.

export interface Diagnostic {
  code: string;
  message: string;
  hint?: string;
  featureId?: string;
  // Whatever else `kernelcad evaluate --json` returns; we use these fields
  // for retry feedback and transcript rendering.
}

export interface EvaluateResult {
  ok: boolean;
  diagnostics: Diagnostic[];
  featureCount?: number;
}

export interface ShapeInfo {
  volume: number;
  surfaceArea: number;
  bbox: {
    min: [number, number, number];
    max: [number, number, number];
  };
}

export interface HarnessResult {
  gates: Record<string, boolean>;
  scored: Record<string, boolean>;
  /**
   * Optional free-form diagnostics surfaced by external scorers (e.g. the
   * cadqueryeval six-check metrics or the MUSE funnel-stage payload).
   * Passed through to score.json so downstream tooling can read them
   * without re-running the scorer.
   */
  metrics?: Record<string, number | boolean | string | null>;
}

/**
 * Context handed to a task harness by the runner. Optional second argument —
 * harnesses that don't need it keep working when invoked with the script
 * path alone (e.g. from unit tests or the best-of-N candidate selector).
 */
export interface HarnessCtx {
  /** Absolute path to the task directory (reference artifacts live here). */
  taskDir: string;
  /** Absolute path to this run's output directory (scratch + artifacts). */
  runDir: string;
}

export interface Score {
  gates: Record<string, boolean>;
  scored: Record<string, boolean>;
  gate_pass: boolean;
  score: number; // 0..1
  attempts: number; // 1..3
  tokens: { input: number; output: number; total: number };
  time_ms: number;
  /**
   * First non-OK diagnostic code observed during the agent loop, if any.
   * Used by downstream tooling (e.g. portfolio attempt classifier) to
   * tag a failed run with the diagnostic that surfaced first. `undefined`
   * when the run never produced a diagnostic (e.g. clean pass, or only
   * synthetic `eval.no-script-extracted` fallbacks).
   */
  firstFailureCode?: string;
  /**
   * W2 — funnel-gate cascade. Per-stage pass-rates derived from the gates /
   * scored maps via a documented stage→name substring mapping (see
   * computeScore in eval/lib.ts). Optional and additive: omitted stages had
   * no matching gate/scored item. Existing `score`/`gate_pass` are unaffected.
   */
  funnel?: { stage: string; passed: number; total: number }[];
  /** External-scorer metrics passed through from HarnessResult.metrics. */
  metrics?: Record<string, number | boolean | string | null>;
}

// Transcript events — captured during a run, rendered to markdown afterward.
export type TranscriptEvent =
  | { kind: 'system_prompt'; chars: number } // we don't dump the full SKILL.md into the transcript; just record its size
  | { kind: 'user_prompt'; content: string }
  | {
      kind: 'turn';
      attempt: number;
      assistant_text: string;
      script_extracted: string | null;
      tokens_in: number;
      tokens_out: number;
      ms: number;
    }
  | { kind: 'evaluate'; attempt: number; ok: boolean; diagnostics: Diagnostic[] }
  | { kind: 'cookbook_inject'; query: string; hits: Array<{ id: string; score: number }> }
  | { kind: 'score'; gates: Record<string, boolean>; scored: Record<string, boolean> };

// Agent client abstraction — lets us swap in a MockAgentClient for tests.
export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentResponse {
  text: string;
  tokens_in: number;
  tokens_out: number;
}

export interface AgentClient {
  generate(opts: {
    system: string;
    systemAddendum?: string;   // NEW — gets its own cache_control block
    messages: AgentMessage[];
    model: string;
    max_tokens: number;
    temperature?: number;   // W4: per-candidate sampling diversity for best-of-N
  }): Promise<AgentResponse>;
}

// Aggregate result for the summary table.
export interface TaskResult {
  task: string;
  score: Score | null; // null ⇒ infra_error
  infra_error?: string; // when set, this task is excluded from the summary aggregate
}
