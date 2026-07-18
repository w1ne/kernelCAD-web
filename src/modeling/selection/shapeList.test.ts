// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/selection/shapeList.test.ts
//
// Selector-algebra unit tests. Pure TS over descriptor fixtures — no OCCT, no
// lowering — because that is exactly the boundary the module lives on.

import { describe, it, expect } from 'vitest';
import { ShapeList, ShapeGroups, select, quantizeMetric, metricOf, positionOf } from './shapeList';
import type { EdgeSegment } from '../../shared/intent/queryTypes';
import { KernelError } from '../../shared/intent/kernelError';
import type { Vec3 } from '../../shared/intent/types';
import { q } from '../../kernel/naming/queryConstructors';
import type { QueryScene } from '../../kernel/naming/query';
import type { HistoryMap, FaceLineage } from '../../kernel/naming/evolutionRecord';
// Importing the evaluator installs its delegates onto the Query chainables —
// `.evaluate()` reads that table at call time (see query.ts cycle-breaker).
import '../../kernel/naming/queryEvaluator';

// ---------------------------------------------------------------------------
// Fixtures. Three descriptor shapes, matching the three real result sources.
// ---------------------------------------------------------------------------

function edge(id: string, midpoint: Vec3, over: Partial<EdgeSegment> = {}): EdgeSegment {
  return {
    id,
    midpoint,
    direction: [1, 0, 0],
    length: 10,
    curveType: 'LINE',
    convex: true,
    dihedralAngleDeg: 90,
    normalA: [0, 0, 1],
    normalB: [1, 0, 0],
    boundary: false,
    ...over,
  };
}

/** Mirrors the `FaceSummary` shape produced by the `list_faces` MCP tool. */
interface FaceLike {
  ref: string;
  centroid: Vec3;
  normal: Vec3;
  surfaceType: string;
  area: number;
}

function face(ref: string, centroid: Vec3, area: number, over: Partial<FaceLike> = {}): FaceLike {
  return { ref, centroid, normal: [0, 0, 1], surfaceType: 'PLANE', area, ...over };
}

/** Mirrors `ResolvedEntity` from the naming-DSL evaluator. */
interface EntityLike {
  kind: string;
  ref: string;
  handle: string;
  snapshot: { centroid: Vec3; normal: Vec3; area: number };
}

function entity(name: string, centroid: Vec3, area: number): EntityLike {
  return {
    kind: 'face',
    ref: `@kc[body/face/${name}]`,
    handle: `F${name}`,
    snapshot: { centroid, normal: [0, 0, 1], area },
  };
}

// ---------------------------------------------------------------------------

describe('select / ShapeList construction', () => {
  it('is a real Array, so existing EdgeSegment[] consumers keep working', () => {
    const list = select([edge('e0', [0, 0, 0]), edge('e1', [0, 0, 5])]);
    expect(Array.isArray(list)).toBe(true);
    expect(list).toBeInstanceOf(ShapeList);
    expect(list.length).toBe(2);
    expect([...list].map((e) => e.id)).toEqual(['e0', 'e1']);
    // Assignable to EdgeSegment[] — the whole point of extending Array.
    const asPlain: EdgeSegment[] = list;
    expect(asPlain[1].id).toBe('e1');
  });

  it('inherited array methods still return a ShapeList (species allocation path)', () => {
    const list = select([edge('e0', [0, 0, 0]), edge('e1', [0, 0, 5])]);
    const mapped = list.map((e) => e.id);
    const filtered = list.filter((e) => e.id === 'e1');
    expect(mapped).toBeInstanceOf(ShapeList);
    expect([...mapped]).toEqual(['e0', 'e1']);
    expect(filtered).toBeInstanceOf(ShapeList);
    expect(filtered.length).toBe(1);
  });

  it('rejects a non-iterable input with a named kernel error', () => {
    expect(() => select(42 as unknown as Iterable<unknown>)).toThrow(KernelError);
    expect(() => select(42 as unknown as Iterable<unknown>)).toThrow(/expected an iterable/);
  });
});

describe('empty and single-element lists', () => {
  const empty = select<EdgeSegment>([]);

  it('every algebra method is total on an empty list', () => {
    expect(empty.length).toBe(0);
    expect(empty.first).toBeUndefined();
    expect(empty.last).toBeUndefined();
    expect(empty.at(0)).toBeUndefined();
    expect(empty.take(3).length).toBe(0);
    expect(empty.sortBy('Z').length).toBe(0);
    expect(empty.sortByDistance([0, 0, 0]).length).toBe(0);
    expect(empty.filterBy('CIRCLE').length).toBe(0);
    expect(empty.filterBy(() => true).length).toBe(0);
    expect(empty.filterByPosition('Z', 0, 10).length).toBe(0);
  });

  it('groupBy on an empty list yields zero groups, not one empty group', () => {
    const groups = empty.groupBy('Z');
    expect(groups).toBeInstanceOf(ShapeGroups);
    expect(groups.length).toBe(0);
    expect(groups.keys).toEqual([]);
    expect(groups.at(0)).toBeUndefined();
    expect(groups.byKey(0)).toBeUndefined();
    expect([...groups]).toEqual([]);
  });

  it('a single-element list is its own first, last, and only group', () => {
    const one = select([edge('e0', [1, 2, 3])]);
    expect(one.first?.id).toBe('e0');
    expect(one.last?.id).toBe('e0');
    expect(one.sortBy('Z').first?.id).toBe('e0');
    expect(one.take(99).length).toBe(1);

    const groups = one.groupBy('Z');
    expect(groups.length).toBe(1);
    expect(groups.keys).toEqual([3]);
    expect(groups.at(0)?.length).toBe(1);
    expect(groups.byKey(3)?.first?.id).toBe('e0');
  });
});

describe('sortBy', () => {
  it('orders by principal axis, ascending by default', () => {
    const list = select([
      edge('mid', [0, 0, 5]),
      edge('top', [0, 0, 10]),
      edge('bottom', [0, 0, 0]),
    ]);
    expect([...list.sortBy('Z')].map((e) => e.id)).toEqual(['bottom', 'mid', 'top']);
    expect([...list.sortBy('Z', { descending: true })].map((e) => e.id)).toEqual(['top', 'mid', 'bottom']);
  });

  it('orders by an arbitrary direction vector (normalized internally)', () => {
    const list = select([
      edge('a', [3, 0, 0]),
      edge('b', [0, 3, 0]),
      edge('c', [-3, 0, 0]),
    ]);
    // Projection onto the +XY diagonal: c = -2.12, b = +2.12, a = +2.12 — a and
    // b tie, so incoming order breaks the tie.
    expect([...list.sortBy([1, 1, 0])].map((e) => e.id)).toEqual(['c', 'a', 'b']);
  });

  it('orders by intrinsic scalars: length, area, radius', () => {
    const byLength = select([edge('l3', [0, 0, 0], { length: 3 }), edge('l1', [0, 0, 0], { length: 1 })]);
    expect([...byLength.sortBy('length')].map((e) => e.id)).toEqual(['l1', 'l3']);

    const byArea = select([face('big', [0, 0, 0], 100), face('small', [0, 0, 0], 4)]);
    expect([...byArea.sortBy('area')].map((f) => f.ref)).toEqual(['small', 'big']);

    const byRadius = select([
      edge('r5', [0, 0, 0], { curveType: 'CIRCLE', radius: 5 }),
      edge('r2', [0, 0, 0], { curveType: 'CIRCLE', radius: 2 }),
    ]);
    expect([...byRadius.sortBy('radius', { descending: true })].map((e) => e.id)).toEqual(['r5', 'r2']);
  });

  it('reads position off a ResolvedEntity snapshot as readily as off an edge midpoint', () => {
    const list = select([entity('top', [0, 0, 10], 1), entity('bottom', [0, 0, 0], 1)]);
    expect([...list.sortBy('Z')].map((e) => e.ref)).toEqual([
      '@kc[body/face/bottom]',
      '@kc[body/face/top]',
    ]);
  });

  it('is IMMUTABLE — the source list keeps its original order', () => {
    const list = select([edge('b', [0, 0, 9]), edge('a', [0, 0, 1])]);
    const sorted = list.sortBy('Z');
    expect([...list].map((e) => e.id)).toEqual(['b', 'a']);
    expect([...sorted].map((e) => e.id)).toEqual(['a', 'b']);
    expect(sorted).not.toBe(list);
  });

  it('is stable under float noise: sub-tolerance jitter cannot flip the order', () => {
    // Three edges nominally at the same Z, jittered by ~1e-12 in the direction
    // that would REVERSE a naive numeric sort. Quantization collapses them to
    // one key, and the index tiebreak preserves the incoming order.
    const noisy = select([
      edge('first', [0, 0, 5 + 3e-12]),
      edge('second', [0, 0, 5 - 1e-12]),
      edge('third', [0, 0, 5 + 1e-12]),
    ]);
    expect([...noisy.sortBy('Z')].map((e) => e.id)).toEqual(['first', 'second', 'third']);
    // Descending must not reverse a tie group either — the tiebreak is the
    // incoming position, not the comparison direction.
    expect([...noisy.sortBy('Z', { descending: true })].map((e) => e.id)).toEqual([
      'first',
      'second',
      'third',
    ]);
  });

  it('an explicit tolerance widens what counts as "the same position"', () => {
    const list = select([
      edge('a', [0, 0, 5.004]),
      edge('b', [0, 0, 4.998]),
      edge('c', [0, 0, 9.0]),
    ]);
    // Untoleranced, b sorts before a. At 0.01 mm buckets they tie and keep
    // incoming order.
    expect([...list.sortBy('Z')].map((e) => e.id)).toEqual(['b', 'a', 'c']);
    expect([...list.sortBy('Z', { tolerance: 0.01 })].map((e) => e.id)).toEqual(['a', 'b', 'c']);
  });

  it('throws a named error when the descriptor cannot supply the metric', () => {
    const list = select([edge('e0', [0, 0, 0])]); // LINE — no radius
    expect(() => list.sortBy('radius')).toThrow(KernelError);
    expect(() => list.sortBy('radius')).toThrow(/carries no radius/);
    expect(() => select([{ id: 'x' }]).sortBy('Z')).toThrow(/carries no position/);
  });

  it('rejects a degenerate or malformed axis', () => {
    const list = select([edge('e0', [0, 0, 0])]);
    expect(() => list.sortBy([0, 0, 0])).toThrow(/zero length/);
    expect(() => list.sortBy('W' as unknown as 'X')).toThrow(/axis must be/);
  });
});

describe('sortByDistance', () => {
  it('orders nearest-first from an arbitrary point', () => {
    const list = select([
      edge('far', [0, 0, 100]),
      edge('near', [0, 0, 1]),
      edge('mid', [0, 0, 20]),
    ]);
    expect([...list.sortByDistance([0, 0, 0])].map((e) => e.id)).toEqual(['near', 'mid', 'far']);
    expect(list.sortByDistance([0, 0, 0], { descending: true }).first?.id).toBe('far');
  });

  it('breaks equidistant ties by incoming order, not by coordinate', () => {
    const list = select([
      edge('plusX', [5, 0, 0]),
      edge('minusX', [-5, 0, 0]),
      edge('plusY', [0, 5, 0]),
    ]);
    expect([...list.sortByDistance([0, 0, 0])].map((e) => e.id)).toEqual(['plusX', 'minusX', 'plusY']);
  });

  it('rejects a malformed point', () => {
    const list = select([edge('e0', [0, 0, 0])]);
    expect(() => list.sortByDistance([0, 0] as unknown as Vec3)).toThrow(/point must be a finite/);
    expect(() => list.sortByDistance([0, NaN, 0])).toThrow(/point must be a finite/);
  });
});

describe('groupBy', () => {
  const levels = select([
    edge('a0', [0, 0, 0]),
    edge('b10', [0, 0, 10]),
    edge('a0b', [1, 0, 0]),
    edge('c5', [0, 0, 5]),
    edge('b10b', [1, 0, 10]),
  ]);

  it('buckets by criterion, orders groups by key, preserves incoming order inside', () => {
    const g = levels.groupBy('Z');
    expect(g.length).toBe(3);
    expect(g.keys).toEqual([0, 5, 10]);
    expect([...g.at(0)!].map((e) => e.id)).toEqual(['a0', 'a0b']);
    expect([...g.at(2)!].map((e) => e.id)).toEqual(['b10', 'b10b']);
  });

  it('is indexable by group position AND by key', () => {
    const g = levels.groupBy('Z');
    expect(g.at(0)).toBe(g.byKey(0));
    expect(g.at(-1)).toBe(g.byKey(10));
    expect(g.at(99)).toBeUndefined();
    expect(g.byKey(7)).toBeUndefined();
  });

  it('descending flips group order without disturbing within-group order', () => {
    const g = levels.groupBy('Z', { descending: true });
    expect(g.keys).toEqual([10, 5, 0]);
    expect([...g.at(0)!].map((e) => e.id)).toEqual(['b10', 'b10b']);
  });

  it('folds float noise into ONE group and rounds the key to the nominal value', () => {
    const noisy = select([
      edge('a', [0, 0, 5.000000000002]),
      edge('b', [0, 0, 4.999999999998]),
      edge('c', [0, 0, 5]),
    ]);
    const g = noisy.groupBy('Z');
    expect(g.length).toBe(1);
    expect(g.keys).toEqual([5]);
    expect(g.at(0)!.length).toBe(3);
    // The nominal value finds the bucket — an agent never has to know the noise.
    expect(g.byKey(5)?.length).toBe(3);
  });

  it('an explicit tolerance folds genuinely-distinct-but-coincident geometry', () => {
    const list = select([
      edge('a', [0, 0, 5.004]),
      edge('b', [0, 0, 4.998]),
      edge('c', [0, 0, 9.0]),
    ]);
    expect(list.groupBy('Z').length).toBe(3); // 1e-6 default keeps them apart
    const coarse = list.groupBy('Z', { tolerance: 0.01 });
    expect(coarse.length).toBe(2);
    expect(coarse.keys).toEqual([5, 9]);
    // byKey must quantize the REQUEST with the same tolerance, or lookup by the
    // nominal value would miss the bucket it just built.
    expect(coarse.byKey(5)?.length).toBe(2);
    expect(coarse.byKey(4.999)?.length).toBe(2);
  });

  it('never emits a -0 key (it would compare unequal to the 0 an agent writes)', () => {
    const g = select([edge('a', [0, 0, -1e-15])]).groupBy('Z');
    expect(Object.is(g.keys[0], -0)).toBe(false);
    expect(g.byKey(0)?.length).toBe(1);
  });

  it('groups by radius — the "one bucket per hole size" case', () => {
    const bores = select([
      edge('h1', [0, 0, 0], { curveType: 'CIRCLE', radius: 1.5 }),
      edge('h2', [5, 0, 0], { curveType: 'CIRCLE', radius: 3.0 }),
      edge('h3', [10, 0, 0], { curveType: 'CIRCLE', radius: 1.5000000001 }),
    ]);
    const g = bores.groupBy('radius');
    expect(g.keys).toEqual([1.5, 3]);
    expect(g.byKey(1.5)?.length).toBe(2);
  });

  it('flat() reassembles every entity in group order', () => {
    const g = levels.groupBy('Z');
    expect([...g.flat()].map((e) => e.id)).toEqual(['a0', 'a0b', 'c5', 'b10', 'b10b']);
    expect(g.flat()).toBeInstanceOf(ShapeList);
  });

  it('iterating yields { key, items } records', () => {
    const seen = [...levels.groupBy('Z')].map((grp) => [grp.key, grp.items.length]);
    expect(seen).toEqual([[0, 2], [5, 1], [10, 2]]);
  });

  it('rejects a non-positive tolerance instead of silently dividing by zero', () => {
    expect(() => levels.groupBy('Z', { tolerance: 0 })).toThrow(/tolerance must be a positive/);
    expect(() => levels.groupBy('Z', { tolerance: -1 })).toThrow(/tolerance must be a positive/);
  });
});

describe('filterBy', () => {
  it('filters by predicate', () => {
    const list = select([edge('short', [0, 0, 0], { length: 1 }), edge('long', [0, 0, 0], { length: 50 })]);
    expect([...list.filterBy((e) => e.length > 10)].map((e) => e.id)).toEqual(['long']);
  });

  it('filters by geometry type, case-insensitively, across descriptor shapes', () => {
    const edges = select([
      edge('line', [0, 0, 0], { curveType: 'LINE' }),
      edge('circle', [0, 0, 0], { curveType: 'CIRCLE' }),
    ]);
    expect([...edges.filterBy('CIRCLE')].map((e) => e.id)).toEqual(['circle']);
    expect([...edges.filterBy('circle')].map((e) => e.id)).toEqual(['circle']);

    const faces = select([face('plane', [0, 0, 0], 1), face('cyl', [0, 0, 0], 1, { surfaceType: 'CYLINDRE' })]);
    expect([...faces.filterBy('CYLINDRE')].map((f) => f.ref)).toEqual(['cyl']);
  });

  it('filters by axis alignment — edge tangent parallel to the axis', () => {
    const list = select([
      edge('alongX', [0, 0, 0], { direction: [1, 0, 0] }),
      edge('alongZ', [0, 0, 0], { direction: [0, 0, 1] }),
      edge('antiZ', [0, 0, 0], { direction: [0, 0, -1] }),
    ]);
    // Parallel is orientation-independent: -Z counts as aligned with Z.
    expect([...list.filterBy('Z')].map((e) => e.id)).toEqual(['alongZ', 'antiZ']);
    expect([...list.filterBy([1, 0, 0])].map((e) => e.id)).toEqual(['alongX']);
  });

  it('honors angleTolerance on axis filtering', () => {
    const tilt = Math.sin((8 * Math.PI) / 180);
    const list = select([edge('tilted8deg', [0, 0, 0], { direction: [tilt, 0, Math.cos((8 * Math.PI) / 180)] })]);
    expect(list.filterBy('Z').length).toBe(1); // default 10 deg
    expect(list.filterBy('Z', { angleTolerance: 5 }).length).toBe(0);
  });

  it('falls back to a face normal when there is no direction field', () => {
    const faces = select([
      face('up', [0, 0, 0], 1, { normal: [0, 0, 1] }),
      face('side', [0, 0, 0], 1, { normal: [1, 0, 0] }),
    ]);
    expect([...faces.filterBy('Z')].map((f) => f.ref)).toEqual(['up']);
  });

  it('rejects a malformed spec', () => {
    const list = select([edge('e0', [0, 0, 0])]);
    expect(() => list.filterBy(7 as unknown as string)).toThrow(/expected a predicate/);
  });
});

describe('filterByPosition', () => {
  const list = select([
    edge('low', [0, 0, 0]),
    edge('mid', [0, 0, 5]),
    edge('high', [0, 0, 10]),
  ]);

  it('keeps entities inside the interval, bounds inclusive by default', () => {
    expect([...list.filterByPosition('Z', 0, 5)].map((e) => e.id)).toEqual(['low', 'mid']);
  });

  it('excludes the bounds when inclusive is false', () => {
    expect([...list.filterByPosition('Z', 0, 5, { inclusive: false })].map((e) => e.id)).toEqual([]);
    expect([...list.filterByPosition('Z', -1, 6, { inclusive: false })].map((e) => e.id)).toEqual(['low', 'mid']);
  });

  it('accepts the bounds in either order', () => {
    expect([...list.filterByPosition('Z', 5, 0)].map((e) => e.id)).toEqual(['low', 'mid']);
  });

  it('projects onto an arbitrary direction', () => {
    const diag = select([edge('a', [1, 1, 0]), edge('b', [-1, -1, 0])]);
    expect([...diag.filterByPosition([1, 1, 0], 0, 10)].map((e) => e.id)).toEqual(['a']);
  });

  it('rejects non-finite bounds', () => {
    expect(() => list.filterByPosition('Z', NaN, 5)).toThrow(/must be finite/);
  });
});

describe('terminal accessors', () => {
  const list = select([edge('a', [0, 0, 0]), edge('b', [0, 0, 5]), edge('c', [0, 0, 10])]);

  it('first / last / at / take', () => {
    expect(list.first?.id).toBe('a');
    expect(list.last?.id).toBe('c');
    expect(list.at(1)?.id).toBe('b');
    expect(list.at(-1)?.id).toBe('c');
    expect(list.at(9)).toBeUndefined();
    expect([...list.take(2)].map((e) => e.id)).toEqual(['a', 'b']);
    expect(list.take(0).length).toBe(0);
    expect(list.take(99).length).toBe(3);
  });

  it('take rejects a negative or fractional count', () => {
    expect(() => list.take(-1)).toThrow(/non-negative integer/);
    expect(() => list.take(1.5)).toThrow(/non-negative integer/);
  });
});

describe('composition with existing EdgeQuery / FaceQuery results', () => {
  // The declarative query is the kernel's job; these fixtures stand in for
  // what `selectEdges(shape, { convex: true, atZ: ... })` would hand back. The
  // point under test is that the algebra layers cleanly ON TOP of that result
  // without needing to re-enter OCCT.
  const queryResult = select([
    edge('rim-a', [0, 0, 10], { curveType: 'CIRCLE', radius: 8, convex: true }),
    edge('rim-b', [0, 0, 10], { curveType: 'CIRCLE', radius: 3, convex: true }),
    edge('side', [5, 0, 5], { curveType: 'LINE', direction: [0, 0, 1], convex: true }),
    edge('floor', [0, 0, 0], { curveType: 'CIRCLE', radius: 8, convex: false }),
  ]);

  it('chains filter -> sort -> terminal to answer "the largest top circle"', () => {
    const largestTopCircle = queryResult
      .filterByPosition('Z', 9, 11)
      .filterBy('CIRCLE')
      .sortBy('radius')
      .last;
    expect(largestTopCircle?.id).toBe('rim-a');
  });

  it('chains predicate + group to answer "bores per level, convex only"', () => {
    const g = queryResult
      .filterBy((e) => e.convex === true)
      .filterBy('CIRCLE')
      .groupBy('Z');
    expect(g.keys).toEqual([10]);
    expect(g.byKey(10)?.length).toBe(2);
  });

  it('every intermediate stage is a ShapeList, so the chain never dead-ends', () => {
    const stage = queryResult.filterBy('CIRCLE').sortBy('radius').take(2);
    expect(stage).toBeInstanceOf(ShapeList);
    expect(stage.groupBy('radius')).toBeInstanceOf(ShapeGroups);
  });
});

describe('lineage preservation', () => {
  // The load-bearing guarantee: the algebra reorders references, it never
  // rebuilds descriptors. If it ever started cloning, `@kc[...]` refs and OCCT
  // handles could drift out from under a downstream fillet.
  const entities = [entity('top', [0, 0, 10], 50), entity('bottom', [0, 0, 0], 50), entity('side', [5, 0, 5], 20)];

  it('sortBy returns the SAME object references, not copies', () => {
    const sorted = select(entities).sortBy('Z');
    expect(sorted.first).toBe(entities[1]); // bottom
    expect(sorted.last).toBe(entities[0]); // top
    for (const e of sorted) expect(entities).toContain(e);
  });

  it('@kc[...] refs and OCCT handles survive sort, group, and filter', () => {
    const list = select(entities);
    const refsBefore = entities.map((e) => e.ref).sort();
    const handlesBefore = entities.map((e) => e.handle).sort();

    const roundTripped = list.sortBy('Z', { descending: true }).groupBy('area').flat().filterBy(() => true);

    expect([...roundTripped].map((e) => e.ref).sort()).toEqual(refsBefore);
    expect([...roundTripped].map((e) => e.handle).sort()).toEqual(handlesBefore);
    for (const e of roundTripped) {
      expect(e.ref).toMatch(/^@kc\[body\/face\/.+\]$/);
    }
  });

  it('EdgeSegment ids survive and stay bound to their own geometry', () => {
    const edges = [edge('e7', [0, 0, 9]), edge('e2', [0, 0, 1]), edge('e5', [0, 0, 5])];
    const sorted = select(edges).sortBy('Z');
    expect([...sorted].map((e) => e.id)).toEqual(['e2', 'e5', 'e7']);
    // Ids stayed attached to the right midpoints — not renumbered by position.
    expect(sorted.map((e) => `${e.id}@${e.midpoint[2]}`).join(',')).toBe('e2@1,e5@5,e7@9');
  });

  it('the source array is never mutated by any algebra call', () => {
    const source = [entity('a', [0, 0, 9], 1), entity('b', [0, 0, 1], 2)];
    const snapshot = [...source];
    const list = select(source);
    list.sortBy('Z');
    list.sortByDistance([0, 0, 0]);
    list.groupBy('area');
    list.filterBy(() => false);
    list.filterByPosition('Z', 0, 1);
    expect(source).toEqual(snapshot);
    expect(source[0].ref).toBe('@kc[body/face/a]');
  });
});

describe('exported helpers', () => {
  it('quantizeMetric snaps onto the lattice and kills -0', () => {
    expect(quantizeMetric(5.0000000001)).toBe(5);
    expect(quantizeMetric(5.004, 0.01)).toBe(5);
    expect(quantizeMetric(4.998, 0.01)).toBe(5);
    expect(Object.is(quantizeMetric(-1e-15), 0)).toBe(true);
    expect(() => quantizeMetric(NaN)).toThrow(/non-finite metric/);
  });

  it('metricOf / positionOf resolve fields across all three descriptor shapes', () => {
    expect(positionOf(edge('e', [1, 2, 3]))).toEqual([1, 2, 3]);
    expect(positionOf(face('f', [4, 5, 6], 1))).toEqual([4, 5, 6]);
    expect(positionOf(entity('g', [7, 8, 9], 1))).toEqual([7, 8, 9]);
    expect(metricOf(entity('g', [7, 8, 9], 42), 'area')).toBe(42);
    expect(metricOf(face('f', [4, 5, 6], 11), 'area')).toBe(11);
    expect(metricOf(edge('e', [1, 2, 3], { length: 12 }), 'length')).toBe(12);
    expect(metricOf(edge('e', [1, 2, 3]), 'Y')).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Integration with the naming-DSL evaluator.
//
// The fixtures above stand in for a `ResolvedEntity`; this block uses the REAL
// `q.face(...).evaluate(scene)` path so the "stable naming survives the
// algebra" claim is checked against the actual producer rather than a
// look-alike. A stub HistoryMap is the same surface the evaluator consumes at
// lowering time (see queryEvaluator.test.ts for the rationale).
// ---------------------------------------------------------------------------

describe('naming-DSL integration: @kc[...] refs survive the algebra', () => {
  function sceneWithSnapshottedFaces(): QueryScene {
    const map: HistoryMap = new Map();
    const spec: Array<[string, string, Vec3, number]> = [
      ['h-top', 'top', [0, 0, 10], 100],
      ['h-bottom', 'bottom', [0, 0, 0], 100],
      ['h-front', 'front', [0, -5, 5], 50],
      ['h-back', 'back', [0, 5, 5], 50],
    ];
    for (const [hash, canonicalName, centroid, area] of spec) {
      map.set(hash, {
        rootHash: hash,
        canonicalName,
        rootFeatureId: 'box-1',
        featureId: 'box-1',
        featureName: 'plate',
        featureKind: 'box',
        surfaceType: 'PLANE',
        snapshot: { centroid, normal: [0, 0, 1], area },
      } as FaceLineage);
    }
    return {
      backend: { historyMap: map, kind: undefined } as unknown as QueryScene['backend'],
      featureId: 'box-1',
      records: [{ id: 'box-1' } as never],
    };
  }

  it('sorts real evaluator output by Z and keeps every ref resolvable', () => {
    const resolved = q.face().evaluate(sceneWithSnapshottedFaces());
    expect(resolved.length).toBe(4);

    const sorted = select(resolved).sortBy('Z');
    // front and back share z = 5. They tie, so the evaluator's own canonical
    // (sort-by-ref) order decides — the algebra's stable tiebreak defers to
    // upstream ordering rather than imposing one of its own.
    expect([...sorted].map((e) => e.ref)).toEqual([
      '@kc[plate/face/bottom]',
      '@kc[plate/face/back]',
      '@kc[plate/face/front]',
      '@kc[plate/face/top]',
    ]);
    // Same objects the evaluator produced — no descriptor was rebuilt.
    for (const e of sorted) expect(resolved).toContain(e);
  });

  it('groups real evaluator output by area and preserves handles', () => {
    const resolved = q.face().evaluate(sceneWithSnapshottedFaces());
    const groups = select(resolved).groupBy('area');
    expect(groups.keys).toEqual([50, 100]);
    expect([...groups.byKey(100)!].map((e) => e.handle).sort()).toEqual(['h-bottom', 'h-top']);
    expect([...groups.byKey(50)!].map((e) => e.handle).sort()).toEqual(['h-back', 'h-front']);
  });

  it('the topmost face by algebra is the entity the query DSL resolves independently', () => {
    // Cross-check against a path that never touches the algebra: `closestTo`
    // is resolved inside the evaluator. Both must name the same face.
    const scene = sceneWithSnapshottedFaces();
    const topByAlgebra = select(q.face().evaluate(scene)).sortBy('Z').last;
    const topByQuery = q.face().and(q.closestTo([0, 0, 100])).evaluateUnique(scene);
    expect(topByAlgebra?.ref).toBe('@kc[plate/face/top]');
    expect(topByAlgebra?.ref).toBe(topByQuery.ref);
    expect(topByAlgebra?.handle).toBe(topByQuery.handle);
  });
});
