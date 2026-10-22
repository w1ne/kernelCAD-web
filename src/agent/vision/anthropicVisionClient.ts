// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/vision/anthropicVisionClient.ts
//
// Thin client over `@anthropic-ai/sdk`'s `messages.create` for image+text
// prompts used by the `trace_from_image` vision-LLM backend.
//
// Design rules:
// - The caller supplies their own `ANTHROPIC_API_KEY` via the environment.
// - **Test seam via `sdkOverride`.** Unit tests inject a stub that matches the
//   minimal SDK surface used here (`messages.create`).
// - **Model from `KERNELCAD_VISION_MODEL` env var**, default
//   `claude-haiku-4-5-20251001` — Haiku is cheap and accurate enough for the
//   coord-extraction task. Tweakable per-call via constructor `model` option.

import Anthropic from '@anthropic-ai/sdk';
import { OpenAiCompatVisionClient, type FetchLike } from './openAiCompatVisionClient';

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
    }, options?: { timeout: number }) => Promise<{
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
  timeoutMs?: number;
  /** Test seam — bypasses the real SDK constructor. */
  sdkOverride?: AnthropicSdkLike;
}

/** Wraps the Anthropic SDK for image+text inference. */
export class AnthropicVisionClient {
  private readonly sdk: AnthropicSdkLike;
  private readonly model: string;
  private readonly timeoutMs: number | undefined;

  constructor(opts: AnthropicVisionClientOptions) {
    this.model = opts.model ?? DEFAULT_MODEL;
    this.timeoutMs = opts.timeoutMs;
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
    }, this.timeoutMs === undefined ? undefined : { timeout: this.timeoutMs });

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
  /** Per-call backend budget; takes precedence over the environment. */
  timeoutMs?: number;
  /** Override the SDK for tests; the API-key + model env-var resolution still runs. */
  sdkOverride?: AnthropicSdkLike;
  /** Override fetch for the OpenAI-compatible client (tests). */
  fetchOverride?: FetchLike;
}

/** What the trace backends need from a vision client. */
export interface VisionLlmClientLike {
  generate(req: VisionRequest): Promise<VisionResponse>;
}

/**
 * Resolve a vision client from environment variables, in this order:
 *
 * 1. `ANTHROPIC_API_KEY` set → Anthropic (`KERNELCAD_VISION_MODEL`, default
 *    {@link DEFAULT_MODEL}).
 * 2. `KERNELCAD_VISION_BASE_URL` + `KERNELCAD_VISION_API_KEY` +
 *    `KERNELCAD_VISION_MODEL` set → any OpenAI-compatible endpoint with image
 *    input (DeepInfra, OpenRouter, vLLM, Ollama, OpenAI).
 * 3. Neither → throws, naming both options.
 *
 * Either way the operator's own key pays for the calls — nothing is proxied
 * through a kernelCAD service.
 */
export function defaultVisionClient(opts: DefaultVisionClientOptions = {}): VisionLlmClientLike {
  const configured = opts.timeoutMs ?? Number(process.env.KERNELCAD_TRACE_BACKEND_TIMEOUT_MS);
  const timeout = Number.isFinite(configured) && configured > 0 ? { timeoutMs: configured } : {};
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey && apiKey.length > 0) {
    const model = process.env.KERNELCAD_VISION_MODEL ?? DEFAULT_MODEL;
    return new AnthropicVisionClient({ apiKey, model, sdkOverride: opts.sdkOverride, ...timeout });
  }
  const baseUrl = process.env.KERNELCAD_VISION_BASE_URL;
  const compatKey = process.env.KERNELCAD_VISION_API_KEY;
  const compatModel = process.env.KERNELCAD_VISION_MODEL;
  if (baseUrl && compatKey && compatModel) {
    return new OpenAiCompatVisionClient({
      baseUrl, apiKey: compatKey, model: compatModel, fetchOverride: opts.fetchOverride,
      ...timeout,
    });
  }
  throw new Error(
    'defaultVisionClient: no vision model is configured. Set ANTHROPIC_API_KEY, or ' +
      'KERNELCAD_VISION_BASE_URL + KERNELCAD_VISION_API_KEY + KERNELCAD_VISION_MODEL for an ' +
      'OpenAI-compatible endpoint with image input. Without one, only the opencv silhouette backend works.',
  );
}
