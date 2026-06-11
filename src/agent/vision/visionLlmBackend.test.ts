// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/vision/visionLlmBackend.test.ts
//
// Unit tests for the vision-LLM backend. The Anthropic client is replaced with
// a `MockVisionClient` so we can control the JSON the "LLM" returns and verify
// prompt construction, schema validation, retry-on-malformed, waypoint
// truncation, and out-of-range rejection — all in the fast path.

import { describe, expect, it } from 'vitest';
import type { VisionRequest, VisionResponse } from './anthropicVisionClient';
import {
  buildVisionPrompt,
  extractFeaturesViaLLM,
} from './visionLlmBackend';
import type { TraceFeatureRequest } from './types';

/**
 * Test-only client that returns scripted responses. Each call to `generate`
 * consumes one entry from `responses` (or throws if the queue is empty).
 */
class MockVisionClient {
  public readonly calls: VisionRequest[] = [];
  private readonly responses: string[];

  constructor(responses: string[]) {
    this.responses = [...responses];
  }

  async generate(req: VisionRequest): Promise<VisionResponse> {
    this.calls.push(req);
    const text = this.responses.shift();
    if (text === undefined) {
      throw new Error('MockVisionClient: response queue exhausted');
    }
    return { text, tokensIn: 100, tokensOut: 50 };
  }
}

describe('buildVisionPrompt', () => {
  it('lists every requested feature label, kind, and optional region', () => {
    const features: TraceFeatureRequest[] = [
      { label: 'frame_brow', kind: 'silhouette' },
      { label: 'bridge_top', kind: 'point', region: 'between the lenses' },
      { label: 'lens_left', kind: 'bbox' },
    ];
    const prompt = buildVisionPrompt({
      features,
      maxWaypointsPerFeature: 12,
    });

    expect(prompt).toContain('frame_brow');
    expect(prompt).toContain('silhouette');
    expect(prompt).toContain('bridge_top');
    expect(prompt).toContain('point');
    expect(prompt).toContain('between the lenses');
    expect(prompt).toContain('lens_left');
    expect(prompt).toContain('bbox');
  });

  it('specifies normalized [0,1] coords with top-left origin', () => {
    const prompt = buildVisionPrompt({
      features: [{ label: 'sil', kind: 'silhouette' }],
      maxWaypointsPerFeature: 10,
    });
    expect(prompt).toMatch(/\[0,\s*1\]|normalized/i);
    expect(prompt).toMatch(/top-left|top left/i);
  });

  it('caps waypoints per feature and asks for JSON only', () => {
    const prompt = buildVisionPrompt({
      features: [{ label: 'sil', kind: 'silhouette' }],
      maxWaypointsPerFeature: 7,
    });
    expect(prompt).toContain('7');
    expect(prompt).toMatch(/json/i);
  });

  it('forwards optional hint into the prompt', () => {
    const prompt = buildVisionPrompt({
      features: [{ label: 'sil', kind: 'silhouette' }],
      maxWaypointsPerFeature: 12,
      hint: 'this is a pair of eyewear',
    });
    expect(prompt).toContain('this is a pair of eyewear');
  });

  it('requests an honest confidence value', () => {
    const prompt = buildVisionPrompt({
      features: [{ label: 'sil', kind: 'silhouette' }],
      maxWaypointsPerFeature: 12,
    });
    expect(prompt).toMatch(/confidence/i);
  });
});

describe('extractFeaturesViaLLM', () => {
  const features: TraceFeatureRequest[] = [
    { label: 'frame_brow', kind: 'silhouette' },
    { label: 'bridge_top', kind: 'point' },
  ];
  const bytes = new Uint8Array([1, 2, 3]);

  it('parses well-formed JSON into TraceFeatureResult[]', async () => {
    const response = JSON.stringify({
      features: [
        {
          label: 'frame_brow',
          kind: 'silhouette',
          waypoints: [
            [0.1, 0.2],
            [0.4, 0.3],
            [0.7, 0.25],
          ],
          confidence: 0.85,
        },
        {
          label: 'bridge_top',
          kind: 'point',
          waypoints: [[0.5, 0.42]],
          confidence: 0.7,
        },
      ],
    });
    const client = new MockVisionClient([response]);

    const out = await extractFeaturesViaLLM(
      client,
      bytes,
      'image/png',
      features,
      undefined,
      12,
    );

    expect(out).toHaveLength(2);
    expect(out[0].label).toBe('frame_brow');
    expect(out[0].kind).toBe('silhouette');
    expect(out[0].waypoints).toEqual([
      [0.1, 0.2],
      [0.4, 0.3],
      [0.7, 0.25],
    ]);
    expect(out[0].confidence).toBeCloseTo(0.85);
    expect(out[0].backend).toBe('vision-llm');
    expect(out[1].label).toBe('bridge_top');
    expect(out[1].waypoints).toEqual([[0.5, 0.42]]);
    expect(client.calls).toHaveLength(1);
  });

  it('retries once on malformed JSON, then succeeds', async () => {
    const goodResponse = JSON.stringify({
      features: [
        {
          label: 'frame_brow',
          kind: 'silhouette',
          waypoints: [[0.1, 0.1], [0.2, 0.2]],
          confidence: 0.9,
        },
        {
          label: 'bridge_top',
          kind: 'point',
          waypoints: [[0.5, 0.5]],
          confidence: 0.6,
        },
      ],
    });
    const client = new MockVisionClient(['not even close to JSON {{', goodResponse]);

    const out = await extractFeaturesViaLLM(
      client,
      bytes,
      'image/png',
      features,
      undefined,
      12,
    );

    expect(out).toHaveLength(2);
    expect(client.calls).toHaveLength(2);
  });

  it('throws after one retry if JSON is still malformed', async () => {
    const client = new MockVisionClient(['garbage 1', 'still garbage 2']);
    await expect(
      extractFeaturesViaLLM(client, bytes, 'image/png', features, undefined, 12),
    ).rejects.toThrow(/malformed|parse|json/i);
    expect(client.calls).toHaveLength(2);
  });

  it('strips stray markdown code fences around JSON', async () => {
    const fenced =
      '```json\n' +
      JSON.stringify({
        features: [
          {
            label: 'frame_brow',
            kind: 'silhouette',
            waypoints: [[0.1, 0.1], [0.2, 0.2]],
            confidence: 0.8,
          },
          {
            label: 'bridge_top',
            kind: 'point',
            waypoints: [[0.5, 0.5]],
            confidence: 0.5,
          },
        ],
      }) +
      '\n```';
    const client = new MockVisionClient([fenced]);

    const out = await extractFeaturesViaLLM(
      client,
      bytes,
      'image/png',
      features,
      undefined,
      12,
    );
    expect(out).toHaveLength(2);
    expect(client.calls).toHaveLength(1);
  });

  it('rejects waypoints outside [0, 1]', async () => {
    const response = JSON.stringify({
      features: [
        {
          label: 'frame_brow',
          kind: 'silhouette',
          // 1.4 is out of range — should fail validation.
          waypoints: [[0.1, 0.1], [1.4, 0.2]],
          confidence: 0.8,
        },
        {
          label: 'bridge_top',
          kind: 'point',
          waypoints: [[0.5, 0.5]],
          confidence: 0.5,
        },
      ],
    });
    const client = new MockVisionClient([response, response]);
    await expect(
      extractFeaturesViaLLM(client, bytes, 'image/png', features, undefined, 12),
    ).rejects.toThrow(/range|0.*1|bounds/i);
  });

  it('truncates waypoints to maxWaypointsPerFeature', async () => {
    const tooMany = Array.from({ length: 20 }, (_, i) => [i / 20, i / 20]);
    const response = JSON.stringify({
      features: [
        {
          label: 'frame_brow',
          kind: 'silhouette',
          waypoints: tooMany,
          confidence: 0.8,
        },
        {
          label: 'bridge_top',
          kind: 'point',
          waypoints: [[0.5, 0.5]],
          confidence: 0.5,
        },
      ],
    });
    const client = new MockVisionClient([response]);

    const out = await extractFeaturesViaLLM(
      client,
      bytes,
      'image/png',
      features,
      undefined,
      8,
    );

    expect(out[0].waypoints).toHaveLength(8);
    // Truncation should preserve the prefix.
    expect(out[0].waypoints[0]).toEqual([0, 0]);
    expect(out[0].waypoints[7]).toEqual([7 / 20, 7 / 20]);
  });

  it('clamps confidence to [0, 1] and defaults to 0.5 when missing', async () => {
    const response = JSON.stringify({
      features: [
        {
          label: 'frame_brow',
          kind: 'silhouette',
          waypoints: [[0.1, 0.1], [0.2, 0.2]],
          confidence: 1.7,
        },
        {
          label: 'bridge_top',
          kind: 'point',
          waypoints: [[0.5, 0.5]],
          // confidence missing
        },
      ],
    });
    const client = new MockVisionClient([response]);
    const out = await extractFeaturesViaLLM(
      client,
      bytes,
      'image/png',
      features,
      undefined,
      12,
    );
    expect(out[0].confidence).toBe(1);
    expect(out[1].confidence).toBe(0.5);
  });
});
