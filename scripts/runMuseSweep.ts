#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { execFile, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { MockAgentClient } from '../eval/agent';
import { OpenAICompatAgentClient } from '../eval/agentOpenAICompat';
import { generateCase, scoreCase } from '../eval/runner';
import { buildSweepPrompt, loadPresets } from '../eval/lib/sweepPrompt';
import { injectCookbook } from '../eval/cookbook-injector';
import { buildSystemPrompt, SWEEP_SKILLS } from '../eval/lib/systemPrompt';
import { mapPool } from '../eval/lib/pool';
import { isAtLeast, readState, writeState, type MusePhase } from '../eval/lib/museState';
import { judgeCase } from './museJudge';
import { runPreflight, formatPreflight, type PreflightReport } from './musePreflight';
import { writeReports } from './museReport';
import type { AgentClient, AgentResponse, TaskResult, TranscriptEvent } from '../eval/types';

const TASKS_DIR = resolve('eval/tasks');
const RUNS_DIR = resolve('eval/runs');
const DEFAULT_MODEL = 'deepseek-ai/DeepSeek-V4.1-Flash';
const DEFAULT_BASE_URL = 'https://api.deepinfra.com/v1/openai';
const JUDGE_MODEL = 'google/gemini-3.1-pro';
const PROTOCOL = 'muse-v1';

interface SweepConfig {
  runId: string;
  runRoot: string;
  cases: string[];
  workers: number;
  model: string;
  baseUrl: string;
  temperature: number;
  maxAttempts: number;
  maxTokens: number;
  skills: string[];
  promptPreset: string;
  useCookbook: boolean;
  skipJudge: boolean;
  force: Set<string>;
  maxTokensIn: number;
  mockFixture?: string;
  startedAt: string;
  gitSha: string;
  gitDirty: boolean;
  env: Record<string, string | undefined>;
}

export interface CaseOutcome {
  case: string;
  status: 'ok' | 'skipped' | 'stopped' | 'budget' | 'infra';
  phase?: MusePhase;
  finalScore?: number;
  attempts?: number;
  timeMs?: number;
  error?: string;
}

export function parseSweepArgs(argv: string[]): SweepConfig {
  const flagValue = (name: string): string | undefined => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const has = (name: string): boolean => argv.includes(name);
  const list = (name: string): string[] => {
    const v = flagValue(name);
    return v ? v.split(',').map((s) => s.trim()).filter(Boolean) : [];
  };
  /** Collects all non-flag tokens after `name`; each may be comma-separated. */
  const multiList = (name: string): string[] => {
    const i = argv.indexOf(name);
    if (i < 0) return [];
    const out: string[] = [];
    for (let j = i + 1; j < argv.length && !argv[j].startsWith('--'); j++) {
      out.push(...argv[j].split(',').map((s) => s.trim()).filter(Boolean));
    }
    return out;
  };
  const fail = (msg: string): never => {
    console.error(`ERROR: ${msg}`);
    process.exit(1);
  };

  const model = flagValue('--model') ?? DEFAULT_MODEL;
  const slug = model
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  let sha = 'nogit';
  let dirty = '';
  try {
    sha = execFileSync('git', ['rev-parse', '--short=7', 'HEAD'], { encoding: 'utf8' }).trim();
    dirty =
      execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim().length > 0
        ? '-dirty'
        : '';
  } catch {
    // not a git checkout — leave as nogit
  }
  const ts = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '').replace('T', '-');
  const runId = flagValue('--run-id') ?? `muse106-${sha}${dirty}-${slug}-${ts}`;

  const workers = Number(flagValue('--workers') ?? 6);
  if (!Number.isInteger(workers) || workers < 1) fail(`--workers must be an integer >= 1, got ${workers}`);
  const temperature = Number(flagValue('--temperature') ?? 0.2);
  if (!Number.isFinite(temperature)) fail(`--temperature must be a number, got ${temperature}`);
  const maxAttempts = Number(flagValue('--max-attempts') ?? 3);
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) fail(`--max-attempts must be an integer >= 1`);
  const maxTokens = Number(flagValue('--max-tokens') ?? 16000);
  if (!Number.isInteger(maxTokens) || maxTokens < 1) fail(`--max-tokens must be an integer >= 1`);
  const maxTokensIn = Number(flagValue('--max-tokens-in') ?? 25_000_000);
  if (!Number.isFinite(maxTokensIn)) fail(`--max-tokens-in must be a number`);

  const promptPreset = flagValue('--prompt-preset') ?? 'full';
  const presets = loadPresets();
  if (!(promptPreset in presets)) {
    // Thrown (not fail()) so parseSweepArgs stays unit-testable without process.exit.
    throw new Error(
      `unknown prompt preset '${promptPreset}' (available: ${Object.keys(presets).join(', ')})`,
    );
  }
  const skillsExplicit = flagValue('--skills') !== undefined;
  if (skillsExplicit && promptPreset !== 'full') {
    throw new Error(
      '--skills only applies to --prompt-preset full; compact presets select their own skill set',
    );
  }
  const skills = skillsExplicit ? list('--skills') : [...SWEEP_SKILLS];
  if (promptPreset === 'full' && skills.length === 0) fail('--skills must select at least one skill');

  return {
    runId,
    runRoot: join(RUNS_DIR, runId),
    cases: multiList('--cases'),
    workers,
    model,
    baseUrl: flagValue('--base-url') ?? DEFAULT_BASE_URL,
    temperature,
    maxAttempts,
    maxTokens,
    skills,
    promptPreset,
    useCookbook: !has('--no-cookbook'),
    skipJudge: has('--skip-judge'),
    force: new Set(multiList('--force')),
    maxTokensIn,
    mockFixture: flagValue('--mock-fixture'),
    startedAt: new Date().toISOString().replace(/\..+$/, '').replace(/:/g, '-'),
    gitSha: sha,
    gitDirty: dirty.length > 0,
    env: process.env as Record<string, string | undefined>,
  };
}

function discoverCases(filter: string[]): string[] {
  const all = readdirSync(TASKS_DIR)
    .filter((name) => name.startsWith('muse-'))
    .filter((name) => {
      const dir = join(TASKS_DIR, name);
      return (
        statSync(dir).isDirectory() &&
        existsSync(join(dir, 'prompt.md')) &&
        existsSync(join(dir, 'harness.ts'))
      );
    })
    .map((name) => name.replace(/^muse-/, ''));
  if (filter.length === 0) return all.sort();
  const wanted = new Set(filter);
  const unknown = filter.filter((c) => !all.includes(c));
  if (unknown.length > 0) console.error(`WARN: unknown cases ignored: ${unknown.join(', ')}`);
  return all.filter((c) => wanted.has(c)).sort();
}

function readScoreResult(caseDir: string): TaskResult | null {
  const path = join(caseDir, 'score.json');
  if (!existsSync(path)) return null;
  return {
    task: caseDir.split('/').pop() ?? 'unknown',
    score: JSON.parse(readFileSync(path, 'utf8')),
  };
}

/** The no-script placeholder written by generateCase. */
function isNoScriptArtifact(outputScriptPath: string): boolean {
  if (!existsSync(outputScriptPath)) return false;
  return readFileSync(outputScriptPath, 'utf8').startsWith('// (no script extracted');
}

function readCachedAgentResponses(fixturePath: string): AgentResponse[] {
  const data = JSON.parse(readFileSync(fixturePath, 'utf8')) as { responses: AgentResponse[] };
  return data.responses;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function judgeWithRetries(
  args: Parameters<typeof judgeCase>[0],
  stage12Ok: boolean,
  attempts = 5,
): Promise<Awaited<ReturnType<typeof judgeCase>>> {
  let lastErr: Error | undefined;
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0) {
      const backoff = Math.min(30_000, 1000 * 2 ** (attempt - 1));
      await sleep(backoff + Math.random() * backoff * 0.25);
    }
    try {
      return await judgeCase(args, stage12Ok);
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastErr ?? new Error('judge failed after retries');
}

async function runOneCase(
  caseName: string,
  cfg: SweepConfig,
  agent: AgentClient,
  skillMd: string,
  totals: { tokensIn: number; tokensOut: number },
): Promise<CaseOutcome> {
  const taskDir = join(TASKS_DIR, `muse-${caseName}`);
  const caseDir = join(cfg.runRoot, 'cases', caseName);
  mkdirSync(caseDir, { recursive: true });

  if (existsSync(join(cfg.runRoot, 'STOP'))) {
    return { case: caseName, status: 'stopped' };
  }
  if (totals.tokensIn >= cfg.maxTokensIn) {
    return { case: caseName, status: 'budget' };
  }

  const targetPhase: MusePhase = cfg.skipJudge ? 'scored' : 'judged';
  let state = readState(caseDir);
  if (!cfg.force.has(caseName) && state !== null && isAtLeast(state.phase, targetPhase)) {
    return { case: caseName, status: 'skipped', phase: state.phase };
  }

  try {
    const outputScriptPath = join(caseDir, 'output.kcad.ts');
    let result: TaskResult;
    let generationMs = state?.generationMs ?? 0;
    let generationEvents: TranscriptEvent[] | undefined;

    const canReuseGeneration =
      !cfg.force.has(caseName) &&
      state !== null &&
      isAtLeast(state.phase, 'generated') &&
      existsSync(outputScriptPath);

    if (!canReuseGeneration) {
      const cookbook = cfg.useCookbook
        ? injectCookbook(readFileSync(join(taskDir, 'prompt.md'), 'utf8'))
        : undefined;
      const gen = await generateCase({
        taskDir,
        runDir: caseDir,
        agent,
        model: cfg.model,
        skillMd,
        startedAt: cfg.startedAt,
        cookbook,
        candidates: 1,
        maxAttempts: cfg.maxAttempts,
        maxTokens: cfg.maxTokens,
        temperature: cfg.temperature,
      });
      generationMs = gen.timeMs;
      generationEvents = gen.events;
      totals.tokensIn += gen.tokensIn;
      totals.tokensOut += gen.tokensOut;
      writeState(caseDir, {
        phase: 'generated',
        attempts: gen.attempts,
        tokens: { in: gen.tokensIn, out: gen.tokensOut },
        firstFailureCode: gen.firstFailureCode,
        generationMs: gen.timeMs,
        protocol: PROTOCOL,
        updatedAt: new Date().toISOString(),
      });
      state = readState(caseDir);
    }

    const cached = readScoreResult(caseDir);
    if (cached !== null && !cfg.force.has(caseName) && isAtLeast(state!.phase, 'scored')) {
      result = cached;
    } else {
      result = await scoreCase({
        taskDir,
        runDir: caseDir,
        outputScriptPath,
        events: generationEvents,
        attempts: state?.attempts ?? 1,
        tokensIn: state?.tokens.in ?? 0,
        tokensOut: state?.tokens.out ?? 0,
        generationMs,
        startedAt: cfg.startedAt,
        model: cfg.model,
        firstFailureCode: state?.firstFailureCode,
        noScript: isNoScriptArtifact(outputScriptPath),
      });
      writeState(caseDir, {
        phase: 'scored',
        attempts: state?.attempts ?? 1,
        tokens: state?.tokens ?? { in: 0, out: 0 },
        firstFailureCode: result.score?.firstFailureCode ?? state?.firstFailureCode,
        generationMs,
        protocol: PROTOCOL,
        updatedAt: new Date().toISOString(),
      });
    }

    if (!cfg.skipJudge) {
      const metrics = result.score?.metrics ?? {};
      const stage12Ok = metrics.muse_sandbox_ok === true && metrics.muse_overlap_free === true;
      const candidatePng = String(metrics.muse_render_png ?? '');
      const museRoot = cfg.env.MUSE_ROOT ?? join(cfg.env.HOME ?? '', 'projects/muse');
      const datasetCaseDir = join(museRoot, 'data/muse/cases', caseName);
      const pythonBin = cfg.env.MUSE_PYTHON ?? join(museRoot, '.venv/bin/python');

      const judge = await judgeWithRetries(
        {
          caseName,
          datasetCaseDir,
          candidatePng,
          outPath: join(caseDir, 'judge.json'),
          museRoot,
          pythonBin,
          baseUrl: cfg.baseUrl,
          model: JUDGE_MODEL,
        },
        stage12Ok && candidatePng.length > 0,
      );
      writeState(caseDir, {
        phase: 'judged',
        attempts: state?.attempts ?? 1,
        tokens: state?.tokens ?? { in: 0, out: 0 },
        firstFailureCode: result.score?.firstFailureCode ?? state?.firstFailureCode,
        generationMs,
        protocol: PROTOCOL,
        updatedAt: new Date().toISOString(),
      });
      return {
        case: caseName,
        status: 'ok',
        phase: 'judged',
        finalScore: judge.overall,
        attempts: result.score?.attempts,
        timeMs: result.score?.time_ms,
      };
    }

    return {
      case: caseName,
      status: 'ok',
      phase: 'scored',
      finalScore: result.score?.score,
      attempts: result.score?.attempts,
      timeMs: result.score?.time_ms,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    writeState(caseDir, {
      phase: 'infra_error',
      attempts: state?.attempts ?? 0,
      tokens: state?.tokens ?? { in: 0, out: 0 },
      firstFailureCode: state?.firstFailureCode,
      generationMs: state?.generationMs,
      error: message.slice(0, 1000),
      protocol: PROTOCOL,
      updatedAt: new Date().toISOString(),
    });
    return { case: caseName, status: 'infra', error: message };
  }
}

export interface PromptPlan {
  skillMd: string;
  promptBytes: number;
  skills: string[];
  preset: string;
}

/** Resolves the system prompt and its provenance (preset + effective skills). */
export function resolvePromptPlan(cfg: Pick<SweepConfig, 'promptPreset' | 'skills'>): PromptPlan {
  if (cfg.promptPreset === 'full') {
    // Legacy path: `--skills` selects the concatenated skill set.
    const skillMd = buildSystemPrompt(cfg.skills);
    return {
      skillMd,
      promptBytes: Buffer.byteLength(skillMd),
      skills: cfg.skills,
      preset: 'full',
    };
  }
  const built = buildSweepPrompt({ preset: cfg.promptPreset });
  return {
    skillMd: built.text,
    promptBytes: built.bytes,
    skills: built.skills,
    preset: built.preset,
  };
}

async function main(): Promise<void> {
  const cfg = parseSweepArgs(process.argv.slice(2));
  const preflightOnly = process.argv.includes('--preflight-only');

  const runJsonPath = join(cfg.runRoot, 'run.json');
  if (existsSync(runJsonPath)) {
    const prior = JSON.parse(readFileSync(runJsonPath, 'utf8')) as {
      promptPreset?: string;
      cookbook?: boolean;
    };
    if (prior.promptPreset !== cfg.promptPreset || prior.cookbook !== cfg.useCookbook) {
      console.error(
        `run '${cfg.runId}' was created with promptPreset=${prior.promptPreset} cookbook=${prior.cookbook}; ` +
          `refusing to resume with promptPreset=${cfg.promptPreset} cookbook=${cfg.useCookbook}. ` +
          'Use a new --run-id.',
      );
      process.exit(1);
    }
  }

  const report: PreflightReport = await runPreflight({
    env: cfg.env,
    exists: existsSync,
    run: (cmd, args) =>
      new Promise((res) => {
        execFile(cmd, args, { timeout: 120_000 }, (err, stdout, stderr) => {
          res({
            code: err ? ((err as { code?: number }).code ?? 1) : 0,
            stdout: String(stdout ?? ''),
            stderr: String(stderr ?? ''),
          });
        });
      }),
    fetchImpl: fetch,
    caseCount: () => {
      const dir = join(cfg.env.MUSE_ROOT ?? join(cfg.env.HOME ?? '', 'projects/muse'), 'data/muse/cases');
      return existsSync(dir) ? readdirSync(dir).length : 0;
    },
  });
  console.log(formatPreflight(report));
  const ignoredForMock = new Set(['deepinfra key', 'judge model']);
  const blocking = report.checks.filter(
    (c) => !(cfg.mockFixture !== undefined && ignoredForMock.has(c.name)),
  );
  if (!blocking.every((c) => c.ok)) process.exit(1);
  if (preflightOnly) {
    console.log('preflight-only: OK');
    return;
  }

  const cases = discoverCases(cfg.cases);
  if (cases.length === 0) {
    console.error('No muse-* tasks found. Run the importer first (plan Task 0).');
    process.exit(1);
  }
  mkdirSync(cfg.runRoot, { recursive: true });

  const plan = resolvePromptPlan(cfg);
  const { skillMd, promptBytes } = plan;
  console.log(`prompt preset=${plan.preset} skills=${plan.skills.join(',')} bytes=${plan.promptBytes}`);
  const agent: AgentClient = cfg.mockFixture
    ? new MockAgentClient(readCachedAgentResponses(cfg.mockFixture))
    : new OpenAICompatAgentClient({
        baseUrl: cfg.baseUrl,
        apiKey: cfg.env.DEEPINFRA_API_KEY ?? '',
      });

  const totals = { tokensIn: 0, tokensOut: 0 };
  const startedAtMs = Date.now();
  const envelope = {
    runId: cfg.runId,
    model: cfg.model,
    baseUrl: cfg.baseUrl,
    gitSha: cfg.gitSha,
    gitDirty: cfg.gitDirty,
    temperature: cfg.temperature,
    maxAttempts: cfg.maxAttempts,
    maxTokens: cfg.maxTokens,
    skills: plan.skills,
    promptPreset: cfg.promptPreset,
    promptBytes,
    cookbook: cfg.useCookbook,
    workers: cfg.workers,
    protocol: PROTOCOL,
    judgeModel: JUDGE_MODEL,
    judgeBaseUrl: cfg.baseUrl,
    startedAt: cfg.startedAt,
    caseCount: cases.length,
  };
  writeFileSync(join(cfg.runRoot, 'run.json'), JSON.stringify(envelope, null, 2));

  const outcomes = await mapPool(cases, cfg.workers, async (caseName, index) => {
    const outcome = await runOneCase(caseName, cfg, agent, skillMd, totals);
    const done = index + 1;
    const badge = outcome.status === 'ok' ? '✓' : outcome.status === 'infra' ? '✗' : '-';
    console.log(
      `[${done}/${cases.length}] ${caseName} ${badge} ${
        outcome.finalScore !== undefined ? `final=${outcome.finalScore.toFixed(2)} ` : ''
      }${outcome.error ?? outcome.status}`,
    );
    return outcome;
  });

  const wallMs = Date.now() - startedAtMs;
  const okCount = outcomes.filter((o) => o.status === 'ok').length;
  const infra = outcomes.filter((o) => o.status === 'infra');
  writeFileSync(
    join(cfg.runRoot, 'run.json'),
    JSON.stringify(
      {
        ...envelope,
        finishedAt: new Date().toISOString(),
        completed: okCount,
        skipped: outcomes.filter((o) => o.status === 'skipped').length,
        stopped: outcomes.filter((o) => o.status === 'stopped').length,
        budgetSkipped: outcomes.filter((o) => o.status === 'budget').length,
        infraErrors: infra.length,
        tokens: totals,
        wallMs,
        outcomes,
      },
      null,
      2,
    ),
  );

  writeReports(cfg.runRoot);
  console.log(
    `\n${okCount}/${cases.length} complete in ${(wallMs / 60000).toFixed(1)} min; ${infra.length} infra errors`,
  );
  process.exit(infra.length > 0 ? 1 : 0);
}

const isEntrypoint = (() => {
  if (!process.argv[1]) return false;
  try {
    return import.meta.url === new URL(`file://${process.argv[1]}`).href;
  } catch {
    return false;
  }
})();

if (isEntrypoint) {
  main().catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
  });
}
