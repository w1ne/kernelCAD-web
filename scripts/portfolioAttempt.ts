#!/usr/bin/env node
// scripts/portfolioAttempt.ts
//
// Run one agent attempt against a portfolio entry's prompt and append
// a single line to eval/portfolio-attempts.jsonl with the outcome.
//
// Usage: portfolioAttempt --slug <slug> --model <model> [--notes <notes>]
// The prompt and harness are read from eval/portfolio/_tasks/<slug>/.
import { resolve, join } from 'node:path';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { runTask } from '../eval/runner';
import { appendPortfolioAttempt } from '../eval/portfolio/portfolioAttemptsLog';
import type { PortfolioAttempt, PortfolioAttemptStatus } from '../eval/portfolio/portfolioAttemptsLog';
import type { FailureModeTag } from '../eval/portfolio/failureMode';
import type { DiagnosticCode } from '../src/diagnostics/codes';
import { makeAgent } from '../eval/run';

interface Args { slug: string; model: string; notes: string; }

function parseArgs(argv: string[]): Args {
  const a: Partial<Args> = { notes: '' };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i], next = argv[i + 1];
    if (arg === '--slug') { a.slug = next; i++; }
    else if (arg === '--model') { a.model = next; i++; }
    else if (arg === '--notes') { a.notes = next; i++; }
  }
  for (const k of ['slug','model'] as const) {
    if (!a[k]) { console.error(`portfolioAttempt: missing --${k}`); process.exit(2); }
  }
  return a as Args;
}

function classify(score: { gate_pass: boolean; firstFailureCode?: string }): { status: PortfolioAttemptStatus; failureMode: FailureModeTag | null; diagnosticCode: DiagnosticCode | null } {
  if (score.gate_pass) return { status: 'built', failureMode: null, diagnosticCode: null };
  const code = score.firstFailureCode;
  if (code) return { status: 'failed', failureMode: `diagnostic_${code}` as FailureModeTag, diagnosticCode: code as DiagnosticCode };
  // Ambiguous: harness gate failed without a kernel diagnostic. Default to
  // out_of_scope (most common cause: kernel can't express the part) and warn
  // so the operator can post-edit failureMode in the JSONL line if a
  // different category fits better (e.g. model_limit when no script extracted).
  console.warn('portfolioAttempt: ambiguous failure (no firstFailureCode); tagging as out_of_scope. Re-tag the JSONL line manually if model_limit / tool_gap fits better.');
  return { status: 'failed', failureMode: 'out_of_scope', diagnosticCode: null };
}

async function main(): Promise<void> {
  const a = parseArgs(process.argv.slice(2));
  const logPath = resolve('eval/portfolio-attempts.jsonl');

  const startedAt = new Date().toISOString().replace(/[:.]/g, '-').replace('Z', '');
  const taskDir = resolve('eval/portfolio/_tasks', a.slug);
  if (!existsSync(taskDir)) { console.error(`portfolioAttempt: task dir missing: ${taskDir}. Create with prompt.md + harness.ts first.`); process.exit(2); }
  const runDir = resolve('eval/runs', `portfolio-${a.slug}-${startedAt}`);

  const agent = makeAgent(a.model);
  const skillsRoot = resolve('src/skills');
  const skillMd = readdirSync(skillsRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(skillsRoot, e.name, 'SKILL.md')))
    .map((e) => e.name)
    .sort()
    .map((name) => readFileSync(join(skillsRoot, name, 'SKILL.md'), 'utf8'))
    .join('\n\n---\n\n');

  // runTask writes score.json + transcript.md into runDir; we read score.json
  // back to classify the attempt rather than relying on the in-memory return
  // value (the disk artifact is the canonical record).
  await runTask({ taskDir, runDir, agent, model: a.model, skillMd, startedAt });

  const score = JSON.parse(readFileSync(resolve(runDir, 'score.json'), 'utf8')) as {
    gate_pass: boolean;
    firstFailureCode?: string;
    attempts: number;
  };
  const { status, failureMode, diagnosticCode } = classify(score);

  const attempt: PortfolioAttempt = {
    schemaVersion: 1,
    slug: a.slug,
    attemptN: score.attempts,
    status,
    failureMode,
    diagnosticCode,
    model: a.model,
    date: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
    notes: a.notes,
  };
  appendPortfolioAttempt(logPath, attempt);
  console.log(`appended: ${a.slug} attempt #${attempt.attemptN} → ${status}${failureMode ? ' / ' + failureMode : ''}`);
}

main().catch(err => { console.error(err); process.exit(1); });
