// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Runs the imported cqe-taskNN set (see eval/lib/importCadQueryEval.ts)
// through the standard agent loop and writes a per-task leaderboard.
//
//   DEEPINFRA_API_KEY=... npx tsx scripts/runCqeBenchmark.ts \
//     [--model deepseek-ai/DeepSeek-V4.1-Flash] [--tasks 01,05] [--workers 3] \
//     [--max-attempts 3] [--temperature 0] [--skills a,b | --all-skills] [--label before]
//     [--lean]    system prompt = SKILL.md only (no inlined references), as an MCP agent sees it
//     [--lookup]  let the model call lookup_api / lookup_authoring_skill (text protocol, eval/agentLookup.ts)
//
// Output: eval/runs/cqe-<label|timestamp>/{leaderboard.json,leaderboard.md,<task>/...}

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { LookupAgentClient, defaultLookupHandler } from '../eval/agentLookup';
import { OpenAICompatAgentClient } from '../eval/agentOpenAICompat';
import { mapPool } from '../eval/lib/pool';
import { DEFAULT_EVAL_SKILLS, buildSystemPrompt, describeSkillSelection, loadSkillSelection, parseSkillSelection } from '../eval/lib/systemPrompt';
import { runTask } from '../eval/runner';

const args = process.argv.slice(2);
const flag = (f: string): string | undefined => {
  const i = args.indexOf(f);
  return i >= 0 ? args[i + 1] : undefined;
};

const model = flag('--model') ?? 'deepseek-ai/DeepSeek-V4.1-Flash';
const baseUrl = flag('--base-url') ?? 'https://api.deepinfra.com/v1/openai';
const workers = Number(flag('--workers') ?? 3);
const maxAttempts = Number(flag('--max-attempts') ?? 3);
const temperature = Number(flag('--temperature') ?? 0);
const maxTokens = Number(flag('--max-tokens') ?? 16000);
const startedAt = new Date().toISOString().replace(/[:.]/g, '-');
const label = flag('--label') ?? startedAt;
const runRoot = resolve('eval/runs', `cqe-${label}`);
const tasksDir = resolve('eval/tasks');

const apiKey = process.env.DEEPINFRA_API_KEY;
if (!apiKey) {
  console.error('DEEPINFRA_API_KEY is required');
  process.exit(1);
}

const all = readdirSync(tasksDir).filter((d) => /^cqe-task\d\d$/.test(d)).sort();
const pick = flag('--tasks')?.split(',').map((s) => `cqe-task${s.padStart(2, '0')}`);
const tasks = pick ? all.filter((t) => pick.includes(t)) : all;
if (tasks.length === 0) {
  console.error('no cqe-taskNN dirs; run: npx tsx eval/lib/importCadQueryEval.ts');
  process.exit(1);
}

const sel = parseSkillSelection(args);
const lean = args.includes('--lean');
const skillMd = sel.mode === 'default'
  ? buildSystemPrompt(DEFAULT_EVAL_SKILLS, undefined, { references: !lean })
  : loadSkillSelection(sel, () => '');
const base = new OpenAICompatAgentClient({ baseUrl, apiKey });
const lookupHandler = args.includes('--lookup') ? defaultLookupHandler() : undefined;

mkdirSync(runRoot, { recursive: true });
const rows = await mapPool(tasks, workers, async (task) => {
  const runDir = join(runRoot, task);
  mkdirSync(runDir, { recursive: true });
  let row: Record<string, unknown>;
  const agent = lookupHandler ? new LookupAgentClient(base, lookupHandler) : base;
  try {
    const r = await runTask({
      taskDir: join(tasksDir, task), runDir, agent, model, skillMd, startedAt,
      candidates: 1, maxAttempts, maxTokens, temperature,
    });
    const score = r.score;
    const scorePath = join(runDir, 'score.json');
    const raw = existsSync(scorePath) ? JSON.parse(readFileSync(scorePath, 'utf8')) : {};
    const scorerPass = !!score && score.scored?.['geometry passes cadqueryeval scorer'] === true;
    const pass = !!score && score.gate_pass && scorerPass;
    row = { task, pass, scorerPass, lookups: agent instanceof LookupAgentClient ? agent.lookups : undefined, gate_pass: score?.gate_pass, scored: score?.scored, attempts: score?.attempts, tokens: score?.tokens, time_ms: score?.time_ms, firstFailureCode: raw.firstFailureCode ?? score?.firstFailureCode, metrics: raw.metrics ?? score?.metrics, infra_error: r.infra_error };
  } catch (e) {
    row = { task, pass: false, infra_error: e instanceof Error ? e.message : String(e) };
  }
  console.error(`${row.pass ? 'PASS' : 'FAIL'} ${task} attempts=${row.attempts ?? '-'} ${row.infra_error ?? ''}`);
  return row;
});

const passed = rows.filter((r) => r.pass).length;
const scorerPassed = rows.filter((r) => r.scorerPass).length;
const summary = { label, model, skills: describeSkillSelection(sel), lean, lookup: !!lookupHandler, maxAttempts, temperature, passed, scorerPassed, total: rows.length, rows };
writeFileSync(join(runRoot, 'leaderboard.json'), JSON.stringify(summary, null, 2));
writeFileSync(join(runRoot, 'leaderboard.md'), [
  `# cqe ${label} — ${model} — scorer ${scorerPassed}/${rows.length}, strict (scorer + local bbox gate) ${passed}/${rows.length}`,
  '', '| task | scorer | strict | attempts | lookups | first failure | detail |', '|---|---|---|---|---|---|---|',
  ...rows.map((r) => `| ${r.task} | ${r.scorerPass ? 'yes' : 'no'} | ${r.pass ? 'yes' : 'no'} | ${r.attempts ?? '-'} | ${r.lookups ?? '-'} | ${r.firstFailureCode ?? ''} | ${String((r.metrics as Record<string, unknown> | undefined)?.cqe_reason ?? r.infra_error ?? '').slice(0, 120)} |`),
].join('\n') + '\n');
console.error(`\n${scorerPassed}/${rows.length} scorer-pass, ${passed}/${rows.length} strict-pass -> ${runRoot}`);
