// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { generateCaseWithTools, pickArtifact } from './toolGenerate';
import type { ToolChatClient, ToolChatResult } from './toolLoop';

const TASK_DIR = join(__dirname, '..', 'tasks', 'bracket-holes');

function clientFrom(responses: ToolChatResult[]): ToolChatClient {
  let i = 0;
  return {
    chatWithTools: async () => {
      const r = responses[i++];
      if (!r) throw new Error('exhausted');
      return r;
    },
  };
}

describe('pickArtifact', () => {
  it('prefers the fenced block, falls back to the last evaluated code', () => {
    expect(pickArtifact('text ```ts\nreturn A;\n```', 'return B;')).toBe('return A;');
    expect(pickArtifact('no fence here', 'return B;')).toBe('return B;');
    expect(pickArtifact('no fence', undefined)).toBeNull();
  });
});

describe('generateCaseWithTools', () => {
  it('writes the fenced artifact and reports status from the injected evaluator', async () => {
    const runDir = mkdtempSync(join(tmpdir(), 'toolgen-'));
    const client = clientFrom([
      {
        text: '```ts\nreturn box(1, 1, 1);\n```',
        toolCalls: [],
        finishReason: 'stop',
        tokensIn: 100,
        tokensOut: 10,
      },
    ]);
    const result = await generateCaseWithTools({
      taskDir: TASK_DIR,
      runDir,
      client,
      model: 'mock',
      skillMd: '# skills',
      startedAt: '2026-09-20T00-00-00',
      maxCalls: 4,
      execute: async () => ({ content: '{"ok":true}', ok: true, diagnostics: [] }),
      evaluateArtifact: async () => ({ ok: true, diagnostics: [] }),
    });
    expect(readFileSync(result.outputScriptPath, 'utf8')).toContain('box(1, 1, 1)');
    expect(result.status).toBe('passed');
    expect(result.tokensIn).toBe(100);
  });

  it('falls back to the last evaluated code when the model never emits a fence', async () => {
    const runDir = mkdtempSync(join(tmpdir(), 'toolgen-'));
    const client = clientFrom([
      {
        text: 'evaluating',
        toolCalls: [{ id: 'c1', name: 'evaluate_script', arguments: '{"code":"return last;"}' }],
        finishReason: 'tool_calls',
        tokensIn: 1,
        tokensOut: 1,
      },
      { text: 'done', toolCalls: [], finishReason: 'stop', tokensIn: 1, tokensOut: 1 },
    ]);
    const result = await generateCaseWithTools({
      taskDir: TASK_DIR,
      runDir,
      client,
      model: 'mock',
      skillMd: '# skills',
      startedAt: '2026-09-20T00-00-00',
      maxCalls: 4,
      execute: async () => ({
        content: '{"ok":false}',
        ok: false,
        diagnostics: ['feature.invalid-args'],
        evaluatedCode: 'return last;',
      }),
      evaluateArtifact: async () => ({ ok: false, diagnostics: [{ code: 'feature.invalid-args' }] }),
    });
    expect(readFileSync(result.outputScriptPath, 'utf8')).toBe('return last;');
    expect(result.status).toBe('gate_failed');
    expect(result.firstFailureCode).toBe('feature.invalid-args');
  });
});
