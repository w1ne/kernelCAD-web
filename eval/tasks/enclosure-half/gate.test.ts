// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Slice E integration gate (Task 10). The win condition for the whole slice is
// a VERIFIED watertight solid — not a render. This gate proves that the slice's
// surface ops (rational nurbsSurface E1, surface trim E2, sew E3) compose into a
// manufacturable body: planar patches sew into a genuinely CLOSED SOLID, the
// model is watertight (manifold, zero naked edges), it exports to a non-empty
// STEP, and the cylindrical boss reads back an EXACT radius (E1 exactness).
//
// The gate builds the model the same way the production pipeline does
// (buildModel → OcctBackend) and queries real post-state. It does NOT assert
// anything the geometry does not actually satisfy; see task-10-report.md for the
// draft-on-spline-faces composition gap this proving ground surfaced.
import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { buildModel } from '../../../src/modeling/buildModel';
import { OcctBackend, meshShapeForExport } from '../../../src/kernel/backends/occt/occtBackend';
import { isWatertight } from '../../../src/kernel/backends/occt/assertWatertight';

const SOLUTION = join(__dirname, 'solution-expert.kcad.ts');
const SHELL_ONLY = join(__dirname, 'shell-only.kcad.ts');

async function build(file: string) {
  const code = await readFile(file, 'utf8');
  const model = await buildModel({ code, fileName: file });
  return model;
}

/** TopAbs_ShapeEnum: COMPOUND=0, COMPSOLID=1, SOLID=2, SHELL=3, FACE=4. */
function shapeTypeValue(backend: OcctBackend): number {
  const wrapped = (backend as unknown as { shape: { wrapped: { ShapeType(): unknown } } }).shape.wrapped;
  const raw = wrapped.ShapeType();
  return typeof raw === 'object' && raw !== null ? (raw.value ?? raw) : raw;
}

describe('enclosure-half — Slice E integration gate', () => {
  it('sews planar patches into a genuinely CLOSED SOLID (E3 watertight headline)', async () => {
    // The sew result, on its own, must be a true closed solid: not an open
    // shell, not a compound. This is the slice's headline win.
    const model = await build(SHELL_ONLY);
    const errs = model.diagnostics.filter((d) => d.severity === 'error');
    expect(errs).toEqual([]);
    const shell = model.rootShape as OcctBackend;
    expect(shell).toBeTruthy();
    // SOLID (2): BRepBuilderAPI_Sewing → MakeSolid → BRepCheck_Analyzer valid.
    expect(shapeTypeValue(shell)).toBe(2);
    expect(shell.volume()).toBeGreaterThan(0);
    // isClosed: watertight at the mesh half-edge level (every edge shared by
    // exactly two triangles) — zero naked edges, manifold.
    const mesh = meshShapeForExport((shell as unknown as { shape: import('replicad').Shape3D }).shape);
    expect(isWatertight(mesh as unknown as { triangles: number[] } as never)).toBe(true);
  }, 60000);

  it('produces a watertight model that exports to STEP and carries an exact boss radius', async () => {
    const model = await build(SOLUTION);
    const errs = model.diagnostics.filter((d) => d.severity === 'error');
    expect(errs).toEqual([]);
    const shape = model.rootShape as OcctBackend;
    expect(shape).toBeTruthy();

    // Watertight: manifold, no naked edges (verify-equivalent post-state).
    const mesh = meshShapeForExport((shape as unknown as { shape: import('replicad').Shape3D }).shape);
    expect(isWatertight(mesh as unknown as { triangles: number[] } as never)).toBe(true);

    // Positive volume — a real enclosed solid region, not a zero-volume shell.
    expect(shape.volume()).toBeGreaterThan(0);

    // STEP export non-empty.
    const step = await shape.exportSTEPAsync();
    expect(step.length).toBeGreaterThan(0);

    // E1 exactness: the cylindrical boss reads as an exact radius of 5 mm.
    // The boss is built from an analytic circle of radius 5; we read it back
    // from the model's geometry rather than trusting the source literal.
    const radius = await measureBossRadius(model);
    expect(Math.abs(radius - 5)).toBeLessThan(1e-6);
  }, 60000);
});

/**
 * Recover the boss radius from the built model: the boss is a circular column
 * centered at (20, 15). Its radius is half the model's XY extent beyond the
 * 40×30 box footprint is not reliable (the box dominates), so we measure the
 * boss directly by rebuilding just the boss feature's bounding box.
 *
 * The boss is the last `extrudeCircle` feature; its bbox half-extent in X (and
 * Y) equals the radius for an axis-aligned circular extrusion.
 */
async function measureBossRadius(model: Awaited<ReturnType<typeof buildModel>>): Promise<number> {
  // Find the extrudeCircle record and read its lowered shape's bbox.
  // extrudeCircle records as kind 'extrude'; the boss is the only extrude in
  // the model. Read its lowered bbox: an axis-aligned circular column has equal
  // X/Y half-extents, each equal to the radius.
  const bossRecord = [...model.records].reverse().find((r) => r.kind === 'extrude');
  if (!bossRecord) throw new Error('measureBossRadius: no extrude boss feature in model');
  const bossShape = model.shapes.get(bossRecord.id) as OcctBackend | undefined;
  if (!bossShape) throw new Error('measureBossRadius: boss feature did not lower');
  const bb = bossShape.boundingBox();
  const rx = (bb.max[0] - bb.min[0]) / 2;
  const ry = (bb.max[1] - bb.min[1]) / 2;
  // Both half-extents must agree (circular) and equal the radius.
  expect(Math.abs(rx - ry)).toBeLessThan(1e-6);
  return rx;
}
