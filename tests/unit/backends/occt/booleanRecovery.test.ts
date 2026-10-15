// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// FIX-10: a boolean whose operands touch tangentially makes OCCT's exact
// boolean finish with warnings and an INVALID solid (wrong volume). The
// history-aware boolean now retries with a fuzzy value scaled to the operands
// and reports which strategy succeeded.

import { describe, it, expect, beforeAll } from 'vitest';
import { getOC } from 'replicad';
import * as replicad from 'replicad';
import { initOcct, OcctBackend } from '../../../../src/kernel/backends/occt/occtBackend';
import { fuseWithHistory, intersectWithHistory } from '../../../../src/kernel/backends/occt/historyAwareBooleans';
import {
  booleanRecoveryDiagnostic,
  isValidShape,
  plausibleBooleanVolume,
  scaledFuzzyValue,
  volumeOf,
} from '../../../../src/kernel/backends/occt/booleanRecovery';
import { buildModel } from '../../../../src/modeling/buildModel';

// A 20 mm cube and a Ø10 × 30 cylinder whose side is tangent to the cube's
// x=0 face, tilted 1e-5° so the tangency is not exactly analytic.
const cube = () => OcctBackend.box(20, 20, 20);
const tangentCylinder = () => OcctBackend.cylinder(30, 5).rotate([1, 0, 0], 1e-5).translate(5, 10, -5);
// 8000 cube + the 10 mm of cylinder that sticks out (5 below, 5 above).
const EXPECTED_FUSE = 8000 + Math.PI * 25 * 10;

/** The historical, exact-only boolean — the failure being fixed. */
function exactFuse(a: OcctBackend, b: OcctBackend): { valid: boolean; warned: boolean; volume: number } {
   
  const o = getOC() as any;
  const builder = new o.BRepAlgoAPI_Fuse_1();
  const args = new o.TopTools_ListOfShape_1();
  const tools = new o.TopTools_ListOfShape_1();
   
  args.Append_1((a.getReplicadShape() as any).wrapped);
   
  tools.Append_1((b.getReplicadShape() as any).wrapped);
  builder.SetArguments(args);
  builder.SetTools(tools);
  const progress = new o.Message_ProgressRange_1();
  builder.Build(progress);
  const out = {
    valid: isValidShape(o, builder.Shape()),
    warned: builder.HasWarnings() as boolean,
    volume: volumeOf(o, builder.Shape()),
  };
  builder.delete(); args.delete(); tools.delete(); progress.delete();
  return out;
}

describe('boolean recovery (fuzzy retry)', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('reproduces: the exact fuse of a tangent cylinder is invalid and double-counts the overlap', () => {
    const r = exactFuse(cube(), tangentCylinder());
    expect(r.warned).toBe(true);
    expect(r.valid).toBe(false);
    // 8000 + the WHOLE cylinder (2356.2) — the overlap was never removed.
    expect(r.volume).toBeCloseTo(8000 + Math.PI * 25 * 30, 0);
  });

  it('fuseWithHistory recovers with a scaled fuzzy value: valid solid, correct volume, history intact', () => {
    const body = cube();
    const result = fuseWithHistory(body, tangentCylinder());
    const oc = getOC();
    expect(result.strategy).toBe('fuzzy');
    expect(result.fuzzyValue).toBeCloseTo(scaledFuzzyValue(Math.hypot(20, 20, 30)), 8);
    expect(isValidShape(oc, result.shape)).toBe(true);
    expect(volumeOf(oc, result.shape)).toBeCloseTo(EXPECTED_FUSE, 1);
    // History still maps every body face: the untouched right face (x=20)
    // either keeps its hash or has a recorded child that exists in the result.
     
    const rightHash = (body as any).findCanonicalFaceHash('right') as string;
     
    const out = new OcctBackend(replicad.cast(result.shape as any) as replicad.Shape3D);
     
    const outFaces = new Set<string>((out as any).faceHashes());
    const children = result.faceHistory.get(rightHash) ?? [rightHash];
    expect(result.deletedFaces.has(rightHash)).toBe(false);
    expect(children.every((h) => outFaces.has(h))).toBe(true);
    // The tangent left face (x=0) was split/modified, and recorded as such.
     
    const leftHash = (body as any).findCanonicalFaceHash('left') as string;
    expect(result.faceHistory.get(leftHash)?.every((h) => outFaces.has(h))).toBe(true);
  });

  it('the recovery is reported as an info diagnostic; exact results report nothing', () => {
    const recovered = fuseWithHistory(cube(), tangentCylinder());
    const d = booleanRecoveryDiagnostic('b1', 'boolean union', recovered);
    expect(d?.code).toBe('feature.boolean.recovered');
    expect(d?.severity).toBe('info');
    expect(d?.details?.strategy).toBe('fuzzy');
    expect(d?.message).toMatch(/invalid solid/);
    const exact = intersectWithHistory(cube(), OcctBackend.box(10, 10, 10).translate(5, 5, 5));
    expect(exact.strategy).toBe('exact');
    expect(booleanRecoveryDiagnostic('b2', 'boolean intersection', exact)).toBeUndefined();
  });

  it('volume sanity bounds reject a glue result that silently skipped the cut', () => {
    expect(plausibleBooleanVolume('cut', 8000, [8000, 2356])).toBe(true); // can be a no-op cut
    expect(plausibleBooleanVolume('fuse', 10356, [8000, 2356])).toBe(true);
    expect(plausibleBooleanVolume('fuse', 7000, [8000, 2356])).toBe(false);
    expect(plausibleBooleanVolume('intersect', 3000, [8000, 2356])).toBe(false);
    expect(scaledFuzzyValue(1e9)).toBe(1e-2);
    expect(scaledFuzzyValue(0.001)).toBe(1e-6);
  });

  it('a .kcad.ts union of the tangent operands builds and surfaces feature.boolean.recovered', async () => {
    const m = await buildModel({
      fileName: 'tangent.kcad.ts',
      code: `return box(20, 20, 20).union(cylinder(30, 5).rotate([1, 0, 0], 0.00001).translate(5, 10, -5));`,
    });
    expect(m.diagnostics.filter((d) => d.severity === 'error'), JSON.stringify(m.diagnostics)).toEqual([]);
    const info = m.diagnostics.find((d) => d.code === 'feature.boolean.recovered');
    expect(info, JSON.stringify(m.diagnostics)).toBeDefined();
    expect(m.tailShape!.volume()).toBeCloseTo(EXPECTED_FUSE, 0);
  }, 60_000);
});
