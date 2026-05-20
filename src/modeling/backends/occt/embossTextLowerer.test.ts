// src/modeling/backends/occt/embossTextLowerer.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import { lowerEmbossText } from './embossTextLowerer';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';

describe('lowerEmbossText', () => {
  beforeAll(async () => { await initOcct(); });

  it('returns { ok: false } with a diagnostic when metadata is missing', async () => {
    const parent = OcctBackend.box(20, 10, 2);
    const r: FeatureRecord = {
      id: 'emboss-1',
      kind: 'embossText',
      params: {},
      inputs: {
        parent: { kind: 'feature', id: 'parent-0' },
        face: {
          kind: 'face',
          featureId: 'parent-0',
          ref: { kind: 'canonical', face: 'top' },
        },
      },
      transforms: [],
      suppressed: false,
      metadata: {}, // missing fields
    };
    const res = await lowerEmbossText(r, parent, undefined, undefined);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.diagnostics.length).toBeGreaterThan(0);
      expect(res.diagnostics[0].code).toBe('feature.invalid-args');
    }
  });

  it('produces a fused OcctBackend for a positive-depth emboss on a box top face', async () => {
    const parent = OcctBackend.box(40, 20, 2);
    const r: FeatureRecord = {
      id: 'emboss-2',
      kind: 'embossText',
      params: {},
      inputs: {
        parent: { kind: 'feature', id: 'parent-0' },
        face: {
          kind: 'face',
          featureId: 'parent-0',
          ref: { kind: 'canonical', face: 'top' },
        },
      },
      transforms: [],
      suppressed: false,
      metadata: {
        textContent: 'KC',
        size: { expression: '6', unit: 'mm', evaluated: 6 },
        depth: { expression: '0.4', unit: 'mm', evaluated: 0.4 },
        align: 'center',
        anchorU: { expression: '0.5', unit: 'unitless', evaluated: 0.5 },
        anchorV: { expression: '0.5', unit: 'unitless', evaluated: 0.5 },
        rotation: { expression: '0', unit: 'deg', evaluated: 0 },
        scaleMode: 'original',
        faceRef: { kind: 'canonical', face: 'top' },
      },
    };
    const res = await lowerEmbossText(r, parent, undefined, undefined);
    expect(res.ok).toBe(true);
    if (res.ok) {
      const bb = res.backend.boundingBox();
      // The fused glyphs raise the bbox above z=2 (box top) by ~0.4mm.
      expect(bb.max[2]).toBeGreaterThan(2);
    }
  });
});
