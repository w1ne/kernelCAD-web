// src/agent/vision/hybridBackend.test.ts
//
// Hybrid-backend unit tests. We stub BOTH the opencv silhouette extractor and
// the LLM client so the test stays in the fast path — the opencv WASM init is
// the documented hang and we don't need it for the composition test.

import { describe, expect, it, vi } from 'vitest';
import type { VisionRequest, VisionResponse } from './anthropicVisionClient';
import type { TraceFeatureRequest, Vec2Normalized } from './types';
import { traceHybrid, type HybridDeps } from './hybridBackend';

class MockVisionClient {
  public readonly calls: VisionRequest[] = [];
  private readonly responses: string[];

  constructor(responses: string[]) {
    this.responses = [...responses];
  }

  async generate(req: VisionRequest): Promise<VisionResponse> {
    this.calls.push(req);
    const text = this.responses.shift();
    if (text === undefined) throw new Error('queue exhausted');
    return { text, tokensIn: 50, tokensOut: 20 };
  }
}

const bytes = Buffer.from([1, 2, 3]);

describe('traceHybrid', () => {
  it('returns opencv silhouette + LLM-only named point', async () => {
    const stubPolyline: Vec2Normalized[] = [
      [0.1, 0.1],
      [0.9, 0.1],
      [0.9, 0.9],
      [0.1, 0.9],
    ];
    const extractStub = vi.fn(async () => stubPolyline);

    const client = new MockVisionClient([
      JSON.stringify({
        features: [
          {
            label: 'centroid',
            kind: 'point',
            waypoints: [[0.5, 0.5]],
            confidence: 0.7,
          },
        ],
      }),
    ]);

    const features: TraceFeatureRequest[] = [
      { label: 'outline', kind: 'silhouette' },
      { label: 'centroid', kind: 'point' },
    ];
    const deps: HybridDeps = { extractSilhouettePolyline: extractStub };
    const out = await traceHybrid(client, bytes, 'image/png', features, undefined, 12, deps);

    expect(out).toHaveLength(2);
    expect(out[0].label).toBe('outline');
    expect(out[0].kind).toBe('silhouette');
    expect(out[0].waypoints).toEqual(stubPolyline);
    expect(out[0].backend).toBe('opencv');
    expect(out[0].confidence).toBe(1);

    expect(out[1].label).toBe('centroid');
    expect(out[1].kind).toBe('point');
    expect(out[1].backend).toBe('vision-llm');
    expect(out[1].waypoints).toEqual([[0.5, 0.5]]);

    expect(extractStub).toHaveBeenCalledTimes(1);
    expect(client.calls).toHaveLength(1);
  });

  it('omits the LLM call when no named-point features are requested', async () => {
    const stubPolyline: Vec2Normalized[] = [[0, 0], [1, 0], [1, 1]];
    const extractStub = vi.fn(async () => stubPolyline);
    const client = new MockVisionClient([]); // no responses queued

    const features: TraceFeatureRequest[] = [
      { label: 'outline', kind: 'silhouette' },
      { label: 'extra', kind: 'curve' },
    ];
    const deps: HybridDeps = { extractSilhouettePolyline: extractStub };
    const out = await traceHybrid(client, bytes, 'image/png', features, undefined, 12, deps);

    expect(out).toHaveLength(2);
    expect(out[0].backend).toBe('opencv');
    expect(out[1].backend).toBe('opencv');
    expect(client.calls).toHaveLength(0);
  });

  it('omits the opencv call when only named-point/bbox features are requested', async () => {
    const extractStub = vi.fn(async () => [] as Vec2Normalized[]);
    const client = new MockVisionClient([
      JSON.stringify({
        features: [
          {
            label: 'centroid',
            kind: 'point',
            waypoints: [[0.5, 0.5]],
            confidence: 0.7,
          },
        ],
      }),
    ]);

    const features: TraceFeatureRequest[] = [
      { label: 'centroid', kind: 'point' },
    ];
    const deps: HybridDeps = { extractSilhouettePolyline: extractStub };
    const out = await traceHybrid(client, bytes, 'image/png', features, undefined, 12, deps);

    expect(out).toHaveLength(1);
    expect(out[0].backend).toBe('vision-llm');
    expect(extractStub).not.toHaveBeenCalled();
    expect(client.calls).toHaveLength(1);
  });
});
