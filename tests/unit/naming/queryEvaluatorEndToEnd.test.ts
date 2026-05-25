// tests/unit/naming/queryEvaluatorEndToEnd.test.ts
//
// Q3 end-to-end smoke (per [[feedback_actually_use_what_you_ship]]). Runs a
// real .kcad.ts-style script through the full lowering pipeline (runScript →
// RecomputeEngine → OcctLowerer) and exercises the Query evaluator against
// the populated OcctBackend.historyMap. The assertions name the expected
// entities (canonical face name, handle, ref shape) — JSON ok:true alone
// wouldn't prove the evaluator returns the right entities.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../../src/modeling/runtime/runScript';
import { RecomputeEngine } from '../../../src/modeling/compute/recomputeEngine';
import { OcctLowerer } from '../../../src/modeling/backends/occt/occtLowerer';
import { q } from '../../../src/kernel/naming/queryConstructors';
import { evaluate, evaluateUnique } from '../../../src/kernel/naming/queryEvaluator';
import type { QueryScene } from '../../../src/kernel/naming/query';

async function buildScene(code: string): Promise<QueryScene> {
  const { records } = await runScript({ code, fileName: 'test.kcad.ts' });
  const engine = new RecomputeEngine(new OcctLowerer());
  const r = await engine.run(records);
  const lastRecord = records[records.length - 1];
  const shape = r.shapes.get(lastRecord.id) as OcctBackend;
  return { backend: shape, featureId: lastRecord.id, records };
}

describe('Query evaluator end-to-end — Q3 smoke (per actually-use-what-you-ship)', () => {
  beforeAll(async () => { await initOcct(); });

  it('kc.q.face() against a real lowered box returns 6 face entities', async () => {
    const scene = await buildScene(`return box(10, 10, 10);`);
    const faces = evaluate(q.face(), scene);
    expect(faces.length).toBe(6);
    // Every entity has the canonical shape: kind='face', non-empty ref + handle.
    for (const f of faces) {
      expect(f.kind).toBe('face');
      expect(f.ref).toMatch(/^@kc\[/);
      expect(typeof f.handle).toBe('string');
      expect(f.handle.length).toBeGreaterThan(0);
    }
  });

  it('kc.q.fromString("@kc[<boxId>/face/top]") resolves to exactly one face on a real box', async () => {
    const { records } = await runScript({ code: `return box(10, 10, 10);`, fileName: 'test.kcad.ts' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const r = await engine.run(records);
    const lastRecord = records[records.length - 1];
    const shape = r.shapes.get(lastRecord.id) as OcctBackend;
    const scene: QueryScene = { backend: shape, featureId: lastRecord.id, records };
    // The box's lineage stores canonicalName='top'; the buildFaceEntity helper
    // uses lineage.featureName ?? rootFeatureId as the owner segment in the
    // formatted ref. Boxes seed only the canonicalName + rootFeatureId
    // (featureName is set when an explicit kc.id() pins the op). The
    // owner segment in the formatted ref equals the rootFeatureId here.
    const top = evaluateUnique(q.fromString(`@kc[${lastRecord.id}/face/top]`), scene);
    expect(top.kind).toBe('face');
    expect(top.ref).toContain('/face/top');
  });

  it('kc.q.face(kc.q.createdBy(<boxId>)) resolves every face the box created', async () => {
    const { records } = await runScript({ code: `return box(10, 10, 10);`, fileName: 'test.kcad.ts' });
    const engine = new RecomputeEngine(new OcctLowerer());
    const r = await engine.run(records);
    const lastRecord = records[records.length - 1];
    const shape = r.shapes.get(lastRecord.id) as OcctBackend;
    const scene: QueryScene = { backend: shape, featureId: lastRecord.id, records };
    const boxFaces = evaluate(q.face(q.createdBy(lastRecord.id)), scene);
    expect(boxFaces.length).toBe(6);
  });

  it('kc.q.edge() on a real box surfaces the Q3 punt code with a clear message', async () => {
    const scene = await buildScene(`return box(10, 10, 10);`);
    let caught: unknown;
    try { evaluate(q.edge(), scene); }
    catch (e) { caught = e; }
    expect(caught).toBeDefined();
    const err = caught as { code?: string; message?: string };
    expect(err.code).toBe('query.unsupported-entity-type');
    expect(err.message).toMatch(/edge/i);
  });

  it('canonical-ordering is stable: same scene, two evaluations → identical handle sequence', async () => {
    const scene = await buildScene(`return box(7, 8, 9);`);
    const r1 = evaluate(q.face(), scene);
    const r2 = evaluate(q.face(), scene);
    expect(r1.map((e) => e.handle)).toEqual(r2.map((e) => e.handle));
    expect(r1.map((e) => e.ref)).toEqual(r2.map((e) => e.ref));
  });

  // Q4 — composed-query failure isolation on a real lowered scene. The
  // synthetic-scene tests in queryComposition.test.ts already cover the
  // wrap-and-rethrow logic; this smoke confirms the same code path lights
  // up under the full lowering pipeline. Per [[feedback_actually_use_what_you_ship]].
  it('q.union with one failing sub-query surfaces query.composition-strict-failure on a real lowered box', async () => {
    const scene = await buildScene(`return box(10, 10, 10);`);
    const okQ = q.face(q.withLabel('top'));
    const badQ = q.face(q.withLabel('nonexistent'));
    let caught: unknown;
    try { evaluate(q.union(okQ, badQ), scene); }
    catch (e) { caught = e; }
    expect(caught).toBeDefined();
    expect((caught as { code?: string }).code).toBe('query.composition-strict-failure');
    expect((caught as { message?: string }).message).toMatch(/query\.unknown-label/);
  });

  it('q.union(...).asLenient() on a real box returns the surviving sub-queries entities', async () => {
    const scene = await buildScene(`return box(10, 10, 10);`);
    const okQ = q.face(q.withLabel('top'));
    const badQ = q.face(q.withLabel('nonexistent'));
    const composed = q.union(okQ, badQ).asLenient();
    const r = evaluate(composed, scene);
    expect(r.length).toBe(1);
    expect(r[0].ref).toContain('/face/top');
  });
});
