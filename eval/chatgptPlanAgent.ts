// SPDX-License-Identifier: MIT
// Responses streaming transport for an independently authorized ChatGPT plan token.
import type { AgentClient, AgentMessage, AgentResponse } from './types';

export class ChatGPTPlanAgentClient implements AgentClient {
  constructor(private readonly options: { token: () => Promise<string>; fetchImpl?: typeof fetch }) {}

  async generate(args: { system: string; systemAddendum?: string; messages: AgentMessage[]; model: string; max_tokens: number; temperature?: number }): Promise<AgentResponse> {
    const instructions = [args.system, args.systemAddendum].filter(Boolean).join('\n\n');
    const input = args.messages.map(message => ({
      role: message.role,
      content: [
        ...(message.images ?? []).map(image => ({ type: 'input_image', image_url: `data:${image.mediaType};base64,${image.data}` })),
        { type: message.role === 'assistant' ? 'output_text' : 'input_text', text: message.content },
      ],
    }));
    const response = await (this.options.fetchImpl ?? fetch)('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await this.options.token()}` },
      body: JSON.stringify({ model: args.model, instructions, input, store: false, stream: true }),
      signal: AbortSignal.timeout(600_000),
    });
    if (!response.ok) throw new Error(`ChatGPT plan request failed: HTTP ${response.status}`);
    const stream = await response.text();
    let text = '', completed = false, tokensIn = 0, tokensOut = 0;
    for (const frame of stream.split(/\r?\n\r?\n/)) {
      const data = frame.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
      if (!data || data === '[DONE]') continue;
      const event = JSON.parse(data);
      if (event.type === 'response.output_text.delta') text += event.delta ?? '';
      if (event.type === 'response.failed' || event.type === 'response.incomplete' || event.type === 'error') {
        throw new Error(`ChatGPT plan response ${event.type}: ${event.response?.error?.code ?? event.code ?? 'unknown'}`);
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
