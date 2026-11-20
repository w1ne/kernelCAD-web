// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Spatial and geometry filters written inside `q.edge(...)` select edges.
// `closestTo`, `containsPoint` and `geometryType` used to read only face
// centroids and face surface types, so `q.edge(q.closestTo(p))` and
// `q.edge(q.geometryType('CIRCLE'))` selected nothing, and
// `q.edge().and(q.closestTo(p))` returned an arbitrary edge.

import { describe, it, expect, beforeAll } from 'vitest';
import { getOC } from 'replicad';
import { initOcct, type OcctBackend } from '../../src/kernel/backends/occt/occtBackend';
import { isValidShape } from '../../src/kernel/backends/occt/booleanRecovery';
import { runScript } from '../../src/modeling/runtime/runScript';
import { RecomputeEngine } from '../../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../src/modeling/backends/occt/occtLowerer';
import { evaluate } from '../../src/kernel/naming/queryEvaluator';
import { q } from '../../src/kernel/naming/queryConstructors';
import { edgeGeometryOf } from '../../src/kernel/backends/occt/edgeGeometry';
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

beforeAll(async () => {
  await initOcct();
}, 120_000);

const A = 60;
const T = 6;
const C = 0.5;
const R = 10;
const H = 20;
const F = 1;
const BOX = `const stock = box(${A}, ${A}, ${T});`;
// cylinder(height, radius): a rod from z = 0 to z = H.
const CYL = `const rod = cylinder(${H}, ${R});`;
// Midpoint of the top-perimeter edge on the y = 0 side of the box.
const TOP_FRONT: [number, number, number] = [A / 2, 0, T];

const handles = (hits: ReadonlyArray<{ handle: string }>) => [...new Set(hits.map((h) => h.handle))];

describe('spatial and geometry filters inside q.edge(...) select edges', () => {
  it('closestTo and containsPoint pick the edge at a point', async () => {
    const { solid, errors } = await lower(`${BOX} return stock;`);
    expect(errors).toEqual([]);
    const scene = { backend: solid!, featureId: 'stock' };
    const near = evaluate(q.edge(q.closestTo([A / 2, -1, T])), scene);
    expect(near).toHaveLength(1);
    expect(near[0]!.kind).toBe('edge');
    expect(near[0]!.ref).toContain('top-perimeter');
    expect(edgeGeometryOf(solid!.getReplicadShape(), near[0]!.handle)?.centroid).toEqual(TOP_FRONT);
    expect(handles(evaluate(q.edge(q.containsPoint(TOP_FRONT)), scene))).toEqual([near[0]!.handle]);
    // The chained spelling narrowed edges with face centroids and returned an
    // arbitrary edge (bottom-perimeter).
    expect(handles(evaluate(q.edge().and(q.closestTo([A / 2, -1, T])), scene))).toEqual([near[0]!.handle]);
  });

  it('chamfers the one edge closest to a point', async () => {
    const { solid, errors } = await lower(
      `${BOX} return stock.chamfer(${C}, q.edge(q.closestTo([${TOP_FRONT.join(', ')}])));`,
    );
    expect(errors).toEqual([]);
    expect(valid(solid!)).toBe(true);
    // One 45° chamfer of leg c along an edge of length a removes c²/2 × a.
    expect(solid!.volume()).toBeCloseTo(A * A * T - (C * C / 2) * A, 4);
    expect(solid!.faceHashes().length).toBe(6 + 1);
  });

  it('geometryType reads edge curve types', async () => {
    const { solid, errors } = await lower(`${CYL} return rod;`);
    expect(errors).toEqual([]);
    const scene = { backend: solid!, featureId: 'rod' };
    expect(handles(evaluate(q.edge(q.geometryType('CIRCLE')), scene))).toHaveLength(2);
    expect(handles(evaluate(q.edge(q.geometryType('LINE')), scene))).toHaveLength(1);
    // A later spatial term narrows the earlier ones: the line nearest the top
    // is the seam, although the top circle is the nearest edge overall.
    const seam = evaluate(q.edge(q.geometryType('LINE'), q.closestTo([0, 0, H])), scene);
    expect(handles(seam)).toEqual(handles(evaluate(q.edge(q.geometryType('LINE')), scene)));
  });

  it('fillets the top rim selected by curve type and position', async () => {
    const { solid, errors } = await lower(
      `${CYL} return rod.fillet(${F}, q.edge(q.geometryType('CIRCLE'), q.closestTo([0, 0, ${H}])));`,
    );
    expect(errors).toEqual([]);
    expect(valid(solid!)).toBe(true);
    // Pappus: the f × f corner less a quarter disc, area f²(1 − π/4), with its
    // centroid (10 − 3π)/(12 − 3π)·f in from the corner, revolved about the axis.
    const spandrel = F * F * (1 - Math.PI / 4);
    const inset = ((10 - 3 * Math.PI) / (12 - 3 * Math.PI)) * F;
    expect(solid!.volume()).toBeCloseTo(Math.PI * R * R * H - 2 * Math.PI * (R - inset) * spandrel, 3);
    expect(solid!.faceHashes().length).toBe(4);
  });

  it('keeps face queries on faces', async () => {
    const { solid } = await lower(`${BOX} return stock;`);
    const scene = { backend: solid!, featureId: 'stock' };
    const hits = evaluate(q.face(q.closestTo([A / 2, A / 2, T + 1])), scene);
    expect(hits).toHaveLength(1);
    expect(hits[0]!.kind).toBe('face');
    expect(evaluate(q.face(q.geometryType('LINE')), scene)).toHaveLength(0);
  });
});
