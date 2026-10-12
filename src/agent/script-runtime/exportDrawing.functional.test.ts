// SPDX-License-Identifier: MIT
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../kernel/backends/occt/occtBackend';
import { runAndExport } from './export';
import { declaredDrawingAnnotation } from '../../kernel/backends/occt/viewerDimensions/drawingAnnotation';
import { drawingDecisionKey } from '../../shared/intent/drawingReview';

beforeAll(initOcct);
const plan = { id: 'mount', requirements: [{ id: 'width', featureId: 'plate interface', annotationId: 'authored:width', expectedKind: 'linear', role: 'critical', reason: 'Mating width' }], decisions: [] };
const dimension = `{id:'width',kind:'linear',from:[0,0,10],to:[80,0,10]}`;
const code = `return box(80,50,10).dimension(${dimension}).drawingReview(${JSON.stringify(plan)});`;
const options = { format: 'svg-drawing' as const, date: '2026-10-12', autoAnnotate: false };
function svg(extra = {}, source = code) { return runAndExport({ code: source, fileName: 'functional.kcad.ts', format: 'svg-drawing', options: { ...options, ...extra } }); }

describe('functional review exports', () => {
  it('preserves stable IDs in unresolved conversion fallbacks for every kind', () => {
    for (const d of [{ id: 'linear', kind: 'linear', from: {edge:{}}, to:[1,0,0] }, { id: 'angular', kind: 'angular', from:{},to:{} }, { id:'diameter',kind:'diameter',edge:{} }, {id:'radius',kind:'radius',edge:{}}]) {
      expect(declaredDrawingAnnotation([], d as never)).toHaveProperty('id', d.id);
    }
  });
  it('evaluates actual source-only dimensions after layout and returns equal SVG/PDF reports', async () => {
    const preview = await svg({ pdfSheet: true, requireCompleteReview: true });
    const pdf = await runAndExport({ code, fileName: 'functional.kcad.ts', format: 'pdf-drawing', options: { ...options, format: 'pdf-drawing', requireCompleteReview: true } });
    expect(preview.drawingReport?.annotations[0]).toMatchObject({ id:'authored:width', source:'authored', kind:'linear' });
    expect(preview.drawingReport?.review).toMatchObject({ status:'complete', criticalCount:1, coveredCriticalCount:1 });
    expect(preview.drawingReport).toEqual(pdf.drawingReport);
    expect(new TextDecoder().decode(pdf.bytes.slice(0,8))).toContain('%PDF');
  });
  it('returns hidden and label-overridden reports ordinarily and refuses strict exports', async () => {
    for (const [override,status] of [[{suppress:true},'hidden'],[{text:'FREE TEXT'},'label-overridden']] as const) {
      const extra = {annotationOverrides:{'authored:width':override}};
      expect((await svg(extra)).drawingReport?.review).toMatchObject({status:'incomplete',requirements:[{status}]});
      await expect(svg({...extra,requireCompleteReview:true})).rejects.toThrow(/complete|incomplete/);
    }
  });
  it('creates a missing coverage report with no authored or automatic annotations', async () => {
    const result = await svg({}, `return box(80,50,10).drawingReview(${JSON.stringify(plan)});`);
    expect(result.drawingReport?.review).toMatchObject({status:'incomplete',requirements:[{status:'missing'}]});
    expect(result.diagnostics.some(d => d.code === 'drawing.review.incomplete')).toBe(true);
    await expect(svg({requireCompleteReview:true}, `return box(80,50,10).drawingReview(${JSON.stringify(plan)});`)).rejects.toThrow(/incomplete/);
  });
  it('reports not-declared and rejects strict legacy exports', async () => {
    expect((await svg({autoAnnotate:true}, 'return box(80,50,10);')).drawingReport?.review.status).toBe('not-declared');
    await expect(svg({requireCompleteReview:true}, 'return box(80,50,10);')).rejects.toThrow(/not-declared/);
  });
  it('rejects note/datum substitution even with the exact authored ID', async () => {
    for (const annotation of [{id:'width',kind:'note',at:[0,0,10],text:'80'}, {id:'width',kind:'datum',face:{atZ:10},label:'A'}]) {
      expect((await svg({annotations:[annotation]})).drawingReport?.review.requirements[0].status).toBe('kind-mismatch');
    }
  });
  it('rejects upstream source plan conflicts and malformed option containers', async () => {
    await expect(svg({}, `const plate=box(80,50,10).drawingReview(${JSON.stringify(plan)}); return plate.subtract(cylinder(20,2)).drawingReview(${JSON.stringify(plan)});`)).rejects.toThrow(/duplicate/);
    for (const extra of [{reviewPlans:null},{reviewPlans:{}},{requireCompleteReview:'yes'},{decisionResolutions:null}]) await expect(svg(extra)).rejects.toThrow();
  });
  it('prevents options erasing or conflicting with upstream source plans', async () => {
    expect((await svg({reviewPlans:[]})).drawingReport?.review.status).toBe('complete');
    await expect(svg({reviewPlans:[plan]})).rejects.toThrow(/duplicate/);
    await expect(svg({reviewPlans:[{id:'empty',requirements:[],decisions:[]}]})).rejects.toThrow(/empty|at least/);
  });
  it('forwards namespaced decision overrides through printable PDF options', async () => {
    const decisions = {id:'fit',requirements:[],decisions:[{id:'bore',kind:'fit',featureId:'bearing bore',prompt:'Select fit'}]};
    const source = `return box(80,50,10).drawingReview(${JSON.stringify(decisions)});`;
    const key = drawingDecisionKey('fit','bore');
    expect((await svg({}, source)).drawingReport?.review.status).toBe('incomplete');
    const extra = {reviewPlans:[],decisionResolutions:{[key]:{note:'Illustrative clearance',provenance:'Example engineering brief'}},requireCompleteReview:true};
    const preview = await svg({...extra,pdfSheet:true},source);
    const pdf = await runAndExport({code:source,fileName:'functional.kcad.ts',format:'pdf-drawing',options:{...options,...extra,format:'pdf-drawing'}});
    expect(preview.drawingReport?.review.status).toBe('complete');
    expect(preview.drawingReport).toEqual(pdf.drawingReport);
    await expect(svg({decisionResolutions:{unknown:{note:'x',provenance:'y'}}},source)).rejects.toThrow(/declared decision/);
    await expect(svg({decisionResolutions:{[key]:{note:'',provenance:'y'}}},source)).rejects.toThrow(/nonempty/);
  });
  it('rejects review requests before architectural source and option early returns', async () => {
    await expect(svg({style:'architectural'})).rejects.toThrow(/architectural/);
    await expect(runAndExport({code,fileName:'functional.kcad.ts',format:'pdf-drawing',options:{format:'pdf-drawing',style:'architectural'}})).rejects.toThrow(/architectural/);
    const ordinary = await svg({style:'architectural'},'return box(8000,5000,3000);');
    expect(ordinary.bytes.length).toBeGreaterThan(0);
    for (const extra of [{reviewPlans:[plan]},{decisionResolutions:{}},{requireCompleteReview:true}]) await expect(svg({...extra,style:'architectural'},'return box(8000,5000,3000);')).rejects.toThrow(/architectural/);
  });
});
