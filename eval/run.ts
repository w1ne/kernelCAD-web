#!/usr/bin/env node
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { runTask } from './runner';
import { AnthropicAgentClient, MockAgentClient } from './agent';
import { isKernelcadAvailable } from './oracle/kernelcad-client';
import type { AgentClient, AgentResponse, TaskResult } from './types';

const MODEL = process.env.EVAL_MODEL ?? 'claude-sonnet-4-6';
const TASKS_DIR = resolve('eval/tasks');
const RUNS_DIR = resolve('eval/runs');
const SKILL_PATH = resolve('src/skill/SKILL.md');

function timestamp(): string {
  // YYYY-MM-DDTHH-MM-SS — filesystem-safe ISO.
  return new Date().toISOString().replace(/\..+$/, '').replace(/:/g, '-');
}

function fail(message: string): never {
  console.error(`\nERROR: ${message}\n`);
  process.exit(1);
}

function discoverTasks(filter?: string): string[] {
  if (!existsSync(TASKS_DIR)) {
    fail(`Tasks directory not found: ${TASKS_DIR}`);
  }
  const all = readdirSync(TASKS_DIR).filter((name) => {
    const full = join(TASKS_DIR, name);
    return statSync(full).isDirectory() && existsSync(join(full, 'prompt.md')) && existsSync(join(full, 'harness.ts'));
  });
  return filter ? all.filter((n) => n === filter) : all;
}

function formatNum(n: number): string {
  return n.toLocaleString('en-US');
}

function printSummary(results: TaskResult[]): void {
  const COLS = { task: 18, score: 8, attempts: 9, tokens: 9, time: 8 };
  const pad = (s: string, w: number) => s.padEnd(w);

  console.error('');
  console.error(
    `${pad('TASK', COLS.task)} ${pad('SCORE', COLS.score)} ${pad('ATTEMPTS', COLS.attempts)} ${pad('TOKENS', COLS.tokens)} ${pad('TIME', COLS.time)}`,
  );

  let totalTokens = 0;
  let totalTimeMs = 0;
  let passed = 0;
  let infraErrors = 0;

  for (const r of results) {
    if (!r.score) {
      console.error(`${pad(r.task, COLS.task)} ${pad('— infra —', COLS.score + COLS.attempts + COLS.tokens + COLS.time + 4)}`);
      infraErrors++;
      continue;
    }
    const s = r.score;
    const mark = s.gate_pass && s.score === 1 ? '✓' : (s.gate_pass ? '~' : '✗');
    if (s.gate_pass && s.score === 1) passed++;
    const scoreStr = `${mark} ${s.score.toFixed(2)}`;
    const tokensStr = formatNum(s.tokens.total);
    const timeStr = `${(s.time_ms / 1000).toFixed(1)}s`;
    const note = !s.gate_pass ? '   gate fail' : '';
    console.error(
      `${pad(r.task, COLS.task)} ${pad(scoreStr, COLS.score)} ${pad(String(s.attempts), COLS.attempts)} ${pad(tokensStr, COLS.tokens)} ${pad(timeStr, COLS.time)}${note}`,
    );
    totalTokens += s.tokens.total;
    totalTimeMs += s.time_ms;
  }

  console.error('─'.repeat(60));
  const counted = results.length - infraErrors;
  console.error(
    `${counted} tasks, ${passed} passed     ${formatNum(totalTokens)} total   ${(totalTimeMs / 1000).toFixed(1)}s${infraErrors > 0 ? `   (${infraErrors} infra failures)` : ''}`,
  );
}

function loadFixture(fixturePath: string): AgentResponse[] {
  const data = JSON.parse(readFileSync(fixturePath, 'utf8'));
  if (!Array.isArray(data.responses)) {
    fail(`Fixture missing responses array: ${fixturePath}`);
  }
  return data.responses;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const isMock = args.includes('--mock');
  const taskArg = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--fixture');

  // --mock fixture path (optional; defaults to runs/golden-2026-05-02-bracket-holes)
  const fixtureFlagIdx = args.indexOf('--fixture');
  const fixturePath =
    fixtureFlagIdx >= 0 && args[fixtureFlagIdx + 1]
      ? args[fixtureFlagIdx + 1]
      : 'eval/runs/golden-2026-05-02-bracket-holes/fixture.json';

  // Pre-flight
  if (!existsSync(SKILL_PATH)) {
    fail(`SKILL.md not found at ${SKILL_PATH}`);
  }
  if (!(await isKernelcadAvailable())) {
    fail(
      'kernelcad CLI not found. Run `npm run build:cli` and set KERNELCAD_BIN=./dist/cli/index.js, or `npm link` to make it global.',
    );
  }
  if (!isMock && !process.env.ANTHROPIC_API_KEY) {
    fail('ANTHROPIC_API_KEY env var is required (or pass --mock to replay a fixture).');
  }

  const skillMd = readFileSync(SKILL_PATH, 'utf8');
  const tasks = discoverTasks(taskArg);
  if (tasks.length === 0) {
    fail(taskArg ? `No task named '${taskArg}' under ${TASKS_DIR}` : `No tasks found under ${TASKS_DIR}`);
  }

  const startedAt = timestamp();
  const runRoot = join(RUNS_DIR, isMock ? `_mock-${startedAt}` : startedAt);

  const results: TaskResult[] = [];
  for (const task of tasks) {
    let agent: AgentClient;
    if (isMock) {
      agent = new MockAgentClient(loadFixture(fixturePath));
    } else {
      agent = new AnthropicAgentClient(process.env.ANTHROPIC_API_KEY!);
    }
    try {
      const r = await runTask({
        taskDir: join(TASKS_DIR, task),
        runDir: join(runRoot, task),
        agent,
        model: isMock ? 'mock-model' : MODEL,
        skillMd,
        startedAt,
      });
      results.push(r);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`\n[${task}] infra error: ${msg}`);
      results.push({ task, score: null, infra_error: msg });
    }
  }

  printSummary(results);

  // Exit 0 unless every task was infra_error.
  const allInfra = results.every((r) => r.infra_error);
  process.exit(allInfra ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
