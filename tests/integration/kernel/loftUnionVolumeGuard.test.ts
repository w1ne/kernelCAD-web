// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The fuse lost-material guard compared fixed-order volume integrals. On
// lofted B-spline solids those read about 7 % high, so a sound union of two
// overlapping lofts measured below its larger operand. The guard then sent it
// to fuzzy recovery, which returned both lofts unmerged (volume = their sum).
// The e46-sedan example body hit this and failed to evaluate. This fixture is
// its nose pattern: a loft grown by 3 mm fused with the same loft shifted
// 3 mm along x.
import { describe, expect, it, vi } from 'vitest';
vi.setConfig({ hookTimeout: 60_000, testTimeout: 60_000 });
import { getOC } from 'replicad';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { accurateVolumeOf, volumeOf } from '../../../src/kernel/backends/occt/booleanRecovery';
import { evaluateAndBuildScript } from '../../../src/composition/scriptEvaluation';

const init = initOcct();

const code = `
type P = [number, number];
function section(half: P[]): Sketch {
  const pts: P[] = half.slice();
  for (let i = half.length - 2; i >= 0; i--) pts.push([-half[i][0], half[i][1]]);
  const [w0, z0] = half[0];
  return path().moveTo(-w0, z0).lineTo(w0, z0).nurbsSegment(pts, { degree: 3 }).close();
}
const half = (s: number, g: number): P[] => {
  const w = 300 + 1.3 * s + g, z0 = 220 - g, zt = 700 + 0.2 * s + g;
  return [[w - 120, z0], [w - 28, z0], [w - 8, z0 + 14], [w, 0.5 * (z0 + zt)], [w - 7, zt - 60],
    [w, zt - 30], [w - 0.4, zt - 27], [w - 9, zt - 24], [0.7 * w, zt], [0.3 * w, zt], [0, zt]];
};
const loftAt = (st: number[], g: number, dx: number): Shape =>
  section(half(st[0], g)).loft(st.slice(1).map((s) => section(half(s, g))), {
    planes: st.map((s) => ({ plane: 'YZ' as const, origin: [s + dx, 0, 0] as [number, number, number] })),
  });
const grown = loftAt([0, 40, 110, 230], 3, 0);
const shifted = loftAt([0, 40, 110, 230], 0, -3);
return grown.union(shifted);
`;

type Wrapped = { getReplicadShape: () => { wrapped: unknown } };

function solidCount(shape: unknown): number {
  const o = getOC() as any;
  const exp = new o.TopExp_Explorer_2(shape, o.TopAbs_ShapeEnum.TopAbs_SOLID, o.TopAbs_ShapeEnum.TopAbs_SHAPE);
  let n = 0;
  for (; exp.More(); exp.Next()) n++;
  exp.delete();
  return n;
}

describe('fuse lost-material guard on lofted solids', () => {
  it('keeps the exact union of two overlapping lofts', async () => {
    await init;
    const built = await evaluateAndBuildScript({ code, file: 'loft-union.kcad.ts' });
    expect(built.evaluation.exitCode).toBe(0);
    if (!built.model) throw new Error('no model');
    const shapes = built.model.shapes as Map<string, Wrapped>;
    const raw = (id: string): unknown => {
      const s = shapes.get(id);
      if (!s) throw new Error(`missing ${id}`);
      return s.getReplicadShape().wrapped;
    };
    const oc = getOC();
    const a = accurateVolumeOf(oc, raw('loft_1'));
    const b = accurateVolumeOf(oc, raw('loft_2'));
    const union = raw('boolean_1');

    // The precondition: the fast integral is too coarse to judge this fuse.
    expect(volumeOf(oc, raw('loft_1')) / a).toBeGreaterThan(1.03);

    expect(solidCount(union)).toBe(1);
    const v = accurateVolumeOf(oc, union);
    expect(v).toBeGreaterThan(Math.max(a, b));
    // The lofts overlap almost entirely: the union is about 1 % above the
    // larger one, not their sum (the unmerged fuzzy fallback).
    expect(v).toBeLessThan(Math.max(a, b) * 1.05);
  });
});
