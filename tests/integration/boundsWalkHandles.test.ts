// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The bounds walks (spline, offset and pruned exact box) left every
// `exp.Current()` copy and `TopoDS.Face_1` / `Edge_1` / `Vertex_1` downcast
// undeleted. The GC safety net held a registration for each until the scene
// summary returned: the SO-100 arm `evaluate_script` aborted at the hosted
// 768 MB heap. Every such handle must be deleted when the walk returns, and
// the boxes must not change.

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { getOC } from 'replicad';
import { initOcct, type OcctBackend } from '../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../src/modeling/runtime/runScript';
import { RecomputeEngine } from '../../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../src/modeling/backends/occt/occtLowerer';
import { offsetFaceBounds, prunedExactBounds, toleranceInclusiveBounds } from '../../src/kernel/backends/occt/backendBounds';
import { splineFaceBounds } from '../../src/kernel/backends/occt/splineFaceBounds';

async function lower(code: string): Promise<OcctBackend> {
  const run = await runScript({ code, fileName: 'test.kcad.ts' });
  const engine = new RecomputeEngine(createOcctLowerer(run.session));
  const r = await engine.run(run.records, { paramTable: run.paramTable });
  expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  return r.shapes.get(run.records[run.records.length - 1].id) as OcctBackend;
}

type Handle = { isDeleted(): boolean };
const restores: Array<() => void> = [];

/** Record every handle returned by `owner[name]` until `afterEach`. */
function spy(owner: Record<string, unknown>, name: string, seen: Handle[]): void {
  const original = owner[name] as (...args: unknown[]) => Handle;
  owner[name] = function (this: unknown, ...args: unknown[]) {
    const handle = original.apply(this, args);
    seen.push(handle);
    return handle;
  };
  restores.push(() => {
    owner[name] = original;
  });
}

/** Handles returned by explorer `Current()` and the three downcasts. */
function watchWalkHandles(): Handle[] {
  const oc = getOC() as any;
  const seen: Handle[] = [];
  let proto = oc.TopExp_Explorer_2.prototype;
  while (!Object.prototype.hasOwnProperty.call(proto, 'Current')) proto = Object.getPrototypeOf(proto);
  spy(proto, 'Current', seen);
  for (const name of ['Face_1', 'Edge_1', 'Vertex_1']) spy(oc.TopoDS, name, seen);
  return seen;
}

beforeAll(async () => {
  await initOcct();
}, 120_000);

afterEach(() => {
  while (restores.length) restores.pop()!();
});

describe('bounds walks delete their sub-shape handles', () => {
  it.each([
    ['spline bounds', splineFaceBounds],
    ['offset bounds', offsetFaceBounds],
    ['pruned exact bounds', prunedExactBounds],
  ] as const)('%s', async (_name, bounds) => {
    const shape = (await lower('return box(20, 10, 8).fillet(2).scale([1.5, 1, 1]).subtract(cylinder(20, 2).translate(15, 5, -5));'))
      .getReplicadShape().wrapped;
    const before = bounds(shape);
    const seen = watchWalkHandles();
    const after = bounds(shape);
    // The walk visited every vertex and face; none of those handles survives.
    expect(seen.length).toBeGreaterThan(40);
    expect(seen.filter((h) => !h.isDeleted())).toEqual([]);
    expect(after).toEqual(before);
  });

  it('keeps the pruned box equal to the whole-shape exact box', async () => {
    const shape = (await lower('return box(10, 10, 10).union(cylinder(4, 30).scale([3, 1, 1]).translate(5, 5, -10));'))
      .getReplicadShape().wrapped;
    const whole = toleranceInclusiveBounds(shape)!;
    const pruned = prunedExactBounds(shape)!;
    [0, 1, 2].forEach((i) => {
      expect(pruned.min[i]).toBeCloseTo(whole.min[i], 9);
      expect(pruned.max[i]).toBeCloseTo(whole.max[i], 9);
    });
  });
});
