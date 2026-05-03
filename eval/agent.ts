import Anthropic from '@anthropic-ai/sdk';
import type { AgentClient, AgentMessage, AgentResponse } from './types';

interface GenerateArgs {
  system: string;
  systemAddendum?: string;
  messages: AgentMessage[];
  model: string;
  max_tokens: number;
}

export class MockAgentClient implements AgentClient {
  public calls: GenerateArgs[] = [];
  private idx = 0;

  constructor(private readonly responses: AgentResponse[]) {}

  async generate(args: GenerateArgs): Promise<AgentResponse> {
    this.calls.push(args);
    if (this.idx >= this.responses.length) {
      throw new Error(
        `MockAgentClient: response queue exhausted (asked for #${this.idx + 1}, only ${this.responses.length} canned)`,
      );
    }
    return this.responses[this.idx++];
  }
}

export class AnthropicAgentClient implements AgentClient {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async generate(args: GenerateArgs): Promise<AgentResponse> {
    // Build the system blocks. Always one block for SKILL.md (cached). When
    // a cookbook addendum is present, it's a separate ephemeral cache block
    // so it can vary per task without invalidating the SKILL.md cache.
    const systemBlocks: Anthropic.TextBlockParam[] = [
      { type: 'text', text: args.system, cache_control: { type: 'ephemeral' } },
    ];
    if (args.systemAddendum && args.systemAddendum.length > 0) {
      systemBlocks.push({
        type: 'text',
        text: args.systemAddendum,
        cache_control: { type: 'ephemeral' },
      });
    }

    const resp = await this.client.messages.create({
      model: args.model,
      max_tokens: args.max_tokens,
      system: systemBlocks,
      messages: args.messages.map((m) => ({ role: m.role, content: m.content })),
    });

    // Concatenate text content blocks. Tool-use isn't expected in CLI single-shot mode.
    const text = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    return {
      text,
      tokens_in: resp.usage.input_tokens + (resp.usage.cache_creation_input_tokens ?? 0) + (resp.usage.cache_read_input_tokens ?? 0),
      tokens_out: resp.usage.output_tokens,
    };
  }
}
