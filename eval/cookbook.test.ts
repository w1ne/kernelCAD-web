// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, beforeAll } from 'vitest';
import { mkdtempSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runTask } from './runner';
import { MockAgentClient } from './agent';
import { isKernelcadAvailable } from './oracle/kernelcad-client';
import { injectCookbook } from './cookbook-injector';
import { loadCombinedSkillMd } from './skillContext';

let kernelcadAvailable = false;

beforeAll(async () => {
  kernelcadAvailable = await isKernelcadAvailable();
  if (!kernelcadAvailable && process.env.CI) {
    throw new Error(
      'kernelcad CLI not available in CI. Set KERNELCAD_BIN=./dist/cli/index.js after `npm run build:cli`.',
    );
  }
});

describe('cookbook A/B against bracket-holes', () => {
  it('produces identical scores with --cookbook on vs off; transcript reflects the difference', async (ctx) => {
    if (!kernelcadAvailable) return ctx.skip();

    const expert = readFileSync('eval/tasks/bracket-holes/solution-expert.kcad.ts', 'utf8');
    const skillMd = loadCombinedSkillMd();
    const prompt = readFileSync('eval/tasks/bracket-holes/prompt.md', 'utf8');

    // OFF
    const offDir = mkdtempSync(join(tmpdir(), 'cookbook-ab-off-'));
    const offClient = new MockAgentClient([
      { text: '```typescript\n' + expert + '\n```', tokens_in: 1000, tokens_out: 200 },
    ]);
    const offResult = await runTask({
      taskDir: 'eval/tasks/bracket-holes',
      runDir: offDir,
      agent: offClient,
      model: 'mock-model',
      skillMd,
      startedAt: 'AB-OFF',
    });

    // ON
    const onDir = mkdtempSync(join(tmpdir(), 'cookbook-ab-on-'));
    const onClient = new MockAgentClient([
      { text: '```typescript\n' + expert + '\n```', tokens_in: 1000, tokens_out: 200 },
    ]);
    const injection = injectCookbook(prompt);
    const onResult = await runTask({
      taskDir: 'eval/tasks/bracket-holes',
      runDir: onDir,
      agent: onClient,
      model: 'mock-model',
      skillMd,
      startedAt: 'AB-ON',
      cookbook: injection,
    });

    // Identical scores (mock agent ⇒ same script ⇒ same harness verdict).
    expect(onResult.score?.score).toBe(offResult.score?.score);
    expect(onResult.score?.gates).toEqual(offResult.score?.gates);
    expect(onResult.score?.scored).toEqual(offResult.score?.scored);

    // OFF: agent received no addendum.
    expect(offClient.calls[0].systemAddendum).toBeUndefined();

    // ON: agent received a non-empty addendum, and the transcript shows the injection.
    expect((onClient.calls[0].systemAddendum ?? '').length).toBeGreaterThan(0);
    expect(onClient.calls[0].systemAddendum).toContain('## Retrieved cookbook snippets for this task');

    const onTx = readFileSync(join(onDir, 'transcript.md'), 'utf8');
    expect(onTx).toContain('## Cookbook injection');
    expect(onTx).toMatch(/non-overlapping-l-bracket|subtract-then-fillet-rim|parametric-bolt-pattern-skeleton/);

    const offTx = readFileSync(join(offDir, 'transcript.md'), 'utf8');
    expect(offTx).not.toContain('## Cookbook injection');

    // Injection ranking is deterministic and includes a top hit relevant to L-brackets.
    expect(injection.hits.length).toBeGreaterThan(0);
    expect(injection.hits.map((h) => h.id)).toContain('non-overlapping-l-bracket');
  });
});
