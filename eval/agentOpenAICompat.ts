// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { AgentClient, AgentMessage, AgentResponse } from './types';

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
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

const RETRYABLE_STATUS = (status: number): boolean => status === 429 || status >= 500;

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class OpenAICompatAgentClient implements AgentClient {
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
    const body = {
      model: args.model,
      max_tokens: args.max_tokens,
      messages: [
        { role: 'system', content: system },
        ...args.messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      ...(args.temperature !== undefined ? { temperature: args.temperature } : {}),
    };

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
      let data: ChatCompletionResponse;
      try {
        data = (await resp.json()) as ChatCompletionResponse;
      } catch (err) {
        lastErr = err instanceof Error ? err : new Error(String(err));
        continue;
      }
      const text = data.choices?.[0]?.message?.content ?? '';
      if (text.length === 0) {
        return { text: '', tokens_in: num(data.usage?.prompt_tokens), tokens_out: 0 };
      }
      return {
        text,
        tokens_in: num(data.usage?.prompt_tokens),
        tokens_out: num(data.usage?.completion_tokens),
      };
    }
    throw lastErr ?? new Error('OpenAI-compat request failed after retries');
  }
}
