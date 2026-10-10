// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/vision/openAiCompatVisionClient.ts
//
// Vision client for any OpenAI-compatible `/chat/completions` endpoint that
// accepts image input (DeepInfra, OpenRouter, vLLM, Ollama, OpenAI itself).
//
// Why: the `trace_from_image` hybrid / vision-LLM backends only had an
// Anthropic client, so a host without ANTHROPIC_API_KEY (the hosted MCP
// server, many self-hosters) failed every request for named features —
// wheels, windows, a roof curve — and could only return the outer silhouette.
//
// Same "no baked billing" rule as the Anthropic client: the operator supplies
// the endpoint, key and model through the environment
// (KERNELCAD_VISION_BASE_URL, KERNELCAD_VISION_API_KEY, KERNELCAD_VISION_MODEL).
// Plain fetch, no SDK dependency.

import type { VisionRequest, VisionResponse } from './anthropicVisionClient';

const DEFAULT_MAX_TOKENS = 2048;
const DEFAULT_TIMEOUT_MS = 60_000;

export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal },
) => Promise<{ ok: boolean; status: number; text(): Promise<string>; json(): Promise<unknown> }>;

export interface OpenAiCompatVisionClientOptions {
  /** Base URL up to and including the API version, e.g. `https://api.deepinfra.com/v1/openai`. */
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs?: number;
  /** Test seam. Defaults to the global fetch. */
  fetchOverride?: FetchLike;
}

interface ChatCompletion {
  choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> | null } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export class OpenAiCompatVisionClient {
  private readonly url: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: FetchLike;

  constructor(opts: OpenAiCompatVisionClientOptions) {
    this.url = `${opts.baseUrl.replace(/\/+$/, '')}/chat/completions`;
    this.apiKey = opts.apiKey;
    this.model = opts.model;
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.fetchImpl = opts.fetchOverride ?? (globalThis.fetch as unknown as FetchLike);
  }

  get modelName(): string {
    return this.model;
  }

  async generate(req: VisionRequest): Promise<VisionResponse> {
    const dataUri = `data:${req.mediaType};base64,${Buffer.from(req.imageBytes).toString('base64')}`;
    const body = {
      model: this.model,
      max_tokens: req.maxTokens ?? DEFAULT_MAX_TOKENS,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: dataUri } },
            { type: 'text', text: req.prompt },
          ],
        },
      ],
    };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    if (typeof timer.unref === 'function') timer.unref();
    let resp;
    try {
      resp = await this.fetchImpl(this.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    if (!resp.ok) {
      const detail = (await resp.text().catch(() => '')).slice(0, 300);
      throw new Error(`vision endpoint returned HTTP ${resp.status}${detail ? `: ${detail}` : ''}`);
    }
    const json = (await resp.json()) as ChatCompletion;
    const content = json.choices?.[0]?.message?.content;
    const text =
      typeof content === 'string'
        ? content
        : Array.isArray(content)
          ? content.map((p) => (p?.type === 'text' || p?.text ? (p.text ?? '') : '')).join('')
          : '';
    if (!text) throw new Error('vision endpoint returned no text');
    return {
      text,
      tokensIn: json.usage?.prompt_tokens ?? 0,
      tokensOut: json.usage?.completion_tokens ?? 0,
    };
  }
}
