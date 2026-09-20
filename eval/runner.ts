// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { AgentClient, TranscriptEvent, TaskResult, HarnessResult, EvaluateResult } from './types';
import { extractScript, computeScore, renderTranscript } from './lib';
import { evaluateScript } from './oracle/kernelcad-client';
import { runClosedLoop, type LoopMessage } from '../src/agent/loop/closedLoop.js';
import { createWebGateRunner } from './loop/webGateRunner.js';
import { buildRepairPrompt } from '../src/agent/loop/repairPrompt';
import type { CookbookInjection } from './cookbook-injector';

const MAX_ATTEMPTS = 3;
const MAX_TOKENS = 8000;

const BEST_OF_N = 4;
// Distinct temperatures so the N first-attempt candidates diverge. Index 0 stays
// low (a near-greedy anchor); the rest spread upward. Length matches BEST_OF_N.
const VARIANT_TEMPERATURES = [0.2, 0.5, 0.7, 0.9];

export { BEST_OF_N };

/** Variant index → sampling temperature; undefined on repair turns (no variant). */
export function variantTemperature(variant: number | undefined): number | undefined {
  if (variant === undefined) return undefined;
  return VARIANT_TEMPERATURES[Math.min(variant, VARIANT_TEMPERATURES.length - 1)];
}

/** Reduce a task harness result to a single [0,1] selector score. */
export function reduceHarnessScore(hr: { gates: Record<string, boolean>; scored: Record<string, number> }): number {
  const vals = Object.values(hr.scored);
  if (vals.length > 0) return vals.reduce((a, b) => a + b, 0) / vals.length;
  const gates = Object.values(hr.gates);
  if (gates.length === 0) return 0;
  return gates.every(Boolean) ? 1 : 0;
}

export interface RunTaskArgs {
  taskDir: string;            // e.g. ./eval/tasks/bracket-holes
  runDir: string;             // e.g. ./eval/runs/2026-05-02T14-00-00/bracket-holes
  agent: AgentClient;
  model: string;
  skillMd: string;
  startedAt: string;          // ISO timestamp string (filesystem-safe), used for transcript header
  cookbook?: CookbookInjection;   // optional — when set, injects cookbook snippets into the system prompt
  /**
   * First-attempt best-of-N fan-out width. Defaults to 1 (single sample), which
   * is the deterministic single-sample path the corpus/golden/runner unit tests
   * assert against. The production eval (`run.ts`, real model) sets this to
   * BEST_OF_N; `--mock` replay keeps it at 1 so the fixed fixture queue stays
   * deterministic.
   */
  candidates?: number;
  maxAttempts?: number;
  maxTokens?: number;
  /** Sent on every call when candidates <= 1 (sweep protocol temperature). */
  temperature?: number;
}

export interface GenerateCaseArgs {
  taskDir: string;
  runDir: string;
  agent: AgentClient;
  model: string;
  skillMd: string;
  startedAt: string;
  cookbook?: CookbookInjection;
  candidates?: number;
  maxAttempts?: number;
  maxTokens?: number;
  /** Sent on every call when candidates <= 1 (sweep protocol temperature). */
  temperature?: number;
}

export interface GenerateCaseResult {
  events: TranscriptEvent[];
  status: 'passed' | 'gate_failed' | 'no_script';
  attempts: number;
  tokensIn: number;
  tokensOut: number;
  timeMs: number;
  firstFailureCode?: string;
  outputScriptPath: string;
}

export async function generateCase(args: GenerateCaseArgs): Promise<GenerateCaseResult> {
  const taskDirAbs = resolve(args.taskDir);
  const prompt = readFileSync(join(taskDirAbs, 'prompt.md'), 'utf8');

  mkdirSync(args.runDir, { recursive: true });
  const outputScriptPath = join(args.runDir, 'output.kcad.ts');

  const events: TranscriptEvent[] = [];
  events.push({ kind: 'system_prompt', chars: args.skillMd.length });
  events.push({ kind: 'user_prompt', content: prompt });
  if (args.cookbook) {
    events.push({ kind: 'cookbook_inject', query: args.cookbook.query, hits: args.cookbook.hits });
  }

  let attemptNo = 0;
  let totalIn = 0;
  let totalOut = 0;
  let firstFailureCode: string | undefined;
  const start = Date.now();

  const candidates = args.candidates ?? 1;
  const maxTokens = args.maxTokens ?? MAX_TOKENS;

  const loopResult = await runClosedLoop({
    prompt,
    gateRunner: createWebGateRunner(),
    extractScript,
    buildRepairPrompt,
    maxAttempts: args.maxAttempts ?? MAX_ATTEMPTS,
    candidates,
    scoreCandidate: async (scriptPath, report) => {
      if (!report.ok) return null;
      try {
        const ev = await evaluateScript(scriptPath);
        if (!ev.ok) return null;
        const harnessModule = await import(join(taskDirAbs, 'harness.ts'));
        const hr = await harnessModule.default(scriptPath);
        return reduceHarnessScore(hr);
      } catch {
        return null;
      }
    },
    writeScript: async (code: string) => {
      writeFileSync(outputScriptPath, code);
      return outputScriptPath;
    },
    generate: async (messages: LoopMessage[], opts?: { variant?: number }) => {
      attemptNo += 1;
      const turnStart = Date.now();
      const temperature =
        candidates > 1 ? variantTemperature(opts?.variant) : args.temperature;
      const resp = await args.agent.generate({
        system: args.skillMd,
        systemAddendum: args.cookbook?.systemPromptAddendum,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        model: args.model,
        max_tokens: maxTokens,
        temperature,
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

  if (loopResult.status === 'no_script') {
    writeFileSync(outputScriptPath, '// (no script extracted from any attempt)');
  }

  return {
    events,
    status: loopResult.status,
    attempts: loopResult.attempts,
    tokensIn: totalIn,
    tokensOut: totalOut,
    timeMs: Date.now() - start,
    firstFailureCode,
    outputScriptPath,
  };
}

export interface ScoreCaseArgs {
  taskDir: string;
  runDir: string;
  outputScriptPath: string;
  events?: TranscriptEvent[];
  attempts: number;
  tokensIn: number;
  tokensOut: number;
  generationMs: number;
  startedAt: string;
  model: string;
  firstFailureCode?: string;
  /** True when generation never extracted a script — skips the evaluate call. */
  noScript?: boolean;
}

export async function scoreCase(args: ScoreCaseArgs): Promise<TaskResult> {
  const taskDirAbs = resolve(args.taskDir);
  const taskName = taskDirAbs.split('/').pop() ?? 'unknown';
  const events = args.events ?? [];
  const scoringStart = Date.now();

  const finalEvaluate: EvaluateResult = args.noScript
    ? {
        ok: false,
        diagnostics: [
          { code: 'eval.no-script-extracted', message: 'No script extracted from any attempt.' },
        ],
      }
    : await evaluateScript(args.outputScriptPath);
  let firstFailureCode = args.firstFailureCode;
  if (firstFailureCode === undefined && !finalEvaluate.ok && finalEvaluate.diagnostics.length > 0) {
    firstFailureCode = finalEvaluate.diagnostics[0].code;
  }

  let harnessResult: HarnessResult;
  if (finalEvaluate.ok) {
    const harnessModule = await import(join(taskDirAbs, 'harness.ts'));
    harnessResult = await harnessModule.default(args.outputScriptPath, {
      taskDir: taskDirAbs,
      runDir: args.runDir,
    });
  } else {
    harnessResult = { gates: { 'evaluates clean': false }, scored: {} };
  }

  events.push({
    kind: 'score',
    gates: harnessResult.gates,
    scored: harnessResult.scored,
  });

  const score = computeScore(harnessResult, {
    attempts: args.attempts,
    tokens_in: args.tokensIn,
    tokens_out: args.tokensOut,
    time_ms: args.generationMs + (Date.now() - scoringStart),
    firstFailureCode,
  });

  writeFileSync(join(args.runDir, 'score.json'), JSON.stringify(score, null, 2));
  writeFileSync(
    join(args.runDir, 'transcript.md'),
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

export async function runTask(args: RunTaskArgs): Promise<TaskResult> {
  const gen = await generateCase({
    taskDir: args.taskDir,
    runDir: args.runDir,
    agent: args.agent,
    model: args.model,
    skillMd: args.skillMd,
    startedAt: args.startedAt,
    cookbook: args.cookbook,
    candidates: args.candidates,
    maxAttempts: args.maxAttempts,
    maxTokens: args.maxTokens,
    temperature: args.temperature,
  });
  return scoreCase({
    taskDir: args.taskDir,
    runDir: args.runDir,
    outputScriptPath: gen.outputScriptPath,
    events: gen.events,
    attempts: gen.attempts,
    tokensIn: gen.tokensIn,
    tokensOut: gen.tokensOut,
    generationMs: gen.timeMs,
    startedAt: args.startedAt,
    model: args.model,
    firstFailureCode: gen.firstFailureCode,
    noScript: gen.status === 'no_script',
  });
}
