// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/backends/occt/featureSanity.test.ts
//
// Post-feature sanity gate: a feature whose kernel result is absurd (an open
// ±1e100 bounding box, a result far outside its inputs, a shell bigger than
// the solid it hollowed) must FAIL with `feature.result.absurd-geometry`
// instead of flowing on as ok:true geometry. Before the gate, a broken
// variableSweep + shell evaluated ok:true with no diagnostics while
// inspect() reported a ±1e100 box and a 2.3e102 volume.

import { describe, it, expect, beforeAll } from 'vitest';
import { cast, getOC } from 'replicad';
import { initOcct, OcctBackend } from '../../../../src/kernel/backends/occt/occtBackend';
import { absurdGeometryDiagnostic } from '../../../../src/modeling/backends/occt/featureSanity';
import { finishLowering } from '../../../../src/modeling/backends/occt/lowerers/transforms';
import { built } from '../../../../src/modeling/backends/occt/lowerers/context';
import type { LowerContext } from '../../../../src/modeling/backends/occt/lowerers/context';
import type { FeatureRecord } from '../../../../src/shared/intent/featureRecord';
import type { Param } from '../../../../src/shared/intent/types';

const mm = (v: number): Param => ({ expression: String(v), unit: 'mm', evaluated: v });

function rec(kind: string, extra: Partial<FeatureRecord> = {}): FeatureRecord {
  return { id: `${kind}_1`, kind, inputs: {}, params: {}, transforms: [], suppressed: false, ...extra } as FeatureRecord;
}

function ctxWith(byKey: Record<string, unknown>): LowerContext {
  return {
    target: 'export-occt',
    inputs: { byKey, records: [] },
    allRecords: [],
    diagnostics: [],
    importedGeometry: new Map(),
    surfaceCache: new Map(),
  } as unknown as LowerContext;
}

describe('post-feature sanity gate', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('rejects an open (±1e100) bounding box on any solid feature', () => {
    // A face on an unbounded plane: OCCT's Bnd_Box for it is OPEN, i.e. the
    // ±1e100 box the dogfood inspect() reported.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const oc = getOC() as any;
    const plane = new oc.gp_Pln_3(new oc.gp_Pnt_3(0, 0, 0), new oc.gp_Dir_4(0, 0, 1));
    const face = new oc.BRepBuilderAPI_MakeFace_3(plane).Face();
    const shape = new OcctBackend(cast(face) as never);
    const d = absurdGeometryDiagnostic(rec('variableSweep'), shape, []);
    expect(d?.code).toBe('feature.result.absurd-geometry');
    expect(d?.severity).toBe('error');
    expect(d?.message).toMatch(/non-finite or wider than/);
  });

  it('rejects a bounded-kind result that runs far outside its inputs', () => {
    const input = OcctBackend.box(20, 20, 20);
    const runaway = OcctBackend.box(20, 20, 20).translate(500, 0, 0);
    const d = absurdGeometryDiagnostic(rec('fillet'), runaway, [input]);
    expect(d?.code).toBe('feature.result.absurd-geometry');
    expect(d?.message).toMatch(/reaches far outside its inputs' box/);
  });

  it('rejects an inward shell whose volume exceeds the body it hollowed', () => {
    const input = OcctBackend.box(20, 20, 20);
    const bigger = OcctBackend.box(22, 22, 22).translate(-1, -1, -1);
    const d = absurdGeometryDiagnostic(rec('shell', { params: { thickness: mm(2) } }), bigger, [input]);
    expect(d?.code).toBe('feature.result.absurd-geometry');
    expect(d?.message).toMatch(/exceeds the solid it hollowed/);
    // An OUTWARD shell (negative thickness) may legitimately add volume.
    expect(absurdGeometryDiagnostic(rec('shell', { params: { thickness: mm(-2) } }), bigger, [input])).toBeNull();
  });

  it('passes plausible results and kinds that legitimately move away from their inputs', () => {
    const input = OcctBackend.box(20, 20, 20);
    expect(absurdGeometryDiagnostic(rec('fillet'), OcctBackend.box(20, 20, 20), [input])).toBeNull();
    const far = OcctBackend.box(20, 20, 20).translate(500, 0, 0);
    expect(absurdGeometryDiagnostic(rec('pattern'), far, [input])).toBeNull();
    expect(absurdGeometryDiagnostic(rec('mirror'), far, [input])).toBeNull();
  });

  it('finishLowering fails the feature closed (no shape, error diagnostic)', () => {
    const input = OcctBackend.box(20, 20, 20);
    const ctx = ctxWith({ base: input });
    const res = finishLowering(ctx, rec('fillet'), built(OcctBackend.box(20, 20, 20).translate(900, 0, 0)));
    expect(res.shape).toBeUndefined();
    expect(res.diagnostics.map((d) => d.code)).toContain('feature.result.absurd-geometry');
  });

  it('checks before the record transforms, so a translated result is not flagged', () => {
    const input = OcctBackend.box(20, 20, 20);
    const ctx = ctxWith({ base: input });
    const moved = rec('fillet', {
      transforms: [{ op: 'translate', vec: { x: mm(900), y: mm(0), z: mm(0) } }],
    } as Partial<FeatureRecord>);
    const res = finishLowering(ctx, moved, built(OcctBackend.box(20, 20, 20)));
    expect(res.diagnostics).toEqual([]);
    expect(res.shape.boundingBox().min[0]).toBeCloseTo(900, 3);
  });
});
