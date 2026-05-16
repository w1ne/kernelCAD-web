import { describe, it, expect } from 'vitest';
import { resolveEdgeRef } from './resolveEdgeRef';
import type { HistoryMap } from './evolutionRecord';
import type { OcctBackend } from '../backends/occt/occtBackend';

describe('resolveEdgeRef created branch', () => {
  function makeStub(historyMap: HistoryMap | undefined): OcctBackend {
    return { historyMap, kind: undefined } as unknown as OcctBackend;
  }

  it('errors with face-ref.not-resolvable when historyMap is missing', () => {
    const result = resolveEdgeRef(
      { kind: 'created', rewriteId: 'hole-1', slot: 'entry-rim', selector: 'edge' },
      { currentShape: makeStub(undefined), featureId: 'fillet-2', surface: 'edge-feature' },
    );
    expect(result.ok).toBe(false);
  });

  it('returns the face hash for a face whose lineage matches (caller derives boundary edges)', () => {
    const map: HistoryMap = new Map();
    map.set('hw', { rootHash: 'hw', rootFeatureId: 'box-1', featureId: 'hole-1', labelName: 'wall',
                   snapshot: { centroid: [0, 0, 0], normal: [0, 0, 1], area: 1 },
                   snapshotAtCreate: { centroid: [0, 0, 0], normal: [0, 0, 1], area: 1 },
                   surfaceType: 'CYLINDRE' });
    const result = resolveEdgeRef(
      { kind: 'created', rewriteId: 'hole-1', slot: 'wall', selector: 'edge' },
      { currentShape: makeStub(map), featureId: 'fillet-2', surface: 'edge-feature' },
    );
    expect(result.ok).toBe(true);
  });
});
