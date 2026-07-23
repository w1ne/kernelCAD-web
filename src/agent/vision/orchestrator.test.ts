// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/vision/orchestrator.test.ts
//
// End-to-end tests for the `traceFromImage()` orchestrator. Uses fixture PNGs
// + a stubbed silhouette extractor to avoid the opencv WASM hang.

import { describe, expect, it, vi } from 'vitest';
import { join } from 'node:path';
import { traceFromImage } from './index';
import type { TraceFromImageInput, Vec2Normalized } from './types';

const FIXTURE_DIR = join(__dirname, '../../..', 'tests/fixtures/vision');
const UNIFORM_FILE_URL = `file://${join(FIXTURE_DIR, 'uniform-bg-square.png')}`;

describe('traceFromImage orchestrator', () => {
  it('returns invalid-image-url diagnostic when imageUrl is missing', async () => {
    const out = await traceFromImage({} as TraceFromImageInput);
    expect(out.ok).toBe(false);
    expect(out.features).toEqual([]);
    expect(out.diagnostics.length).toBeGreaterThan(0);
    expect(out.diagnostics[0].code).toBe('tool.trace-from-image.invalid-image-url');
  });

  it('returns invalid-image-url diagnostic when imageUrl is an empty string', async () => {
    const out = await traceFromImage({ imageUrl: '' });
    expect(out.ok).toBe(false);
    expect(out.diagnostics[0].code).toBe('tool.trace-from-image.invalid-image-url');
  });

  it('returns no-features-requested when features array is explicitly empty', async () => {
    const out = await traceFromImage({
      imageUrl: UNIFORM_FILE_URL,
      features: [],
    });
    expect(out.ok).toBe(false);
    expect(out.diagnostics[0].code).toBe('tool.trace-from-image.no-features-requested');
  });

  it('auto-routes a uniform-bg image with silhouette-only to opencv', async () => {
    const fakePolyline: Vec2Normalized[] = [
      [0.3, 0.3],
      [0.7, 0.3],
      [0.7, 0.7],
      [0.3, 0.7],
    ];
    const extractStub = vi.fn(async () => fakePolyline);

    const out = await traceFromImage(
      {
        imageUrl: UNIFORM_FILE_URL,
        // default features → single silhouette
      },
      { extractSilhouettePolyline: extractStub },
    );

    expect(out.ok).toBe(true);
    expect(out.features).toHaveLength(1);
    expect(out.features[0].backend).toBe('opencv');
    expect(out.features[0].kind).toBe('silhouette');
    expect(out.features[0].waypoints).toEqual(fakePolyline);
    expect(out.diagnostics).toEqual([]);
    expect(out.imageDims[0]).toBeGreaterThan(0);
    expect(out.imageDims[1]).toBeGreaterThan(0);
    expect(extractStub).toHaveBeenCalledTimes(1);
  });

  it('honours explicit backend: vision-llm even on uniform-bg', async () => {
    const stubClient = {
      generate: vi.fn(async () => ({
        text: JSON.stringify({
          features: [
            {
              label: 'silhouette',
              kind: 'silhouette',
              waypoints: [[0.1, 0.1], [0.9, 0.9]],
              confidence: 0.7,
            },
          ],
        }),
        tokensIn: 0,
        tokensOut: 0,
      })),
    };
    const out = await traceFromImage(
      {
        imageUrl: UNIFORM_FILE_URL,
        backend: 'vision-llm',
      },
      { visionClient: stubClient },
    );
    expect(out.ok).toBe(true);
    expect(out.features[0].backend).toBe('vision-llm');
    expect(stubClient.generate).toHaveBeenCalledTimes(1);
  });

  it('defaults maxWaypointsPerFeature to 12 when omitted', async () => {
    let observedMax = -1;
    const extractStub = vi.fn(async (_b: Buffer, max: number) => {
      observedMax = max;
      return [[0, 0], [1, 1]] as Vec2Normalized[];
    });

    await traceFromImage(
      { imageUrl: UNIFORM_FILE_URL },
      { extractSilhouettePolyline: extractStub },
    );
    expect(observedMax).toBe(12);
  });

  it('emits opencv-cannot-label warning when a point feature is forced through opencv', async () => {
    const extractStub = vi.fn(async () => [[0, 0], [1, 1]] as Vec2Normalized[]);
    const out = await traceFromImage(
      {
        imageUrl: UNIFORM_FILE_URL,
        backend: 'opencv',
        features: [
          { label: 'silhouette', kind: 'silhouette' },
          { label: 'tip', kind: 'point' },
        ],
      },
      { extractSilhouettePolyline: extractStub },
    );
    expect(out.ok).toBe(true);
    expect(out.diagnostics.some((d) => d.code === 'tool.trace-from-image.opencv-cannot-label')).toBe(true);
  });

  it('emits backend-failed when the silhouette extractor throws', async () => {
    const extractStub = vi.fn(async () => {
      throw new Error('no foreground');
    });
    const out = await traceFromImage(
      { imageUrl: UNIFORM_FILE_URL, backend: 'opencv' },
      { extractSilhouettePolyline: extractStub },
    );
    expect(out.ok).toBe(false);
    expect(out.diagnostics.some((d) => d.code === 'tool.trace-from-image.backend-failed')).toBe(true);
  });

  it('fails closed with a diagnostic when an outer light foreground cannot be isolated', async () => {
    const sharp = (await import('sharp')).default;
    const paleBody = await sharp({
      create: { width: 220, height: 220, channels: 3, background: { r: 232, g: 232, b: 232 } },
    }).png().toBuffer();
    const darkScreen = await sharp({
      create: { width: 100, height: 100, channels: 3, background: { r: 24, g: 24, b: 24 } },
    }).png().toBuffer();
    const ambiguous = await sharp({
      create: { width: 256, height: 256, channels: 3, background: { r: 255, g: 255, b: 255 } },
    })
      .composite([
        { input: paleBody, left: 0, top: 18 },
        { input: darkScreen, left: 68, top: 70 },
      ])
      .png()
      .toBuffer();

    const out = await traceFromImage({
      imageUrl: `data:image/png;base64,${ambiguous.toString('base64')}`,
      backend: 'opencv',
      features: [{ label: 'outer_housing', kind: 'silhouette' }],
    });

    expect(out.ok).toBe(false);
    expect(out.features).toEqual([]);
    expect(out.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'tool.trace-from-image.backend-failed',
        message: expect.stringMatching(/ambiguous outer silhouette/),
      }),
    ]));
  });

  it('emits trace-timeout when a backend hangs past the hard timeout', async () => {
    const hangingExtract = vi.fn(
      () => new Promise<Vec2Normalized[]>(() => {}), // never resolves
    );
    const out = await traceFromImage(
      { imageUrl: UNIFORM_FILE_URL, backend: 'opencv' },
      { extractSilhouettePolyline: hangingExtract, backendTimeoutMs: 25 },
    );
    expect(out.ok).toBe(false);
    expect(out.features).toEqual([]);
    expect(out.diagnostics.some((d) => d.code === 'tool.trace-from-image.trace-timeout')).toBe(true);
  });

  it('emits image-fetch-failed when a file:// path does not exist', async () => {
    const out = await traceFromImage({
      imageUrl: `file://${FIXTURE_DIR}/does-not-exist.png`,
    });
    expect(out.ok).toBe(false);
    expect(out.diagnostics.some((d) => d.code === 'tool.trace-from-image.image-fetch-failed')).toBe(true);
  });
});
