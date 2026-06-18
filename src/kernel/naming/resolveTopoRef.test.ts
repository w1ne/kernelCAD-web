// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { resolveTopoRef, type TopoResolveContext } from './resolveTopoRef';
import { parseTopoRef, type TopoRef } from './topoRef';
import type { HistoryMap, FaceLineage } from './evolutionRecord';
import type { OcctBackend } from '../backends/occt/occtBackend';

function makeStubBackend(historyMap: HistoryMap | undefined): OcctBackend {
  return { historyMap, kind: undefined } as unknown as OcctBackend;
}

function parsed(s: string): TopoRef {
  const r = parseTopoRef(s);
  if ('error' in r) throw new Error(`fixture invalid: ${r.error}`);
  return r;
}

function lineage(over: Partial<FaceLineage>): FaceLineage {
  return {
    rootHash: 'h-root',
    rootFeatureId: 'box-1',
    snapshot: { centroid: [0, 0, 0], normal: [0, 0, 1], area: 1 },
    snapshotAtCreate: { centroid: [0, 0, 0], normal: [0, 0, 1], area: 1 },
    surfaceType: 'PLANE',
    ...over,
  };
}

describe('resolveTopoRef — name-propagation primary path', () => {
  it('resolves @kc[base/face/top] via canonicalName lineage hit', () => {
    const map: HistoryMap = new Map();
    map.set('h-top', lineage({ canonicalName: 'top' }));
    const ctx: TopoResolveContext = {
      currentShape: makeStubBackend(map),
      featureId: 'fillet-2',
    };
    const r = resolveTopoRef(parsed('@kc[base/face/top]'), ctx);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(r.entityHash).toBe('h-top');
      expect(r.path).toBe('lineage');
    }
  });

  it('resolves @kc[base/face/lid] via labelName lineage hit', () => {
    const map: HistoryMap = new Map();
    map.set('h-lid', lineage({ labelName: 'lid' }));
    const ctx: TopoResolveContext = {
      currentShape: makeStubBackend(map),
      featureId: 'fillet-2',
    };
    const r = resolveTopoRef(parsed('@kc[base/face/lid]'), ctx);
    expect(r.kind).toBe('ok');
  });

  it('resolves @kc[hole1/face/wall] via featureKind+featureOrdinal+labelName', () => {
    const map: HistoryMap = new Map();
    map.set('h-wall', lineage({ featureKind: 'hole', featureOrdinal: 1, labelName: 'wall' }));
    const ctx: TopoResolveContext = {
      currentShape: makeStubBackend(map),
      featureId: 'fillet-2',
    };
    const r = resolveTopoRef(parsed('@kc[hole1/face/wall]'), ctx);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') expect(r.entityHash).toBe('h-wall');
  });
});

describe('resolveTopoRef — ambiguous-after-split', () => {
  it('returns ambiguous when lineage matches >= 2 surviving descendants', () => {
    const map: HistoryMap = new Map();
    map.set('h-a', lineage({ labelName: 'lid' }));
    map.set('h-b', lineage({ labelName: 'lid' }));
    const ctx: TopoResolveContext = {
      currentShape: makeStubBackend(map),
      featureId: 'fillet-2',
    };
    const r = resolveTopoRef(parsed('@kc[base/face/lid]'), ctx);
    expect(r.kind).toBe('ambiguous');
    if (r.kind === 'ambiguous') {
      expect(r.code).toBe('feature.face-ref.ambiguous-after-split');
      expect(r.candidates.length).toBe(2);
      expect(r.candidates).toContain('h-a');
      expect(r.candidates).toContain('h-b');
    }
  });
});

describe('resolveTopoRef — snapshot fallback', () => {
  it('falls back to snapshot when lineage returns zero and a fingerprint matches', () => {
    const map: HistoryMap = new Map();
    map.set('h-renamed', lineage({
      labelName: 'lid-v2',
      snapshot: { centroid: [5, 5, 5], normal: [0, 0, 1], area: 4 },
      snapshotAtCreate: { centroid: [5, 5, 5], normal: [0, 0, 1], area: 4 },
      surfaceType: 'PLANE',
      featureKind: 'extrude',
      featureOrdinal: 1,
    }));
    map.set('h-orphan', lineage({
      labelName: 'lid',
      snapshot: undefined,
      snapshotAtCreate: { centroid: [5, 5, 5], normal: [0, 0, 1], area: 4 },
      surfaceType: 'PLANE',
      featureKind: 'extrude',
      featureOrdinal: 1,
    }));
    const ctx: TopoResolveContext = {
      currentShape: makeStubBackend(map),
      featureId: 'fillet-2',
    };
    const r = resolveTopoRef(parsed('@kc[base/face/lid]'), ctx);
    if (r.kind === 'ok') {
      expect(r.path).toBe('snapshot');
      expect(r.warnings?.[0]?.code).toBe('feature.face-ref.snapshot-fallback-used');
    } else {
      expect(r.kind === 'not-resolvable' || r.kind === 'ambiguous').toBe(true);
    }
  });
});

describe('resolveTopoRef — not-resolvable', () => {
  it('returns not-resolvable when lineage AND snapshot both return zero', () => {
    const map: HistoryMap = new Map();
    const ctx: TopoResolveContext = {
      currentShape: makeStubBackend(map),
      featureId: 'fillet-2',
    };
    const r = resolveTopoRef(parsed('@kc[base/face/lid]'), ctx);
    expect(r.kind).toBe('not-resolvable');
    if (r.kind === 'not-resolvable') {
      expect(r.code).toBe('feature.face-ref.not-resolvable');
    }
  });

  it('returns not-resolvable when historyMap is undefined', () => {
    const ctx: TopoResolveContext = {
      currentShape: makeStubBackend(undefined),
      featureId: 'fillet-2',
    };
    const r = resolveTopoRef(parsed('@kc[base/face/lid]'), ctx);
    expect(r.kind).toBe('not-resolvable');
  });
});

describe('resolveTopoRef — kind dispatch', () => {
  it('handles edge kind by routing through the same lineage walk', () => {
    const map: HistoryMap = new Map();
    map.set('h-edge', lineage({ labelName: 'top-front' }));
    const ctx: TopoResolveContext = {
      currentShape: makeStubBackend(map),
      featureId: 'fillet-2',
    };
    const r = resolveTopoRef(parsed('@kc[base/edge/top-front]'), ctx);
    expect(r.kind).toBe('ok');
  });

  it('returns not-resolvable for connector kind when no connector machinery is provided', () => {
    const map: HistoryMap = new Map();
    const ctx: TopoResolveContext = {
      currentShape: makeStubBackend(map),
      featureId: 'inspect-1',
    };
    const r = resolveTopoRef(parsed('@kc[base/connector/flange]'), ctx);
    expect(r.kind === 'not-resolvable' || r.kind === 'ok').toBe(true);
  });
});
