// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Image attachments on AgentMessage reach both providers' wire formats, and
// text-only messages keep their plain-string content.
import { describe, expect, it, vi } from 'vitest';

const create = vi.fn(async () => ({
  content: [{ type: 'text', text: 'ok' }],
  usage: { input_tokens: 1, output_tokens: 1 },
}));
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create };
  },
}));

const { AnthropicAgentClient } = await import('./agent');
const { OpenAICompatAgentClient } = await import('./agentOpenAICompat');

const IMG = { mediaType: 'image/png' as const, data: 'AAAA' };
const MESSAGES = [
  { role: 'user' as const, content: 'draw this', images: [IMG] },
  { role: 'assistant' as const, content: 'done' },
  { role: 'user' as const, content: 'fix it' },
];

describe('AgentMessage.images', () => {
  it('Anthropic: images become base64 image blocks before the text', async () => {
    await new AnthropicAgentClient('k').generate({ system: 's', messages: MESSAGES, model: 'm', max_tokens: 10 });
    const sent = (create.mock.calls[0] as unknown as [{ messages: Array<{ content: unknown }> }])[0].messages;
    expect(sent[0].content).toEqual([
      { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'AAAA' } },
      { type: 'text', text: 'draw this' },
    ]);
    expect(sent[1].content).toBe('done');
    expect(sent[2].content).toBe('fix it');
  });

  it('OpenAI-compatible: images become data-URL image_url parts', async () => {
    let body: { messages: Array<{ content: unknown }> } | undefined;
    const fetchImpl = (async (_url: string, init: RequestInit) => {
      body = JSON.parse(String(init.body));
      return new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }], usage: {} }), { status: 200 });
    }) as unknown as typeof fetch;
    await new OpenAICompatAgentClient({ baseUrl: 'https://x/v1', apiKey: 'k', fetchImpl }).generate({
      system: 's',
      messages: MESSAGES,
      model: 'm',
      max_tokens: 10,
    });
    expect(body!.messages[1].content).toEqual([
      { type: 'image_url', image_url: { url: 'data:image/png;base64,AAAA' } },
      { type: 'text', text: 'draw this' },
    ]);
    expect(body!.messages[2].content).toBe('done');
  });
});
