// tests/unit/naming/resolveFaceRef.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { resolveFaceRef } from '../../../src/kernel/naming/resolveFaceRef';
import type { HistoryMap, FaceLineage } from '../../../src/kernel/naming/evolutionRecord';

describe('resolveFaceRef', () => {
  beforeAll(async () => { await initOcct(); });

  // All real-world resolver tests need OcctBackend.historyMap and faceHashes() —
  // those land in Task 5. The tests here build synthetic OcctBackend stubs.

  function makeStub(historyMap: HistoryMap | undefined): OcctBackend {
    return { historyMap, kind: undefined } as unknown as OcctBackend;
  }

  it('returns success when exactly one face matches the canonical name', () => {
    const map: HistoryMap = new Map();
    map.set('hash-a', { rootHash: 'hash-a', canonicalName: 'top', rootFeatureId: 'box-1' });
    map.set('hash-b', { rootHash: 'hash-b', canonicalName: 'bottom', rootFeatureId: 'box-1' });
    const result = resolveFaceRef(
      { kind: 'canonical', face: 'top' },
      { currentShape: makeStub(map), featureId: 'fillet-2', surface: 'edge-feature' },
    );
    expect(result.ok).toBe(true);
    expect((result as { ok: true; faceHash: string }).faceHash).toBe('hash-a');
  });

  it('emits face-ref-removed when zero faces match', () => {
    const map: HistoryMap = new Map();
    map.set('hash-b', { rootHash: 'hash-b', canonicalName: 'bottom', rootFeatureId: 'box-1' });
    const result = resolveFaceRef(
      { kind: 'canonical', face: 'top' },
      { currentShape: makeStub(map), featureId: 'fillet-2', surface: 'edge-feature' },
    );
    expect(result.ok).toBe(false);
    const diag = (result as { ok: false; diagnostic: { code: string } }).diagnostic;
    expect(diag.code).toBe('feature.face-ref.removed');
  });

  it('emits face-ref-ambiguous-after-split when multiple faces match', () => {
    const map: HistoryMap = new Map();
    map.set('hash-a1', { rootHash: 'hash-a', canonicalName: 'top', rootFeatureId: 'box-1' });
    map.set('hash-a2', { rootHash: 'hash-a', canonicalName: 'top', rootFeatureId: 'box-1' });
    const result = resolveFaceRef(
      { kind: 'canonical', face: 'top' },
      { currentShape: makeStub(map), featureId: 'fillet-2', surface: 'edge-feature' },
    );
    expect(result.ok).toBe(false);
    const diag = (result as { ok: false; diagnostic: { code: string; message: string } }).diagnostic;
    expect(diag.code).toBe('feature.face-ref.ambiguous-after-split');
    expect(diag.message).toContain('split into 2 children');
  });

  it('emits feature.face-ref.not-resolvable for face-feature surface (codes are unified across surfaces)', () => {
    // Pass undefined historyMap to trigger the face-ref-not-resolvable path.
    // (An empty map is valid and produces face-ref-removed when no face matches.)
    const result = resolveFaceRef(
      { kind: 'canonical', face: 'top' },
      { currentShape: makeStub(undefined), featureId: 'shell-3', surface: 'face-feature' },
    );
    expect(result.ok).toBe(false);
    const diag = (result as { ok: false; diagnostic: { code: string } }).diagnostic;
    expect(diag.code).toBe('feature.face-ref.not-resolvable');
  });

  it('returns face-ref-not-resolvable when historyMap is undefined', () => {
    const result = resolveFaceRef(
      { kind: 'canonical', face: 'top' },
      { currentShape: makeStub(undefined), featureId: 'fillet-2', surface: 'edge-feature' },
    );
    expect(result.ok).toBe(false);
    const diag = (result as { ok: false; diagnostic: { code: string } }).diagnostic;
    expect(diag.code).toBe('feature.face-ref.not-resolvable');
  });
});

describe('resolveFaceRef created-ref branch', () => {
  beforeAll(async () => { await initOcct(); });

  function makeStub(historyMap: HistoryMap): OcctBackend {
    return { historyMap, kind: undefined } as unknown as OcctBackend;
  }

  it('returns success when exactly one lineage matches rewriteId + slot', () => {
    const map: HistoryMap = new Map();
    map.set('hw', { rootHash: 'hw', rootFeatureId: 'box-1', featureId: 'hole-1', labelName: 'wall',
                   snapshot: { centroid: [0, 0, 0], normal: [0, 0, 1], area: 1 },
                   snapshotAtCreate: { centroid: [0, 0, 0], normal: [0, 0, 1], area: 1 },
                   surfaceType: 'CYLINDRE' });
    const result = resolveFaceRef(
      { kind: 'created', rewriteId: 'hole-1', slot: 'wall' },
      { currentShape: makeStub(map), featureId: 'fillet-2', surface: 'edge-feature' },
    );
    expect(result.ok).toBe(true);
    expect((result as { ok: true; faceHash: string }).faceHash).toBe('hw');
  });

  it('falls back to geometry-snapshot when topology returns zero hits — single match → success + warning diag in result.warnings', () => {
    const target = { centroid: [1, 1, 1] as [number, number, number], normal: [0, 0, 1] as [number, number, number], area: 25 };
    const map: HistoryMap = new Map();
    // Original lineage was overwritten / split — the slot/rewriteId lookup misses.
    map.set('hLive', { rootHash: 'hLive', rootFeatureId: 'box-1',
                      snapshot: target, snapshotAtCreate: target, surfaceType: 'PLANE',
                      featureId: 'someOther', labelName: 'else' });
    // But the resolver also has a record of the create-time fingerprint via
    // the rewriteId lineage (kept in the map with a different hash).
    map.set('hOrig', { rootHash: 'hOrig', rootFeatureId: 'box-1',
                      snapshotAtCreate: target, surfaceType: 'PLANE',
                      featureId: 'hole-1', labelName: 'wall' });
    const result = resolveFaceRef(
      { kind: 'created', rewriteId: 'hole-1', slot: 'wall' },
      { currentShape: makeStub(map), featureId: 'fillet-2', surface: 'edge-feature' },
    );
    expect(result.ok).toBe(true);
    expect((result as { ok: true; faceHash: string }).faceHash).toBe('hLive');
    expect((result as { ok: true; warnings?: { code: string }[] }).warnings?.[0]?.code)
      .toBe('feature.created-ref.fallback-used');
  });

  it('emits face-ref.removed when topology + fallback both miss', () => {
    const map: HistoryMap = new Map();
    map.set('hOrig', { rootHash: 'hOrig', rootFeatureId: 'box-1',
                      snapshotAtCreate: { centroid: [0, 0, 0], normal: [0, 0, 1], area: 1 }, surfaceType: 'CYLINDRE',
                      featureId: 'hole-1', labelName: 'wall' });
    const result = resolveFaceRef(
      { kind: 'created', rewriteId: 'hole-1', slot: 'wall' },
      { currentShape: makeStub(map), featureId: 'fillet-2', surface: 'edge-feature' },
    );
    expect(result.ok).toBe(false);
    expect((result as { ok: false; diagnostic: { code: string } }).diagnostic.code).toBe('feature.face-ref.removed');
  });

  it('emits ambiguous-after-split when fallback finds >1 matches', () => {
    const target = { centroid: [1, 1, 1] as [number, number, number], normal: [0, 0, 1] as [number, number, number], area: 25 };
    const map: HistoryMap = new Map();
    map.set('hA', { rootHash: 'hA', rootFeatureId: 'box-1', snapshot: target, surfaceType: 'PLANE' });
    map.set('hB', { rootHash: 'hB', rootFeatureId: 'box-1', snapshot: target, surfaceType: 'PLANE' });
    map.set('hOrig', { rootHash: 'hOrig', rootFeatureId: 'box-1',
                      snapshotAtCreate: target, surfaceType: 'PLANE',
                      featureId: 'hole-1', labelName: 'wall' });
    const result = resolveFaceRef(
      { kind: 'created', rewriteId: 'hole-1', slot: 'wall' },
      { currentShape: makeStub(map), featureId: 'fillet-2', surface: 'edge-feature' },
    );
    expect(result.ok).toBe(false);
    expect((result as { ok: false; diagnostic: { code: string } }).diagnostic.code).toBe('feature.face-ref.ambiguous-after-split');
  });
});

