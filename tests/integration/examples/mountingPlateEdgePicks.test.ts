// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Issue #1300. The drafting-review mounting plate still fillets its four
// vertical corners and chamfers its top perimeter, but the picks are stored
// identity, not a geometric re-query:
//
//   q.edge(q.createdBy(stock.id)).and(q.withLabel('corner' | 'top-perimeter'))
//
// createdBy reads edgeHistoryMap. withLabel reads the birth label on that
// lineage. The lowerer then bridges the query evaluator's edge handles back
// onto the current shape by OCCT HashCode. A created edge ref for the same
// slot goes through resolveEdgeRef. A width/depth/thickness edit moves and
// lengthens those edges without deleting them, so the stored query must hit
// them again. It must not blend a neighbour (the bottom perimeter).
// `{ parallel: [0,0,1] }` and `{ face: 'top' }` are not the selectors under test.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getOC } from 'replicad';
import { buildModel, updateModelParams, type BuiltModel } from '../../../src/modeling/buildModel';
import { OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { inspectEdgeBreaks } from '../../../src/kernel/backends/occt/edgeRadius';
import { pickEdges } from '../../../src/kernel/backends/occt/edgeSelection';
import type { FeatureRecord } from '../../../src/shared/intent/featureRecord';
import type { BindingFingerprint, SelectionRecord } from '../../../src/shared/intent/selectionRecord';
import type { Vec3 } from '../../../src/shared/intent/types';

const PLATE = 'examples/drafting-review/mounting-plate.kcad.ts';
const WIDTH_EDIT = 140;
const DEPTH_EDIT = 100;
const THICKNESS_EDIT = 18;

function identityPlateSource(): string {
  const src = readFileSync(resolve(PLATE), 'utf8');
  const rewritten = src.replace(
    'return box(width, depth, thickness)\n  .fillet(6, { parallel: [0, 0, 1] })\n  .chamfer(0.5, { face: \'top\' })',
    [
      'const stock = box(width, depth, thickness);',
      'return stock',
      '  .fillet(6, q.edge(q.createdBy(stock.id)).and(q.withLabel(\'corner\')))',
      '  .chamfer(0.5, q.edge(q.createdBy(stock.id)).and(q.withLabel(\'top-perimeter\')))',
    ].join('\n'),
  );
  if (rewritten === src) {
    throw new Error('mounting plate no longer has the geometric fillet/chamfer this test rewrites');
  }
  return rewritten;
}

function notchedIdentityPlateSource(): string {
  const source = identityPlateSource();
  const rewritten = source.replace(
    'const stock = box(width, depth, thickness);',
    [
      'const raw = box(width, depth, thickness);',
      "const notchX = param('notchX', 2, { min: 2, max: 98 });",
      "const notchY = param('notchY', 2, { min: 2, max: 68 });",
      'const stock = raw.subtract(box(4, 4, 100, true).translate(notchX, notchY, thickness.divide(2)));',
    ].join('\n'),
  ).replaceAll('createdBy(stock.id)', 'createdBy(raw.id)');
  if (rewritten === source) throw new Error('could not add the upstream corner notch to the plate');
  return rewritten;
}

function shapeOf(model: BuiltModel): OcctBackend {
  const shape = model.rootShape as OcctBackend | undefined;
  expect(shape, 'mounting plate did not lower to a solid').toBeDefined();
  return shape!;
}

function distanceToSolid(shape: OcctBackend, point: Vec3): number {
  const oc = getOC() as any;
  const pnt = new oc.gp_Pnt_3(point[0], point[1], point[2]);
  const maker = new oc.BRepBuilderAPI_MakeVertex(pnt);
  const vertex = maker.Vertex();
  const dist = new oc.BRepExtrema_DistShapeShape_1();
  const progress = new oc.Message_ProgressRange_1();
  try {
    dist.LoadS1(vertex);
    dist.LoadS2((shape.getReplicadShape() as { wrapped: unknown }).wrapped);
    dist.SetDeflection(1e-6);
    dist.Perform(progress);
    if (!dist.IsDone() || dist.NbSolution() < 1) return Number.POSITIVE_INFINITY;
    return dist.Value();
  } finally {
    vertex.delete?.();
    maker.delete?.();
    pnt.delete?.();
    dist.delete?.();
    progress.delete?.();
  }
}

function frame(shape: OcctBackend) {
  const bb = shape.boundingBox({ exact: true });
  const [minX, minY, minZ] = bb.min;
  const [maxX, maxY, maxZ] = bb.max;
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;
  const midZ = (minZ + maxZ) / 2;
  const corners: Vec3[] = [
    [minX, minY, midZ],
    [maxX, minY, midZ],
    [minX, maxY, midZ],
    [maxX, maxY, midZ],
  ];
  const edgeMids = (z: number): Vec3[] => [
    [midX, minY, z],
    [midX, maxY, z],
    [minX, midY, z],
    [maxX, midY, z],
  ];
  return {
    width: maxX - minX,
    depth: maxY - minY,
    thickness: maxZ - minZ,
    corners,
    topMids: edgeMids(maxZ),
    bottomMids: edgeMids(minZ),
  };
}

function distTo(point: Vec3, targets: readonly Vec3[]): number {
  return Math.min(...targets.map((t) => Math.hypot(point[0] - t[0], point[1] - t[1], point[2] - t[2])));
}

function identitySelection(selections: readonly SelectionRecord[], label: string): SelectionRecord {
  const found = selections.find((s) => s.selectorText.includes('createdBy') && s.selectorText.includes(`withLabel("${label}")`));
  expect(found, `missing identity selection for '${label}': ${selections.map((s) => s.selectorText).join(' | ')}`).toBeDefined();
  return found!;
}

function assertStoredIdentityQuery(model: BuiltModel, kind: 'fillet' | 'chamfer', label: string): void {
  const record = model.records.find((r) => r.kind === kind);
  expect(record, kind).toBeDefined();
  const edges = record!.inputs.edges;
  expect(edges?.kind).toBe('edge');
  if (edges?.kind !== 'edge') return;
  expect(edges.ref.kind).toBe('queryDsl');
  const ast = JSON.stringify(edges.ref.kind === 'queryDsl' ? edges.ref.queryAst : {});
  expect(ast).toContain('createdBy');
  expect(ast).toContain(label);
  expect(ast).not.toContain('parallel');
  expect(ast).not.toContain('"face"');
}

/** The four vertical corner edges, and only those, are the fillet pick. */
function expectCornerFilletPick(fingerprints: readonly BindingFingerprint[], plate: ReturnType<typeof frame>): void {
  expect(fingerprints).toHaveLength(4);
  const used = new Set<number>();
  for (const edge of fingerprints) {
    expect(edge.entityKind).toBe('edge');
    expect(edge.geomType).toBe('LINE');
    expect(Math.abs(edge.direction?.[2] ?? 0)).toBeGreaterThan(0.99);
    expect(edge.size).toBeCloseTo(plate.thickness, 1);
    let nearest = 0;
    let best = Infinity;
    plate.corners.forEach((corner, index) => {
      const d = distTo(edge.centroid, [corner]);
      if (d < best) { best = d; nearest = index; }
    });
    expect(best, `fillet edge at ${edge.centroid.join(',')} is not a vertical corner`).toBeLessThan(1);
    used.add(nearest);
  }
  expect(used.size).toBe(4);
}

function expectTopPerimeterPick(fingerprints: readonly BindingFingerprint[], plate: ReturnType<typeof frame>): void {
  expect(fingerprints).toHaveLength(4);
  for (const edge of fingerprints) {
    expect(edge.entityKind).toBe('edge');
    expect(edge.geomType).toBe('LINE');
    expect(Math.abs(edge.direction?.[2] ?? 0)).toBeLessThan(0.1);
    expect(edge.centroid[2]).toBeCloseTo(plate.thickness, 1);
    expect(distTo(edge.centroid, plate.bottomMids), `chamfer edge at ${edge.centroid.join(',')} is on the bottom`).toBeGreaterThan(plate.thickness / 2);
  }
}

/** Corner fillets present, top perimeter chamfered, bottom perimeter left sharp. */
function expectAppliedGeometry(shape: OcctBackend, plate: ReturnType<typeof frame>): void {
  for (const corner of plate.corners) {
    const gap = distanceToSolid(shape, corner);
    expect(gap, `vertical corner ${corner.join(',')} was not filleted`).toBeGreaterThan(1.5);
    expect(gap, `vertical corner ${corner.join(',')} was not the R6 fillet`).toBeLessThan(4);
  }
  for (const mid of plate.topMids) {
    const gap = distanceToSolid(shape, mid);
    expect(gap, `top edge ${mid.join(',')} was not chamfered`).toBeGreaterThan(0.08);
    expect(gap, `top edge ${mid.join(',')} took a corner fillet`).toBeLessThan(1);
  }
  expectNeighboursSharp(shape, plate);
}

function expectNeighboursSharp(shape: OcctBackend, plate: ReturnType<typeof frame>): void {
  for (const mid of plate.bottomMids) {
    expect(distanceToSolid(shape, mid), `bottom edge ${mid.join(',')} was modified`).toBeLessThan(0.05);
  }
  const { breaks } = inspectEdgeBreaks(shape);
  const stray = breaks.filter((b) => {
    if (b.kind !== 'fillet' || b.radiusMm === null || Math.abs(b.radiusMm - 6) > 0.25) return false;
    const face = shape.getReplicadShape().faces[b.faceIndex];
    const centre: Vec3 = [face.center.x, face.center.y, face.center.z];
    return distTo(centre, plate.corners) > 8;
  });
  expect(stray, 'an R6 fillet landed away from the vertical corners').toEqual([]);
}

function expectNoFalseFlag(model: BuiltModel): void {
  const changed = model.diagnostics.filter((d) => d.code === 'selector.binding-changed');
  expect(changed, JSON.stringify(changed)).toEqual([]);
  const errors = model.diagnostics.filter((d) => d.severity === 'error');
  expect(errors, JSON.stringify(errors.map((d) => ({ code: d.code, message: d.message })))).toEqual([]);
}

/** Created edge ref for the box's birth label. This is the resolveEdgeRef path. */
function expectCreatedCornerRef(model: BuiltModel, plate: ReturnType<typeof frame>): void {
  const box = model.records.find((r) => r.kind === 'box');
  expect(box).toBeDefined();
  const base = model.shapes.get(box!.id) as OcctBackend;
  const record = {
    id: 'created_corner_probe',
    kind: 'fillet',
    inputs: {
      base: { kind: 'feature', id: box!.id },
      edges: {
        kind: 'edge',
        featureId: box!.id,
        ref: { kind: 'created', rewriteId: box!.id, slot: 'corner', selector: 'edge' },
      },
    },
    params: { radius: { expression: '6', unit: 'mm', evaluated: 6 } },
    transforms: [],
    suppressed: false,
  } as FeatureRecord;
  const picked = pickEdges(record, base, model.records);
  if ('error' in picked) {
    expect.fail(`created corner ref missed: ${picked.error.code} ${picked.error.message}`);
  }
  expect(picked).toHaveLength(4);
  for (const edge of picked) {
    const mid = edge.pointAt(0.5);
    const tangent = edge.tangentAt(0.5);
    expect(Math.abs(tangent.z)).toBeGreaterThan(0.99);
    expect(distTo([mid.x, mid.y, mid.z], plate.corners)).toBeLessThan(1);
    mid.delete?.();
    tangent.delete?.();
  }
}

describe('drafting-review mounting plate edge picks', () => {
  it('keeps lineage corner and top-perimeter picks after the plate is resized', async () => {
    const fileName = resolve(PLATE);
    const model = await buildModel({
      code: identityPlateSource(),
      fileName,
      scriptDir: dirname(fileName),
    });
    expectNoFalseFlag(model);
    assertStoredIdentityQuery(model, 'fillet', 'corner');
    assertStoredIdentityQuery(model, 'chamfer', 'top-perimeter');
    const base = frame(shapeOf(model));
    expect(base.width).toBeCloseTo(100, 3);
    expect(base.depth).toBeCloseTo(70, 3);
    expect(base.thickness).toBeCloseTo(12, 3);
    expectCornerFilletPick(identitySelection(model.selections, 'corner').fingerprints, base);
    expectTopPerimeterPick(identitySelection(model.selections, 'top-perimeter').fingerprints, base);
    expectCreatedCornerRef(model, base);
    expectAppliedGeometry(shapeOf(model), base);

    const { model: resized } = await updateModelParams(model, [
      { name: 'width', value: WIDTH_EDIT },
      { name: 'depth', value: DEPTH_EDIT },
      { name: 'thickness', value: THICKNESS_EDIT },
    ]);
    const edited = frame(shapeOf(resized));
    expect(edited.width).toBeCloseTo(WIDTH_EDIT, 3);
    expect(edited.depth).toBeCloseTo(DEPTH_EDIT, 3);
    expect(edited.thickness).toBeCloseTo(THICKNESS_EDIT, 3);

    // This edit moves and lengthens the corners. It does not delete or split
    // them, so a typed miss here would mean the stored identity was dropped.
    expectNoFalseFlag(resized);
    assertStoredIdentityQuery(resized, 'fillet', 'corner');
    assertStoredIdentityQuery(resized, 'chamfer', 'top-perimeter');
    expectCornerFilletPick(identitySelection(resized.selections, 'corner').fingerprints, edited);
    expectTopPerimeterPick(identitySelection(resized.selections, 'top-perimeter').fingerprints, edited);
    expectCreatedCornerRef(resized, edited);
    expectAppliedGeometry(shapeOf(resized), edited);
  });

  it('reports a typed miss when an upstream edit replaces a selected corner lineage', async () => {
    const fileName = resolve(PLATE);
    const model = await buildModel({
      code: notchedIdentityPlateSource(),
      fileName,
      scriptDir: dirname(fileName),
    });
    expectNoFalseFlag(model);
    expect(identitySelection(model.selections, 'corner').fingerprints).toHaveLength(3);

    const { model: movedNotch } = await updateModelParams(model, [
      { name: 'notchX', value: 98 },
      { name: 'notchY', value: 68 },
    ]);
    const misses = movedNotch.diagnostics.filter((diagnostic) => diagnostic.code === 'feature.selection.no-match');
    expect(misses).toHaveLength(1);
    expect(misses[0]).toMatchObject({ severity: 'error', featureId: 'fillet_1' });
    expect(misses[0]?.message).toContain('same unique edge lineage');
    expect(misses[0]?.hint).toContain('deleted, split into ambiguous descendants, or replaced');
  });
});
