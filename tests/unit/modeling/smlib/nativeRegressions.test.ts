// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { loadSmlib } from '../../../../src/modeling/backends/smlib/runtime';
import { cutNoOp } from '../../../../src/modeling/backends/smlib/guards';

describe('published WASM regressions', () => {
  it('0.6 refuses the bowtie cut by name; 0.3 returned the uncut solid', async () => {
    const sm=await loadSmlib();
    const target=sm.Cylinder(10,12).translate([0,0,6]);
    const tool=sm.extrude(sm.Polygon([0,0],[5,4],[0,4],[3,0]),5).translate([0,0,-2]);
    const control=sm.extrude(sm.Polygon([0,0],[5,0],[5,4],[0,4]),5).translate([0,0,-2]);
    let healthy: ReturnType<typeof target.cut> | undefined;
    try {
      // 0.6 throws instead of handing back the uncut cylinder. The profile
      // guard and cutNoOp stay for a kernel that still returns that solid.
      expect(() => target.cut(tool)).toThrow(/uncut/);
      healthy=target.cut(control);
      expect(target.volume-healthy.volume).toBeCloseTo(60,6);
      expect(() => cutNoOp(target.volume,healthy.volume,60)).not.toThrow();
      expect(() => cutNoOp(target.volume,target.volume,1)).toThrow(expect.objectContaining({code:'CUT_NO_OP'}));
    } finally { for (const p of [target,tool,control,healthy]) p?.dispose(); }
  });

});
