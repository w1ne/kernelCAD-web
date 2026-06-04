import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { AgentClient, TranscriptEvent, TaskResult, HarnessResult } from './types';
import { extractScript, computeScore, renderTranscript } from './lib';
import { evaluateScript } from './oracle/kernelcad-client';
import { runClosedLoop, type LoopMessage } from '../src/agent/loop/closedLoop.js';
import { createWebGateRunner } from './loop/webGateRunner.js';
import type { CookbookInjection } from './cookbook-injector';

const MAX_ATTEMPTS = 3;
const MAX_TOKENS = 8000;

export interface RunTaskArgs {
  taskDir: string;            // e.g. ./eval/tasks/bracket-holes
  runDir: string;             // e.g. ./eval/runs/2026-05-02T14-00-00/bracket-holes
  agent: AgentClient;
  model: string;
  skillMd: string;
  startedAt: string;          // ISO timestamp string (filesystem-safe), used for transcript header
  cookbook?: CookbookInjection;   // optional — when set, injects cookbook snippets into the system prompt
}

export async function runTask(args: RunTaskArgs): Promise<TaskResult> {
  const taskDirAbs = resolve(args.taskDir);
  const taskName = taskDirAbs.split('/').pop() ?? 'unknown';
  const promptPath = join(taskDirAbs, 'prompt.md');
  const harnessPath = join(taskDirAbs, 'harness.ts');
  const prompt = readFileSync(promptPath, 'utf8');

  mkdirSync(args.runDir, { recursive: true });
  const outputScriptPath = join(args.runDir, 'output.kcad.ts');
  const transcriptPath = join(args.runDir, 'transcript.md');
  const scorePath = join(args.runDir, 'score.json');

  const events: TranscriptEvent[] = [];
  events.push({ kind: 'system_prompt', chars: args.skillMd.length });
  events.push({ kind: 'user_prompt', content: prompt });

  if (args.cookbook) {
    events.push({
      kind: 'cookbook_inject',
      query: args.cookbook.query,
      hits: args.cookbook.hits,
    });
  }

  // Per-turn bookkeeping. `attemptNo` mirrors the closed loop's attempt index
  // so the existing `'turn'`/`'evaluate'` transcript events keep their numbers.
  let attemptNo = 0;
  let totalIn = 0;
  let totalOut = 0;
  // First non-OK diagnostic code observed across the loop. Set once, never
  // overwritten — downstream classifiers (portfolio attempt logger) use this
  // to tag a failed run with the diagnostic that surfaced first.
  let firstFailureCode: string | undefined;

  const start = Date.now();

  // Drive the generate→gate→repair loop through the shared closed loop. The
  // web gate runner gates on evaluate AND interference, so the loop now retries
  // on interference failures too — not just on evaluate failures.
  const loopResult = await runClosedLoop({
    prompt,
    gateRunner: createWebGateRunner(),
    extractScript,
    maxAttempts: MAX_ATTEMPTS,
    writeScript: async (code: string) => {
      writeFileSync(outputScriptPath, code);
      return outputScriptPath;
    },
    generate: async (messages: LoopMessage[]) => {
      attemptNo += 1;
      const turnStart = Date.now();
      const resp = await args.agent.generate({
        system: args.skillMd,
        systemAddendum: args.cookbook?.systemPromptAddendum,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        model: args.model,
        max_tokens: MAX_TOKENS,
      });
      totalIn += resp.tokens_in;
      totalOut += resp.tokens_out;
      events.push({
        kind: 'turn',
        attempt: attemptNo,
        assistant_text: resp.text,
        script_extracted: extractScript(resp.text),
        tokens_in: resp.tokens_in,
        tokens_out: resp.tokens_out,
        ms: Date.now() - turnStart,
      });
      return { text: resp.text, tokensIn: resp.tokens_in, tokensOut: resp.tokens_out };
    },
    onEvent: (e) => {
      if (e.type === 'gate_report') {
        const failing = e.report.verdicts.filter((v) => !v.ok);
        events.push({
          kind: 'evaluate',
          attempt: attemptNo,
          ok: e.report.ok,
          diagnostics: failing.map((v) => ({
            code: v.code ?? v.gate,
            message: v.message,
            hint: v.hint,
            featureId: v.locus,
          })),
        });
        if (firstFailureCode === undefined && failing.length > 0) {
          firstFailureCode = failing[0].code ?? failing[0].gate;
        }
      }
    },
  });

  // If we never extracted a script, write a placeholder so the human can read
  // the run; the harness will be skipped and gate-fail recorded below.
  if (loopResult.status === 'no_script') {
    writeFileSync(outputScriptPath, '// (no script extracted from any attempt)');
  }

  // Re-run evaluate on the final written script to preserve the EXACT prior
  // clean-decision + firstFailureCode semantics: the harness must still run
  // when the script evaluates clean, even though the loop may have stopped on
  // interference (which the harness does not itself gate on).
  const finalEvaluate =
    loopResult.status === 'no_script'
      ? {
          ok: false,
          diagnostics: [
            { code: 'eval.no-script-extracted', message: 'No script extracted from any attempt.' },
          ],
        }
      : await evaluateScript(outputScriptPath);
  if (firstFailureCode === undefined && !finalEvaluate.ok && finalEvaluate.diagnostics.length > 0) {
    firstFailureCode = finalEvaluate.diagnostics[0].code;
  }
  const lastEvaluateOk = finalEvaluate.ok;

  // Run the task's harness against the final output.
  let harnessResult: HarnessResult;
  if (lastEvaluateOk) {
    const harnessModule = await import(harnessPath);
    harnessResult = await harnessModule.default(outputScriptPath);
  } else {
    harnessResult = { gates: { 'evaluates clean': false }, scored: {} };
  }

  events.push({
    kind: 'score',
    gates: harnessResult.gates,
    scored: harnessResult.scored,
  });

  const score = computeScore(harnessResult, {
    attempts: loopResult.attempts,
    tokens_in: totalIn,
    tokens_out: totalOut,
    time_ms: Date.now() - start,
    firstFailureCode,
  });

  writeFileSync(scorePath, JSON.stringify(score, null, 2));
  writeFileSync(
    transcriptPath,
    renderTranscript({
      task: taskName,
      model: args.model,
      started_at: args.startedAt,
      events,
      score,
    }),
  );

  return { task: taskName, score };
}
