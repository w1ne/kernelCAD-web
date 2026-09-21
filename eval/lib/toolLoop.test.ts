// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { runToolLoop, type ToolChatClient, type ToolChatResult } from './toolLoop';

function clientFrom(responses: ToolChatResult[]): ToolChatClient {
  let i = 0;
  return {
    chatWithTools: async () => {
      const r = responses[i++];
      if (!r) throw new Error('client exhausted');
      return r;
    },
  };
}

const TOOL = {
  type: 'function' as const,
  function: { name: 'evaluate_script', description: 'eval', parameters: { type: 'object' } },
};

describe('runToolLoop', () => {
  it('stops on an assistant message without tool calls', async () => {
    const client = clientFrom([
      { text: '```ts\nreturn box(1,1,1);\n```', toolCalls: [], finishReason: 'stop', tokensIn: 10, tokensOut: 5 },
    ]);
    const r = await runToolLoop({
      client, system: 's', user: 'u', model: 'm', maxTokens: 100, maxCalls: 8, tools: [TOOL],
      execute: async () => ({ content: '{}', ok: true, diagnostics: [] }),
    });
    expect(r.stopReason).toBe('final');
    expect(r.toolCallCount).toBe(0);
    expect(r.finalText).toContain('box(1,1,1)');
    expect(r.tokensIn).toBe(10);
  });

  it('executes tool calls, feeds results back, and records the evaluated code', async () => {
    const client = clientFrom([
      {
        text: 'checking',
        toolCalls: [{ id: 'c1', name: 'evaluate_script', arguments: '{"code":"return box(1,1,1);"}' }],
        finishReason: 'tool_calls', tokensIn: 20, tokensOut: 8,
      },
      { text: '```ts\nreturn box(1,1,1);\n```', toolCalls: [], finishReason: 'stop', tokensIn: 30, tokensOut: 9 },
    ]);
    const seen: string[] = [];
    const r = await runToolLoop({
      client, system: 's', user: 'u', model: 'm', maxTokens: 100, maxCalls: 8, tools: [TOOL],
      execute: async (_name, args) => {
        seen.push(String(args.code));
        return { content: '{"ok":true}', ok: true, diagnostics: [], evaluatedCode: String(args.code) };
      },
    });
    expect(r.stopReason).toBe('final');
    expect(r.toolCallCount).toBe(1);
    expect(seen).toEqual(['return box(1,1,1);']);
    expect(r.lastEvaluatedCode).toBe('return box(1,1,1);');
    expect(r.tokensIn).toBe(50);
    // The second request must include the assistant tool_calls message and the tool result.
    expect(r.messages.map((m) => m.role)).toEqual(['user', 'assistant', 'tool', 'assistant']);
  });

  it('returns an error result to the model for malformed arguments JSON', async () => {
    const client = clientFrom([
      {
        text: '',
        toolCalls: [{ id: 'c1', name: 'evaluate_script', arguments: '{not json' }],
        finishReason: 'tool_calls', tokensIn: 1, tokensOut: 1,
      },
      { text: 'done', toolCalls: [], finishReason: 'stop', tokensIn: 1, tokensOut: 1 },
    ]);
    const r = await runToolLoop({
      client, system: 's', user: 'u', model: 'm', maxTokens: 100, maxCalls: 8, tools: [TOOL],
      execute: async () => ({ content: '{}', ok: true, diagnostics: [] }),
    });
    const toolMsg = r.messages.find((m) => m.role === 'tool');
    expect(toolMsg?.content).toContain('invalid arguments JSON');
  });

  it('caps at maxCalls and reports stopReason cap', async () => {
    const client: ToolChatClient = {
      chatWithTools: async () => ({
        text: 'more',
        toolCalls: [{ id: 'c', name: 'evaluate_script', arguments: '{"code":"x"}' }],
        finishReason: 'tool_calls', tokensIn: 1, tokensOut: 1,
      }),
    };
    const r = await runToolLoop({
      client, system: 's', user: 'u', model: 'm', maxTokens: 100, maxCalls: 3, tools: [TOOL],
      execute: async () => ({ content: '{}', ok: false, diagnostics: [] }),
    });
    expect(r.stopReason).toBe('cap');
    expect(r.toolCallCount).toBe(3);
  });

  it('executes multiple tool calls in one turn, last-evaluated wins while last-clean tracks the clean one', async () => {
    const client = clientFrom([
      {
        text: 'checking',
        toolCalls: [
          { id: 'c1', name: 'evaluate_script', arguments: '{"code":"return first;"}' },
          { id: 'c2', name: 'evaluate_script', arguments: '{"code":"return second;"}' },
        ],
        finishReason: 'tool_calls', tokensIn: 5, tokensOut: 5,
      },
      { text: 'done', toolCalls: [], finishReason: 'stop', tokensIn: 5, tokensOut: 5 },
    ]);
    const r = await runToolLoop({
      client, system: 's', user: 'u', model: 'm', maxTokens: 100, maxCalls: 8, tools: [TOOL],
      execute: async (_name, args) => {
        const code = String(args.code);
        const ok = code === 'return second;';
        return { content: ok ? '{"ok":true}' : '{"ok":false}', ok, diagnostics: [], evaluatedCode: code };
      },
    });
    expect(r.stopReason).toBe('final');
    expect(r.toolCallCount).toBe(2);
    const toolMsgs = r.messages.filter((m) => m.role === 'tool');
    expect(toolMsgs).toHaveLength(2);
    expect(toolMsgs.map((m) => m.tool_call_id)).toEqual(['c1', 'c2']);
    expect(r.lastEvaluatedCode).toBe('return second;');
    expect(r.lastCleanCode).toBe('return second;');
  });

  it('keeps the earlier clean candidate when a later call fails', async () => {
    const client = clientFrom([
      {
        text: 'checking',
        toolCalls: [
          { id: 'c1', name: 'evaluate_script', arguments: '{"code":"return clean;"}' },
          { id: 'c2', name: 'evaluate_script', arguments: '{"code":"return broken;"}' },
        ],
        finishReason: 'tool_calls', tokensIn: 5, tokensOut: 5,
      },
      { text: 'done', toolCalls: [], finishReason: 'stop', tokensIn: 5, tokensOut: 5 },
    ]);
    const r = await runToolLoop({
      client, system: 's', user: 'u', model: 'm', maxTokens: 100, maxCalls: 8, tools: [TOOL],
      execute: async (_name, args) => {
        const code = String(args.code);
        const ok = code === 'return clean;';
        return { content: ok ? '{"ok":true}' : '{"ok":false}', ok, diagnostics: [], evaluatedCode: code };
      },
    });
    expect(r.lastEvaluatedCode).toBe('return broken;');
    expect(r.lastCleanCode).toBe('return clean;');
  });

  it('leaves lastCleanCode undefined when no call evaluates cleanly', async () => {
    const client = clientFrom([
      {
        text: 'checking',
        toolCalls: [{ id: 'c1', name: 'evaluate_script', arguments: '{"code":"return broken;"}' }],
        finishReason: 'tool_calls', tokensIn: 5, tokensOut: 5,
      },
      { text: 'done', toolCalls: [], finishReason: 'stop', tokensIn: 5, tokensOut: 5 },
    ]);
    const r = await runToolLoop({
      client, system: 's', user: 'u', model: 'm', maxTokens: 100, maxCalls: 8, tools: [TOOL],
      execute: async (_name, args) => ({
        content: '{"ok":false}',
        ok: false,
        diagnostics: ['feature.invalid-args'],
        evaluatedCode: String(args.code),
      }),
    });
    expect(r.lastEvaluatedCode).toBe('return broken;');
    expect(r.lastCleanCode).toBeUndefined();
  });

  it('returns an error tool message when execute throws and continues the loop', async () => {
    const client = clientFrom([
      {
        text: '',
        toolCalls: [{ id: 'c1', name: 'evaluate_script', arguments: '{"code":"x"}' }],
        finishReason: 'tool_calls', tokensIn: 1, tokensOut: 1,
      },
      { text: 'recovered', toolCalls: [], finishReason: 'stop', tokensIn: 1, tokensOut: 1 },
    ]);
    const r = await runToolLoop({
      client, system: 's', user: 'u', model: 'm', maxTokens: 100, maxCalls: 8, tools: [TOOL],
      execute: async () => {
        throw new Error('sandbox exploded');
      },
    });
    const toolMsg = r.messages.find((m) => m.role === 'tool');
    expect(toolMsg?.content).toContain('"error"');
    expect(toolMsg?.content).toContain('sandbox exploded');
    expect(r.stopReason).toBe('final');
    expect(r.finalText).toBe('recovered');
  });

  it('bounds tool executions within a single turn at maxCalls', async () => {
    const client = clientFrom([
      {
        text: 'checking',
        toolCalls: [
          { id: 'c1', name: 'evaluate_script', arguments: '{"code":"a"}' },
          { id: 'c2', name: 'evaluate_script', arguments: '{"code":"b"}' },
          { id: 'c3', name: 'evaluate_script', arguments: '{"code":"c"}' },
        ],
        finishReason: 'tool_calls', tokensIn: 1, tokensOut: 1,
      },
      { text: 'done', toolCalls: [], finishReason: 'stop', tokensIn: 1, tokensOut: 1 },
    ]);
    const r = await runToolLoop({
      client, system: 's', user: 'u', model: 'm', maxTokens: 100, maxCalls: 2, tools: [TOOL],
      execute: async () => ({ content: '{"ok":true}', ok: true, diagnostics: [] }),
    });
    expect(r.toolCallCount).toBe(2);
    const toolMsgs = r.messages.filter((m) => m.role === 'tool');
    expect(toolMsgs).toHaveLength(3);
    expect(toolMsgs[2]?.tool_call_id).toBe('c3');
    expect(toolMsgs[2]?.content).toContain('budget exhausted');
    expect(r.stopReason).toBe('final');
  });

  it('surfaces the last finish reason even when stopping on a final message', async () => {
    const client = clientFrom([
      { text: 'truncated', toolCalls: [], finishReason: 'length', tokensIn: 10, tokensOut: 5 },
    ]);
    const r = await runToolLoop({
      client, system: 's', user: 'u', model: 'm', maxTokens: 100, maxCalls: 8, tools: [TOOL],
      execute: async () => ({ content: '{}', ok: true, diagnostics: [] }),
    });
    expect(r.finishReason).toBe('length');
    expect(r.stopReason).toBe('final');
  });
});
