#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

interface ScoreFile { score: number; gate_pass: boolean; tokens: { total: number }; }

function discoverRunDir(rootBefore: string[]): string {
  const after = readdirSync('eval/runs').sort();
  const fresh = after.find((n) => !rootBefore.includes(n));
  if (!fresh) throw new Error('Could not detect new run directory under eval/runs/');
  return join('eval/runs', fresh);
}

function readScores(runDir: string): Record<string, ScoreFile> {
  const out: Record<string, ScoreFile> = {};
  for (const task of readdirSync(runDir)) {
    const full = join(runDir, task);
    if (!statSync(full).isDirectory()) continue;
    const scorePath = join(full, 'score.json');
    if (!existsSync(scorePath)) continue;
    out[task] = JSON.parse(readFileSync(scorePath, 'utf8'));
  }
  return out;
}

function runEval(extraArgs: string[]): string {
  const before = existsSync('eval/runs') ? readdirSync('eval/runs').sort() : [];
  const r = spawnSync('npx', ['tsx', 'eval/run.ts', ...extraArgs], {
    stdio: 'inherit',
    env: process.env,
  });
  if (r.status !== 0) throw new Error(`eval failed (exit ${r.status})`);
  return discoverRunDir(before);
}

function main(): void {
  // Forward argv from `npm run eval:ab -- <args>` so callers can pin to a
  // single task or use --mock. ON gets the same args plus --cookbook.
  const sharedArgs = process.argv.slice(2);
  console.log('\n=== A/B eval — cookbook OFF ===\n');
  const offRun = runEval(sharedArgs);
  console.log('\n=== A/B eval — cookbook ON ===\n');
  const onRun = runEval([...sharedArgs, '--cookbook']);

  const off = readScores(offRun);
  const on = readScores(onRun);

  console.log('\n=== Score delta (ON minus OFF) ===\n');
  console.log('TASK                  OFF    ON     ΔSCORE  ΔTOKENS');
  console.log('─'.repeat(60));
  let totalDelta = 0;
  let tokenDeltaTotal = 0;
  for (const task of Object.keys(off).sort()) {
    if (!on[task]) continue;
    const d = on[task].score - off[task].score;
    const td = on[task].tokens.total - off[task].tokens.total;
    totalDelta += d;
    tokenDeltaTotal += td;
    console.log(`${task.padEnd(22)}${off[task].score.toFixed(2).padEnd(7)}${on[task].score.toFixed(2).padEnd(7)}${(d >= 0 ? '+' : '') + d.toFixed(2).padEnd(7)}${(td >= 0 ? '+' : '') + td}`);
  }
  console.log('─'.repeat(60));
  console.log(`TOTAL                                ${(totalDelta >= 0 ? '+' : '') + totalDelta.toFixed(2)}    ${(tokenDeltaTotal >= 0 ? '+' : '') + tokenDeltaTotal}`);
}

main();
