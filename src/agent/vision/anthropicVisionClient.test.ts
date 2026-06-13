// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/vision/anthropicVisionClient.test.ts
//
// Unit tests for the thin Anthropic vision client used by the `trace_from_image`
// vision-LLM backend. The SDK is injected via `sdkOverride` so tests can verify
// the request shape without hitting the real API.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AnthropicVisionClient,
  defaultVisionClient,
  type VisionRequest,
} from './anthropicVisionClient';

interface MockSdkCall {
  model: string;
  max_tokens: number;
  messages: unknown[];
}

function makeSdkStub(responseText: string) {
  const calls: MockSdkCall[] = [];
  const sdk = {
    messages: {
      create: vi.fn(async (args: MockSdkCall) => {
        calls.push(args);
        return {
          content: [{ type: 'text', text: responseText }],
          usage: { input_tokens: 100, output_tokens: 50 },
        };
      }),
    },
  };
  return { sdk, calls };
}

describe('AnthropicVisionClient', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    delete process.env.KERNELCAD_VISION_MODEL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('sends an image block + text block via messages.create and returns joined text', async () => {
    const { sdk, calls } = makeSdkStub('the response text');
    const client = new AnthropicVisionClient({ apiKey: 'test-key', sdkOverride: sdk });

    const req: VisionRequest = {
      prompt: 'find the silhouette',
      imageBytes: new Uint8Array([1, 2, 3, 4]),
      mediaType: 'image/png',
    };
    const resp = await client.generate(req);

    expect(resp.text).toBe('the response text');
    expect(calls.length).toBe(1);
    expect(calls[0].messages.length).toBe(1);
    const userMsg = calls[0].messages[0] as { role: string; content: unknown[] };
    expect(userMsg.role).toBe('user');
    expect(userMsg.content.length).toBe(2);
    const imageBlock = userMsg.content[0] as { type: string; source: { media_type: string } };
    const textBlock = userMsg.content[1] as { type: string; text: string };
    expect(imageBlock.type).toBe('image');
    expect(imageBlock.source.media_type).toBe('image/png');
    expect(textBlock.type).toBe('text');
    expect(textBlock.text).toBe('find the silhouette');
  });

  it('defaultVisionClient() throws when ANTHROPIC_API_KEY is missing', () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(() => defaultVisionClient()).toThrowError(/ANTHROPIC_API_KEY/);
  });

  it('reads model from KERNELCAD_VISION_MODEL env var', async () => {
    process.env.KERNELCAD_VISION_MODEL = 'claude-test-model-v9';
    const { sdk, calls } = makeSdkStub('ok');
    const client = defaultVisionClient({ sdkOverride: sdk });

    await client.generate({
      prompt: 'p',
      imageBytes: new Uint8Array([0]),
      mediaType: 'image/png',
    });
    expect(calls[0].model).toBe('claude-test-model-v9');
  });

  it('falls back to default model when KERNELCAD_VISION_MODEL is unset', async () => {
    const { sdk, calls } = makeSdkStub('ok');
    const client = defaultVisionClient({ sdkOverride: sdk });

    await client.generate({
      prompt: 'p',
      imageBytes: new Uint8Array([0]),
      mediaType: 'image/png',
    });
    expect(calls[0].model).toBe('claude-haiku-4-5-20251001');
  });
});
