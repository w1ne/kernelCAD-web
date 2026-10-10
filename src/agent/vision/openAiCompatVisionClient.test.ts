// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/vision/openAiCompatVisionClient.test.ts
//
// The OpenAI-compatible vision client and its selection by defaultVisionClient.
// Hosts without ANTHROPIC_API_KEY (the hosted MCP server) failed every
// trace_from_image request for named features; this is the fallback.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenAiCompatVisionClient, type FetchLike } from './openAiCompatVisionClient';
import { AnthropicVisionClient, defaultVisionClient } from './anthropicVisionClient';
import { traceFromImage } from './index';
import sharp from 'sharp';

function fakeFetch(reply: { status?: number; body: unknown }) {
  const calls: Array<{ url: string; init: Parameters<FetchLike>[1] }> = [];
  const fetchImpl: FetchLike = vi.fn(async (url, init) => {
    calls.push({ url, init });
    const status = reply.status ?? 200;
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => (typeof reply.body === 'string' ? reply.body : JSON.stringify(reply.body)),
      json: async () => reply.body,
    };
  });
  return { fetchImpl, calls };
}

const req = { prompt: 'find the wheels', imageBytes: new Uint8Array([1, 2, 3]), mediaType: 'image/png' as const };

describe('OpenAiCompatVisionClient', () => {
  it('posts an image_url data URI + text to /chat/completions with bearer auth', async () => {
    const { fetchImpl, calls } = fakeFetch({
      body: { choices: [{ message: { content: '{"ok":1}' } }], usage: { prompt_tokens: 12, completion_tokens: 3 } },
    });
    const c = new OpenAiCompatVisionClient({ baseUrl: 'https://x.test/v1/openai/', apiKey: 'k', model: 'Qwen/VL', fetchOverride: fetchImpl });
    const r = await c.generate(req);
    expect(r).toEqual({ text: '{"ok":1}', tokensIn: 12, tokensOut: 3 });
    expect(calls[0]!.url).toBe('https://x.test/v1/openai/chat/completions');
    expect(calls[0]!.init.headers['authorization']).toBe('Bearer k');
    const body = JSON.parse(calls[0]!.init.body);
    expect(body.model).toBe('Qwen/VL');
    expect(body.temperature).toBe(0);
    expect(body.messages[0].content[0]).toEqual({ type: 'image_url', image_url: { url: 'data:image/png;base64,AQID' } });
    expect(body.messages[0].content[1]).toEqual({ type: 'text', text: 'find the wheels' });
  });

  it('joins array-form content parts', async () => {
    const { fetchImpl } = fakeFetch({ body: { choices: [{ message: { content: [{ type: 'text', text: 'a' }, { type: 'text', text: 'b' }] } }] } });
    const c = new OpenAiCompatVisionClient({ baseUrl: 'https://x.test', apiKey: 'k', model: 'm', fetchOverride: fetchImpl });
    expect((await c.generate(req)).text).toBe('ab');
  });

  it('throws with the status and a short detail on HTTP errors, and on empty content', async () => {
    const bad = fakeFetch({ status: 422, body: 'model does not support images' });
    const c1 = new OpenAiCompatVisionClient({ baseUrl: 'https://x.test', apiKey: 'k', model: 'm', fetchOverride: bad.fetchImpl });
    await expect(c1.generate(req)).rejects.toThrow(/HTTP 422: model does not support images/);
    const empty = fakeFetch({ body: { choices: [{ message: { content: '' } }] } });
    const c2 = new OpenAiCompatVisionClient({ baseUrl: 'https://x.test', apiKey: 'k', model: 'm', fetchOverride: empty.fetchImpl });
    await expect(c2.generate(req)).rejects.toThrow(/no text/);
  });
});

describe('defaultVisionClient selection', () => {
  const originalEnv = { ...process.env };
  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.KERNELCAD_VISION_BASE_URL;
    delete process.env.KERNELCAD_VISION_API_KEY;
    delete process.env.KERNELCAD_VISION_MODEL;
  });
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('prefers Anthropic when ANTHROPIC_API_KEY is set', () => {
    process.env.ANTHROPIC_API_KEY = 'a';
    process.env.KERNELCAD_VISION_BASE_URL = 'https://x.test';
    process.env.KERNELCAD_VISION_API_KEY = 'k';
    process.env.KERNELCAD_VISION_MODEL = 'm';
    expect(defaultVisionClient()).toBeInstanceOf(AnthropicVisionClient);
  });

  it('uses the OpenAI-compatible endpoint when only it is configured', () => {
    process.env.KERNELCAD_VISION_BASE_URL = 'https://x.test';
    process.env.KERNELCAD_VISION_API_KEY = 'k';
    process.env.KERNELCAD_VISION_MODEL = 'Qwen/VL';
    const c = defaultVisionClient();
    expect(c).toBeInstanceOf(OpenAiCompatVisionClient);
    expect((c as OpenAiCompatVisionClient).modelName).toBe('Qwen/VL');
  });

  it('a partial OpenAI-compatible config is not enough', () => {
    process.env.KERNELCAD_VISION_BASE_URL = 'https://x.test';
    process.env.KERNELCAD_VISION_API_KEY = 'k';
    expect(() => defaultVisionClient()).toThrow(/no vision model is configured/);
  });
});

describe('trace_from_image with named features and no Anthropic key', () => {
  const originalEnv = { ...process.env };
  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
  });

  it('labels bbox features through the OpenAI-compatible endpoint', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    process.env.KERNELCAD_VISION_BASE_URL = 'https://vision.test/v1';
    process.env.KERNELCAD_VISION_API_KEY = 'k';
    process.env.KERNELCAD_VISION_MODEL = 'Qwen/VL';
    const png = await sharp({ create: { width: 64, height: 48, channels: 3, background: '#ffffff' } }).png().toBuffer();
    const seen: string[] = [];
    vi.stubGlobal('fetch', async (url: string, init: { body: string }) => {
      seen.push(url);
      const prompt = JSON.parse(init.body).messages[0].content[1].text as string;
      expect(prompt).toContain('left_wheel');
      const text = JSON.stringify({
        features: [
          { label: 'left_wheel', kind: 'bbox', waypoints: [[0.1, 0.55], [0.36, 0.88]], confidence: 0.9 },
        ],
      });
      return new Response(JSON.stringify({ choices: [{ message: { content: text } }] }), { status: 200 });
    });
    const out = await traceFromImage(
      {
        imageUrl: `data:image/png;base64,${png.toString('base64')}`,
        backend: 'vision-llm',
        features: [{ label: 'left_wheel', kind: 'bbox', region: 'left wheel' }],
      },
      { backendTimeoutMs: 5000 },
    );
    expect(seen).toEqual(['https://vision.test/v1/chat/completions']);
    expect(out.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(out.ok).toBe(true);
    expect(out.features[0]!.label).toBe('left_wheel');
  });
});
