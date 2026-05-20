// src/agent/vision/router.test.ts
//
// Tests for the trace_from_image backend router. Uses real fixture PNGs to
// exercise the corner-color stddev heuristic end-to-end (it's cheap — sharp
// only decodes 4 single pixels, no opencv).

import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { decideBackend } from './router';
import type { TraceFeatureRequest } from './types';

const FIXTURE_DIR = join(__dirname, '../../..', 'tests/fixtures/vision');

describe('decideBackend', () => {
  it('routes uniform-bg + silhouette-only to opencv', async () => {
    const png = await readFile(join(FIXTURE_DIR, 'uniform-bg-square.png'));
    const features: TraceFeatureRequest[] = [
      { label: 'silhouette', kind: 'silhouette' },
    ];
    const backend = await decideBackend(png, features);
    expect(backend).toBe('opencv');
  });

  it('routes uniform-bg + any point feature to hybrid', async () => {
    const png = await readFile(join(FIXTURE_DIR, 'uniform-bg-square.png'));
    const features: TraceFeatureRequest[] = [
      { label: 'silhouette', kind: 'silhouette' },
      { label: 'centroid', kind: 'point' },
    ];
    const backend = await decideBackend(png, features);
    expect(backend).toBe('hybrid');
  });

  it('routes uniform-bg + any bbox feature to hybrid', async () => {
    const png = await readFile(join(FIXTURE_DIR, 'uniform-bg-square.png'));
    const features: TraceFeatureRequest[] = [
      { label: 'extent', kind: 'bbox' },
    ];
    const backend = await decideBackend(png, features);
    expect(backend).toBe('hybrid');
  });

  it('routes a cluttered photo to vision-llm', async () => {
    const png = await readFile(join(FIXTURE_DIR, 'cluttered-photo.png'));
    const features: TraceFeatureRequest[] = [
      { label: 'silhouette', kind: 'silhouette' },
    ];
    const backend = await decideBackend(png, features);
    expect(backend).toBe('vision-llm');
  });
});
