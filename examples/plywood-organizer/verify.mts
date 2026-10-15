import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {evaluateAndBuildScript} from '../../src/agent/cli/commands/evaluate';
import {isSceneBackend} from '../../src/kernel/backends/sceneBackend';
const dir = new URL('.', import.meta.url).pathname;
const file=dir+'/organizer.kcad.ts';
const evaluated=await evaluateAndBuildScript({file});
assert.equal(evaluated.evaluation.exitCode,0,JSON.stringify(evaluated.evaluation.diagnostics));
const scene=evaluated.model?.rootShape;assert(isSceneBackend(scene));
assert.equal(scene.parts.length,7);
const rows=scene.parts.map(p=>({name:p.name,bounds:p.shape.boundingBox(),volumeMm3:p.shape.volume()}));
for(const p of rows) assert(p.volumeMm3>0,p.name);
const min=[0,1,2].map(i=>Math.min(...rows.map(p=>p.bounds.min[i])));
const max=[0,1,2].map(i=>Math.max(...rows.map(p=>p.bounds.max[i])));
const envelope=max.map((v,i)=>v-min[i]);
assert.deepEqual(envelope,[150,100,46]);
const collisions=[];
let pairs=0;
for(let i=0;i<scene.parts.length;i++)for(let j=i+1;j<scene.parts.length;j++){
  pairs++;
  const a=scene.parts[i],b=scene.parts[j];
  const v=Math.abs(a.shape.intersect(b.shape).volume());
  if(v>1e-6)collisions.push({a:a.name,b:b.name,volumeMm3:v});
}
assert.equal(collisions.length,0,JSON.stringify(collisions));
const evidence={checkedAt:new Date().toISOString(),sourceSha256:createHash('sha256').update(await readFile(file)).digest('hex'),nativeKernel:'OCCT via evaluateAndBuildScript',envelopeMm:envelope,partCount:7,pairsChecked:pairs,positiveVolumeOverlaps:collisions,parts:rows,fit:{illustrativeThicknessMm:6,uncompensatedSlotWidthMm:6.2,endClearanceMm:0.2,halfLapDepthMm:20},scope:'Native static geometry and nominal envelope; no physical stock measurement, laser kerf, adhesive strength, physical cutting or assembled fit verified.'};
await writeFile(dir+'/geometry-evidence.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
