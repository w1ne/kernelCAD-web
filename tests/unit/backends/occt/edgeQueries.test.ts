// tests/unit/backends/occt/edgeQueries.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { OcctBackend, initOcct } from '../../../../src/backends/occt/occtBackend';
import { resolveEdgeQuery, resolveFaceQuery, selectEdges, selectEdge } from '../../../../src/backends/occt/edgeQueries';

describe('resolveEdgeQuery', () => {
  beforeAll(async () => { await initOcct(); });

  it('returns 12 edges for an empty query on a box', () => {
    const box = OcctBackend.box(10, 10, 5);
    const edges = resolveEdgeQuery(box, {});
    expect(edges).toHaveLength(12);
  });

  it('returns 4 top edges for { atZ: 5 } on a 10x10x5 box', () => {
    const box = OcctBackend.box(10, 10, 5);
    const edges = resolveEdgeQuery(box, { atZ: 5 });
    expect(edges).toHaveLength(4);
  });

  it('returns 4 bottom edges for { atZ: 0 } on a box', () => {
    const box = OcctBackend.box(10, 10, 5);
    const edges = resolveEdgeQuery(box, { atZ: 0 });
    expect(edges).toHaveLength(4);
  });

  it('returns 4 vertical edges for { parallel: [0,0,1] }', () => {
    const box = OcctBackend.box(10, 10, 5);
    const edges = resolveEdgeQuery(box, { parallel: [0, 0, 1] });
    expect(edges).toHaveLength(4);
  });

  it('returns 12 convex edges for { convex: true } on a box (all box edges convex)', () => {
    const box = OcctBackend.box(10, 10, 5);
    const edges = resolveEdgeQuery(box, { convex: true });
    expect(edges).toHaveLength(12);
  });

  it('AND-combines multiple keys: { atZ: 5, parallel: [1,0,0] } -> 2 top edges parallel to X', () => {
    const box = OcctBackend.box(10, 10, 5);
    const edges = resolveEdgeQuery(box, { atZ: 5, parallel: [1, 0, 0] });
    expect(edges).toHaveLength(2);
  });

  it('returns no edges when query matches nothing', () => {
    const box = OcctBackend.box(10, 10, 5);
    const edges = resolveEdgeQuery(box, { atZ: 999 });
    expect(edges).toHaveLength(0);
  });
});

describe('resolveFaceQuery', () => {
  beforeAll(async () => { await initOcct(); });

  it('returns 6 faces for an empty query on a box', () => {
    const box = OcctBackend.box(10, 10, 5);
    const faces = resolveFaceQuery(box, {});
    expect(faces).toHaveLength(6);
  });

  it('returns 1 top face for { atZ: 5 } on a 10x10x5 box', () => {
    const box = OcctBackend.box(10, 10, 5);
    const faces = resolveFaceQuery(box, { atZ: 5 });
    expect(faces).toHaveLength(1);
  });

  it('returns 2 faces for { parallelTo: "XY" } on a box (top + bottom)', () => {
    const box = OcctBackend.box(10, 10, 5);
    const faces = resolveFaceQuery(box, { parallelTo: 'XY' });
    expect(faces).toHaveLength(2);
  });
});

describe('selectEdges / selectEdge', () => {
  beforeAll(async () => { await initOcct(); });

  it('selectEdges returns EdgeSegment[] with full metadata', () => {
    const box = OcctBackend.box(10, 10, 5);
    const segments = selectEdges(box, { atZ: 5 });
    expect(segments).toHaveLength(4);
    expect(segments[0]).toHaveProperty('id');
    expect(segments[0]).toHaveProperty('midpoint');
    expect(segments[0]).toHaveProperty('direction');
    expect(segments[0]).toHaveProperty('length');
    expect(segments[0]).toHaveProperty('curveType');
  });

  it('selectEdge returns single EdgeSegment when query matches one', () => {
    const box = OcctBackend.box(10, 10, 5);
    const seg = selectEdge(box, { atZ: 5, parallel: [1, 0, 0], near: [5, 0, 5] });
    expect(seg).toHaveProperty('id');
    expect(seg.midpoint[2]).toBeCloseTo(5, 1);
  });

  it('selectEdge throws when query matches multiple edges', () => {
    const box = OcctBackend.box(10, 10, 5);
    expect(() => selectEdge(box, { atZ: 5 })).toThrow(/ambiguous|multiple/i);
  });

  it('selectEdge throws when query matches zero edges', () => {
    const box = OcctBackend.box(10, 10, 5);
    expect(() => selectEdge(box, { atZ: 999 })).toThrow(/no edges|zero/i);
  });
});
