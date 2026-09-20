// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it, vi } from 'vitest';
import { OpenAICompatAgentClient } from './agentOpenAICompat';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const REQ = {
  system: 'S',
  messages: [{ role: 'user' as const, content: 'hi' }],
  model: 'deepseek-ai/DeepSeek-V4.1-Flash',
  max_tokens: 100,
  temperature: 0.2,
};

describe('OpenAICompatAgentClient', () => {
  it('returns text and usage from a successful completion', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        choices: [{ message: { content: 'hello' } }],
        usage: { prompt_tokens: 11, completion_tokens: 7 },
      }),
    );
    const client = new OpenAICompatAgentClient({
      baseUrl: 'https://api.example.com/v1/',
      apiKey: 'k',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const out = await client.generate(REQ);
    expect(out).toEqual({ text: 'hello', tokens_in: 11, tokens_out: 7, finish_reason: 'stop' });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.example.com/v1/chat/completions');
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.model).toBe('deepseek-ai/DeepSeek-V4.1-Flash');
    expect(body.messages[0]).toEqual({ role: 'system', content: 'S' });
    expect(body.temperature).toBe(0.2);
  });

  it('retries 429 then succeeds', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response('rate', { status: 429 }))
      .mockResolvedValueOnce(
        jsonResponse({ choices: [{ message: { content: 'ok' } }], usage: {} }),
      );
    const client = new OpenAICompatAgentClient({
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'k',
      retryBaseMs: 1,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const out = await client.generate(REQ);
    expect(out.text).toBe('ok');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('retries a network error up to the cap, then throws', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('ECONNRESET');
    });
    const client = new OpenAICompatAgentClient({
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'k',
      maxRetries: 2,
      retryBaseMs: 1,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await expect(client.generate(REQ)).rejects.toThrow('ECONNRESET');
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('retries a bad JSON body then succeeds', async () => {
    const badJson = {
      status: 200,
      ok: true,
      json: async () => {
        throw new SyntaxError('Unexpected token < in JSON');
      },
    } as unknown as Response;
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(badJson)
      .mockResolvedValueOnce(
        jsonResponse({ choices: [{ message: { content: 'ok' } }], usage: {} }),
      );
    const client = new OpenAICompatAgentClient({
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'k',
      retryBaseMs: 1,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const out = await client.generate(REQ);
    expect(out.text).toBe('ok');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('retries a timeout error then succeeds', async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(
        new DOMException('The operation was aborted due to timeout', 'TimeoutError'),
      )
      .mockResolvedValueOnce(
        jsonResponse({ choices: [{ message: { content: 'ok' } }], usage: {} }),
      );
    const client = new OpenAICompatAgentClient({
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'k',
      retryBaseMs: 1,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const out = await client.generate(REQ);
    expect(out.text).toBe('ok');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('throws on a non-retryable 400 without retrying', async () => {
    const fetchImpl = vi.fn(async () => new Response('bad model', { status: 400 }));
    const client = new OpenAICompatAgentClient({
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'k',
      retryBaseMs: 1,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await expect(client.generate(REQ)).rejects.toThrow('HTTP 400');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('continues once when the reply is truncated (finish_reason length)', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          choices: [{ message: { content: 'const a = ' }, finish_reason: 'length' }],
          usage: { prompt_tokens: 10, completion_tokens: 3 },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          choices: [{ message: { content: 'box(1,1,1);' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 12, completion_tokens: 4 },
        }),
      );
    const client = new OpenAICompatAgentClient({
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'k',
      retryBaseMs: 1,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const out = await client.generate(REQ);
    expect(out.text).toBe('const a = box(1,1,1);');
    expect(out.tokens_in).toBe(22);
    expect(out.tokens_out).toBe(7);
    expect(out.finish_reason).toBe('stop');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const secondBody = JSON.parse(
      (fetchImpl.mock.calls[1][1] as RequestInit).body as string,
    );
    expect(secondBody.messages.at(-1).role).toBe('user');
    expect(secondBody.messages.at(-1).content).toMatch(/continue/i);
    expect(secondBody.messages.at(-2)).toEqual({ role: 'assistant', content: 'const a = ' });
    expect(secondBody.messages[0].role).toBe('system');
    expect(secondBody.messages[1]).toEqual({ role: 'user', content: 'hi' });
  });

  it('does not continue an empty truncated reply', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        choices: [{ message: { content: '' }, finish_reason: 'length' }],
        usage: { prompt_tokens: 5, completion_tokens: 9 },
      }),
    );
    const client = new OpenAICompatAgentClient({
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'k',
      retryBaseMs: 1,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const out = await client.generate(REQ);
    expect(out).toEqual({ text: '', tokens_in: 5, tokens_out: 0, finish_reason: 'length' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('caps continuation at two turns', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        choices: [{ message: { content: 'x' }, finish_reason: 'length' }],
        usage: { prompt_tokens: 1, completion_tokens: 1 },
      }),
    );
    const client = new OpenAICompatAgentClient({
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'k',
      retryBaseMs: 1,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const out = await client.generate(REQ);
    expect(out.text).toBe('xxx');
    expect(out.finish_reason).toBe('length');
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
});
