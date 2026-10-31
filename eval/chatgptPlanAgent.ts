// SPDX-License-Identifier: MIT
// Responses streaming transport for an independently authorized ChatGPT plan token.
import type { AgentClient, AgentMessage, AgentResponse } from './types';

const RETRYABLE_STATUS = (status: number): boolean => status === 429 || status >= 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class ChatGPTPlanAgentClient implements AgentClient {
  constructor(private readonly options: {
    token: () => Promise<string>;
    fetchImpl?: typeof fetch;
    /** Extra attempts after the first. Default 5. */
    maxRetries?: number;
    retryBaseMs?: number;
  }) {}

  async generate(args: { system: string; systemAddendum?: string; messages: AgentMessage[]; model: string; max_tokens: number; temperature?: number }): Promise<AgentResponse> {
    const instructions = [args.system, args.systemAddendum].filter(Boolean).join('\n\n');
    const input = args.messages.map(message => ({
      role: message.role,
      content: [
        ...(message.images ?? []).map(image => ({ type: 'input_image', image_url: `data:${image.mediaType};base64,${image.data}` })),
        { type: message.role === 'assistant' ? 'output_text' : 'input_text', text: message.content },
      ],
    }));
    const maxRetries = this.options.maxRetries ?? 5;
    const retryBaseMs = this.options.retryBaseMs ?? 1000;
    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        const backoff = Math.min(30_000, retryBaseMs * 2 ** (attempt - 1));
        await sleep(backoff);
      }
      try {
        return await this.request(args.model, instructions, input);
      } catch (error) {
        const wrapped = error instanceof Error ? error : new Error(String(error));
        if (!isRetryable(wrapped)) throw wrapped;
        lastError = wrapped;
      }
    }
    throw lastError ?? new Error('fetch failed');
  }

  private async request(model: string, instructions: string, input: unknown): Promise<AgentResponse> {
    const response = await (this.options.fetchImpl ?? fetch)('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await this.options.token()}` },
      body: JSON.stringify({ model, instructions, input, store: false, stream: true }),
      signal: AbortSignal.timeout(600_000),
    });
    if (RETRYABLE_STATUS(response.status)) {
      throw new Error(`ChatGPT plan request failed: HTTP ${response.status}`);
    }
    if (!response.ok) throw Object.assign(new Error(`ChatGPT plan request failed: HTTP ${response.status}`), { retryable: false });
    const stream = await response.text();
    let text = '', completed = false, tokensIn = 0, tokensOut = 0;
    for (const frame of stream.split(/\r?\n\r?\n/)) {
      const data = frame.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
      if (!data || data === '[DONE]') continue;
      const event = JSON.parse(data) as {
        type?: string;
        delta?: string;
        code?: string;
        response?: { error?: { code?: string }; usage?: { input_tokens?: number; output_tokens?: number } };
      };
      if (event.type === 'response.output_text.delta') text += event.delta ?? '';
      if (event.type === 'response.failed' || event.type === 'response.incomplete' || event.type === 'error') {
        throw Object.assign(
          new Error(`ChatGPT plan response ${event.type}: ${event.response?.error?.code ?? event.code ?? 'unknown'}`),
          { retryable: false },
        );
      }
      if (event.type === 'response.completed') {
        completed = true;
        tokensIn = event.response?.usage?.input_tokens ?? 0;
        tokensOut = event.response?.usage?.output_tokens ?? 0;
      }
    }
    if (!completed) throw new Error('ChatGPT plan stream ended without response.completed');
    return { text, tokens_in: tokensIn, tokens_out: tokensOut };
  }
}

function isRetryable(error: Error): boolean {
  if ('retryable' in error && error.retryable === false) return false;
  return true;
}
