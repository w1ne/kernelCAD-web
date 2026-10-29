// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/historyAwareBooleans.test.ts
import { beforeAll, describe, it, expect } from 'vitest';
import { getOC, makeCompound } from 'replicad';
import { OcctBackend, initOcct } from './occtBackend';
import { assertBooleanSucceeded, fuseLeftUnmerged } from './historyAwareBooleans';

// A degenerate OCCT boolean (coplanar/tangent tool faces, a tool that misses
// the body) can leave the builder with IsDone()==false / HasErrors()==true
// while Shape() returns the UNMODIFIED body. Reading the result without
// checking status reports a no-op cut as a successful one. assertBooleanSucceeded
// is the guard: it throws so the failure surfaces as a lowering diagnostic
// instead of silently-unchanged geometry.
describe('assertBooleanSucceeded', () => {
  it('does not throw when the builder is done with no errors', () => {
    expect(() => assertBooleanSucceeded({ IsDone: () => true, HasErrors: () => false }, 'cut')).not.toThrow();
  });

  it('does not throw when the builder is done and exposes no HasErrors()', () => {
    // Some OCCT builder bindings do not expose HasErrors(); IsDone() alone must pass.
    expect(() => assertBooleanSucceeded({ IsDone: () => true }, 'fuse')).not.toThrow();
  });

  it('throws when the builder is not done, naming the operation', () => {
    expect(() => assertBooleanSucceeded({ IsDone: () => false }, 'cut')).toThrow(/cut/);
  });

  it('throws when the builder reports errors', () => {
    expect(() => assertBooleanSucceeded({ IsDone: () => true, HasErrors: () => true }, 'intersect')).toThrow(/intersect/);
  });
});

// OCCT's exact general fuse can return a partially merged compound instead of
// one body — silently, with no builder warning and BRepCheck-valid topology.
// A healed STEP import with a tool tangent to its cylindrical faces triggered
// exactly that (a groove plug that never fused, so the edit was a no-op). The
// detector below is what sends that result to the fuzzy recovery ladder.
describe('fuseLeftUnmerged', () => {
  beforeAll(async () => {
    await initOcct();
  });

  const wrapped = (shape: OcctBackend): unknown => (shape.getReplicadShape() as { wrapped: unknown }).wrapped;
  /** A compound of the two shapes, standing in for a partially merged fuse. */
  const unfusedCompound = (a: OcctBackend, b: OcctBackend): OcctBackend =>
    new OcctBackend(
      makeCompound([a.clone().getReplicadShape(), b.clone().getReplicadShape()]) as never,
    );

  it('accepts a real overlapping fuse that merged into one solid', () => {
    const body = OcctBackend.box(20, 12, 8, true);
    const tool = OcctBackend.box(10, 12, 8, true).translate(14, 0, 0);
    const bodyW = wrapped(body);
    const toolW = wrapped(tool);
    const fused = body.union(tool);
    expect(fuseLeftUnmerged(getOC(), [bodyW, toolW], wrapped(fused))).toBe(false);
  });

  it('does not ask for recovery when the operands are genuinely apart', () => {
    const body = OcctBackend.box(10, 10, 10, true);
    const tool = OcctBackend.box(10, 10, 10, true).translate(40, 0, 0);
    const bodyW = wrapped(body);
    const toolW = wrapped(tool);
    expect(fuseLeftUnmerged(getOC(), [bodyW, toolW], wrapped(unfusedCompound(body, tool)))).toBe(false);
  });

  it('flags a compound of overlapping operands as a partial merge', () => {
    const body = OcctBackend.box(20, 12, 8, true);
    const tool = OcctBackend.box(10, 12, 8, true).translate(14, 0, 0);
    const bodyW = wrapped(body);
    const toolW = wrapped(tool);
    expect(fuseLeftUnmerged(getOC(), [bodyW, toolW], wrapped(unfusedCompound(body, tool)))).toBe(true);
  });

  it('treats face contact as touching, so a butt joint that stayed apart is flagged', () => {
    const body = OcctBackend.box(10, 10, 10, true);
    const tool = OcctBackend.box(10, 10, 10, true).translate(10, 0, 0);
    const bodyW = wrapped(body);
    const toolW = wrapped(tool);
    expect(fuseLeftUnmerged(getOC(), [bodyW, toolW], wrapped(unfusedCompound(body, tool)))).toBe(true);
  });

  it('never flags a single-solid result', () => {
    const body = OcctBackend.box(10, 10, 10, true);
    const bodyW = wrapped(body);
    expect(fuseLeftUnmerged(getOC(), [bodyW], bodyW)).toBe(false);
  });
});
