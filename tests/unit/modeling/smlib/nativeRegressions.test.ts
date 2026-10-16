// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { loadSmlib } from '../../../../src/modeling/backends/smlib/runtime';
import { cutNoOp } from '../../../../src/modeling/backends/smlib/guards';

describe('published 0.3.1 WASM regressions (unpatched)', () => {
  it('catches the actual bowtie Boolean no-op and permits the rectangular control', async () => {
    const sm=await loadSmlib();
    const target=sm.Cylinder(10,12).translate([0,0,6]);
    const tool=sm.extrude(sm.Polygon([0,0],[5,4],[0,4],[3,0]),5).translate([0,0,-2]);
    const control=sm.extrude(sm.Polygon([0,0],[5,0],[5,4],[0,4]),5).translate([0,0,-2]);
    const cut=target.cut(tool), healthy=target.cut(control);
    try {
      // Analytic upper bowtie lobe lies inside r=10 cylinder at z=1.
      // This certificate is independent of SMLib and AABBs.
      expect(() => cutNoOp(target.volume,cut.volume,1)).toThrow(expect.objectContaining({code:'CUT_NO_OP'}));
      expect(target.volume-healthy.volume).toBeCloseTo(60,6);
      expect(() => cutNoOp(target.volume,healthy.volume,60)).not.toThrow();
    } finally { for (const p of [target,tool,control,cut,healthy]) p.dispose(); }
  });

});
