// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import ring from '../../../fixtures/smlib/ring-selfx.json';
import type { Point2 } from '../../../../src/modeling/backends/smlib/guards';
import healthy from '../../../fixtures/smlib/healthy-volumes.json';
import { cutNoOp, profileSelfIntersections, repairInvariant, requireSimpleProfile, volumeCrossCheck } from '../../../../src/modeling/backends/smlib/guards';

describe('prototype regressions (recorded measurements, not live WASM builds)', () => {
  const bad = [
    ['bowtie', 'SELF_INTERSECTION', () => requireSimpleProfile([[0,0],[5,4],[0,4],[3,0]])],
    ['ring crossing', 'SELF_INTERSECTION', () => requireSimpleProfile(ring as Point2[])],
    ['certified unchanged cut', 'CUT_NO_OP', () => cutNoOp(3769.911184307752,3769.911184307752,1)],
    ['repair area loss', 'AREA_MISMATCH', () => repairInvariant({volume:100,area:10},{volume:100,area:5})],
    ['repair nonfinite area', 'BAD_MEASURE', () => repairInvariant({volume:100,area:10},{volume:100,area:NaN})],
  ] as const;
  it.each(bad)('%s rejects with %s', (_name, code, run) => {
    expect(run).toThrow(expect.objectContaining({ code }));
  });
  it.each(healthy)('$runtime / $case passes the 0.1% check', ({reference,candidate}) => {
    expect(() => volumeCrossCheck(reference,candidate)).not.toThrow();
  });
  it('never certifies overlap from an AABB', () => {
    expect(() => cutNoOp(100,100,undefined)).not.toThrow();
    expect(() => cutNoOp(100,100,0)).not.toThrow();
    expect(() => cutNoOp(100,99.9,.1)).not.toThrow();
  });
  it('rejects adjacent backtracking and degenerate profiles after deduplication', () => {
    expect(profileSelfIntersections([[0,0],[2,0],[1,0]])).toContainEqual({a:0,b:1});
    expect(()=>requireSimpleProfile([[0,0],[1,0],[0,0]])).toThrow(expect.objectContaining({code:'BAD_PROFILE'}));
  });
});
