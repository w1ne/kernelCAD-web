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

// #392 / #393 regression coverage — these tests assert GEOMETRY, not labels:
// the earlier suite passed while cuts no-op'ed and glyphs mirrored because it
// only checked bbox growth and historyMap label presence.
describe('lowerEmbossText — geometry correctness (#392/#393)', () => {
  beforeAll(async () => { await initOcct(); });

  function fRecord(
    depth: number,
    opts: { rotation?: number; anchorU?: number; anchorV?: number } = {},
  ): FeatureRecord {
    return {
      id: 'emboss-geom-1',
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
        // 'F' is asymmetric: the stem fills the LEFT half (reading from
        // outside), the right half only carries the two arms.
        textContent: 'F',
        size: { expression: '6', unit: 'mm', evaluated: 6 },
        depth: { expression: String(depth), unit: 'mm', evaluated: depth },
        align: 'center',
        anchorU: { expression: String(opts.anchorU ?? 0.5), unit: 'unitless', evaluated: opts.anchorU ?? 0.5 },
        anchorV: { expression: String(opts.anchorV ?? 0.5), unit: 'unitless', evaluated: opts.anchorV ?? 0.5 },
        rotation: { expression: String(opts.rotation ?? 0), unit: 'deg', evaluated: opts.rotation ?? 0 },
        scaleMode: 'original',
        faceRef: { kind: 'canonical', face: 'top' },
      },
    };
  }

  /** Volume of `backend ∩ axis-aligned box` spanning [x0,x1]×[y0,y1]×[z0,z1].
   *  `OcctBackend.box` is corner-based (spans 0..w / 0..h / 0..d), so the
   *  slab is positioned by translating its min corner to (x0, y0, z0). */
  function regionVolume(
    backend: OcctBackend,
    x0: number, x1: number, y0: number, y1: number, z0: number, z1: number,
  ): number {
    const slab = OcctBackend.box(x1 - x0, y1 - y0, z1 - z0).translate([x0, y0, z0]);
    return backend.intersect(slab).volume();
  }

  it('cut removes material on a box top (volume strictly decreases)', async () => {
    const parent = OcctBackend.box(40, 20, 4);
    const res = await lowerEmbossText(fRecord(-1), parent, undefined, undefined);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.backend.volume()).toBeLessThan(parent.volume() - 0.5);
    // and the cavity is BELOW the entry face, not above
    expect(res.backend.boundingBox().max[2]).toBeCloseTo(4, 5);
  });

  it('cut removes material on a cylinder end-cap (#393)', async () => {
    const parent = OcctBackend.cylinder(4, 20);
    const res = await lowerEmbossText(fRecord(-1), parent, undefined, undefined);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.backend.volume()).toBeLessThan(parent.volume() - 0.5);
    expect(res.backend.boundingBox().max[2]).toBeCloseTo(4, 5);
  });

  it('emboss adds material on a cylinder end-cap', async () => {
    const parent = OcctBackend.cylinder(4, 20);
    const res = await lowerEmbossText(fRecord(1), parent, undefined, undefined);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.backend.volume()).toBeGreaterThan(parent.volume() + 0.5);
    expect(res.backend.boundingBox().max[2]).toBeCloseTo(5, 5);
  });

  it("glyphs read correctly from outside on a box top (#392): 'F' stem lands in the left half", async () => {
    const parent = OcctBackend.box(40, 20, 4);
    const res = await lowerEmbossText(fRecord(1), parent, undefined, undefined);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    // Material ABOVE the entry plane (z 4..5), split at the glyph
    // centerline. OcctBackend.box is corner-based, so the face centre (and
    // glyph anchor) sits at (20, 10).
    const left = regionVolume(res.backend, 10, 20, 0, 20, 4.001, 5.2);
    const right = regionVolume(res.backend, 20, 30, 0, 20, 4.001, 5.2);
    expect(left).toBeGreaterThan(0.5);
    // Correct reading: stem (full-height bar) in the left half outweighs the
    // arms-only right half. Mirrored output inverts this inequality.
    expect(left).toBeGreaterThan(right * 1.3);
  });

  it("glyphs read correctly from outside on a cylinder end-cap (#392)", async () => {
    const parent = OcctBackend.cylinder(4, 20);
    const res = await lowerEmbossText(fRecord(1), parent, undefined, undefined);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const left = regionVolume(res.backend, -10, 0, -10, 10, 4.001, 5.2);
    const right = regionVolume(res.backend, 0, 10, -10, 10, 4.001, 5.2);
    expect(left).toBeGreaterThan(0.5);
    expect(left).toBeGreaterThan(right * 1.3);
  });

  it('rotation is CCW as seen from outside: +90° turns the F stem toward -y', async () => {
    const parent = OcctBackend.box(40, 20, 4);
    const res = await lowerEmbossText(fRecord(1, { rotation: 90 }), parent, undefined, undefined);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    // (x, y) → (-y, x) under +90 CCW viewed from +z: the stem (was left,
    // x<0) lands in the y<0 half. A wrong rotation sign puts it at y>0.
    // Corner-based box: glyph anchor at (20, 10); the y-halves split there.
    const yNeg = regionVolume(res.backend, 10, 30, 0, 10, 4.001, 5.2);
    const yPos = regionVolume(res.backend, 10, 30, 10, 20, 4.001, 5.2);
    expect(yNeg).toBeGreaterThan(yPos * 1.3);
  });

  it('emits feature.emboss-text.boolean-noop when the cut changes nothing (glyph over a hole)', async () => {
    // Anchor far past the face bounds (capture-side validation is bypassed
    // by hand-crafting the record): the engrave prism descends through air
    // beside the cylinder, so the cut removes nothing — the exact silent
    // failure #393 shipped with.
    const parent = OcctBackend.cylinder(4, 20);
    const res = await lowerEmbossText(fRecord(-0.5, { anchorU: 1.4 }), parent, undefined, undefined);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.diagnostics.some((d) => d.code === 'feature.emboss-text.boolean-noop')).toBe(true);
  });
});
