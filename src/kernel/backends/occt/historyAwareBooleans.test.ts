// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/historyAwareBooleans.test.ts
import { beforeAll, describe, it, expect } from 'vitest';
import { getOC, makeCompound } from 'replicad';
import { OcctBackend, initOcct } from './occtBackend';
import { assertBooleanSucceeded, fuseLeftUnmerged, fuseLostMaterial } from './historyAwareBooleans';

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

  it('accepts a fuse into one solid of a multi-solid body (the other solid stays apart)', () => {
    // A clevis parent is a fork plus a separate pin: a tool that merges with
    // the fork leaves two solids, and that is the full merge.
    const fork = OcctBackend.box(20, 12, 8, true);
    const pin = OcctBackend.box(4, 4, 4, true).translate(0, 40, 0);
    const body = unfusedCompound(fork, pin);
    const tool = OcctBackend.box(10, 12, 8, true).translate(14, 0, 0);
    const merged = unfusedCompound(fork.union(tool), pin);
    expect(fuseLeftUnmerged(getOC(), [wrapped(body), wrapped(tool)], wrapped(merged))).toBe(false);
  });

  it('still flags a multi-solid body whose touching tool stayed apart', () => {
    const fork = OcctBackend.box(20, 12, 8, true);
    const pin = OcctBackend.box(4, 4, 4, true).translate(0, 40, 0);
    const body = unfusedCompound(fork, pin);
    const tool = OcctBackend.box(10, 12, 8, true).translate(14, 0, 0);
    const partial = new OcctBackend(
      makeCompound([fork.clone().getReplicadShape(), pin.clone().getReplicadShape(), tool.clone().getReplicadShape()]) as never,
    );
    expect(fuseLeftUnmerged(getOC(), [wrapped(body), wrapped(tool)], wrapped(partial))).toBe(true);
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

// OCCT's exact fuse of a healed STEP import with a filleted tool whose R4.95
// corners sat 0.05 mm inside the import's R5 corners returned an EMPTY shape,
// with no builder warning (CADGenBench 248). It exported as an empty STEP while
// evaluate reported OK. A union always contains each operand, so a result
// smaller than the largest operand solid is sent to recovery, then refused.
describe('fuseLostMaterial', () => {
  beforeAll(async () => {
    await initOcct();
  });

  const wrapped = (shape: OcctBackend): unknown => (shape.getReplicadShape() as { wrapped: unknown }).wrapped;

  it('accepts a real fuse', () => {
    const body = OcctBackend.box(20, 12, 8, true);
    const tool = OcctBackend.box(10, 12, 8, true).translate(14, 0, 0);
    const inputs = [wrapped(body), wrapped(tool)];
    expect(fuseLostMaterial(getOC(), inputs, wrapped(body.union(tool)))).toBeUndefined();
  });

  it('accepts a tool buried inside the body (no volume change)', () => {
    const body = OcctBackend.box(20, 20, 20, true);
    const tool = OcctBackend.box(5, 5, 5, true);
    expect(fuseLostMaterial(getOC(), [wrapped(body), wrapped(tool)], wrapped(body.union(tool)))).toBeUndefined();
  });

  it('flags an empty result', () => {
    const body = OcctBackend.box(20, 12, 8, true);
    const tool = OcctBackend.box(10, 12, 8, true).translate(14, 0, 0);
    const empty = new OcctBackend(makeCompound([]) as never);
    const lost = fuseLostMaterial(getOC(), [wrapped(body), wrapped(tool)], wrapped(empty));
    expect(lost).toEqual({ resultVolume: 0, largestSolid: expect.closeTo(20 * 12 * 8, 3) });
  });

  it('flags a result that kept only the smaller operand', () => {
    const body = OcctBackend.box(20, 12, 8, true);
    const tool = OcctBackend.box(10, 12, 8, true).translate(14, 0, 0);
    const lost = fuseLostMaterial(getOC(), [wrapped(body), wrapped(tool)], wrapped(tool.clone()));
    expect(lost?.largestSolid).toBeCloseTo(20 * 12 * 8, 3);
  });

  it('measures operand solids one by one, so an overlapping compound operand is not double-counted', () => {
    const a = OcctBackend.box(10, 10, 10, true);
    const b = OcctBackend.box(10, 10, 10, true).translate(5, 0, 0);
    const overlapping = new OcctBackend(makeCompound([a.clone().getReplicadShape(), b.clone().getReplicadShape()]) as never);
    // The compound "volume" is 2000 mm³; the true union is 1500 mm³ and is correct.
    expect(fuseLostMaterial(getOC(), [wrapped(overlapping)], wrapped(a.union(b)))).toBeUndefined();
  });
});
