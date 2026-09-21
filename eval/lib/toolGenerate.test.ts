// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

// toolGenerate imports '../oracle/kernelcad-client' relative to eval/lib/ —
// i.e. this same specifier — so register the mock before loading the module.
vi.mock('../oracle/kernelcad-client', () => ({ evaluateScript: vi.fn() }));

// Import AFTER mocks are registered.
import { evaluateScript } from '../oracle/kernelcad-client';
import { generateCaseWithTools, pickArtifact, TOOL_PROTOCOL } from './toolGenerate';
import type { ToolChatClient, ToolChatMessage, ToolChatResult } from './toolLoop';

const TASK_DIR = join(__dirname, '..', 'tasks', 'bracket-holes');
const mockEval = vi.mocked(evaluateScript);

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

function readToolLoop(runDir: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(runDir, 'tool-loop.json'), 'utf8')) as Record<string, unknown>;
}

function lastToolMessage(messages: ToolChatMessage[]): ToolChatMessage {
  const tools = messages.filter((m) => m.role === 'tool');
  const last = tools[tools.length - 1];
  if (!last) throw new Error('no tool message');
  return last;
}

describe('pickArtifact', () => {
  it('prefers the fenced block, then the last clean candidate, then the last evaluated one', () => {
    expect(pickArtifact('text ```ts\nreturn A;\n```', 'return B;', 'return C;')).toEqual({
      code: 'return A;',
      source: 'fence',
    });
    expect(pickArtifact('no fence here', 'return B;', 'return C;')).toEqual({
      code: 'return B;',
      source: 'last-clean',
    });
    expect(pickArtifact('no fence here', undefined, 'return C;')).toEqual({
      code: 'return C;',
      source: 'last-evaluated',
    });
    expect(pickArtifact('no fence', undefined, undefined)).toBeNull();
  });

  it('treats an empty fenced block as absent', () => {
    expect(pickArtifact('```ts\n\n```', 'return B;', 'return C;')).toEqual({
      code: 'return B;',
      source: 'last-clean',
    });
    expect(pickArtifact('```ts\n\n```', undefined, 'return C;')).toEqual({
      code: 'return C;',
      source: 'last-evaluated',
    });
    expect(pickArtifact('```ts\n\n```', undefined, undefined)).toBeNull();
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

    const meta = readToolLoop(runDir);
    expect(meta.artifactSource).toBe('fence');
    expect(meta.lastCleanAvailable).toBe(false);
    expect(meta.status).toBe('passed');
    expect(meta.maxCalls).toBe(4);
    expect(meta.startedAt).toBe('2026-09-20T00-00-00');
  });

  it('keeps the cookbook addendum in the tool-arm system prompt', async () => {
    const runDir = mkdtempSync(join(tmpdir(), 'toolgen-'));
    let capturedSystem = '';
    const client: ToolChatClient = {
      chatWithTools: async (a) => {
        capturedSystem = a.system;
        return {
          text: '```ts\nreturn box(1,1,1);\n```',
          toolCalls: [],
          finishReason: 'stop',
          tokensIn: 1,
          tokensOut: 1,
        };
      },
    };
    const result = await generateCaseWithTools({
      taskDir: TASK_DIR,
      runDir,
      client,
      model: 'mock',
      skillMd: '# skills',
      startedAt: '2026-09-20T00-00-00',
      maxCalls: 4,
      cookbook: {
        query: 'q',
        hits: [{ id: 'snap-1', score: 0.9 }],
        systemPromptAddendum: 'DISTINCTIVE_COOKBOOK_ADDENDUM',
      },
      execute: async () => ({ content: '{"ok":true}', ok: true, diagnostics: [] }),
      evaluateArtifact: async () => ({ ok: true, diagnostics: [] }),
    });
    expect(capturedSystem).toContain('DISTINCTIVE_COOKBOOK_ADDENDUM');
    expect(capturedSystem).toContain('## Verification tool');
    expect(capturedSystem).toContain(TOOL_PROTOCOL);
    expect(result.events.map((e) => e.kind)).toEqual(['system_prompt', 'user_prompt', 'cookbook_inject']);
    expect(result.events[2]).toEqual({
      kind: 'cookbook_inject',
      query: 'q',
      hits: [{ id: 'snap-1', score: 0.9 }],
    });
    expect(result.status).toBe('passed');
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

    const meta = readToolLoop(runDir);
    expect(meta.artifactSource).toBe('last-evaluated');
    expect(meta.lastCleanAvailable).toBe(false);
  });

  it('uses the last evaluated candidate when no call was clean and there is no fence', async () => {
    const runDir = mkdtempSync(join(tmpdir(), 'toolgen-'));
    const client = clientFrom([
      {
        text: 'trying',
        toolCalls: [
          { id: 'c1', name: 'evaluate_script', arguments: '{"code":"return v1;"}' },
          { id: 'c2', name: 'evaluate_script', arguments: '{"code":"return v2;"}' },
        ],
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
      execute: async (_name, args) => ({
        content: '{"ok":false}',
        ok: false,
        diagnostics: ['feature.invalid-args'],
        evaluatedCode: String(args.code),
      }),
      evaluateArtifact: async () => ({ ok: false, diagnostics: [{ code: 'feature.invalid-args' }] }),
    });
    expect(readFileSync(result.outputScriptPath, 'utf8')).toBe('return v2;');
    expect(result.status).toBe('gate_failed');

    const meta = readToolLoop(runDir);
    expect(meta.artifactSource).toBe('last-evaluated');
    expect(meta.lastCleanAvailable).toBe(false);
  });

  it('prefers the earlier clean candidate when the last call fails and there is no fence', async () => {
    const runDir = mkdtempSync(join(tmpdir(), 'toolgen-'));
    const client = clientFrom([
      {
        text: 'trying',
        toolCalls: [
          { id: 'c1', name: 'evaluate_script', arguments: '{"code":"return clean;"}' },
          { id: 'c2', name: 'evaluate_script', arguments: '{"code":"return broken;"}' },
        ],
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
      execute: async (_name, args) => {
        const code = String(args.code);
        const ok = code === 'return clean;';
        return { content: ok ? '{"ok":true}' : '{"ok":false}', ok, diagnostics: [], evaluatedCode: code };
      },
      evaluateArtifact: async () => ({ ok: true, diagnostics: [] }),
    });
    expect(readFileSync(result.outputScriptPath, 'utf8')).toBe('return clean;');
    expect(result.status).toBe('passed');

    const meta = readToolLoop(runDir);
    expect(meta.artifactSource).toBe('last-clean');
    expect(meta.lastCleanAvailable).toBe(true);
  });

  it('falls back to the last clean candidate when the final fence fails evaluation', async () => {
    const runDir = mkdtempSync(join(tmpdir(), 'toolgen-'));
    const client = clientFrom([
      {
        text: 'checking',
        toolCalls: [{ id: 'c1', name: 'evaluate_script', arguments: '{"code":"return clean;"}' }],
        finishReason: 'tool_calls',
        tokensIn: 1,
        tokensOut: 1,
      },
      { text: '```ts\nreturn fenced;\n```', toolCalls: [], finishReason: 'stop', tokensIn: 1, tokensOut: 1 },
    ]);
    const evaluated: string[] = [];
    const result = await generateCaseWithTools({
      taskDir: TASK_DIR,
      runDir,
      client,
      model: 'mock',
      skillMd: '# skills',
      startedAt: '2026-09-20T00-00-00',
      maxCalls: 4,
      execute: async (_name, args) => ({
        content: '{"ok":true}',
        ok: true,
        diagnostics: [],
        evaluatedCode: String(args.code),
      }),
      evaluateArtifact: async (scriptPath) => {
        const code = readFileSync(scriptPath, 'utf8');
        evaluated.push(code);
        return code === 'return fenced;'
          ? { ok: false, diagnostics: [{ code: 'fence.broken' }] }
          : { ok: true, diagnostics: [] };
      },
    });
    expect(evaluated).toEqual(['return fenced;', 'return clean;']);
    expect(readFileSync(result.outputScriptPath, 'utf8')).toBe('return clean;');
    expect(result.status).toBe('passed');

    const meta = readToolLoop(runDir);
    expect(meta.artifactSource).toBe('last-clean');
    expect(meta.lastCleanAvailable).toBe(true);
    expect(meta.firstFailureCode).toBeUndefined();
  });

  it('writes the no-script placeholder when the model only emits prose', async () => {
    const runDir = mkdtempSync(join(tmpdir(), 'toolgen-'));
    const client = clientFrom([
      { text: 'I could not produce a script, sorry.', toolCalls: [], finishReason: 'stop', tokensIn: 3, tokensOut: 4 },
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
    expect(readFileSync(result.outputScriptPath, 'utf8')).toBe('// (no script extracted from any attempt)');
    expect(result.status).toBe('no_script');
    expect(result.firstFailureCode).toBe('eval.no-script-extracted');

    const meta = readToolLoop(runDir);
    expect(meta.artifactSource).toBe('none');
    expect(meta.lastCleanAvailable).toBe(false);
    expect(meta.status).toBe('no_script');
    expect(meta.firstFailureCode).toBe('eval.no-script-extracted');
  });

  it('caps the loop and falls back to the last evaluated candidate', async () => {
    const runDir = mkdtempSync(join(tmpdir(), 'toolgen-'));
    const client = clientFrom([
      {
        text: 'working',
        toolCalls: [{ id: 'c1', name: 'evaluate_script', arguments: '{"code":"return v1;"}' }],
        finishReason: 'tool_calls',
        tokensIn: 1,
        tokensOut: 1,
      },
      {
        text: 'still working',
        toolCalls: [{ id: 'c2', name: 'evaluate_script', arguments: '{"code":"return v2;"}' }],
        finishReason: 'tool_calls',
        tokensIn: 1,
        tokensOut: 1,
      },
    ]);
    let n = 0;
    const result = await generateCaseWithTools({
      taskDir: TASK_DIR,
      runDir,
      client,
      model: 'mock',
      skillMd: '# skills',
      startedAt: '2026-09-20T00-00-00',
      maxCalls: 2,
      execute: async () => {
        n += 1;
        return { content: '{"ok":true}', ok: true, diagnostics: [], evaluatedCode: `return v${n};` };
      },
      evaluateArtifact: async () => ({ ok: true, diagnostics: [] }),
    });
    expect(readFileSync(result.outputScriptPath, 'utf8')).toBe('return v2;');
    expect(result.status).toBe('passed');

    const meta = readToolLoop(runDir);
    expect(meta.stopReason).toBe('cap');
    expect(meta.artifactSource).toBe('last-clean');
    expect(meta.lastCleanAvailable).toBe(true);
    expect(meta.toolCallCount).toBe(2);
  });

  it('production execute writes candidates and reports unknown-tool/missing-code', async () => {
    const runDir = mkdtempSync(join(tmpdir(), 'toolgen-'));
    mockEval.mockResolvedValue({
      ok: true,
      diagnostics: [{ code: 'warn.x', message: 'm', hint: 'h' }],
      featureCount: 7,
    });
    const seen: ToolChatMessage[][] = [];
    const client: ToolChatClient = {
      chatWithTools: async (a) => {
        seen.push(a.messages.map((m) => ({ ...m })));
        const i = seen.length;
        if (i === 1) {
          return {
            text: '',
            toolCalls: [{ id: 'c1', name: 'evaluate_script', arguments: '{"code":"return box(2,2,2);"}' }],
            finishReason: 'tool_calls',
            tokensIn: 1,
            tokensOut: 1,
          };
        }
        if (i === 2) {
          return {
            text: '',
            toolCalls: [{ id: 'c2', name: 'nope', arguments: '{}' }],
            finishReason: 'tool_calls',
            tokensIn: 1,
            tokensOut: 1,
          };
        }
        if (i === 3) {
          return {
            text: '',
            toolCalls: [{ id: 'c3', name: 'evaluate_script', arguments: '{}' }],
            finishReason: 'tool_calls',
            tokensIn: 1,
            tokensOut: 1,
          };
        }
        return {
          text: '```ts\nreturn box(2,2,2);\n```',
          toolCalls: [],
          finishReason: 'stop',
          tokensIn: 1,
          tokensOut: 1,
        };
      },
    };
    const result = await generateCaseWithTools({
      taskDir: TASK_DIR,
      runDir,
      client,
      model: 'mock',
      skillMd: '# skills',
      startedAt: '2026-09-20T00-00-00',
      maxCalls: 8,
    });

    const candidate = join(runDir, 'tool-calls', 'call-1.kcad.ts');
    expect(readFileSync(candidate, 'utf8')).toBe('return box(2,2,2);');
    expect(readdirSync(join(runDir, 'tool-calls'))).toEqual(['call-1.kcad.ts']);
    expect(mockEval).toHaveBeenCalledWith(candidate);

    const first = JSON.parse(lastToolMessage(seen[1]).content) as Record<string, unknown>;
    expect(first.ok).toBe(true);
    expect(first.featureCount).toBe(7);
    expect(first.diagnostics).toEqual([{ code: 'warn.x', message: 'm', hint: 'h' }]);

    expect(JSON.parse(lastToolMessage(seen[2]).content)).toEqual({ error: 'unknown tool nope' });
    expect(JSON.parse(lastToolMessage(seen[3]).content)).toEqual({ error: 'code is required' });

    expect(result.status).toBe('passed');
    expect(readToolLoop(runDir).artifactSource).toBe('fence');
  });
});
