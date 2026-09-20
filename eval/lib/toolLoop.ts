// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

export interface ToolSpec {
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

export interface ToolCallPayload {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface ToolChatMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: ToolCallPayload[];
  tool_call_id?: string;
}

export interface ToolChatResult {
  text: string;
  toolCalls: Array<{ id: string; name: string; arguments: string }>;
  finishReason: string;
  tokensIn: number;
  tokensOut: number;
}

export interface ToolChatClient {
  chatWithTools(args: {
    system: string;
    messages: ToolChatMessage[];
    tools: ToolSpec[];
    model: string;
    max_tokens: number;
    temperature?: number;
  }): Promise<ToolChatResult>;
}

export type ToolLoopEvent =
  | { type: 'assistant'; call: number; textChars: number; toolCalls: number; tokensIn: number; tokensOut: number }
  | { type: 'tool'; call: number; name: string; ok: boolean; diagnostics: string[] };

export interface ToolExecuteResult {
  content: string;
  ok: boolean;
  diagnostics: string[];
  evaluatedCode?: string;
}

export interface ToolLoopResult {
  finalText: string;
  finishReason: string;
  toolCallCount: number;
  tokensIn: number;
  tokensOut: number;
  stopReason: 'final' | 'cap';
  lastEvaluatedCode?: string;
  messages: ToolChatMessage[];
}

export async function runToolLoop(opts: {
  client: ToolChatClient;
  system: string;
  user: string;
  model: string;
  maxTokens: number;
  temperature?: number;
  maxCalls: number;
  tools: ToolSpec[];
  execute: (name: string, args: Record<string, unknown>) => Promise<ToolExecuteResult>;
  onEvent?: (e: ToolLoopEvent) => void;
}): Promise<ToolLoopResult> {
  const messages: ToolChatMessage[] = [{ role: 'user', content: opts.user }];
  let tokensIn = 0;
  let tokensOut = 0;
  let toolCallCount = 0;
  let lastEvaluatedCode: string | undefined;
  let finalText = '';
  let finishReason = '';

  for (let call = 1; call <= opts.maxCalls; call++) {
    const resp = await opts.client.chatWithTools({
      system: opts.system,
      messages,
      tools: opts.tools,
      model: opts.model,
      max_tokens: opts.maxTokens,
      temperature: opts.temperature,
    });
    tokensIn += resp.tokensIn;
    tokensOut += resp.tokensOut;
    finalText = resp.text;
    finishReason = resp.finishReason;

    const assistant: ToolChatMessage = { role: 'assistant', content: resp.text };
    if (resp.toolCalls.length > 0) {
      assistant.tool_calls = resp.toolCalls.map((tc) => ({
        id: tc.id,
        type: 'function',
        function: { name: tc.name, arguments: tc.arguments },
      }));
    }
    messages.push(assistant);
    opts.onEvent?.({
      type: 'assistant',
      call,
      textChars: resp.text.length,
      toolCalls: resp.toolCalls.length,
      tokensIn: resp.tokensIn,
      tokensOut: resp.tokensOut,
    });

    if (resp.toolCalls.length === 0) {
      return {
        finalText,
        finishReason,
        toolCallCount,
        tokensIn,
        tokensOut,
        stopReason: 'final',
        lastEvaluatedCode,
        messages,
      };
    }

    for (const tc of resp.toolCalls) {
      if (toolCallCount >= opts.maxCalls) {
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify({ error: 'tool call budget exhausted' }),
        });
        opts.onEvent?.({ type: 'tool', call, name: tc.name, ok: false, diagnostics: ['budget-exhausted'] });
        continue;
      }
      let args: Record<string, unknown>;
      try {
        const parsed: unknown = JSON.parse(tc.arguments);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          throw new Error('invalid arguments shape');
        }
        args = parsed as Record<string, unknown>;
      } catch {
        toolCallCount++;
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify({ error: 'invalid arguments JSON' }),
        });
        opts.onEvent?.({ type: 'tool', call, name: tc.name, ok: false, diagnostics: ['invalid-arguments-json'] });
        continue;
      }
      toolCallCount++;
      let result: ToolExecuteResult;
      try {
        result = await opts.execute(tc.name, args);
      } catch (err) {
        result = {
          content: JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
          ok: false,
          diagnostics: ['tool-execute-failed'],
        };
      }
      if (result.evaluatedCode !== undefined) lastEvaluatedCode = result.evaluatedCode;
      messages.push({ role: 'tool', tool_call_id: tc.id, content: result.content });
      opts.onEvent?.({
        type: 'tool',
        call,
        name: tc.name,
        ok: result.ok,
        diagnostics: result.diagnostics.slice(0, 5),
      });
    }
  }

  return { finalText, finishReason, toolCallCount, tokensIn, tokensOut, stopReason: 'cap', lastEvaluatedCode, messages };
}
