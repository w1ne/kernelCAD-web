// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { AgentClient, AgentMessage, AgentResponse } from './types';
import type { ToolChatClient, ToolChatMessage, ToolChatResult, ToolSpec } from './lib/toolLoop';

export interface OpenAICompatOptions {
  baseUrl: string;
  apiKey: string;
  /** Total attempts = maxRetries + 1. Default 5 (6 attempts). */
  maxRetries?: number;
  retryBaseMs?: number;
  retryMaxMs?: number;
  fetchImpl?: typeof fetch;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
      tool_calls?: Array<{ id?: string; type?: string; function?: { name?: string; arguments?: string } }>;
    };
    finish_reason?: string | null;
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

const RETRYABLE_STATUS = (status: number): boolean => status === 429 || status >= 500;

const isTruncated = (r: string | undefined): boolean => r === 'length' || r === 'max_tokens';

const MAX_CONTINUATIONS = 2;
const CONTINUATION_PROMPT =
  'Your previous reply was truncated. Continue exactly where you left off; do not repeat anything.';

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class OpenAICompatAgentClient implements AgentClient, ToolChatClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly maxRetries: number;
  private readonly retryBaseMs: number;
  private readonly retryMaxMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: OpenAICompatOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
    this.apiKey = opts.apiKey;
    this.maxRetries = opts.maxRetries ?? 5;
    this.retryBaseMs = opts.retryBaseMs ?? 1000;
    this.retryMaxMs = opts.retryMaxMs ?? 30000;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  private async request(body: Record<string, unknown>): Promise<ChatCompletionResponse> {
    let lastErr: Error | undefined;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        const backoff = Math.min(this.retryMaxMs, this.retryBaseMs * 2 ** (attempt - 1));
        await sleep(backoff + Math.random() * backoff * 0.25);
      }
      let resp: Response;
      try {
        resp = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(180_000),
        });
      } catch (err) {
        lastErr = err instanceof Error ? err : new Error(String(err));
        continue;
      }
      if (RETRYABLE_STATUS(resp.status)) {
        const text = await resp.text().catch(() => '');
        lastErr = new Error(`HTTP ${resp.status} ${text.slice(0, 300)}`);
        continue;
      }
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(`OpenAI-compat request failed: HTTP ${resp.status} ${text.slice(0, 300)}`);
      }
      try {
        return (await resp.json()) as ChatCompletionResponse;
      } catch (err) {
        lastErr = err instanceof Error ? err : new Error(String(err));
        continue;
      }
    }
    throw lastErr ?? new Error('OpenAI-compat request failed after retries');
  }

  async generate(args: {
    system: string;
    systemAddendum?: string;
    messages: AgentMessage[];
    model: string;
    max_tokens: number;
    temperature?: number;
  }): Promise<AgentResponse> {
    const system =
      args.systemAddendum && args.systemAddendum.length > 0
        ? `${args.system}\n\n${args.systemAddendum}`
        : args.system;
    const base = {
      model: args.model,
      max_tokens: args.max_tokens,
      messages: [
        { role: 'system', content: system },
        ...args.messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      ...(args.temperature !== undefined ? { temperature: args.temperature } : {}),
    };

    const first = await this.request(base);
    let text = first.choices?.[0]?.message?.content ?? '';
    let tokensIn = num(first.usage?.prompt_tokens);
    let tokensOut = num(first.usage?.completion_tokens);
    let finish = first.choices?.[0]?.finish_reason ?? 'stop';

    let continuations = 0;
    while (text.length > 0 && isTruncated(finish) && continuations < MAX_CONTINUATIONS) {
      continuations += 1;
      const cont = await this.request({
        ...base,
        messages: [
          ...base.messages,
          { role: 'assistant', content: text },
          { role: 'user', content: CONTINUATION_PROMPT },
        ],
      });
      text += cont.choices?.[0]?.message?.content ?? '';
      tokensIn += num(cont.usage?.prompt_tokens);
      tokensOut += num(cont.usage?.completion_tokens);
      finish = cont.choices?.[0]?.finish_reason ?? 'stop';
    }

    if (text.length === 0) {
      // Deliberately zero output tokens for empty replies (existing behavior).
      return { text: '', tokens_in: tokensIn, tokens_out: 0, finish_reason: finish };
    }
    return { text, tokens_in: tokensIn, tokens_out: tokensOut, finish_reason: finish };
  }

  async chatWithTools(args: {
    system: string;
    messages: ToolChatMessage[];
    tools: ToolSpec[];
    model: string;
    max_tokens: number;
    temperature?: number;
  }): Promise<ToolChatResult> {
    const data = await this.request({
      model: args.model,
      max_tokens: args.max_tokens,
      messages: [{ role: 'system', content: args.system }, ...args.messages],
      tools: args.tools,
      tool_choice: 'auto',
      ...(args.temperature !== undefined ? { temperature: args.temperature } : {}),
    });
    const choice = data.choices?.[0];
    const toolCalls = (choice?.message?.tool_calls ?? [])
      .map((tc, i) => ({
        id: tc.id ?? `call_${i}`,
        name: tc.function?.name ?? '',
        arguments: tc.function?.arguments ?? '{}',
      }))
      .filter((tc) => tc.name.length > 0);
    return {
      text: choice?.message?.content ?? '',
      toolCalls,
      finishReason: choice?.finish_reason ?? 'stop',
      tokensIn: num(data.usage?.prompt_tokens),
      tokensOut: num(data.usage?.completion_tokens),
    };
  }
}
