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
  generate(messages: LoopMessage[]): Promise<{ text: string; tokensIn: number; tokensOut: number }>;
  gateRunner: GateRunner;
  extractScript(text: string): string | null;
  writeScript(code: string): Promise<string>; // writes the candidate, returns the scriptPath
  buildRepairPrompt?(verdicts: GateVerdict[]): string; // optional; W3 supplies the rich version. Default = simple join.
  maxAttempts?: number; // default 3
  onEvent?(e: ClosedLoopEvent): void;
}

export type ClosedLoopEvent =
  | { type: 'attempt'; n: number }
  | { type: 'gate_report'; report: GateReport }
  | { type: 'repair'; prompt: string };

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
