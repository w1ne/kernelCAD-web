// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Spatial and geometry filters inside `q.face(...)` select faces on plain
// primitives. Face lineage on box(...) and cylinder(...) carries no geometry
// snapshot and no surface type, so `q.face(q.closestTo(p))` returned the
// first face by name whatever p was, and `q.face(q.geometryType('PLANE'))`
// returned nothing.

import { describe, it, expect, beforeAll } from 'vitest';
import { getOC, measureArea } from 'replicad';
import { initOcct, type OcctBackend } from '../../src/kernel/backends/occt/occtBackend';
import { isValidShape } from '../../src/kernel/backends/occt/booleanRecovery';
import { runScript } from '../../src/modeling/runtime/runScript';
import { RecomputeEngine } from '../../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../src/modeling/backends/occt/occtLowerer';
import { evaluate } from '../../src/kernel/naming/queryEvaluator';
import { q } from '../../src/kernel/naming/queryConstructors';
import { faceGeometryOf } from '../../src/kernel/backends/occt/faceGeometry';
import type { CompilerDiagnostic } from '../../src/shared/diagnostics/diagnostic';

async function lower(code: string): Promise<{ solid?: OcctBackend; errors: CompilerDiagnostic[] }> {
  const run = await runScript({ code, fileName: 'test.kcad.ts' });
  const engine = new RecomputeEngine(createOcctLowerer(run.session));
  const r = await engine.run(run.records, { paramTable: run.paramTable });
  const errors = (r.diagnostics as CompilerDiagnostic[]).filter((d) => d.severity === 'error');
  const solid = r.shapes.get(run.records[run.records.length - 1].id) as OcctBackend | undefined;
  return { solid, errors };
}

const valid = (s: OcctBackend) => isValidShape(getOC(), s.getReplicadShape().wrapped);

beforeAll(async () => {
  await initOcct();
}, 120_000);

const A = 40;
const B = 30;
const T = 10;
const W = 2;
const R = 10;
const H = 20;
const BOX = `const stock = box(${A}, ${B}, ${T});`;
// cylinder(height, radius): a rod from z = 0 to z = H.
const CYL = `const rod = cylinder(${H}, ${R});`;
const ABOVE: [number, number, number] = [A / 2, B / 2, T + 5];
const BELOW: [number, number, number] = [A / 2, B / 2, -5];

const handles = (hits: ReadonlyArray<{ handle: string }>) => [...new Set(hits.map((h) => h.handle))];

describe('spatial and geometry filters inside q.face(...) select faces on primitives', () => {
  it('closestTo and containsPoint pick the face at a point', async () => {
    const { solid, errors } = await lower(`${BOX} return stock;`);
    expect(errors).toEqual([]);
    const scene = { backend: solid!, featureId: 'stock' };
    const shape = solid!.getReplicadShape();

    const top = evaluate(q.face(q.closestTo(ABOVE)), scene);
    expect(top).toHaveLength(1);
    expect(top[0]!.ref).toContain('top');
    expect(faceGeometryOf(shape, top[0]!.handle)?.centroid).toEqual([A / 2, B / 2, T]);

    const bottom = evaluate(q.face(q.closestTo(BELOW)), scene);
    expect(bottom).toHaveLength(1);
    expect(bottom[0]!.ref).toContain('bottom');
    expect(faceGeometryOf(shape, bottom[0]!.handle)?.centroid).toEqual([A / 2, B / 2, 0]);

    expect(handles(evaluate(q.face(q.containsPoint([A / 2, B / 2, T])), scene))).toEqual([top[0]!.handle]);
    expect(handles(evaluate(q.face().and(q.closestTo(BELOW)), scene))).toEqual([bottom[0]!.handle]);
    // k nearest: the two faces nearest a point beside the +X face.
    const sides = evaluate(q.face(q.closestTo([A + 5, 0, T / 2], 2)), scene);
    expect(sides.map((f) => faceGeometryOf(shape, f.handle)?.centroid)).toEqual([
      [A, B / 2, T / 2],
      [A / 2, 0, T / 2],
    ]);
  });

  it('shells a box open at the face closest to a point', async () => {
    const { solid, errors } = await lower(
      `${BOX} return stock.shell(${W}, { face: q.face(q.closestTo([${BELOW.join(', ')}])) });`,
    );
    expect(errors).toEqual([]);
    expect(valid(solid!)).toBe(true);
    // A × B × T block less an (A − 2W) × (B − 2W) × (T − W) cavity open at z = 0.
    expect(solid!.volume()).toBeCloseTo(A * B * T - (A - 2 * W) * (B - 2 * W) * (T - W), 3);
    const shape = solid!.getReplicadShape();
    const bb = shape.boundingBox.bounds;
    [0, 0, 0, A, B, T].forEach((v, i) => expect(bb[Math.floor(i / 3)][i % 3]).toBeCloseTo(v, 5));
    // Open at z = 0: the face there is the W-wide rim, not the full footprint;
    // the roof at z = T stays whole.
    const areaAt = (z: number) =>
      shape.faces.filter((f) => Math.abs(f.center.z - z) < 1e-6).map((f) => measureArea(f));
    expect(areaAt(0)).toHaveLength(1);
    expect(areaAt(0)[0]).toBeCloseTo(A * B - (A - 2 * W) * (B - 2 * W), 6);
    expect(areaAt(T)).toHaveLength(1);
    expect(areaAt(T)[0]).toBeCloseTo(A * B, 6);
  });

  it('geometryType reads face surface types', async () => {
    const box = await lower(`${BOX} return stock;`);
    expect(handles(evaluate(q.face(q.geometryType('PLANE')), { backend: box.solid!, featureId: 'stock' }))).toHaveLength(6);

    const { solid, errors } = await lower(`${CYL} return rod;`);
    expect(errors).toEqual([]);
    const scene = { backend: solid!, featureId: 'rod' };
    const side = evaluate(q.face(q.geometryType('CYLINDER')), scene);
    expect(side).toHaveLength(1);
    expect(handles(evaluate(q.face(q.geometryType('PLANE')), scene))).toHaveLength(2);
    // A later spatial term narrows the earlier one: the plane nearest the top.
    const cap = evaluate(q.face(q.geometryType('PLANE'), q.closestTo([0, 0, H + 1])), scene);
    expect(cap).toHaveLength(1);
    expect(faceGeometryOf(solid!.getReplicadShape(), cap[0]!.handle)?.centroid[2]).toBeCloseTo(H, 9);
  });

  it('keeps edge queries on edges', async () => {
    const { solid } = await lower(`${CYL} return rod;`);
    const scene = { backend: solid!, featureId: 'rod' };
    const hits = evaluate(q.edge(q.geometryType('CIRCLE')), scene);
    expect(hits).toHaveLength(2);
    expect(hits.every((h) => h.kind === 'edge')).toBe(true);
    expect(evaluate(q.edge(q.geometryType('PLANE')), scene)).toHaveLength(0);
  });
});
