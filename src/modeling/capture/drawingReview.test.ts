// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';
import { runScript } from '../runtime/runScript';
import { collectDrawingDeclarations } from '../runtime/drawingDeclarations';
const plan = { id: 'plate', requirements: [{ id: 'width', featureId: 'plate', annotationId: 'authored:w', expectedKind: 'linear', role: 'critical', reason: 'Interface' }], decisions: [] };
describe('shape.drawingReview', () => {
  it('collects virtual source plans and stable dimension IDs only upstream of target', async () => {
    const run = await runScript({ code: `const plate = box(40,20,10).dimension({id:'w',kind:'linear',from:[0,0,0],to:[40,0,0]}).drawingReview(${JSON.stringify(plan)}); box(5,5,5).drawingReview({...${JSON.stringify(plan)},id:'unrelated'}); return plate.subtract(cylinder(2,20));`, fileName: 'review.kcad.ts' });
    expect(run.records.filter(r => r.kind === 'drawingReview')).toHaveLength(2);
    expect(run.records.find(r => r.kind === 'drawingReview')?.metadata).toMatchObject({ virtual: true, plan });
    const collected = collectDrawingDeclarations(run.records, (run.returnValue as {id:string}).id);
    expect(collected.reviewPlans).toEqual([plan]);
    expect(collected.dimensions[0]).toMatchObject({ id: 'w' });
  });
  it.each(['""', '" "', '3', 'null'])('rejects malformed stable dimension id %s', async id => {
    await expect(runScript({ code: `return box(1,1,1).dimension({id:${id},kind:'linear',from:[0,0,0],to:[1,0,0]});`, fileName: 'review.kcad.ts' })).rejects.toThrow(/id/);
  });
  it('rejects empty source review plans during capture', async () => {
    await expect(runScript({ code: `return box(1,1,1).drawingReview({id:'empty',requirements:[],decisions:[]});`, fileName: 'review.kcad.ts' })).rejects.toThrow(/empty|at least/);
  });
});
