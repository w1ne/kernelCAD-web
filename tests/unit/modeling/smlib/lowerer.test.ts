// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { createLowerer } from '../../../../src/modeling/backends/kernelRegistry';
import { buildModel } from '../../../../src/modeling/buildModel';

describe('guarded SMLib registry path (live WASM)', () => {
  it('is opt-in; constructing a factory does not initialize WASM', () => {
    expect(createLowerer().target).toBe('export-occt');
    expect(createLowerer('smlib').target).toBe('export-smlib');
  });
  it('builds a polygon extrusion and fillet with explicit SMLib', async () => {
    const model = await buildModel({
      code: 'export default kc.extrudePolygon([[0,0],[10,0],[10,10],[0,10]], 5).fillet(0.5);',
      fileName: '<smlib-live>', kernel: 'smlib',
    });
    expect(model.diagnostics).toEqual([]);
    expect([...model.shapes.values()].some(s => s.volume() > 0)).toBe(true);
  });
  it('falls back visibly for unsupported features', async () => {
    const model = await buildModel({ code: 'export default kc.box(10,10,10).chamfer(0.5);', fileName:'<fallback>', kernel:'smlib' });
    expect(model.diagnostics).toContainEqual(expect.objectContaining({
      code:'recompute.kernel.guard-fallback', message:expect.stringContaining('UNSUPPORTED_FEATURE'),
    }));
  });
  it('accepts the smooth spur-gear extrusion candidate', async () => {
    const model = await buildModel({code:'export default kc.spurGear({module:1.75,teeth:20,faceWidth:5});',fileName:'<smooth-gear>',kernel:'smlib'});
    expect(model.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    const extrusion = model.records.find(r => r.kind === 'extrude')!;
    expect(model.diagnostics.filter(d => d.featureId === extrusion.id)).toEqual([]);
    expect(model.shapes.get(extrusion.id)!.volume()).toBeGreaterThan(1000);
  });
  it('preserves selected primitive faces across accepted candidates', async () => {
    const model=await buildModel({code:"export default kc.box(10,10,10).fillet(0.5, {face:'top'});",fileName:'<named-face>',kernel:'smlib'});
    expect(model.diagnostics.filter(d=>d.severity==='error')).toEqual([]);
    expect(model.rootShape!.volume()).toBeGreaterThan(990);
  });
});
