// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadSmlib } from '../../../../src/modeling/backends/smlib/runtime';
import { cutNoOp, volumeCrossCheck } from '../../../../src/modeling/backends/smlib/guards';
import { importStepShape } from '../../../../src/kernel/import/inspectStep';
import { createLowerer } from '../../../../src/modeling/backends/kernelRegistry';
import type { FeatureRecord } from '../../../../src/shared/intent/featureRecord';
import type { SmlibLowerer } from '../../../../src/modeling/backends/smlib/smlibLowerer';

describe('published 0.2.3 WASM regressions (unpatched)', () => {
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

  it('rejects the raw legacy GT2 volume, then normalizes it on the registry path', async () => {
    const bytes=readFileSync(new URL('../../../fixtures/smlib/gt2-raw.step',import.meta.url));
    const sm=await loadSmlib();
    const raw=sm.fromStep(bytes.toString('utf8'));
    expect(raw).toBeInstanceOf(sm.Part);
    const part=raw as InstanceType<typeof sm.Part>;
    try { expect(() => volumeCrossCheck(1613.9392566474169,part.volume)).toThrow(expect.objectContaining({code:'VOLUME_MISMATCH'})); }
    finally { part.dispose(); }
    const source=await importStepShape(bytes);
    const id='guarded-import' as FeatureRecord['id'];
    const record: FeatureRecord={id,kind:'importedStep',inputs:{},params:{},transforms:[],suppressed:false};
    const lowerer=createLowerer('smlib',{importedGeometry:new Map([[id,source]])}) as SmlibLowerer;
    const result=await lowerer.lower(record,{byKey:{}});
    try {
      expect(result.diagnostics).toContainEqual(expect.objectContaining({code:'recompute.kernel.guard-fallback',message:expect.stringContaining('VOLUME_MISMATCH')}));
      expect(lowerer.guardRecords).toContainEqual(expect.objectContaining({featureId:id,outcome:'fallback',guard:'VOLUME_MISMATCH'}));
      expect(result.shape.volume()).toBeCloseTo(1613.9392566474169,4);
    } finally { result.shape.dispose?.(); source.dispose(); }
  });
});
