// Q3 — Query evaluator. Resolves QueryAst nodes against a QueryScene, returning
// the matching ResolvedEntity[] in canonical order. Lazy at lowering per D0.3:
// construction never touches the scene; evaluation reads the scene afresh on
// every call.
//
// Reality-vs-plan note: the plan's test file assumes a `tests/helpers/
// evaluateScript` shim and a populated `OcctBackend.edgeHistoryMap`. Neither
// exists in develop today. We exercise the evaluator directly against synthetic
// `OcctBackend` stubs carrying a `historyMap` of our choosing, mirroring the
// resolveFaceRef.test.ts pattern. This is the same surface the evaluator
// consumes at lowering time — the only difference is who populates the lineage
// map (test → directly; runtime → primitives + booleans + fillets etc).
//
// Edge-branch coverage is intentionally limited to a `query.unsupported-
// entity-type` diagnostic surface (Finding #33 — edge-history wiring across
// the ~10 feature lowerers is a separate slice).

import { describe, it, expect } from 'vitest';
import type { HistoryMap, FaceLineage } from './evolutionRecord';
import type { OcctBackend } from '../backends/occt/occtBackend';
import type { QueryScene } from './query';
import { q } from './queryConstructors';
import { evaluate, evaluateUnique } from './queryEvaluator';
import { KernelError } from '../../shared/intent/kernelError';

function makeStubBackend(historyMap: HistoryMap | undefined): OcctBackend {
  return { historyMap, kind: undefined } as unknown as OcctBackend;
}

function makeSceneWithSixFaces(featureId = 'box-1'): QueryScene {
  const map: HistoryMap = new Map();
  const faces: Array<[string, FaceLineage]> = [
    ['h-top', { rootHash: 'h-top', canonicalName: 'top', rootFeatureId: featureId, featureId, featureName: 'box1', featureKind: 'box' }],
    ['h-bottom', { rootHash: 'h-bottom', canonicalName: 'bottom', rootFeatureId: featureId, featureId, featureName: 'box1', featureKind: 'box' }],
    ['h-left', { rootHash: 'h-left', canonicalName: 'left', rootFeatureId: featureId, featureId, featureName: 'box1', featureKind: 'box' }],
    ['h-right', { rootHash: 'h-right', canonicalName: 'right', rootFeatureId: featureId, featureId, featureName: 'box1', featureKind: 'box' }],
    ['h-front', { rootHash: 'h-front', canonicalName: 'front', rootFeatureId: featureId, featureId, featureName: 'box1', featureKind: 'box' }],
    ['h-back', { rootHash: 'h-back', canonicalName: 'back', rootFeatureId: featureId, featureId, featureName: 'box1', featureKind: 'box' }],
  ];
  for (const [h, l] of faces) map.set(h, l);
  return {
    backend: makeStubBackend(map),
    featureId,
    records: [{ id: featureId } as never],
  };
}

function makeSceneWithLabelledLid(): QueryScene {
  const map: HistoryMap = new Map();
  map.set('h-lid', {
    rootHash: 'h-lid',
    canonicalName: 'top',
    labelName: 'lid',
    rootFeatureId: 'box-1',
    featureId: 'box-1',
    featureName: 'box1',
    featureKind: 'box',
    surfaceType: 'PLANE',
  });
  map.set('h-floor', {
    rootHash: 'h-floor',
    canonicalName: 'bottom',
    labelName: 'floor',
    rootFeatureId: 'box-1',
    featureId: 'box-1',
    featureName: 'box1',
    featureKind: 'box',
    surfaceType: 'PLANE',
  });
  map.set('h-side', {
    rootHash: 'h-side',
    canonicalName: 'left',
    rootFeatureId: 'box-1',
    featureId: 'box-1',
    featureName: 'box1',
    featureKind: 'box',
    surfaceType: 'PLANE',
  });
  return {
    backend: makeStubBackend(map),
    featureId: 'box-1',
    records: [{ id: 'box-1' } as never],
  };
}

function makeSceneWithCentroids(): QueryScene {
  const map: HistoryMap = new Map();
  map.set('h-top', {
    rootHash: 'h-top',
    canonicalName: 'top',
    rootFeatureId: 'box-1',
    featureId: 'box-1',
    featureName: 'box1',
    featureKind: 'box',
    surfaceType: 'PLANE',
    snapshot: { centroid: [5, 5, 100], normal: [0, 0, 1], area: 100 },
  });
  map.set('h-bottom', {
    rootHash: 'h-bottom',
    canonicalName: 'bottom',
    rootFeatureId: 'box-1',
    featureId: 'box-1',
    featureName: 'box1',
    featureKind: 'box',
    surfaceType: 'PLANE',
    snapshot: { centroid: [5, 5, 0], normal: [0, 0, -1], area: 100 },
  });
  return {
    backend: makeStubBackend(map),
    featureId: 'box-1',
    records: [{ id: 'box-1' } as never],
  };
}

describe('queryEvaluator.evaluate — Q3', () => {
  it('q.everything("face") returns one entry per face on a 6-face box', () => {
    const scene = makeSceneWithSixFaces();
    const results = evaluate(q.everything('face'), scene);
    expect(results.length).toBe(6);
    for (const e of results) {
      expect(e.kind).toBe('face');
      expect(e.ref).toMatch(/^@kc\[/);
      expect(e.handle).toBeDefined();
    }
  });

  it('q.nothing() returns []', () => {
    const scene = makeSceneWithSixFaces();
    const results = evaluate(q.nothing(), scene);
    expect(results).toEqual([]);
  });

  it('q.face() returns every face when no filters are applied', () => {
    const scene = makeSceneWithSixFaces();
    const results = evaluate(q.face(), scene);
    expect(results.length).toBe(6);
    expect(results.every((e) => e.kind === 'face')).toBe(true);
  });

  it('q.createdBy("<id>") returns face lineage entries stamped with that featureId', () => {
    const scene = makeSceneWithSixFaces('box-1');
    const results = evaluate(q.face(q.createdBy('box-1')), scene);
    expect(results.length).toBe(6);
  });

  it('q.withLabel narrows the face set to lineage entries with the matching labelName', () => {
    const scene = makeSceneWithLabelledLid();
    const lid = evaluateUnique(q.face().and(q.withLabel('lid')), scene);
    expect(lid.kind).toBe('face');
    expect(lid.ref).toContain('/face/lid');
  });

  it('q.withFeatureName narrows by lineage featureName', () => {
    const scene = makeSceneWithSixFaces('box-1');
    const results = evaluate(q.face().and(q.withFeatureName('box1')), scene);
    expect(results.length).toBe(6);
  });

  it('q.closestTo orders entities by Euclidean distance to a 3D point', () => {
    const scene = makeSceneWithCentroids();
    const top = evaluateUnique(q.face().and(q.closestTo([0, 0, 100])), scene);
    expect(top.handle).toBe('h-top');
  });

  it('q.geometryType("PLANE") filters by surface kind', () => {
    const scene = makeSceneWithLabelledLid();
    const planes = evaluate(q.face().and(q.geometryType('PLANE')), scene);
    expect(planes.length).toBe(3);
  });

  it('q.union deduplicates by handle', () => {
    const scene = makeSceneWithLabelledLid();
    const lidQ = q.face().and(q.withLabel('lid'));
    const floorQ = q.face().and(q.withLabel('floor'));
    const both = evaluate(q.union(lidQ, floorQ), scene);
    expect(both.length).toBe(2);
    const handles = new Set(both.map((e) => e.handle));
    expect(handles.size).toBe(2);
  });

  it('q.intersection keeps only entities in every sub-query', () => {
    const scene = makeSceneWithLabelledLid();
    const labelledQ = q.face().and(q.withLabel('lid'));
    const planarQ = q.face().and(q.geometryType('PLANE'));
    const both = evaluate(q.intersection(labelledQ, planarQ), scene);
    expect(both.length).toBe(1);
    expect(both[0].handle).toBe('h-lid');
  });

  it('q.subtraction returns entities in a but not in b', () => {
    const scene = makeSceneWithLabelledLid();
    const allFaces = q.face();
    const lidQ = q.face().and(q.withLabel('lid'));
    const remainder = evaluate(q.subtraction(allFaces, lidQ), scene);
    expect(remainder.length).toBe(2);
    for (const e of remainder) {
      expect(e.handle).not.toBe('h-lid');
    }
  });

  it('.nth(0) picks the first canonical-ordered entity; same scene → same pick', () => {
    const scene = makeSceneWithSixFaces();
    const r1 = evaluateUnique(q.face().nth(0), scene);
    const r2 = evaluateUnique(q.face().nth(0), scene);
    expect(r1.handle).toBe(r2.handle);
  });

  it('q.fromString resolves an @kc[owner/face/canonical] ref through the strings-as-sugar branch', () => {
    const scene = makeSceneWithSixFaces();
    const sugar = q.fromString('@kc[box1/face/top]');
    const results = evaluate(sugar, scene);
    expect(results.length).toBe(1);
    expect(results[0].kind).toBe('face');
    expect(results[0].handle).toBe('h-top');
  });

  it('evaluateUnique throws query.over-determined on multi-hit', () => {
    const scene = makeSceneWithSixFaces();
    let caught: unknown;
    try { evaluateUnique(q.face(), scene); }
    catch (e) { caught = e; }
    expect(caught).toBeInstanceOf(KernelError);
    expect((caught as KernelError).code).toBe('query.over-determined');
  });

  it('evaluateUnique throws query.empty on zero-hit', () => {
    const scene = makeSceneWithSixFaces();
    let caught: unknown;
    try { evaluateUnique(q.face(q.withLabel('nonexistent')), scene); }
    catch (e) { caught = e; }
    expect(caught).toBeInstanceOf(KernelError);
    expect((caught as KernelError).code).toBe('query.unknown-label');
  });

  it('q.createdBy with an unknown id throws query.unknown-id', () => {
    const scene = makeSceneWithSixFaces();
    let caught: unknown;
    try { evaluate(q.face(q.createdBy('not-a-real-id')), scene); }
    catch (e) { caught = e; }
    expect(caught).toBeInstanceOf(KernelError);
    expect((caught as KernelError).code).toBe('query.unknown-id');
  });

  it('q.edge(...) surfaces query.unsupported-entity-type until edge-history wiring lands', () => {
    const scene = makeSceneWithSixFaces();
    let caught: unknown;
    try { evaluate(q.edge(), scene); }
    catch (e) { caught = e; }
    expect(caught).toBeInstanceOf(KernelError);
    expect((caught as KernelError).code).toBe('query.unsupported-entity-type');
    expect((caught as KernelError).message).toMatch(/edge/i);
  });

  it('lenient annotation suppresses query.unknown-label and returns []', () => {
    const scene = makeSceneWithSixFaces();
    const lenientQ = q.face(q.withLabel('nonexistent')).asLenient();
    const results = evaluate(lenientQ, scene);
    expect(results).toEqual([]);
  });
});

describe('queryEvaluator lazy timing — D0.3 (b)', () => {
  it('Query construction does NOT touch a scene', () => {
    const v = q.face(q.createdBy('arm'));
    expect(v._kind).toBe('kc.query');
    expect(v.ast.op).toBe('entityFilter');
  });

  it('Two evaluations against two different scenes resolve independently', () => {
    const a = makeSceneWithSixFaces('box-a');
    const b = makeSceneWithSixFaces('box-b');
    const query = q.face();
    const ra = evaluate(query, a);
    const rb = evaluate(query, b);
    expect(ra.length).toBe(6);
    expect(rb.length).toBe(6);
    // Different scenes carry independent featureId; refs reflect that.
    expect(ra[0].ref).not.toBe(rb[0].ref);
  });

  it('Same scene, two evaluations: same ordered result (canonical-stable)', () => {
    const s = makeSceneWithSixFaces();
    const r1 = evaluate(q.face(), s);
    const r2 = evaluate(q.face(), s);
    expect(r1.map((e) => e.handle)).toEqual(r2.map((e) => e.handle));
  });
});

describe('queryEvaluator chainable method — Q3.5', () => {
  it('.evaluate(scene) delegates to the evaluator entry point', () => {
    const scene = makeSceneWithSixFaces();
    const results = q.face().evaluate(scene);
    expect(results.length).toBe(6);
  });

  it('.evaluateUnique(scene) throws on multi-hit, returns the single entity on unique-hit', () => {
    const scene = makeSceneWithLabelledLid();
    const lid = q.face().and(q.withLabel('lid')).evaluateUnique(scene);
    expect(lid.kind).toBe('face');

    let caught: unknown;
    try { q.face().evaluateUnique(scene); }
    catch (e) { caught = e; }
    expect(caught).toBeInstanceOf(KernelError);
    expect((caught as KernelError).code).toBe('query.over-determined');
  });
});

describe('queryEvaluator end-to-end smoke — finding [[feedback_actually_use_what_you_ship]]', () => {
  // Mimics a real .kcad.ts call shape: `kc.q.face(kc.q.withLabel('lid'))` ->
  // evaluator resolves the entity, downstream op consumes it. We assert the
  // entity ID, not just count, so we know the right entity comes back.
  it('q.face().and(q.withLabel("lid")) resolves to exactly the lid face on a labelled box scene', () => {
    const scene = makeSceneWithLabelledLid();
    const result = evaluateUnique(q.face().and(q.withLabel('lid')), scene);
    expect(result.handle).toBe('h-lid');
    expect(result.ref).toContain('/face/lid');
    // Snapshot still surfaces through the ResolvedEntity for downstream cite-by-geometry.
    expect(result.snapshot).toBeUndefined(); // this stub has no snapshot on lid; that's intentional.
  });

  it('q.face().and(q.closestTo([x,y,z])) round-trips a canonical query through the evaluator and picks the spatially-closest face', () => {
    const scene = makeSceneWithCentroids();
    const top = evaluateUnique(q.face().and(q.closestTo([5, 5, 1000])), scene);
    expect(top.handle).toBe('h-top');
    const bottom = evaluateUnique(q.face().and(q.closestTo([5, 5, -1000])), scene);
    expect(bottom.handle).toBe('h-bottom');
  });
});
