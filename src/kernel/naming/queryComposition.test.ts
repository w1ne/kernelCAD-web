// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/naming/queryComposition.test.ts
//
// Q4 — composed-query failure isolation per D0.16 (c).
//
// Strict mode (default): a sub-query that errors aborts the outer composition
// and surfaces a single named wrapper code, query.composition-strict-failure,
// regardless of which underlying diagnostic the sub-query raised. The wrapper
// quotes the inner code so the agent can trace the cause.
//
// Lenient mode (`.asLenient()` annotation): failing sub-queries contribute
// zero entities and the composition continues. The surviving sub-queries are
// unioned / intersected / subtracted as if the failing branch had returned
// the empty set.
//
// The Q3 evaluator already implemented the swallow-on-lenient path on the
// raw inner diagnostics. Q4 formalises the strict path by emitting a
// dedicated wrapper code instead of re-throwing the sub-query's diagnostic.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, OcctBackend } from '../backends/occt/occtBackend';
import { runScript } from '../../modeling/runtime/runScript';
import { RecomputeEngine } from '../../modeling/compute/recomputeEngine';
import { OcctLowerer } from '../../modeling/backends/occt/occtLowerer';
import { q } from './queryConstructors';
import { evaluate } from './queryEvaluator';
import type { QueryScene } from './query';

async function sceneFor(code: string): Promise<QueryScene> {
  const { records } = await runScript({ code, fileName: 'test.kcad.ts' });
  const engine = new RecomputeEngine(new OcctLowerer());
  const r = await engine.run(records);
  const lastRecord = records[records.length - 1];
  const shape = r.shapes.get(lastRecord.id) as OcctBackend;
  return { backend: shape, featureId: lastRecord.id, records };
}

describe('Query composition failure isolation — Q4 (D0.16 (c))', () => {
  beforeAll(async () => { await initOcct(); });

  // Q3 filter-lift note (finding #45): `.and(q.withLabel(...))` lifts the
  // label filter through the intersection's placeholder path, which is
  // silent on unknown labels. The set-algebra failure surface lives on the
  // positional-filter form `q.face(q.withLabel(...))`, which routes through
  // `filterEntityKind → filterWithLabel` and raises `query.unknown-label`
  // when the label isn't present.

  // Box faces seed the lineage's canonicalName (top/bottom/left/right/front/
  // back). User-supplied `faceLabels` are recorded in record metadata, not
  // copied into FaceLineage.labelName, so .withLabel only matches against
  // the canonical names on a bare box. We use 'top' / 'bottom' / 'left' as
  // the "successful" labels and 'nonexistent' as the failing one.

  it('strict mode short-circuits union on first sub-query error with query.composition-strict-failure', async () => {
    const scene = await sceneFor(`return box(10, 10, 10);`);
    const okQ = q.face(q.withLabel('top'));
    const badQ = q.face(q.withLabel('nonexistent'));
    let caught: unknown;
    try { evaluate(q.union(okQ, badQ), scene); }
    catch (e) { caught = e; }
    expect(caught).toBeDefined();
    const err = caught as { code?: string; message?: string };
    expect(err.code).toBe('query.composition-strict-failure');
    // Wrapper quotes the inner code for trace.
    expect(err.message).toMatch(/query\.unknown-label/);
  });

  it('lenient union lets failed sub-queries contribute zero entities; survivors come through', async () => {
    const scene = await sceneFor(`return box(10, 10, 10);`);
    const okQ = q.face(q.withLabel('top'));
    const badQ = q.face(q.withLabel('nonexistent'));
    const composed = q.union(okQ, badQ).asLenient();
    const r = evaluate(composed, scene);
    expect(r.length).toBe(1);
    expect(r[0].ref).toContain('/face/top');
  });

  it('lenient annotation propagates through nested composition', async () => {
    const scene = await sceneFor(`return box(10, 10, 10);`);
    const inner = q.union(
      q.face(q.withLabel('top')),
      q.face(q.withLabel('side-missing')),
    );
    const outer = q.union(inner, q.face(q.withLabel('also-missing'))).asLenient();
    const r = evaluate(outer, scene);
    expect(r.length).toBeGreaterThanOrEqual(1);
  });

  it('strict mode on intersection: first failing sub-query short-circuits with the wrapper code', async () => {
    const scene = await sceneFor(`return box(10, 10, 10);`);
    const okQ = q.face(q.withLabel('top'));
    const badQ = q.face(q.withLabel('nonexistent'));
    let caught: unknown;
    try { evaluate(q.intersection(okQ, badQ), scene); }
    catch (e) { caught = e; }
    expect(caught).toBeDefined();
    expect((caught as { code?: string }).code).toBe('query.composition-strict-failure');
  });

  it('strict mode on subtraction: failing b-side short-circuits with the wrapper code', async () => {
    const scene = await sceneFor(`return box(10, 10, 10);`);
    const aQ = q.face();
    const badQ = q.face(q.withLabel('nonexistent'));
    let caught: unknown;
    try { evaluate(q.subtraction(aQ, badQ), scene); }
    catch (e) { caught = e; }
    expect(caught).toBeDefined();
    expect((caught as { code?: string }).code).toBe('query.composition-strict-failure');
  });

  it('lenient subtraction with a failing b-side returns the a-side unchanged', async () => {
    const scene = await sceneFor(`return box(10, 10, 10);`);
    const aQ = q.face();
    const badQ = q.face(q.withLabel('nonexistent'));
    const composed = q.subtraction(aQ, badQ).asLenient();
    const r = evaluate(composed, scene);
    // a-side is every face (6 on a box); failing b-side contributes [] so
    // subtraction degenerates to the identity on a.
    expect(r.length).toBe(6);
  });
});
