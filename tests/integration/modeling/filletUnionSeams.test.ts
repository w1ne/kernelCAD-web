// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Rounding every edge of a part built from joined primitives. The history-aware
// union keeps coplanar seams: a face split where two operands share a plane,
// and the convex edge along it cut in two at a vertex a smooth seam edge also
// meets. The blend solver could not pass that vertex at any radius, so
// `.fillet(1)` on a six-operand bracket failed outright. The edge feature now
// retries on the same solid with same-domain faces merged; a default
// every-edge round that still has edges no radius builds on rounds the rest
// and names the skipped edges.

import { describe, expect, it } from 'vitest';
import type { Edge, Face } from 'replicad';
import { evaluateAndBuildScript } from '../../../src/composition/scriptEvaluation';
import type { OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { countSolids, isTopologicallyValid } from '../../../src/kernel/backends/occt/edgeFeatureValidity';
import { computeDihedralPublic } from '../../../src/kernel/backends/occt/edgeQueries';

const HELPERS = `
const bx = (x0, x1, y0, y1, z0, z1) => box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);
const yCyl = (r, y0, y1) => cylinder(y1 - y0, r).rotateX(-90).translate(0, y0, 0);
const r = 13, y0 = 22, y1 = 26, xb = 30;
`;

const BRACKET = `union(
  yCyl(r, y0, y1), yCyl(r, -y1, -y0),
  bx(0, xb + 6, y0, y1, -r, r), bx(0, xb + 6, -y1, -y0, -r, r),
  bx(xb, xb + 6, -y1, y1, -r, r),
  bx(xb + 5, 90, -5, 5, -6, 6),
)`;

/** Smallest failing shape: a plate and a block flush on two planes. */
const PLATE_AND_BLOCK = 'union(bx(0, xb + 6, y0, y1, -r, r), bx(xb, xb + 6, 10, y0, -r, r))';

/** A boss whose wall meets the plate's corner edges tangentially. */
const TANGENT_AT_CORNER = 'union(yCyl(r, y0 + 1, y1 - 1), bx(0, xb + 6, y0, y1, -r, r))';

async function build(body: string) {
  const { evaluation, model } = await evaluateAndBuildScript({ code: `${HELPERS}\nreturn ${body};` });
  // The edge feature when there is one, else the last record (the bare union).
  const target = model?.records.find((rec) => rec.kind === 'fillet' || rec.kind === 'chamfer') ?? model?.records.at(-1);
  const shape = target ? (model?.shapes.get(target.id) as OcctBackend | undefined) : undefined;
  return { evaluation, shape, featureId: target?.id };
}

/** Edges whose faces still meet at a crease (dihedral below 175°). */
function sharpEdgeCount(shape: OcctBackend): number {
  const s = shape.getReplicadShape() as unknown as { faces: Face[]; edges: Edge[] };
  return s.edges.filter((e) => {
    const d = computeDihedralPublic(s, e, { convexity: false });
    return d !== null && d.angleDeg < 175;
  }).length;
}

function expectOneValidSolid(shape: OcctBackend | undefined): asserts shape is OcctBackend {
  expect(shape).toBeDefined();
  const wrapped = (shape!.getReplicadShape() as any).wrapped;
  expect(countSolids(wrapped)).toBe(1);
  expect(isTopologicallyValid(wrapped)).toBe(true);
}

function notInfo(diagnostics: readonly { severity: string }[]) {
  return diagnostics.filter((d) => d.severity !== 'info');
}

describe('fillet and chamfer on every edge of a multi-primitive union', () => {
  it('rounds every edge of the six-operand bracket', async () => {
    const { evaluation, shape } = await build(`${BRACKET}.fillet(1)`);
    expect(notInfo(evaluation.diagnostics)).toEqual([]);
    expect(evaluation.exitCode).toBe(0);
    expectOneValidSolid(shape);
    expect(sharpEdgeCount(shape)).toBe(0);
  }, 60_000);

  it('rounds every edge of a plate and block that share two planes', async () => {
    const plain = await build(PLATE_AND_BLOCK);
    const { evaluation, shape } = await build(`${PLATE_AND_BLOCK}.fillet(1)`);
    expect(notInfo(evaluation.diagnostics)).toEqual([]);
    expect(evaluation.exitCode).toBe(0);
    expectOneValidSolid(shape);
    expect(sharpEdgeCount(shape)).toBe(0);
    expect(shape.volume()).toBeLessThan(plain.shape!.volume());
  }, 60_000);

  it('chamfers every edge of the bracket', async () => {
    const { evaluation, shape } = await build(`${BRACKET}.chamfer(1)`);
    expect(notInfo(evaluation.diagnostics)).toEqual([]);
    expectOneValidSolid(shape);
  }, 60_000);

  it('rounds the blendable edges and names the skipped ones when no radius builds on all', async () => {
    const { evaluation, shape, featureId } = await build(`${TANGENT_AT_CORNER}.fillet(1)`);
    expect(evaluation.exitCode).toBe(0);
    const reported = notInfo(evaluation.diagnostics);
    expect(reported.map((d) => d.code)).toEqual(['feature.edge-feature.unblendable-edges-skipped']);
    const skipped = reported[0]!;
    expect(skipped.severity).toBe('warn');
    expect(skipped.featureId).toBe(featureId);
    const details = skipped.details!;
    const rounded = Number(details.roundedEdgeCount);
    const skippedCount = Number(details.skippedEdgeCount);
    expect(rounded).toBeGreaterThan(0);
    expect(skippedCount).toBeGreaterThan(0);
    expect(rounded + skippedCount).toBe(details.edgeCount);
    expect(Number(details.skippedFailAloneCount) + Number(details.skippedConflictCount)).toBe(skippedCount);
    expect(String(details.skippedEdgeIds).split(',')).toHaveLength(skippedCount);
    expect(skipped.hint).toMatch(/Skipped edges: /);
    expect(skipped.message).toContain(`rounded ${rounded} of ${details.edgeCount} edges`);
    expectOneValidSolid(shape);
    // Not a silent no-op: some creases were rounded, the skipped ones remain.
    const before = await build(TANGENT_AT_CORNER);
    const sharpBefore = sharpEdgeCount(before.shape!);
    const sharpAfter = sharpEdgeCount(shape);
    expect(sharpAfter).toBeGreaterThan(0);
    expect(sharpAfter).toBeLessThan(sharpBefore);
  }, 120_000);

  it('still refuses an explicit selection that cannot be blended', async () => {
    const { evaluation } = await build(`${TANGENT_AT_CORNER}.fillet(1, { parallel: 'Z' })`);
    expect(evaluation.exitCode).toBe(1);
    expect(evaluation.diagnostics.map((d) => d.code)).toContain('feature.kernel-failed');
    expect(evaluation.diagnostics.map((d) => d.code)).not.toContain('feature.edge-feature.unblendable-edges-skipped');
  }, 120_000);

  it.each([
    ['a box', 'box(40, 20, 12).fillet(2)'],
    ['an L of two boxes', 'union(box(40, 10, 10), box(10, 40, 10)).fillet(1)'],
    ['a box and a tangent cylinder', 'union(bx(0, 40, -5, 5, 0, 10), cylinder(10, 5)).fillet(1)'],
    ['a box and a non-tangent cylinder', 'union(bx(0, 40, -5, 5, 0, 10), cylinder(10, 8)).fillet(1)'],
  ])('keeps rounding %s cleanly', async (_name, body) => {
    const { evaluation, shape } = await build(body);
    expect(notInfo(evaluation.diagnostics)).toEqual([]);
    expect(evaluation.exitCode).toBe(0);
    expectOneValidSolid(shape);
    expect(sharpEdgeCount(shape)).toBe(0);
  }, 60_000);
});
