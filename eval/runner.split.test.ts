// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { generateCase, scoreCase } from './runner';
import { MockAgentClient } from './agent';
import type { AgentResponse } from './types';

const TASK_DIR = join(__dirname, 'tasks', 'bracket-holes');
const SKILLS = '# skills\n\nBe precise.';
const hasCli =
  existsSync(join(process.cwd(), 'dist/cli/index.js')) || Boolean(process.env.KERNELCAD_BIN);

const GOOD_SCRIPT = [
  '```ts',
  'export const bracket = box(40, 20, 5);',
  '```',
].join('\n');

describe.skipIf(!hasCli)('generateCase / scoreCase split', () => {
  it('generates without scoring, then scores the written script', async () => {
    const runDir = mkdtempSync(join(tmpdir(), 'split-'));
    const agent = new MockAgentClient([
      { text: GOOD_SCRIPT, tokens_in: 10, tokens_out: 5 } satisfies AgentResponse,
    ]);
    const gen = await generateCase({
      taskDir: TASK_DIR,
      runDir,
      agent,
      model: 'mock-model',
      skillMd: SKILLS,
      startedAt: '2026-09-19T00-00-00',
      candidates: 1,
      maxAttempts: 3,
      maxTokens: 8000,
      temperature: 0.2,
    });
    const script = readFileSync(gen.outputScriptPath, 'utf8');
    expect(script.length).toBeGreaterThan(0);
    expect(gen.tokensIn).toBe(10);

    const result = await scoreCase({
      taskDir: TASK_DIR,
      runDir,
      outputScriptPath: gen.outputScriptPath,
      events: gen.events,
      attempts: gen.attempts,
      tokensIn: gen.tokensIn,
      tokensOut: gen.tokensOut,
      generationMs: gen.timeMs,
      startedAt: '2026-09-19T00-00-00',
      model: 'mock-model',
      firstFailureCode: gen.firstFailureCode,
      noScript: gen.status === 'no_script',
    });
    expect(result.task).toBe('bracket-holes');
    expect(result.score).not.toBeNull();
    expect(readFileSync(join(runDir, 'score.json'), 'utf8')).toContain('"attempts"');
  });
});
