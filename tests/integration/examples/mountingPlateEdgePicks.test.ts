// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Issue #1300. The drafting-review mounting plate fillets the four vertical
// corners and chamfers the top perimeter. After an upstream width edit those
// picks must still land on those edges, or fail with a typed miss. A
// neighbouring edge (bottom perimeter, top edge taken as a corner fillet)
// must not be blended in their place.

import { describe, expect, it } from 'vitest';
import { getOC } from 'replicad';
import { buildModelFromFile, updateModelParams, type BuiltModel } from '../../../src/modeling/buildModel';
import { OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { inspectEdgeBreaks } from '../../../src/kernel/backends/occt/edgeRadius';
import type { BindingFingerprint, SelectionRecord } from '../../../src/shared/intent/selectionRecord';
import type { Vec3 } from '../../../src/shared/intent/types';

const PLATE = 'examples/drafting-review/mounting-plate.kcad.ts';
const WIDTH_EDIT = 130;

/** Selection failures. A warning that the selector moved is not a miss. */
const TYPED_MISS = new Set([
  'feature.selection.no-match',
  'feature.invalid-args',
  'feature.face-ref.not-resolvable',
  'feature.face-ref.not-supported',
  'feature.face-ref.not-applicable',
  'feature.face-ref.ambiguous-after-split',
  'feature.face-ref.removed',
  'feature.kernel-failed',
  'query.empty',
  'query.unsupported-entity-type',
  'query.unknown-label',
  'query.ambiguous',
]);

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

function selection(selections: readonly SelectionRecord[], text: string): SelectionRecord {
  const found = selections.find((s) => s.selectorText === text);
  expect(found, `missing selection '${text}'`).toBeDefined();
  return found!;
}

function typedMisses(model: BuiltModel): string[] {
  return model.diagnostics.filter((d) => d.severity === 'error' && TYPED_MISS.has(d.code)).map((d) => d.code);
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

function expectTopChamferPick(fingerprint: BindingFingerprint): void {
  expect(fingerprint.entityKind).toBe('face');
  expect(fingerprint.role).toBe('top');
  expect(fingerprint.direction?.[2] ?? 0).toBeGreaterThan(0.99);
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

describe('drafting-review mounting plate edge picks', () => {
  it('keeps the corner fillet and top chamfer after the plate is widened', async () => {
    const model = await buildModelFromFile({ file: PLATE });
    expectNoFalseFlag(model);
    const base = frame(shapeOf(model));
    expect(base.width).toBeCloseTo(100, 3);
    expect(base.depth).toBeCloseTo(70, 3);
    expect(base.thickness).toBeCloseTo(12, 3);
    expectCornerFilletPick(selection(model.selections, '{"parallel":[0,0,1]}').fingerprints, base);
    expectTopChamferPick(selection(model.selections, 'top').fingerprints[0]!);
    expectAppliedGeometry(shapeOf(model), base);

    const { model: wide } = await updateModelParams(model, [{ name: 'width', value: WIDTH_EDIT }]);
    const edited = frame(shapeOf(wide));
    expect(edited.width).toBeCloseTo(WIDTH_EDIT, 3);
    expect(edited.depth).toBeCloseTo(70, 3);
    expect(edited.thickness).toBeCloseTo(12, 3);

    const misses = typedMisses(wide);
    const otherErrors = wide.diagnostics.filter((d) => d.severity === 'error' && !TYPED_MISS.has(d.code));
    expect(otherErrors, JSON.stringify(otherErrors.map((d) => d.code))).toEqual([]);

    if (misses.length > 0) {
      for (const corner of edited.corners) {
        expect(distanceToSolid(shapeOf(wide), corner), 'typed miss still filleted a corner').toBeLessThan(0.05);
      }
      expectNeighboursSharp(shapeOf(wide), edited);
      return;
    }

    expectNoFalseFlag(wide);
    expectCornerFilletPick(selection(wide.selections, '{"parallel":[0,0,1]}').fingerprints, edited);
    expectTopChamferPick(selection(wide.selections, 'top').fingerprints[0]!);
    expectAppliedGeometry(shapeOf(wide), edited);
  });
});
