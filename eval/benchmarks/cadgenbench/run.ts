#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/benchmarks/cadgenbench/run.ts
//
// CADGenBench harness CLI. Downloads the public task inputs on demand, runs
// each task through the kernelCAD pipeline (pipeline.ts) with bounded
// concurrency and resume, optionally runs the benchmark's own validity gate,
// and writes a submission zip plus a summary. It never uploads anything:
// submitting to the leaderboard is a separate, manual step.
//
//   npx tsx eval/benchmarks/cadgenbench/run.ts [options]
//
// See README.md in this directory for the options and full-run commands.

import { execFile, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { AnthropicAgentClient } from '../../agent';
import { OpenAICompatAgentClient } from '../../agentOpenAICompat';
import { mapPool } from '../../lib/pool';
import { buildSystemPrompt, SWEEP_SKILLS } from '../../lib/systemPrompt';
import { isKernelcadAvailable } from '../../oracle/kernelcad-client';
import { MODEL as DEFAULT_MODEL } from '../../run';
import type { AgentClient } from '../../types';
import { defaultCacheDir, fetchDataset, loadTasks, selectTasks, type TaskSelection } from './dataset';
import { runTask, type PipelineConfig, type Prices } from './pipeline';
import { renderSummaryMarkdown, summarize } from './report';
import { isFinished, readTaskState, writeTaskState, type TaskState } from './state';
import { buildSubmissionZip, candidatePath, hasCandidate } from './submission';

export interface CliOptions {
  selection: TaskSelection;
  runDir: string;
  workers: number;
  model: string;
  baseUrl?: string;
  apiKeyEnv: string;
  noLlm: boolean;
  scriptsFrom?: string;
  maxAttempts: number;
  maxTokens: number;
  temperature?: number;
  editFallback: 'none' | 'passthrough';
  keepInvalid: boolean;
  retryFailed: boolean;
  officialCheck: boolean;
  python?: string;
  prices?: Prices;
  revision: string;
  dataDir?: string;
  cacheDir: string;
  meta: { submitter: string; name: string; agentUrl: string | null; notes: string | null; agree: boolean };
}

export function parseArgs(argv: string[], env: NodeJS.ProcessEnv = process.env): CliOptions {
  const value = (name: string): string | undefined => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const has = (name: string): boolean => argv.includes(name);
  const int = (name: string, def: number, min = 1): number => {
    const raw = value(name);
    const n = raw === undefined ? def : Number(raw);
    if (!Number.isInteger(n) || n < min) throw new Error(`${name} must be an integer >= ${min}, got ${raw}`);
    return n;
  };
  const num = (name: string): number | undefined => {
    const raw = value(name);
    if (raw === undefined) return undefined;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) throw new Error(`${name} must be a number >= 0, got ${raw}`);
    return n;
  };

  const ids = (value('--tasks') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const selection: TaskSelection = ids.length > 0 ? { ids } : {};
  if (ids.length === 0 && (has('--generation') || has('--editing'))) {
    selection.generation = int('--generation', 0, 0);
    selection.editing = int('--editing', 0, 0);
  }

  const model = value('--model') ?? DEFAULT_MODEL;
  const slug = model.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '').replace('T', '-');
  const runDir = resolve(value('--run-dir') ?? join('eval/benchmarks/cadgenbench/runs', `${stamp}-${slug}`));

  const editFallback = value('--edit-fallback') ?? 'none';
  if (editFallback !== 'none' && editFallback !== 'passthrough') {
    throw new Error(`--edit-fallback must be 'none' or 'passthrough', got ${editFallback}`);
  }
  const priceIn = num('--price-in');
  const priceOut = num('--price-out');
  if ((priceIn === undefined) !== (priceOut === undefined)) {
    throw new Error('--price-in and --price-out go together (USD per million tokens)');
  }
  const notes = value('--notes') ?? null;
  if (notes !== null && notes.length > 500) throw new Error('--notes must be at most 500 characters');

  return {
    selection,
    runDir,
    workers: int('--workers', 2),
    model,
    baseUrl: value('--base-url'),
    apiKeyEnv: value('--api-key-env') ?? (value('--base-url') ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY'),
    noLlm: has('--no-llm'),
    scriptsFrom: value('--scripts-from') ? resolve(value('--scripts-from')!) : undefined,
    maxAttempts: int('--max-attempts', 3),
    maxTokens: int('--max-tokens', 16000),
    temperature: num('--temperature'),
    editFallback,
    keepInvalid: has('--keep-invalid'),
    retryFailed: has('--retry-failed'),
    officialCheck: has('--official-check'),
    python: value('--python') ?? env.CADGENBENCH_PYTHON,
    ...(priceIn !== undefined && priceOut !== undefined ? { prices: { inPerMTok: priceIn, outPerMTok: priceOut } } : {}),
    revision: value('--revision') ?? 'main',
    dataDir: value('--data-dir') ? resolve(value('--data-dir')!) : undefined,
    cacheDir: value('--cache-dir') ? resolve(value('--cache-dir')!) : defaultCacheDir(),
    meta: {
      submitter: value('--submitter') ?? env.USER ?? 'unknown',
      name: value('--name') ?? `kernelCAD (${model})`,
      agentUrl: value('--agent-url') ?? 'https://github.com/w1ne/kernelCAD-web',
      notes,
      agree: has('--agree'),
    },
  };
}

function makeAgent(opts: CliOptions, env: NodeJS.ProcessEnv): AgentClient | null {
  if (opts.noLlm || opts.scriptsFrom) return null;
  const key = env[opts.apiKeyEnv];
  if (!key) return null;
  return opts.baseUrl
    ? new OpenAICompatAgentClient({ baseUrl: opts.baseUrl, apiKey: key })
    : new AnthropicAgentClient(key);
}

interface OfficialRow {
  path: string;
  valid: boolean;
  errors: string[];
}

/** Run the benchmark's own validity gate over the candidates, in one Python process. */
async function officialGate(python: string, paths: string[]): Promise<Map<string, OfficialRow>> {
  const script = resolve('eval/benchmarks/cadgenbench/officialGate.py');
  const stdout = await new Promise<string>((res, rej) => {
    execFile(python, [script, ...paths], { maxBuffer: 64 * 1024 * 1024, timeout: 60 * 60_000 }, (err, out, errOut) => {
      if (err) rej(new Error(`${python} officialGate.py failed: ${err.message}\n${String(errOut).slice(-1000)}`));
      else res(String(out));
    });
  });
  const rows = new Map<string, OfficialRow>();
  for (const line of stdout.split('\n')) {
    if (!line.startsWith('{')) continue;
    const row = JSON.parse(line) as OfficialRow;
    rows.set(row.path, row);
  }
  return rows;
}

function gitSha(): string {
  try {
    const sha = execFileSync('git', ['rev-parse', '--short=10', 'HEAD'], { encoding: 'utf8' }).trim();
    const dirty = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim().length > 0;
    return dirty ? `${sha}-dirty` : sha;
  } catch {
    return 'nogit';
  }
}

async function main(): Promise<void> {
  const env = process.env;
  const opts = parseArgs(process.argv.slice(2), env);
  const log = (line: string) => console.error(line);

  if (!(await isKernelcadAvailable())) {
    throw new Error('kernelcad CLI not found. Run `npm run build:cli` first (or set KERNELCAD_BIN).');
  }
  if (opts.officialCheck && !opts.python) {
    throw new Error('--official-check needs a Python with the benchmark package: set CADGENBENCH_PYTHON or pass --python.');
  }

  // 1. Inputs.
  let dataDir = opts.dataDir;
  let revision = 'local';
  if (!dataDir) {
    const fetched = await fetchDataset({ cacheDir: opts.cacheDir, revision: opts.revision, selection: opts.selection, log });
    dataDir = fetched.dir;
    revision = fetched.manifest.revision;
  }
  const tasks = selectTasks(loadTasks(dataDir), opts.selection);
  if (tasks.length === 0) throw new Error(`no tasks selected under ${dataDir}`);

  // 2. Producer.
  const agent = makeAgent(opts, env);
  const mode: TaskState['mode'] = opts.scriptsFrom ? 'scripts-from' : agent ? 'llm' : 'passthrough';
  if (!agent && !opts.scriptsFrom) {
    log(
      opts.noLlm
        ? '--no-llm: generation tasks are recorded as needs_key; editing tasks submit the unchanged input.'
        : `${opts.apiKeyEnv} is not set: generation tasks are recorded as needs_key; editing tasks submit the unchanged input.`,
    );
  }
  mkdirSync(opts.runDir, { recursive: true });
  const envelope = {
    benchmark: 'CADGenBench',
    dataset: { repo: 'HuggingAI4Engineering/cadgenbench-data', revision, license: 'ODC-BY-1.0', dir: dataDir },
    mode,
    model: agent ? opts.model : null,
    baseUrl: opts.baseUrl ?? null,
    gitSha: gitSha(),
    maxAttempts: opts.maxAttempts,
    maxTokens: opts.maxTokens,
    editFallback: opts.editFallback,
    workers: opts.workers,
    tasks: tasks.map((t) => t.id),
    startedAt: new Date().toISOString(),
  };
  writeFileSync(join(opts.runDir, 'run.json'), JSON.stringify(envelope, null, 2) + '\n');

  const cfg: PipelineConfig = {
    runDir: opts.runDir,
    agent,
    model: opts.model,
    skillMd: agent ? buildSystemPrompt(SWEEP_SKILLS) : '',
    maxAttempts: opts.maxAttempts,
    maxTokens: opts.maxTokens,
    ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
    ...(opts.scriptsFrom ? { scriptsFrom: opts.scriptsFrom } : {}),
    editFallback: opts.editFallback,
    keepInvalid: opts.keepInvalid,
    ...(opts.prices ? { prices: opts.prices } : {}),
    log,
  };

  // 3. Tasks, with resume.
  const states = await mapPool(tasks, opts.workers, async (task, i) => {
    const prev = readTaskState(opts.runDir, task.id);
    const taskMode = !agent && !opts.scriptsFrom && task.type === 'generation' ? 'none' : mode;
    if (isFinished(prev, { retryFailed: opts.retryFailed, mode: taskMode })) {
      log(`[${i + 1}/${tasks.length}] ${task.id} ${prev!.status} (resumed, skipped)`);
      return prev!;
    }
    const state = await runTask(task, cfg);
    writeTaskState(opts.runDir, state);
    log(
      `[${i + 1}/${tasks.length}] ${task.id} ${task.type} ${state.status}${state.fallback ? ' (passthrough fallback)' : ''} ` +
        `${(state.wallMs / 1000).toFixed(1)}s${state.error ? ` — ${state.error}` : ''}`,
    );
    return state;
  });

  // 4. The benchmark's own gate over every candidate in the submission.
  if (opts.officialCheck) {
    const withCandidate = states.filter((s) => hasCandidate(opts.runDir, s.id));
    if (withCandidate.length > 0) {
      log(`official gate: checking ${withCandidate.length} candidate(s) with ${opts.python}`);
      const rows = await officialGate(opts.python!, withCandidate.map((s) => candidatePath(opts.runDir, s.id)));
      for (const s of withCandidate) {
        const row = rows.get(candidatePath(opts.runDir, s.id));
        if (!row) continue;
        s.official = { valid: row.valid, detail: row.valid ? 'pass' : row.errors.slice(0, 3).join('; ') };
        writeTaskState(opts.runDir, s);
      }
    }
  }

  // 5. Zip + summary.
  const zip = buildSubmissionZip(
    opts.runDir,
    tasks.map((t) => t.id),
    {
      submitter_name: opts.meta.submitter,
      submission_name: opts.meta.name,
      agent_url: opts.meta.agentUrl,
      notes: opts.meta.notes,
      agree_to_publish: opts.meta.agree,
    },
    join(opts.runDir, 'submission.zip'),
  );
  const summary = summarize(states);
  writeFileSync(join(opts.runDir, 'summary.json'), JSON.stringify({ ...summary, zip, states }, null, 2) + '\n');
  const md = renderSummaryMarkdown(states, {
    run: opts.runDir,
    dataset: `${envelope.dataset.repo}@${revision}`,
    mode,
    model: envelope.model ?? '—',
    git: envelope.gitSha,
    zip: `${zip.zipPath} (${zip.withCandidate}/${zip.tasks} with candidate; agree_to_publish=${opts.meta.agree})`,
  });
  writeFileSync(join(opts.runDir, 'summary.md'), md);
  console.log(md);
  if (!existsSync(zip.zipPath)) throw new Error('submission zip was not written');
}

const isEntrypoint = (() => {
  if (!process.argv[1]) return false;
  try {
    return import.meta.url === new URL(`file://${resolve(process.argv[1])}`).href;
  } catch {
    return false;
  }
})();

if (isEntrypoint) {
  main().catch((err) => {
    console.error('Fatal:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
