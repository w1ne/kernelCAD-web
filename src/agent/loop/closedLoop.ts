import {
  defaultBuildRepairPrompt,
  type ClosedLoopInput,
  type ClosedLoopResult,
  type LoopMessage,
} from './types.js';
import { selectBest, type ScoredCandidate } from './bestOfN.js';

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
 * When `candidates > 1`, the FIRST attempt fans out to N diverse samples, selects the
 * best (gate-stages, then oracle score), and the winner alone enters the repair loop
 * (W4 best-of-N). The oracle score is used for SELECTION ONLY — it never feeds a repair
 * prompt, which is the guard against iterating one sample against the scorer.
 *
 * Invariant: never returns status:'passed' unless the gate suite reported ok for the
 * selected candidate. A broken artifact returns 'gate_failed' (or 'no_script').
 */
export async function runClosedLoop(input: ClosedLoopInput): Promise<ClosedLoopResult> {
  const maxAttempts = input.maxAttempts ?? 3;
  const candidateCount = Math.max(1, input.candidates ?? 1);
  const buildRepairPrompt = input.buildRepairPrompt ?? defaultBuildRepairPrompt;

  const messages: LoopMessage[] = [{ role: 'user', content: input.prompt }];
  let tokensIn = 0;
  let tokensOut = 0;
  let lastScriptPath = '';
  let lastText = '';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    input.onEvent?.({ type: 'attempt', n: attempt });

    // --- W4 best-of-N: fan out on the first attempt only, when configured. ---
    if (attempt === 1 && candidateCount > 1) {
      const genResults = await Promise.all(
        Array.from({ length: candidateCount }, (_, i) => input.generate(messages, { variant: i })),
      );
      const scored: ScoredCandidate[] = [];
      for (const gen of genResults) {
        tokensIn += gen.tokensIn;
        tokensOut += gen.tokensOut;
        const code = input.extractScript(gen.text);
        if (code === null) continue;
        const scriptPath = await input.writeScript(code);
        const report = await input.gateRunner.run(scriptPath);
        const oracleScore = input.scoreCandidate ? await input.scoreCandidate(scriptPath, report) : null;
        scored.push({ scriptPath, text: gen.text, report, oracleScore });
      }

      if (scored.length === 0) {
        // No candidate produced a script — mirror the single-sample no_script path.
        if (attempt < maxAttempts) {
          messages.push({ role: 'assistant', content: genResults[genResults.length - 1].text });
          messages.push({
            role: 'user',
            content: 'Could not extract a code block from your reply. Return the full script in a single fenced code block.',
          });
          continue;
        }
        return { status: 'no_script', attempts: attempt, tokensIn, tokensOut };
      }

      const winner = selectBest(scored);
      // The sequential fan-out above leaves the LAST candidate on disk when the
      // host's writeScript reuses a single path. Re-materialize the winner so its
      // scriptPath holds the winner's code — the host scores that path post-loop.
      const winnerCode = input.extractScript(winner.text);
      const winnerPath = winnerCode !== null ? await input.writeScript(winnerCode) : winner.scriptPath;
      input.onEvent?.({
        type: 'best_of_n',
        winnerIndex: scored.indexOf(winner),
        candidates: scored.map((c) => ({
          stagesPassed: c.report.verdicts.filter((v) => v.ok).length,
          oracleScore: c.oracleScore,
        })),
      });
      lastScriptPath = winnerPath;
      lastText = winner.text;
      input.onEvent?.({ type: 'gate_report', report: winner.report });

      if (winner.report.ok) {
        return { status: 'passed', scriptPath: winnerPath, finalText: winner.text, attempts: attempt, tokensIn, tokensOut };
      }
      if (attempt < maxAttempts) {
        const repairPrompt = buildRepairPrompt(winner.report.verdicts);
        input.onEvent?.({ type: 'repair', prompt: repairPrompt });
        messages.push({ role: 'assistant', content: winner.text });
        messages.push({ role: 'user', content: repairPrompt });
        continue;
      }
      return { status: 'gate_failed', scriptPath: winnerPath, finalText: winner.text, attempts: attempt, verdicts: winner.report.verdicts, tokensIn, tokensOut };
    }

    // --- Single-sample path (unchanged: attempt > 1, or candidates <= 1). ---
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
