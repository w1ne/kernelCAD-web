// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Filters written inside `q.edge(...)` select edges. A bare `withLabel`,
// `withFeatureName` or `createdBy` filter defaulted to every face, and the
// edge-kind narrowing then dropped all of them, so
// `box(60, 60, 6).chamfer(0.5, q.edge(q.withLabel('top-perimeter')))`
// had nothing to chamfer. The working spelling was
// `q.edge(q.createdBy(id)).and(q.withLabel(...))`.

import { describe, it, expect, beforeAll } from 'vitest';
import { getOC } from 'replicad';
import { initOcct, type OcctBackend } from '../../src/kernel/backends/occt/occtBackend';
import { isValidShape } from '../../src/kernel/backends/occt/booleanRecovery';
import { runScript } from '../../src/modeling/runtime/runScript';
import { RecomputeEngine } from '../../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../src/modeling/backends/occt/occtLowerer';
import { evaluate } from '../../src/kernel/naming/queryEvaluator';
import { q } from '../../src/kernel/naming/queryConstructors';
import type { CompilerDiagnostic } from '../../src/shared/diagnostics/diagnostic';

async function lower(code: string): Promise<{ solid?: OcctBackend; errors: CompilerDiagnostic[]; rootId: string }> {
  const run = await runScript({ code, fileName: 'test.kcad.ts' });
  const engine = new RecomputeEngine(createOcctLowerer(run.session));
  const r = await engine.run(run.records, { paramTable: run.paramTable });
  const errors = (r.diagnostics as CompilerDiagnostic[]).filter((d) => d.severity === 'error');
  const solid = r.shapes.get(run.records[run.records.length - 1].id) as OcctBackend | undefined;
  return { solid, errors, rootId: run.records[0].id };
}

const valid = (s: OcctBackend) => isValidShape(getOC(), s.getReplicadShape().wrapped);

const A = 60;
const T = 6;
const C = 0.5;
const STOCK = `const stock = box(${A}, ${A}, ${T});`;
// 45° chamfers of leg c on the four edges of an a × a face, vertical corners
// sharp: four prisms c²/2 × a, less the four mitre overlaps of c³/3 each.
const faceChamfer = (a: number, c: number) => 4 * (c * c / 2) * a - 4 * (c * c * c) / 3;

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('filters inside q.edge(...) select edges', () => {
  it('q.edge(q.withLabel(x)) returns the labelled edges', async () => {
    const { solid, errors } = await lower(`${STOCK} return stock;`);
    expect(errors).toEqual([]);
    const scene = { backend: solid!, featureId: 'stock' };
    const hits = evaluate(q.edge(q.withLabel('top-perimeter')), scene);
    expect(new Set(hits.map((h) => h.handle)).size).toBe(4);
    expect(hits.every((h) => h.kind === 'edge')).toBe(true);
    expect(evaluate(q.edge(q.withLabel('corner')), scene).length).toBeGreaterThanOrEqual(4);
  });

  it('chamfers the top perimeter through a bare label filter', async () => {
    const { solid, errors } = await lower(
      `${STOCK} return stock.chamfer(${C}, q.edge(q.withLabel('top-perimeter')));`,
    );
    expect(errors).toEqual([]);
    expect(valid(solid!)).toBe(true);
    expect(solid!.volume()).toBeCloseTo(A * A * T - faceChamfer(A, C), 4);
    expect(solid!.faceHashes().length).toBe(6 + 4);
  });

  it('combines label, owner and birth filters as edge filters', async () => {
    const { solid, errors, rootId } = await lower(`${STOCK} return stock;`);
    expect(errors).toEqual([]);
    const scene = { backend: solid!, featureId: rootId };
    const byOwner = evaluate(q.edge(q.withFeatureName(rootId), q.withLabel('corner')), scene);
    const byBirth = evaluate(q.edge(q.createdBy(rootId), q.withLabel('corner')), scene);
    expect(new Set(byOwner.map((h) => h.handle)).size).toBe(4);
    expect(byBirth.map((h) => h.handle)).toEqual(byOwner.map((h) => h.handle));
  });

  it('keeps face queries unchanged', async () => {
    const { solid, rootId } = await lower(`${STOCK} return stock;`);
    const scene = { backend: solid!, featureId: rootId };
    expect(evaluate(q.face(q.withLabel('top')), scene).length).toBe(1);
    expect(evaluate(q.face(q.withFeatureName(rootId)), scene).length).toBe(6);
  });
});
