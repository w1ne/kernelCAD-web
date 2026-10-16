#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/mech40/runAgent.ts — run an LLM agent loop over the mech40 task set at
// k samples per task and write `eval/results/<date>-<model>.json` with
// pass@1, pass@k, mean evals-to-success and failure codes.
//
//   ANTHROPIC_API_KEY=... npx tsx eval/mech40/runAgent.ts --k 3 [--model claude-...]
//       [--tasks 01-plate-four-corner-holes,24-spur-gear-pair] [--max-attempts 3]
//       [--temperature 0.7] [--concurrency 2] [--skills a,b | --all-skills] [--out file]
//   npx tsx eval/mech40/runAgent.ts --mock [--k 2] [--tasks ...]
//
// `--mock` needs no API key: a reference agent answers every task with its
// expert solution, so the whole pipeline (agent loop, in-process gate,
// harness, metrics, results file) runs end to end and pass@1 should be 1.
// Mock results go to eval/runs/ (gitignored) unless --out is given.
//
// stdout carries exactly one line, the results path; everything else (logs,
// OCCT's STEP-writer banners) goes to stderr. CI passes --out and reads the
// path it chose rather than parsing stdout.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { AnthropicAgentClient } from '../agent';
import { generateCase } from '../runner';
import { loadCombinedSkillMd } from '../skillContext';
import { describeSkillSelection, loadSkillSelection, parseSkillSelection } from '../lib/systemPrompt';
import { mapPool } from '../lib/pool';
import type { AgentClient, AgentResponse } from '../types';
import type { GateRunner } from '../../src/agent/loop/types';
import { createInProcessGateRunner } from './inProcessGate';
import { failingChecks, listMech40Tasks, runHarness, type Mech40Task } from './tasks';
import {
  INFRA_ERROR_CODE, RESULTS_SCHEMA, resultsFileName, summarize, summarizeTask,
  type ResultsFile, type SampleResult,
} from './metrics';

export const DEFAULT_MODEL = process.env.EVAL_MODEL ?? 'claude-sonnet-4-6';

export interface Mech40Options {
  k: number;
  model: string;
  tasks?: readonly string[];
  maxAttempts: number;
  temperature?: number;
  concurrency: number;
  mock: boolean;
  skills: string;
  skillMd: string;
  runRoot: string;
}

export interface Mech40Deps {
  /** A fresh agent client per sample. */
  agentFor(task: Mech40Task): AgentClient;
  gateRunner: GateRunner;
  log?(line: string): void;
}

/** Mock agent: answers with the task's expert reference solution. */
export class ReferenceAgentClient implements AgentClient {
  private readonly solutionPath: string;
  constructor(solutionPath: string) {
    this.solutionPath = solutionPath;
  }
  async generate(): Promise<AgentResponse> {
    const code = readFileSync(this.solutionPath, 'utf8');
    return { text: `\`\`\`typescript\n${code}\n\`\`\``, tokens_in: 0, tokens_out: 0 };
  }
}

/** Why a sample failed, as one code. */
function failureCodeOf(status: string, firstFailureCode: string | undefined, failed: readonly string[]): string | undefined {
  if (status === 'no_script') return 'eval.no-script-extracted';
  if (status === 'gate_failed') return firstFailureCode ?? 'eval.gate-failed';
  return failed.length > 0 ? `check:${failed[0]}` : undefined;
}

async function runSample(task: Mech40Task, i: number, opts: Mech40Options, deps: Mech40Deps): Promise<SampleResult> {
  const start = Date.now();
  try {
    const gen = await generateCase({
      taskDir: task.dir,
      runDir: join(opts.runRoot, task.id, `sample-${i}`),
      agent: deps.agentFor(task),
      model: opts.model,
      skillMd: opts.skillMd,
      startedAt: new Date(start).toISOString(),
      candidates: 1,
      maxAttempts: opts.maxAttempts,
      ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
      gateRunner: deps.gateRunner,
    });
    const failed = gen.status === 'no_script' ? ['no script'] : failingChecks(await runHarness(task, gen.outputScriptPath));
    const pass = gen.status === 'passed' && failed.length === 0;
    const failureCode = pass ? undefined : failureCodeOf(gen.status, gen.firstFailureCode, failed);
    return {
      pass,
      evals: gen.attempts,
      ...(failureCode !== undefined ? { failureCode } : {}),
      ...(pass ? {} : { failedChecks: failed }),
      tokensIn: gen.tokensIn,
      tokensOut: gen.tokensOut,
      ms: Date.now() - start,
    };
  } catch (err) {
    deps.log?.(`[${task.id}#${i}] infra error: ${err instanceof Error ? err.message : String(err)}`);
    return { pass: false, evals: 0, failureCode: INFRA_ERROR_CODE, tokensIn: 0, tokensOut: 0, ms: Date.now() - start };
  }
}

/** Run k samples per task and aggregate into a results file (not written). */
export async function runMech40(opts: Mech40Options, deps: Mech40Deps): Promise<ResultsFile> {
  const tasks = listMech40Tasks(undefined, opts.tasks);
  if (tasks.length === 0) throw new Error(`no mech40 tasks match ${opts.tasks?.join(',') ?? '(all)'}`);
  const jobs = tasks.flatMap((t) => Array.from({ length: opts.k }, (_, i) => ({ t, i })));
  const samples = await mapPool(jobs, opts.concurrency, async ({ t, i }) => {
    const s = await runSample(t, i, opts, deps);
    deps.log?.(`${s.pass ? 'PASS' : 'FAIL'} ${t.id}#${i} evals=${s.evals}${s.failureCode ? ` ${s.failureCode}` : ''}`);
    return s;
  });
  const perTask = tasks.map((t, ti) => summarizeTask(t.id, samples.slice(ti * opts.k, (ti + 1) * opts.k), opts.k));
  return {
    schema: RESULTS_SCHEMA,
    suite: 'mech40',
    date: new Date().toISOString(),
    model: opts.model,
    k: opts.k,
    skills: opts.skills,
    max_attempts: opts.maxAttempts,
    temperature: opts.temperature ?? null,
    mock: opts.mock,
    summary: summarize(perTask),
    tasks: perTask,
  };
}

// ------------------------------------------------------------------ CLI --

const VALUE_FLAGS = ['--k', '--model', '--tasks', '--max-attempts', '--temperature', '--concurrency', '--out', '--skills'];

export function flagValue(args: readonly string[], flag: string): string | undefined {
  const i = args.indexOf(flag);
  if (i < 0) return undefined;
  const v = args[i + 1];
  if (v === undefined || v.startsWith('--')) throw new Error(`${flag} needs a value`);
  return v;
}

function intFlag(args: readonly string[], flag: string, fallback: number): number {
  const raw = flagValue(args, flag);
  if (raw === undefined) return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) throw new Error(`${flag} must be an integer >= 1, got '${raw}'`);
  return n;
}

export interface CliConfig {
  k: number;
  model: string;
  tasks?: string[];
  maxAttempts: number;
  temperature?: number;
  concurrency: number;
  mock: boolean;
  out?: string;
}

/** Parse the runner's flags. Throws on unknown flags or bad values. */
export function parseCli(args: readonly string[]): CliConfig {
  const unknown = args.filter((a, i) => a.startsWith('--') && !VALUE_FLAGS.includes(a)
    && !['--mock', '--all-skills'].includes(a) && !VALUE_FLAGS.includes(args[i - 1]));
  if (unknown.length > 0) throw new Error(`unknown flag(s): ${unknown.join(' ')}`);
  const mock = args.includes('--mock');
  const temp = flagValue(args, '--temperature');
  if (temp !== undefined && !(Number(temp) >= 0 && Number(temp) <= 1)) throw new Error(`--temperature must be in [0, 1], got '${temp}'`);
  const tasks = flagValue(args, '--tasks')?.split(',').map((s) => s.trim()).filter(Boolean);
  const out = flagValue(args, '--out');
  return {
    k: intFlag(args, '--k', 3),
    model: mock ? 'mock-reference' : (flagValue(args, '--model') ?? DEFAULT_MODEL),
    ...(tasks ? { tasks } : {}),
    maxAttempts: intFlag(args, '--max-attempts', 3),
    ...(temp !== undefined ? { temperature: Number(temp) } : {}),
    concurrency: intFlag(args, '--concurrency', 1),
    mock,
    ...(out ? { out } : {}),
  };
}

function defaultOut(cfg: CliConfig, now: Date): string {
  const name = resultsFileName(now, cfg.model);
  return cfg.mock ? resolve('eval/runs', `_mock-mech40-${name}`) : resolve('eval/results', name);
}

/**
 * Run `fn` with everything written to stdout sent to stderr instead, and hand
 * it the real stdout writer. OCCT's STEP writer prints transfer banners
 * ("Statistics on Transfer (Write)", "Step File Name : blob.step ... Write
 * Done") through Emscripten's print → console.log → process.stdout; callers
 * that capture the runner's stdout (the results path) must see only that.
 */
export async function withStdoutToStderr<T>(fn: (stdout: (line: string) => void) => Promise<T>): Promise<T> {
  const realWrite = process.stdout.write;
  const stdout = (line: string): void => {
    realWrite.call(process.stdout, `${line}\n`);
  };
  process.stdout.write = process.stderr.write.bind(process.stderr) as typeof process.stdout.write;
  try {
    return await fn(stdout);
  } finally {
    process.stdout.write = realWrite;
  }
}

async function main(stdout: (line: string) => void): Promise<void> {
  const args = process.argv.slice(2);
  const cfg = parseCli(args);
  const selection = parseSkillSelection(args);
  if (!cfg.mock && !process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is required (or pass --mock to run the reference agent).');
  }
  const now = new Date();
  const skillMd = loadSkillSelection(selection, loadCombinedSkillMd);
  console.error(`[mech40] skills: ${describeSkillSelection(selection)} (${skillMd.length} chars)`);
  const results = await runMech40(
    {
      ...cfg,
      skills: describeSkillSelection(selection),
      skillMd,
      runRoot: resolve('eval/runs', `mech40-${now.toISOString().replace(/[:.]/g, '-')}`),
    },
    {
      agentFor: (t) => (cfg.mock ? new ReferenceAgentClient(t.solution) : new AnthropicAgentClient(process.env.ANTHROPIC_API_KEY!)),
      gateRunner: createInProcessGateRunner(),
      log: (l) => console.error(l),
    },
  );
  const out = cfg.out ? resolve(cfg.out) : defaultOut(cfg, now);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(results, null, 2)}\n`);
  const s = results.summary;
  console.error(`\nmech40 ${results.model}: pass@1 ${s.pass_at_1}, pass@${results.k} ${s.pass_at_k}, `
    + `mean evals-to-success ${s.mean_evals_to_success ?? '—'} (${s.tasks} tasks × ${results.k}`
    + `${s.infra_errors ? `, ${s.infra_errors} infra error(s) not scored` : ''})`);
  // The only line on stdout: the results path (CI passes --out and does not
  // need it, but local callers do `out=$(... runAgent.ts)`).
  stdout(out);
}

const isEntrypoint = process.argv[1] !== undefined && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isEntrypoint) {
  withStdoutToStderr(main).catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
