import {
  defaultBuildRepairPrompt,
  type ClosedLoopInput,
  type ClosedLoopResult,
  type LoopMessage,
} from './types.js';

/**
 * Hard upper bound a caller may configure for repair attempts.
 * The DEFAULT stays 3. Only safe to raise toward this ceiling once the W5
 * convergence guard ships — without it a higher cap risks repair doom-loops.
 */
export const MAX_REPAIR_ATTEMPTS_CEILING = 10;

/**
 * Host-agnostic generate→gate→repair loop. Imports nothing from fs/CLI/oracle so it
 * bundles cleanly for the server. The host injects generate(), gateRunner, extractScript,
 * and writeScript.
 *
 * Invariant: never returns status:'passed' unless the gate suite reported ok for the
 * written candidate. A broken artifact returns 'gate_failed' (or 'no_script').
 */
export async function runClosedLoop(input: ClosedLoopInput): Promise<ClosedLoopResult> {
  const maxAttempts = input.maxAttempts ?? 3;
  const buildRepairPrompt = input.buildRepairPrompt ?? defaultBuildRepairPrompt;

  const messages: LoopMessage[] = [{ role: 'user', content: input.prompt }];
  let tokensIn = 0;
  let tokensOut = 0;
  let lastScriptPath = '';
  let lastText = '';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    input.onEvent?.({ type: 'attempt', n: attempt });

    const gen = await input.generate(messages);
    tokensIn += gen.tokensIn;
    tokensOut += gen.tokensOut;
    lastText = gen.text;

    const code = input.extractScript(gen.text);
    if (code === null) {
      if (attempt < maxAttempts) {
        messages.push({ role: 'assistant', content: gen.text });
        messages.push({
          role: 'user',
          content: 'Could not extract a code block from your reply. Return the full script in a single fenced code block.',
        });
        continue;
      }
      return { status: 'no_script', attempts: attempt, tokensIn, tokensOut };
    }

    lastScriptPath = await input.writeScript(code);
    const report = await input.gateRunner.run(lastScriptPath);
    input.onEvent?.({ type: 'gate_report', report });

    if (report.ok) {
      return { status: 'passed', scriptPath: lastScriptPath, finalText: lastText, attempts: attempt, tokensIn, tokensOut };
    }

    if (attempt < maxAttempts) {
      const repairPrompt = buildRepairPrompt(report.verdicts);
      input.onEvent?.({ type: 'repair', prompt: repairPrompt });
      messages.push({ role: 'assistant', content: gen.text });
      messages.push({ role: 'user', content: repairPrompt });
      continue;
    }

    return { status: 'gate_failed', scriptPath: lastScriptPath, finalText: lastText, attempts: attempt, verdicts: report.verdicts, tokensIn, tokensOut };
  }

  // Unreachable given maxAttempts >= 1, but the type checker needs a terminal return.
  return { status: 'no_script', attempts: maxAttempts, tokensIn, tokensOut };
}
