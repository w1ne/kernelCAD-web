// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// FIX-10 "make real parts survive":
//   - a fillet/chamfer the kernel rejects reports the largest value that
//     VERIFIABLY builds on the same edges (maxFeasibleRadius), never a guess;
//   - a box filleted on every edge, then shelled with the top open, used to
//     fail every MakeThickSolid join mode (and the 0.5× retry hint failed too).
//     It now builds through the offset-and-subtract fallback with the
//     requested wall.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { shellWithHistory } from '../../../src/kernel/backends/occt/historyAwareEdgeFeatures';
import { intersectWithHistory } from '../../../src/kernel/backends/occt/historyAwareBooleans';
import { volumeOf } from '../../../src/kernel/backends/occt/booleanRecovery';
import { buildModel } from '../../../src/modeling/buildModel';
import { probeMaxFeasible, floorToReadable } from '../../../src/modeling/backends/occt/lowerers/feasibilityProbe';
import { shellFailureDiagnostic } from '../../../src/modeling/backends/occt/lowerers/shellDraft';
import { getOC } from 'replicad';

async function build(code: string) {
  return buildModel({ fileName: 'fix10.kcad.ts', code });
}

/** Volume of `shape` inside an axis-aligned probe box. */
function materialIn(shape: OcctBackend, min: [number, number, number], size: [number, number, number]): number {
  const probe = OcctBackend.box(size[0], size[1], size[2]).translate(min[0], min[1], min[2]);
  return volumeOf(getOC(), intersectWithHistory(shape, probe).shape);
}

describe('FIX-10 fillet / chamfer max-feasible probe', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('probeMaxFeasible bisects to the largest value that builds and reports a readable verified value', () => {
    const tried: number[] = [];
    const r = probeMaxFeasible(5, (v) => { tried.push(v); return v <= 2.345; }, 8);
    expect(r.maxFeasible).toBe(2.34);
    expect(r.maxFeasible! <= 2.345).toBe(true);
    expect(tried).toContain(2.34); // the reported value was itself tried
    expect(r.attempts).toBeLessThanOrEqual(9);
    expect(probeMaxFeasible(5, () => false, 6).maxFeasible).toBeUndefined();
    expect(floorToReadable(0.012345)).toBeCloseTo(0.0123, 6);
  });

  it('box(40,30,10).fillet(5) fails and reports maxFeasibleRadius, without applying it', async () => {
    const m = await build(`return box(40, 30, 10).fillet(5);`);
    const d = m.diagnostics.find((x) => x.code === 'feature.kernel-failed');
    expect(d, JSON.stringify(m.diagnostics)).toBeDefined();
    const max = d!.details?.maxFeasibleRadius as number;
    // Half the 10 mm height is the geometric ceiling; the probe lands just under.
    expect(max).toBeGreaterThan(4.9);
    expect(max).toBeLessThan(5);
    expect(d!.hint).toContain(`largest radius that works on these 12 edges is ${max} mm`);
    expect(d!.nextAction).toMatchObject({ kind: 'retry-with-smaller-param', param: 'radius' });
    // Reported, not silently applied: the feature failed.
    expect(m.tailShape).toBeUndefined();
    // ...and the reported radius really builds.
    const ok = await build(`return box(40, 30, 10).fillet(${max});`);
    expect(ok.diagnostics.filter((x) => x.severity === 'error')).toEqual([]);
    expect(ok.tailShape!.volume()).toBeGreaterThan(0);
  }, 120_000);

  it('chamfer shares the probe and no longer leaks a raw WASM pointer', async () => {
    const m = await build(`return box(40, 30, 10).chamfer(5);`);
    const d = m.diagnostics.find((x) => x.code === 'feature.kernel-failed');
    expect(d, JSON.stringify(m.diagnostics)).toBeDefined();
    expect(d!.message).not.toMatch(/failed: \d+$/);
    expect(d!.details?.maxFeasibleDistance).toBeGreaterThan(4.9);
    expect(d!.details?.maxFeasibleDistance).toBeLessThan(5);
  }, 120_000);
});

describe('FIX-10 shell after fillet-all', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('reproduces: every MakeThickSolid join mode fails on the filleted box; shellWithHistory falls back', async () => {
    const body = (await build(`return box(60, 40, 30).fillet(5);`)).tailShape as OcctBackend;
     
    const oc = getOC() as any;
     
    const solid = (body.getReplicadShape() as any).wrapped;
    // The top face: the planar face centred at z=30 with area 50×30.
    let top: unknown;
    let topHash = '';
    const ex = new oc.TopExp_Explorer_2(solid, oc.TopAbs_ShapeEnum.TopAbs_FACE, oc.TopAbs_ShapeEnum.TopAbs_SHAPE);
    for (; ex.More(); ex.Next()) {
      const f = ex.Current();
      const p = new oc.GProp_GProps_1();
      oc.BRepGProp.SurfaceProperties_1(f, p, false, false);
      if (Math.abs(p.CentreOfMass().Z() - 30) < 1e-6 && Math.abs(p.Mass() - 1500) < 1e-3) {
        top = f;
        topHash = f.HashCode(2147483647).toString(16);
      }
      p.delete();
    }
    ex.delete();
    expect(top).toBeDefined();
    const J = oc.GeomAbs_JoinType;
    for (const [intersection, join] of [[false, J.GeomAbs_Arc], [true, J.GeomAbs_Arc], [true, J.GeomAbs_Intersection]]) {
      const faces = new oc.TopTools_ListOfShape_1();
      faces.Append_1(top);
      const builder = new oc.BRepOffsetAPI_MakeThickSolid();
      const progress = new oc.Message_ProgressRange_1();
      let done = false;
      try {
        builder.MakeThickSolidByJoin(solid, faces, -1.5, 1e-3, oc.BRepOffset_Mode.BRepOffset_Skin, intersection, false, join, false, progress);
        builder.Build(progress);
        done = builder.IsDone();
      } catch {
        done = false;
      }
      expect(done).toBe(false);
      builder.delete(); progress.delete(); faces.delete();
    }
    const r = shellWithHistory(body, [{ hash: topHash }], 1.5);
    expect(r.strategy).toBe('offset-subtract');
    expect(r.deletedFaces.has(topHash)).toBe(true);
  }, 120_000);

  it('box(60,40,30).fillet(5).shell(1.5, top) builds with a 1.5 mm wall and the right volume', async () => {
    const outer = (await build(`return box(60, 40, 30).fillet(5);`)).tailShape!;
    const inner = (await build(`return box(57, 37, 27).fillet(3.5).translate(1.5, 1.5, 1.5);`)).tailShape!;
    const m = await build(`return box(60, 40, 30).fillet(5).shell(1.5, { face: 'top' });`);
    expect(m.diagnostics.filter((d) => d.severity === 'error'), JSON.stringify(m.diagnostics)).toEqual([]);
    expect(m.diagnostics.map((d) => d.code)).toContain('feature.shell.boolean-fallback');
    const shelled = m.tailShape as OcctBackend;
    // Outer − inner offset − the 50×30 flat opening through the 1.5 mm top.
    const expected = outer.volume() - inner.volume() - 50 * 30 * 1.5;
    expect(shelled.volume()).toBeCloseTo(expected, 0);
    expect(shelled.volume()).toBeGreaterThan(11_000);
    // Wall thickness, measured: a 2×2 mm column through the floor holds
    // 2×2×1.5 mm³ of material; same through a side wall at mid-height.
    expect(materialIn(shelled, [29, 19, -1], [2, 2, 10])).toBeCloseTo(6, 3);
    expect(materialIn(shelled, [-1, 19, 14], [10, 2, 2])).toBeCloseTo(6, 3);
    // The top is open: nothing at the top face centre.
    expect(materialIn(shelled, [29, 19, 25], [2, 2, 10])).toBeCloseTo(0, 6);
    // Bounding box unchanged.
    const bb = shelled.boundingBox();
    expect(bb.max[2] - bb.min[2]).toBeCloseTo(30, 2);
  }, 180_000);

  it('a failing shell only suggests a thinner wall that was verified to build', () => {
    const verified = shellFailureDiagnostic('s1', 'boom', 6, (t) => t <= 3);
    expect(verified.hint).toMatch(/A 3 mm wall builds on this body, verified/);
    expect(verified.details?.verifiedThickness).toBe(3);
    const none = shellFailureDiagnostic('s1', 'boom', 1.5, () => false);
    expect(none.hint).toMatch(/0\.75 mm and 0\.375 mm also fail, verified/);
    expect(none.hint).not.toMatch(/thinner wall of/);
    expect(none.nextAction?.kind).toBe('rewrite-feature');
    expect(none.hint).toMatch(/outer\.subtract\(inner\)/);
  });
});
