// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runTask } from './runner';
import { MockAgentClient } from './agent';
import { isKernelcadAvailable } from './oracle/kernelcad-client';

let kernelcadAvailable = false;
let runsDir: string;

beforeAll(async () => {
  kernelcadAvailable = await isKernelcadAvailable();
  // In CI we must fail loudly rather than silently skip — a green build with
  // zero runner coverage is worse than a red one. Local dev still gets the skip.
  if (!kernelcadAvailable && process.env.CI) {
    throw new Error(
      'kernelcad CLI not available in CI. Set KERNELCAD_BIN=./dist/cli/index.js after `npm run build:cli`, or `npm link`.',
    );
  }
});

beforeEach(() => {
  runsDir = mkdtempSync(join(tmpdir(), 'eval-runner-'));
});

describe('runTask', () => {
  it('runs a task end-to-end and writes artifacts when the agent succeeds first try', async (ctx) => {
    if (!kernelcadAvailable) return ctx.skip();

    const expertScript = readFileSync('./eval/tasks/bracket-holes/solution-expert.kcad.ts', 'utf8');
    const client = new MockAgentClient([
      {
        text: 'Here is the bracket:\n```typescript\n' + expertScript + '\n```',
        tokens_in: 4000,
        tokens_out: 200,
      },
    ]);

    const result = await runTask({
      taskDir: './eval/tasks/bracket-holes',
      runDir: runsDir,
      agent: client,
      model: 'mock-model',
      skillMd: 'fake skill content',
      startedAt: '2026-05-02T14-00-00',
    });

    expect(result.score).not.toBeNull();
    expect(result.score!.gate_pass).toBe(true);
    expect(result.score!.score).toBe(1);
    expect(result.score!.attempts).toBe(1);

    expect(existsSync(join(runsDir, 'transcript.md'))).toBe(true);
    expect(existsSync(join(runsDir, 'output.kcad.ts'))).toBe(true);
    expect(existsSync(join(runsDir, 'score.json'))).toBe(true);

    const score = JSON.parse(readFileSync(join(runsDir, 'score.json'), 'utf8'));
    expect(score.gate_pass).toBe(true);
    expect(score.score).toBe(1);

    const tx = readFileSync(join(runsDir, 'transcript.md'), 'utf8');
    expect(tx).toContain('# bracket-holes');
    expect(tx).toContain('## Turn 1');
    expect(tx).toContain('## Evaluate (attempt 1) — OK');
  }, 30000);

  it('retries up to 3 attempts when the agent first generates a broken script', async (ctx) => {
    if (!kernelcadAvailable) return ctx.skip();

    const expertScript = readFileSync('./eval/tasks/bracket-holes/solution-expert.kcad.ts', 'utf8');
    const client = new MockAgentClient([
      // Attempt 1: broken (sphere with face filter — guaranteed-fail diagnostic)
      {
        text: '```typescript\nreturn sphere(5).fillet(1, { face: "top" });\n```',
        tokens_in: 4000,
        tokens_out: 50,
      },
      // Attempt 2: correct
      {
        text: '```typescript\n' + expertScript + '\n```',
        tokens_in: 4500,
        tokens_out: 200,
      },
    ]);

    const result = await runTask({
      taskDir: './eval/tasks/bracket-holes',
      runDir: runsDir,
      agent: client,
      model: 'mock-model',
      skillMd: 'fake skill content',
      startedAt: '2026-05-02T14-00-00',
    });

    expect(result.score!.attempts).toBe(2);
    expect(result.score!.score).toBe(1);

    const tx = readFileSync(join(runsDir, 'transcript.md'), 'utf8');
    expect(tx).toContain('## Evaluate (attempt 1) — FAIL');
    expect(tx).toContain('## Turn 2');
    expect(tx).toContain('## Evaluate (attempt 2) — OK');
  }, 30000);

  it('gives up after 3 failed attempts and marks gate-fail', async (ctx) => {
    if (!kernelcadAvailable) return ctx.skip();

    const broken = '```typescript\nreturn sphere(5).fillet(1, { face: "top" });\n```';
    const client = new MockAgentClient([
      { text: broken, tokens_in: 4000, tokens_out: 50 },
      { text: broken, tokens_in: 4000, tokens_out: 50 },
      { text: broken, tokens_in: 4000, tokens_out: 50 },
    ]);

    const result = await runTask({
      taskDir: './eval/tasks/bracket-holes',
      runDir: runsDir,
      agent: client,
      model: 'mock-model',
      skillMd: 'fake skill content',
      startedAt: '2026-05-02T14-00-00',
    });

    expect(result.score!.attempts).toBe(3);
    expect(result.score!.gate_pass).toBe(false);
    expect(result.score!.score).toBe(0);
  }, 30000);
});
