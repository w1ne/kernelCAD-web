import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { AgentClient, AgentMessage, TranscriptEvent, TaskResult, HarnessResult } from './types';
import { extractScript, formatDiagnostics, computeScore, renderTranscript } from './lib';
import { evaluateScript } from './oracle/kernelcad-client';
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

  const messages: AgentMessage[] = [{ role: 'user', content: prompt }];
  let attempts = 0;
  let totalIn = 0;
  let totalOut = 0;
  let lastEvaluateOk = false;
  let finalScript: string | null = null;

  const start = Date.now();

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    attempts = attempt;
    const turnStart = Date.now();
    const resp = await args.agent.generate({
      system: args.skillMd,
      systemAddendum: args.cookbook?.systemPromptAddendum,
      messages,
      model: args.model,
      max_tokens: MAX_TOKENS,
    });
    const turnMs = Date.now() - turnStart;
    totalIn += resp.tokens_in;
    totalOut += resp.tokens_out;
    const script = extractScript(resp.text);

    events.push({
      kind: 'turn',
      attempt,
      assistant_text: resp.text,
      script_extracted: script,
      tokens_in: resp.tokens_in,
      tokens_out: resp.tokens_out,
      ms: turnMs,
    });

    if (!script) {
      // Couldn't extract a script — append a guidance message and retry.
      events.push({
        kind: 'evaluate',
        attempt,
        ok: false,
        diagnostics: [
          { code: 'eval.no-script-extracted', message: 'No script extracted from model response.' },
        ],
      });
      messages.push({ role: 'assistant', content: resp.text });
      messages.push({
        role: 'user',
        content: 'I could not extract a script from your response. Please return the full script in a single ```typescript code block.',
      });
      continue;
    }

    writeFileSync(outputScriptPath, script);
    finalScript = script;

    const ev = await evaluateScript(outputScriptPath);
    events.push({ kind: 'evaluate', attempt, ok: ev.ok, diagnostics: ev.diagnostics });

    if (ev.ok) {
      lastEvaluateOk = true;
      break;
    }

    // Feed diagnostics back and retry (unless this was the last attempt).
    if (attempt < MAX_ATTEMPTS) {
      messages.push({ role: 'assistant', content: resp.text });
      messages.push({
        role: 'user',
        content: `Diagnostics:\n${formatDiagnostics(ev.diagnostics)}\nFix and return the full corrected script.`,
      });
    }
  }

  // If we never got a clean evaluate, finalScript may still be the last broken attempt or null.
  // Write whatever we have so the human can read it; harness will mark gate-fail.
  if (!finalScript) {
    writeFileSync(outputScriptPath, '// (no script extracted from any attempt)');
  }

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
    attempts,
    tokens_in: totalIn,
    tokens_out: totalOut,
    time_ms: Date.now() - start,
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
