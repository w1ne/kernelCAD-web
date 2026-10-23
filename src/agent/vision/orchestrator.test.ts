// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/vision/orchestrator.test.ts
//
// End-to-end tests for the `traceFromImage()` orchestrator. Uses fixture PNGs
// + a stubbed silhouette extractor to avoid the opencv WASM hang.

import { describe, expect, it, vi } from 'vitest';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { traceFromImage } from './index';
import { findCatalogMatch, groupDraftBom, partsInOutlineFrame, type RawDetectedPart } from './visionLlmBackend';
import type { DetectedTracePart, TraceFeatureResult, TraceFromImageInput, Vec2Normalized } from './types';
import type { PartRecord } from '../../shared/parts/types';

const FIXTURE_DIR = join(__dirname, '../../..', 'tests/fixtures/vision');
const UNIFORM_FILE_URL = `file://${join(FIXTURE_DIR, 'uniform-bg-square.png')}`;

describe('traceFromImage orchestrator', () => {
  it('matches an MPN label against every bundled candidate, including candidate attributes', () => {
    const record = (id: string, name: string, attributes: PartRecord['attributes'] = {}): PartRecord => ({
      id, name, category: 'motor', family: 'stepper-motor', tags: [], attributes,
      sha256: '0'.repeat(64), source: 'local-catalog', license: 'MIT', connectors: [],
    });
    const match = findCatalogMatch('17HS4401', [
      record('unrelated-board', 'Controller board'),
      record('nema17-stepper', 'NEMA 17 stepper motor', { mpn: '17HS4401' }),
    ]);
    expect(match).toMatchObject({ id: 'nema17-stepper', name: 'NEMA 17 stepper motor', confidence: 1 });
  });

  it.each(['voltage', 'mpn'])('does not treat an attribute key (%s) as a catalog identity', (label) => {
    const record: PartRecord = {
      id: 'unrelated-sensor', name: 'Ambient sensor', category: 'sensor', family: 'environmental', tags: [],
      attributes: { voltage: 3.3, mpn: 'SEN-204' }, sha256: '0'.repeat(64), source: 'local-catalog', license: 'MIT', connectors: [],
    };
    expect(findCatalogMatch(label, [record])).toBeUndefined();
  });

  it('ranks an exact MPN alias above a fuzzy name-token match', () => {
    const record = (id: string, name: string, attributes: PartRecord['attributes'] = {}): PartRecord => ({
      id, name, category: 'motor', family: 'stepper-motor', tags: [], attributes,
      sha256: '0'.repeat(64), source: 'local-catalog', license: 'MIT', connectors: [],
    });
    const match = findCatalogMatch('17HS4401 Stepper', [
      record('stepper-generic', 'Stepper 17HS4401'),
      record('nema17-motor', 'NEMA 17 stepper motor', { mpn: '17HS4401 Stepper' }),
    ]);
    expect(match).toMatchObject({ id: 'nema17-motor', confidence: 1 });
  });

  it('does not assign a catalog identity from a label that is only a substring of an alias', () => {
    const record: PartRecord = {
      id: 'esp32-devkitc-32e', name: 'ESP32 DevKitC-32E', category: 'controller', family: 'microcontroller',
      tags: ['ESP32 DevKit'], attributes: {}, sha256: '0'.repeat(64), source: 'local-catalog', license: 'MIT', connectors: [],
    };
    expect(findCatalogMatch('ESP32 DevKitC', [record])).toBeUndefined();
  });

  it('preserves image-frame boxes that fall partly outside the traced outline', () => {
    const outside: RawDetectedPart = { name: 'outside part', quantity: 1, bbox: [0.9, 0.3, 1, 0.5], confidence: 0.8 };
    const silhouette: TraceFeatureResult = {
      label: 'silhouette', kind: 'silhouette', waypoints: [[0.2, 0.2], [0.8, 0.2], [0.8, 0.8], [0.2, 0.8]], confidence: 1, backend: 'opencv',
    };
    const result = partsInOutlineFrame([outside], [silhouette]);
    expect(result.detectedParts[0]).toMatchObject({
      bbox: outside.bbox,
      position: [0.95, 0.4],
      coordinateFrame: 'image',
      outsideOutline: true,
    });
    expect(result.partDetectionFrame).toBe('image');
  });

  it('keeps boxes in a concave silhouette cutout in image coordinates', () => {
    const silhouette: TraceFeatureResult = {
      label: 'silhouette', kind: 'silhouette',
      waypoints: [[0.1, 0.1], [0.9, 0.1], [0.9, 0.9], [0.6, 0.9], [0.6, 0.4], [0.4, 0.4], [0.4, 0.9], [0.1, 0.9]],
      confidence: 1, backend: 'opencv',
    };
    const cutout: RawDetectedPart = { name: 'part', quantity: 1, bbox: [0.46, 0.6, 0.54, 0.7], confidence: 0.8 };
    expect(partsInOutlineFrame([cutout], [silhouette]).detectedParts[0]).toMatchObject({
      bbox: cutout.bbox, coordinateFrame: 'image', outsideOutline: true,
    });
  });

  it('does not match a generic attribute value as a catalog identity', () => {
    const record: PartRecord = {
      id: 'unrelated-sensor', name: 'Ambient sensor', category: 'sensor', family: 'environmental', tags: [],
      attributes: { voltage: 3.3 }, sha256: '0'.repeat(64), source: 'local-catalog', license: 'MIT', connectors: [],
    };
    expect(findCatalogMatch('3.3', [record])).toBeUndefined();
  });

  it('groups catalog-matched name variants into one BOM row and leaves unmatched labels distinct', () => {
    const match = { id: 'esp32-devkitc', name: 'ESP32 DevKitC', confidence: 1 };
    const detection = (name: string, quantity: number, matchedCatalogId?: string): DetectedTracePart => ({
      name, quantity, position: [0.5, 0.5], bbox: [0.4, 0.4, 0.6, 0.6], confidence: 0.8,
      coordinateFrame: 'outline',
      ...(matchedCatalogId ? { catalogMatch: match, matchedCatalogId } : {}),
    });
    const bom = groupDraftBom([
      detection('ESP32', 1, 'esp32-devkitc'),
      detection('ESP32-DevKitC-32E', 1, 'esp32-devkitc'),
      detection('mystery sensor', 1),
      detection('unrecognized module', 2),
    ]);
    expect(bom).toHaveLength(3);
    expect(bom[0]).toMatchObject({ partName: 'ESP32 DevKitC', qty: 2, matchedCatalogId: 'esp32-devkitc' });
    expect(bom.slice(1).map((row) => row.partName)).toEqual(['mystery sensor', 'unrecognized module']);
  });

  it('optionally detects labeled parts, maps boxes to the traced outline, and drafts a BOM', async () => {
    const response = JSON.parse(await readFile(join(FIXTURE_DIR, 'argon-grow-parts-response.json'), 'utf8')) as { parts: unknown[] };
    const generate = vi.fn(async () => ({ text: JSON.stringify(response), tokensIn: 10, tokensOut: 10 }));
    const outline: Vec2Normalized[] = [[0.2, 0.2], [0.8, 0.2], [0.8, 0.8], [0.2, 0.8]];
    const out = await traceFromImage({ imageUrl: UNIFORM_FILE_URL, backend: 'opencv', detectParts: true }, {
      extractSilhouettePolyline: vi.fn(async () => outline),
      visionClient: { generate },
    });
    expect(out.ok).toBe(true);
    expect(out.features[0].waypoints).toEqual(outline);
    expect(out.detectedParts).toHaveLength(6);
    expect(out.detectedParts?.[0]).toMatchObject({ name: 'ESP32-DevKitC-32E', quantity: 1 });
    expect(out.detectedParts?.[0].bbox[0]).toBeCloseTo(1 / 6);
    expect(out.detectedParts?.[0].bbox[2]).toBeCloseTo(0.4666666667);
    expect(out.detectedParts?.[0].position[0]).toBeCloseTo(0.3166666667);
    expect(out.detectedParts?.[0].position[1]).toBeCloseTo(0.3);
    expect(out.draftBom?.some((item) => item.partName === '17HS4401' && item.qty === 2)).toBe(true);
    expect(out.unmatchedLabels).toContainEqual({ label: 'mystery sensor', quantity: 1, confidence: 0.62, reason: 'no-bundled-catalog-match' });
    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate.mock.calls[0][0].prompt).toMatch(/detect labeled component/i);
  });

  it('keeps the outline when the optional part detector response is invalid', async () => {
    const out = await traceFromImage({ imageUrl: UNIFORM_FILE_URL, backend: 'opencv', detectParts: true }, {
      extractSilhouettePolyline: vi.fn(async () => [[0.2, 0.2], [0.8, 0.8]]),
      visionClient: { generate: vi.fn(async () => ({ text: '{bad json', tokensIn: 0, tokensOut: 0 })) },
    });
    expect(out.ok).toBe(true);
    expect(out.features).toHaveLength(1);
    expect(out.detectedParts).toEqual([]);
    expect(out.draftBom).toEqual([]);
    expect(out.unmatchedLabels).toEqual([]);
    expect(out.diagnostics.some((d) => d.code === 'tool.trace-from-image.part-detection-failed')).toBe(true);
  });

  it('bounds the optional part detection request with the backend timeout', async () => {
    const out = await traceFromImage({ imageUrl: UNIFORM_FILE_URL, backend: 'opencv', detectParts: true }, {
      backendTimeoutMs: 10,
      extractSilhouettePolyline: vi.fn(async () => [[0.2, 0.2], [0.8, 0.8]]),
      visionClient: { generate: vi.fn(() => new Promise(() => {})) },
    });
    expect(out.ok).toBe(true);
    expect(out.features).toHaveLength(1);
    expect(out.detectedParts).toEqual([]);
    expect(out.diagnostics.some((d) => d.code === 'tool.trace-from-image.part-detection-failed' && d.message.includes('10ms'))).toBe(true);
  });

  it('shares the backend timeout budget between tracing and optional detection', async () => {
    const originalNow = Date.now;
    let now = originalNow();
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const generate = vi.fn(async (req: { prompt: string }) => {
      if (req.prompt.includes('detect labeled component')) return new Promise<{ text: string; tokensIn: number; tokensOut: number }>(() => {});
      now += 35;
      return { text: '{"features":[{"label":"outline","kind":"silhouette","waypoints":[[0,0],[1,0],[1,1]],"confidence":1]}', tokensIn: 0, tokensOut: 0 };
    });
    try {
      const output = await traceFromImage({ imageUrl: UNIFORM_FILE_URL, backend: 'vision-llm', detectParts: true, features: [{ label: 'outline', kind: 'silhouette' }] }, {
        backendTimeoutMs: 50, visionClient: { generate },
      });
      expect(output.ok).toBe(false);
      expect(output.features).toEqual([]);
      expect(output.diagnostics.some((d) => d.code === 'tool.trace-from-image.backend-failed')).toBe(true);
      expect(generate).toHaveBeenCalledTimes(2);
    } finally { vi.restoreAllMocks(); }
  });

  it('reports image coordinates when part detection has no traced silhouette', async () => {
    const response = JSON.parse(await readFile(join(FIXTURE_DIR, 'argon-grow-parts-response.json'), 'utf8')) as { parts: unknown[] };
    let call = 0;
    const out = await traceFromImage({
      imageUrl: UNIFORM_FILE_URL,
      backend: 'vision-llm',
      detectParts: true,
      features: [{ label: 'marker', kind: 'point' }],
    }, {
      visionClient: { generate: vi.fn(async () => {
        call += 1;
        return call === 1
          ? { text: JSON.stringify({ features: [{ label: 'marker', kind: 'point', waypoints: [[0.5, 0.5]], confidence: 0.9 }] }), tokensIn: 0, tokensOut: 0 }
          : { text: JSON.stringify(response), tokensIn: 0, tokensOut: 0 };
      }) },
    });
    expect(out.ok).toBe(true);
    expect(out.features.some((feature) => feature.kind === 'silhouette')).toBe(false);
    expect(out.partDetectionFrame).toBe('image');
    expect(out.detectedParts?.[0].bbox).toEqual([0.3, 0.3, 0.48, 0.46]);
  });

  it.each(['auto', 'hybrid'] as const)('honours a component silhouette region with backend %s', async backend => {
    const extract = vi.fn(async (): Promise<Vec2Normalized[]> => [[0, 0], [1, 1]]);
    const component: Vec2Normalized[] = [[0.1, 0.2], [0.3, 0.2], [0.2, 0.5]];
    const generate = vi.fn(async (_req: { prompt: string }) => ({
      text: JSON.stringify({ features: [{ label: 'horse', kind: 'silhouette', waypoints: component, confidence: 0.7 }] }),
      tokensIn: 10, tokensOut: 10,
    }));
    const out = await traceFromImage({
      imageUrl: UNIFORM_FILE_URL, backend,
      features: [{ label: 'horse', kind: 'silhouette', region: 'left horse only' }],
    }, { extractSilhouettePolyline: extract, visionClient: { generate } });
    expect(out.ok).toBe(true);
    expect(out.features[0].waypoints).toEqual(component);
    expect(out.features[0].backend).toBe('vision-llm');
    expect(extract).not.toHaveBeenCalled();
    expect(generate.mock.calls[0][0].prompt).toContain('left horse only');
  });

  it('refuses opencv for a semantic region instead of reporting a whole-image success', async () => {
    const extract = vi.fn(async (): Promise<Vec2Normalized[]> => [[0, 0], [1, 1]]);
    const out = await traceFromImage({
      imageUrl: UNIFORM_FILE_URL, backend: 'opencv',
      features: [{ label: 'horse', kind: 'silhouette', region: 'left horse only' }],
    }, { extractSilhouettePolyline: extract });
    expect(out.ok).toBe(false);
    expect(out.features).toEqual([]);
    expect(out.diagnostics[0].message).toContain('vision-llm');
    expect(extract).not.toHaveBeenCalled();
  });

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
    // No scale anchor was supplied — the assumption ledger's `scale` fact is
    // `missing`, so a warn-level `reference.assumptions.unresolved` fires.
    expect(out.diagnostics).toHaveLength(1);
    expect(out.diagnostics[0].code).toBe('reference.assumptions.unresolved');
    expect(out.diagnostics[0].severity).toBe('warn');
    expect(out.imageDims[0]).toBeGreaterThan(0);
    expect(out.imageDims[1]).toBeGreaterThan(0);
    expect(extractStub).toHaveBeenCalledTimes(1);

    expect(out.ledger.unresolvedCount).toBe(1);
    const silhouetteFact = out.ledger.facts.find((f) => f.id === 'silhouette');
    expect(silhouetteFact?.kind).toBe('visible');
    expect(silhouetteFact?.resolution).toBe('confirmed');
    const scaleFact = out.ledger.facts.find((f) => f.id === 'scale');
    expect(scaleFact?.kind).toBe('missing');
    expect(scaleFact?.resolution).toBe('open');
  });

  it('grounds the ledger scale fact when a scaleAnchor is supplied, leaving zero unresolved', async () => {
    const fakePolyline: Vec2Normalized[] = [[0.3, 0.3], [0.7, 0.3], [0.7, 0.7], [0.3, 0.7]];
    const out = await traceFromImage(
      {
        imageUrl: UNIFORM_FILE_URL,
        scaleAnchor: { pixelDistance: 100, realDistance: 20, unit: 'mm' },
      },
      { extractSilhouettePolyline: vi.fn(async () => fakePolyline) },
    );

    expect(out.diagnostics).toEqual([]);
    expect(out.ledger.unresolvedCount).toBe(0);
    expect(out.ledger.scale).toEqual({ mmPerPixel: 0.2, source: 'scale-anchor' });
  });

  it('fails with an error diagnostic when validate:"error" and scale is still missing', async () => {
    const fakePolyline: Vec2Normalized[] = [[0.3, 0.3], [0.7, 0.3], [0.7, 0.7], [0.3, 0.7]];
    const out = await traceFromImage(
      {
        imageUrl: UNIFORM_FILE_URL,
        validate: 'error',
      },
      { extractSilhouettePolyline: vi.fn(async () => fakePolyline) },
    );

    expect(out.ok).toBe(false);
    expect(out.diagnostics[0].code).toBe('reference.assumptions.unresolved');
    expect(out.diagnostics[0].severity).toBe('error');
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
