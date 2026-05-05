// tests/unit/naming/resolveFaceRef.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, OcctBackend } from '../../../src/backends/occt/occtBackend';
import { resolveFaceRef } from '../../../src/naming/resolveFaceRef';
import type { HistoryMap, FaceLineage } from '../../../src/naming/evolutionRecord';

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
