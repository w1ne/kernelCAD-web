// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OcctBackend, initOcct } from '../../../../src/kernel/backends/occt/occtBackend';
import { SmlibLowerer } from '../../../../src/modeling/backends/smlib/smlibLowerer';
import * as runtime from '../../../../src/modeling/backends/smlib/runtime';
import type { FeatureRecord } from '../../../../src/shared/intent/featureRecord';

afterEach(() => vi.restoreAllMocks());

describe('fallback is observable and retains the OCCT result', () => {
  it('identifies failed lazy initialization', async () => {
    await initOcct();
    vi.spyOn(runtime,'loadSmlib').mockRejectedValue(new Error('WASM load failed'));
    const lowerer=new SmlibLowerer();
    const record: FeatureRecord={id:'box' as FeatureRecord['id'],kind:'box',inputs:{},params:{
      x:{expression:'10',evaluated:10},y:{expression:'10',evaluated:10},z:{expression:'10',evaluated:10},
    },transforms:[],suppressed:false};
    const result=await lowerer.lower(record,{byKey:{}});
    try {
      expect(result.shape.volume()).toBeCloseTo(1000,6);
      expect(result.diagnostics).toContainEqual(expect.objectContaining({code:'recompute.kernel.guard-fallback',message:expect.stringContaining('KERNEL_EXCEPTION')}));
      expect(lowerer.guardRecords[0]).toMatchObject({outcome:'fallback',guard:'KERNEL_EXCEPTION'});
    } finally { result.shape.dispose?.(); }
  });

  it('identifies changed area across the normalized STEP import boundary', async () => {
    await initOcct();
    const sm=await runtime.loadSmlib();
    const measure=sm.Part.prototype.massProperties;
    vi.spyOn(sm.Part.prototype,'massProperties').mockImplementation(function(this: InstanceType<typeof sm.Part>, ...args) {
      const p=measure.apply(this,args);
      return new sm.MassProperties(p.mass,p.volume,p.area/2,p.center,p.inertia,p.density);
    });
    const source=OcctBackend.box(10,10,10);
    const id='import' as FeatureRecord['id'];
    const lowerer=new SmlibLowerer({importedGeometry:new Map([[id,source]])});
    const result=await lowerer.lower({id,kind:'importedStep',inputs:{},params:{},transforms:[],suppressed:false},{byKey:{}});
    try {
      expect(result.shape.volume()).toBeCloseTo(1000,6);
      expect(result.diagnostics).toContainEqual(expect.objectContaining({code:'recompute.kernel.guard-fallback',message:expect.stringContaining('STEP_IMPORT_INVARIANT')}));
    } finally { result.shape.dispose?.(); source.dispose(); }
  });
});
