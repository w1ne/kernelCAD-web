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
}

export interface Score {
  gates: Record<string, boolean>;
  scored: Record<string, boolean>;
  gate_pass: boolean;
  score: number; // 0..1
  attempts: number; // 1..3
  tokens: { input: number; output: number; total: number };
  time_ms: number;
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
    messages: AgentMessage[];
    model: string;
    max_tokens: number;
  }): Promise<AgentResponse>;
}

// Aggregate result for the summary table.
export interface TaskResult {
  task: string;
  score: Score | null; // null ⇒ infra_error
  infra_error?: string; // when set, this task is excluded from the summary aggregate
}
