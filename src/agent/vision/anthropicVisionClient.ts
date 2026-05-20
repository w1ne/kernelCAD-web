// src/agent/vision/anthropicVisionClient.ts
//
// Thin client over `@anthropic-ai/sdk`'s `messages.create` for image+text
// prompts used by the `trace_from_image` vision-LLM backend.
//
// Design rules:
// - **No baked billing.** The caller supplies their own `ANTHROPIC_API_KEY` via
//   the environment; kernelCAD-web is an open-source codebase and does not
//   ship hosted billing here. (See `kernelcad_billing_personal_account` for
//   the hosted-product split.)
// - **Test seam via `sdkOverride`.** Unit tests inject a stub that matches the
//   minimal SDK surface used here (`messages.create`).
// - **Model from `KERNELCAD_VISION_MODEL` env var**, default
//   `claude-haiku-4-5-20251001` — Haiku is cheap and accurate enough for the
//   coord-extraction task. Tweakable per-call via constructor `model` option.

import Anthropic from '@anthropic-ai/sdk';

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
const DEFAULT_MAX_TOKENS = 2048;

export type VisionMediaType = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';

/** Minimal subset of the Anthropic SDK used by this client — keeps the test
 *  seam type-safe and the production binding narrow. */
export interface AnthropicSdkLike {
  messages: {
    create: (args: {
      model: string;
      max_tokens: number;
      messages: Array<{ role: 'user'; content: unknown[] }>;
    }) => Promise<{
      content: Array<{ type: string; text?: string }>;
      usage: { input_tokens: number; output_tokens: number };
    }>;
  };
}

export interface VisionRequest {
  prompt: string;
  imageBytes: Uint8Array;
  mediaType: VisionMediaType;
  /** Override `max_tokens` for this call only. Defaults to {@link DEFAULT_MAX_TOKENS}. */
  maxTokens?: number;
}

export interface VisionResponse {
  text: string;
  tokensIn: number;
  tokensOut: number;
}

export interface AnthropicVisionClientOptions {
  apiKey: string;
  model?: string;
  /** Test seam — bypasses the real SDK constructor. */
  sdkOverride?: AnthropicSdkLike;
}

/** Wraps the Anthropic SDK for image+text inference. */
export class AnthropicVisionClient {
  private readonly sdk: AnthropicSdkLike;
  private readonly model: string;

  constructor(opts: AnthropicVisionClientOptions) {
    this.model = opts.model ?? DEFAULT_MODEL;
    this.sdk = opts.sdkOverride ?? (new Anthropic({ apiKey: opts.apiKey }) as unknown as AnthropicSdkLike);
  }

  async generate(req: VisionRequest): Promise<VisionResponse> {
    const base64 = Buffer.from(req.imageBytes).toString('base64');
    const resp = await this.sdk.messages.create({
      model: this.model,
      max_tokens: req.maxTokens ?? DEFAULT_MAX_TOKENS,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: req.mediaType,
                data: base64,
              },
            },
            { type: 'text', text: req.prompt },
          ],
        },
      ],
    });

    const text = resp.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text ?? '')
      .join('');
    return {
      text,
      tokensIn: resp.usage.input_tokens,
      tokensOut: resp.usage.output_tokens,
    };
  }
}

export interface DefaultVisionClientOptions {
  /** Override the SDK for tests; the API-key + model env-var resolution still runs. */
  sdkOverride?: AnthropicSdkLike;
}

/**
 * Resolve a vision client from environment variables.
 *
 * Reads `ANTHROPIC_API_KEY` (required) and `KERNELCAD_VISION_MODEL` (optional;
 * defaults to {@link DEFAULT_MODEL}). The caller-supplied key model means the
 * agent host pays for the vision calls — no proxying through any kernelCAD
 * service.
 */
export function defaultVisionClient(opts: DefaultVisionClientOptions = {}): AnthropicVisionClient {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.length === 0) {
    throw new Error(
      'defaultVisionClient: ANTHROPIC_API_KEY environment variable is not set. ' +
        'The vision-LLM backend requires the caller to supply their own Anthropic API key.',
    );
  }
  const model = process.env.KERNELCAD_VISION_MODEL ?? DEFAULT_MODEL;
  return new AnthropicVisionClient({ apiKey, model, sdkOverride: opts.sdkOverride });
}
