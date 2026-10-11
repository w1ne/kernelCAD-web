// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// The mech40 workflow's "Run the agent" step, executed exactly as GitHub runs
// it (bash -eo pipefail, GITHUB_OUTPUT file) with the reference agent. OCCT's
// STEP writer prints banners to stdout; they must not reach `results=`.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { withStdoutToStderr } from './runAgent';

const WORKFLOW = resolve('.github/workflows/mech40-eval.yml');

interface Step { name?: string; run?: string }

function runStepScript(): string {
  const wf = parse(readFileSync(WORKFLOW, 'utf8')) as { jobs: { mech40: { steps: Step[] } } };
  const step = wf.jobs.mech40.steps.find((s) => s.name === 'Run the agent over mech40');
  if (!step?.run) throw new Error('workflow has no "Run the agent over mech40" run step');
  return step.run;
}

describe('mech40-eval.yml run step', () => {
  it('writes a clean results=<path> to GITHUB_OUTPUT even though OCCT prints STEP banners', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mech40-wf-'));
    const ghOut = join(dir, 'github_output');
    const runId = `test-${process.pid}-${Date.now()}`;
    const env = {
      ...process.env, GITHUB_OUTPUT: ghOut, GITHUB_RUN_ID: runId,
      K: '1', MODEL: '', TASKS: '01-plate-four-corner-holes', MOCK: 'true',
    };
    let results = '';
    try {
      const stdout = execFileSync('bash', ['--noprofile', '--norc', '-eo', 'pipefail', '-c', runStepScript()], {
        env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
      });
      expect(stdout).toBe('');
      const lines = readFileSync(ghOut, 'utf8').split('\n').filter(Boolean);
      expect(lines).toHaveLength(1);
      const m = /^results=(.+)$/.exec(lines[0]);
      expect(m?.[1]).toBe(`eval/results/ci-${runId}-mech40.json`);
      results = resolve(m![1]);
      const parsed = JSON.parse(readFileSync(results, 'utf8')) as { schema: string; summary: { pass_at_1: number } };
      expect(parsed.schema).toBe('kernelcad.mech40.results/v1');
      expect(parsed.summary.pass_at_1).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
      if (results && existsSync(results)) rmSync(results);
      const fallback = resolve(`eval/results/ci-${runId}-mech40.json`);
      if (existsSync(fallback)) rmSync(fallback);
    }
  }, 180_000);
});

describe('withStdoutToStderr', () => {
  it('routes stray stdout writes to stderr and keeps a real stdout writer', async () => {
    const seen: string[] = [];
    const realOut = process.stdout.write;
    const realErr = process.stderr.write;
    process.stdout.write = ((c: string) => { seen.push(`out:${c}`); return true; }) as typeof process.stdout.write;
    process.stderr.write = ((c: string) => { seen.push(`err:${c}`); return true; }) as typeof process.stdout.write;
    try {
      await withStdoutToStderr(async (stdout) => {
        process.stdout.write(' Step File Name : blob.step(1038 ents)  Write  Done\n');
        stdout('/tmp/results.json');
      });
      process.stdout.write('after\n');
    } finally {
      process.stdout.write = realOut;
      process.stderr.write = realErr;
    }
    expect(seen).toEqual([
      'err: Step File Name : blob.step(1038 ents)  Write  Done\n',
      'out:/tmp/results.json\n',
      'out:after\n',
    ]);
  });
});
