// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { mkdirSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { buildModelFromFile } from '../../../src/modeling/buildModel';
import { importStepShape } from '../../../src/kernel/import/inspectStep';
import { createLowerer } from '../../../src/modeling/backends/kernelRegistry';
import type { SmlibLowerer } from '../../../src/modeling/backends/smlib/smlibLowerer';
import type { FeatureRecord } from '../../../src/shared/intent/featureRecord';
import { readFileSync } from 'node:fs';

const out='docs/demos/smlib-guarded/evidence';
mkdirSync(out,{recursive:true});
for (const name of ['gear','fillet']) {
  const start=performance.now();
  const model=await buildModelFromFile({file:`docs/demos/smlib-guarded/${name}.kcad.ts`,kernel:'smlib'});
  const durationMs=performance.now()-start;
  if (model.diagnostics.some(d=>d.severity==='error')) throw new Error(JSON.stringify(model.diagnostics));
  const last=model.rootShape!;
  const mesh=last.getMesh();
  writeFileSync(`${out}/${name}.json`,JSON.stringify({name,kernel:'smlib',durationMs,volume:last.volume(),area:last.surfaceArea(),diagnostics:model.diagnostics,mesh:{vertices:Array.from(mesh.positions),triangles:Array.from(mesh.indices)}}));
  // Sketch records have no solid handle; dispose only the owned returned solid.
  last.dispose?.();
}
const source=await importStepShape(readFileSync('tests/fixtures/smlib/gt2-raw.step'));
const id='demo-import' as FeatureRecord['id'];
const lowerer=createLowerer('smlib',{importedGeometry:new Map([[id,source]])}) as SmlibLowerer;
const result=await lowerer.lower({id,kind:'importedStep',inputs:{},params:{},transforms:[],suppressed:false},{byKey:{}});
writeFileSync(`${out}/fallback.json`,JSON.stringify({volume:result.shape.volume(),diagnostics:result.diagnostics,records:lowerer.guardRecords,mesh:{vertices:Array.from(result.shape.getMesh().positions),triangles:Array.from(result.shape.getMesh().indices)}},null,2));
result.shape.dispose?.();source.dispose();
console.log('Captured local guarded-kernel meshes and fallback diagnostics');
