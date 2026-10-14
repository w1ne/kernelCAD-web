// SPDX-License-Identifier: MIT
import { expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';

it('keeps repeated HLR projections valid across native garbage collection', () => {
  const probe=`
    import {initOcct,OcctBackend} from './src/kernel/backends/occt/occtBackend.ts';
    import {projectShapeForDrawing,makeDrawingCamera} from './src/kernel/backends/occt/drawingProjection.ts';
    await initOcct();
    const body=OcctBackend.box(80,50,10);
    const camera=makeDrawingCamera('front');
    for(let i=0;i<12;i++) {
      const view=projectShapeForDrawing(body.getReplicadShape(),camera);
      if(!view.visibleSharp.length) throw new Error('Projection lost its visible edges');
      global.gc();
      await new Promise(r=>setImmediate(r));
    }
    console.log('twelve valid projections');
  `;
  const result=spawnSync(process.execPath,['--expose-gc','--import','tsx','--input-type=module','-e',probe],
    {cwd:process.cwd(),encoding:'utf8',timeout:30000,maxBuffer:2*1024*1024});
  expect(result.status).toBe(0);
  expect(result.stderr).toBe('');
  expect(result.stdout).toContain('twelve valid projections');
});
