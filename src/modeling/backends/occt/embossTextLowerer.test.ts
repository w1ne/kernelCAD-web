// src/modeling/backends/occt/embossTextLowerer.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import { lowerEmbossText } from './embossTextLowerer';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import type { HistoryMap } from '../../../kernel/naming/evolutionRecord';
import { resolveFaceRef } from '../../../kernel/naming/resolveFaceRef';

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

// W3 follow-up: chained embossText face-ref propagation via history-aware
// booleans. The lowerer must stamp `labelName` entries on the result
// HistoryMap so downstream chained features (.fillet/.chamfer/.shell) can
// target the newly-created glyph faces by name.
describe('lowerEmbossText — created face-ref propagation', () => {
  beforeAll(async () => { await initOcct(); });

  function embossRecord(id: string, depth: number, faceName: 'top' | 'bottom' = 'top'): FeatureRecord {
    return {
      id,
      kind: 'embossText',
      params: {},
      inputs: {
        parent: { kind: 'feature', id: 'parent-0' },
        face: {
          kind: 'face',
          featureId: 'parent-0',
          ref: { kind: 'canonical', face: faceName },
        },
      },
      transforms: [],
      suppressed: false,
      metadata: {
        textContent: 'KC',
        size: { expression: '6', unit: 'mm', evaluated: 6 },
        depth: { expression: String(depth), unit: 'mm', evaluated: depth },
        align: 'center',
        anchorU: { expression: '0.5', unit: 'unitless', evaluated: 0.5 },
        anchorV: { expression: '0.5', unit: 'unitless', evaluated: 0.5 },
        rotation: { expression: '0', unit: 'deg', evaluated: 0 },
        scaleMode: 'original',
        faceRef: { kind: 'canonical', face: faceName },
      },
    };
  }

  it("emit's a 'embossed-text' labelName on at least one new face (positive depth)", async () => {
    const parent = OcctBackend.box(40, 20, 2);
    const r = embossRecord('emboss-pos-1', 0.4);
    const res = await lowerEmbossText(r, parent, undefined, undefined);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const map = res.backend.historyMap as HistoryMap | undefined;
    expect(map).toBeDefined();
    if (!map) return;
    const labels = new Set<string>();
    for (const lineage of map.values()) {
      if (lineage.labelName) labels.add(lineage.labelName);
    }
    // The new glyph top + side walls are stamped with the embossed-text labels.
    expect(labels.has('embossed-text')).toBe(true);
    expect(labels.has('embossed-text-wall')).toBe(true);
    // featureId points at this lowerer's feature record.
    let count = 0;
    for (const lineage of map.values()) {
      if (lineage.featureId === 'emboss-pos-1' && lineage.featureKind === 'embossText') count++;
    }
    expect(count).toBeGreaterThan(0);
  });

  it("emits 'engraved-text-floor' and 'engraved-text-wall' labels for negative depth (cut)", async () => {
    const parent = OcctBackend.box(40, 20, 4);
    const r = embossRecord('emboss-neg-1', -0.3);
    const res = await lowerEmbossText(r, parent, undefined, undefined);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const map = res.backend.historyMap as HistoryMap | undefined;
    expect(map).toBeDefined();
    if (!map) return;
    const labels = new Set<string>();
    for (const lineage of map.values()) {
      if (lineage.labelName) labels.add(lineage.labelName);
    }
    expect(labels.has('engraved-text-floor')).toBe(true);
    expect(labels.has('engraved-text-wall')).toBe(true);
  });

  it("a 'created' face ref { rewriteId, slot: 'embossed-text' } resolves on the result", async () => {
    const parent = OcctBackend.box(40, 20, 2);
    const r = embossRecord('emboss-resolve-1', 0.4);
    const res = await lowerEmbossText(r, parent, undefined, undefined);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    // Resolve a created face ref against the result's historyMap. This proves
    // the downstream chained-feature path (.fillet/.chamfer on the new face)
    // can find the embossed glyph faces by label.
    const resolve = resolveFaceRef(
      { kind: 'created', rewriteId: 'emboss-resolve-1', slot: 'embossed-text' },
      { currentShape: res.backend, featureId: 'downstream-1', surface: 'edge-feature' },
    );
    expect(resolve.ok).toBe(true);
  });
});
