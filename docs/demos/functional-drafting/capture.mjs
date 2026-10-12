// Actual UI workflows; connect to existing Chrome only. Own tab and local project.
// BASE_URL/CDP_URL/BACKEND_SHA/OUTPUT optional; no launched browser or cloud write.
import { attach, domPage } from './cdp.mjs';
import { captureLifecycle, abortable, restoreCaptureProject, sourceRequestsMatch } from './lifecycle.mjs';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:5248';
const cdpUrl = process.env.CDP_URL ?? 'http://127.0.0.1:9444';
const root = resolve(new URL('../../..', import.meta.url).pathname);
const output = resolve(process.env.OUTPUT ?? new URL('./', import.meta.url).pathname);
const kind = process.argv[2] ?? 'plate';
if (!['plate', 'bearing'].includes(kind)) throw Error('Expected plate or bearing');
const sourceName = kind === 'plate' ? 'fixture-plate.kcad.ts' : 'bearing-seat.kcad.ts';
const code = await readFile(resolve(root, 'examples/functional-drafting', sourceName), 'utf8');
const ownedId = `functional-demo-${kind}-${Date.now()}`;
const out = resolve(output, kind); await rm(resolve(out,'frames'),{recursive:true,force:true}); await mkdir(resolve(out, 'frames'), { recursive:true });
const receipt = { startedAt:new Date().toISOString(), environment:'LOCAL Studio source checkout; illustrative geometry; actual UI and unmodified HTTP responses', baseUrl, backendSha:process.env.BACKEND_SHA ?? null, sourceName, sourceSha256:createHash('sha256').update(code).digest('hex'), exportSourceSha256:createHash('sha256').update(code.trim()).digest('hex'), sourceNormalization:'Studio exportRequest trims leading/trailing whitespace', ownedId, stages:[], samples:[] };
let page, cleanupPage, connectionAttempt, recording = false, recorder; const started = Date.now();
const sleep = ms => new Promise(r => setTimeout(r,ms));
const button = name => page.getByRole('button', { name, exact:true });
async function stage(name, caption) {
  const text = await page.locator('[role=dialog]').innerText();
  receipt.stages.push({ name, caption, seconds:(Date.now()-started)/1000, text });
  await page.locator('[role=dialog]').screenshot({ path:resolve(out,name+'.png') }); console.log(name);
  await sleep(1400);
}
async function preview(first = false) {
  await button(first?'Generate preview':'Refresh preview').click();
  await page.getByText('Preview up to date',{exact:true}).waitFor({ timeout:50000 });
}
async function savePdf(name) {
  await page.waitForFunction(() => window.__functional.pdfs.length>0);
  const bytes = Buffer.from(await page.evaluate(async()=>{const b=window.__functional.pdfs.shift(); const a=new Uint8Array(await b.arrayBuffer());let s='';for(const n of a)s+=String.fromCharCode(n);return btoa(s);}), 'base64');
  if(bytes.subarray(0,5).toString()!=='%PDF-')throw Error('Invalid downloaded PDF');
  await writeFile(resolve(out,name),bytes);
  (receipt.pdfs??=[]).push({name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
}
async function gateDisabled() { if(!await button('Export reviewed PDF').isDisabled()) throw Error('Reviewed PDF gate should be disabled'); }
const lifecycle=captureLifecycle({
 listenSignals:true,
 onFailure:error=>{recording=false;receipt.success=false;receipt.error??=error.message;process.exitCode??=error.exitCode??1;},
 cleanup:async()=>{
  recording=false;await connectionAttempt?.catch(()=>{});await recorder?.catch(()=>{});
  if(cleanupPage) {
    await restoreCaptureProject(cleanupPage,ownedId,receipt);
    receipt.transport=await cleanupPage.evaluate(()=>window.__functional?.requests??[]).catch(()=>[]);
    receipt.transport=receipt.transport.map(row=>{if(row.sourceShaInput){row.sourceSha256=createHash('sha256').update(row.sourceShaInput).digest('hex');delete row.sourceShaInput;}return row;});
    if(receipt.success && !sourceRequestsMatch(receipt.transport,receipt.exportSourceSha256)){receipt.success=false;receipt.error='Export transport source did not match captured source';process.exitCode=1;}
    const svgs=await cleanupPage.evaluate(()=>window.__functional?.svgs??[]).catch(()=>[]);for(let i=0;i<svgs.length;i++)await writeFile(resolve(out,`preview-${i}.svg`),svgs[i]);
  } else {receipt.projectStateCreated=false;receipt.projectCleanup=true;}
 },
 save:async()=>{receipt.finishedAt=new Date().toISOString();await writeFile(resolve(out,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');},
 close:async()=>{if(cleanupPage){await cleanupPage.close();receipt.ownedTabClosed=true;}},
});
await lifecycle.run(async()=>{
  // Preflight attachment must succeed; this helper has no launch fallback.
  const version = await (await fetch(cdpUrl+'/json/version',{signal:AbortSignal.timeout(3000)})).json(); receipt.browser=version.Browser;
  connectionAttempt=attach(cdpUrl,{signal:lifecycle.signal}).then(connection=>{cleanupPage=domPage(connection);receipt.ownedTarget=connection.targetId;return connection;});
  const connection=await connectionAttempt;
  const guarded={...connection,send:(...args)=>{lifecycle.signal.throwIfAborted();return abortable(connection.send(...args),lifecycle.signal);},evaluate:expression=>{lifecycle.signal.throwIfAborted();return abortable(connection.evaluate(expression),lifecycle.signal);}};
  page=domPage(guarded); await guarded.send('Page.enable'); page.setDefaultTimeout(10000); await page.setViewportSize({width:1440,height:1100});
  await page.addInitScript(({origin,id,code})=>{
    if(location.origin!==origin)return;
    const previous={last:localStorage.getItem('kernelcad_last_project_id'),legacy:localStorage.getItem('kernelcad_current_project'),index:localStorage.getItem('kernelcad_project_index')}; window.__functionalPrevious=previous;
    const now=new Date().toISOString(); let index; try{index=JSON.parse(previous.index??'[]');}catch{index=[];} if(!Array.isArray(index))throw Error('Invalid project index');
    localStorage.removeItem('kernelcad_current_project');
    localStorage.setItem('kernelcad_project_'+id,JSON.stringify({version:'1.1',name:'Functional drawing demo (temporary)',code,lastUpdated:now,viewState:{viewMode:'code',viewMode3D:'shadedWithEdges',sidePanelVisible:true,showSketches:true}}));
    localStorage.setItem('kernelcad_project_index',JSON.stringify([...index,{id,name:'Functional drawing demo (temporary)',lastUpdated:now}])); localStorage.setItem('kernelcad_last_project_id',id);
    window.__functional={requests:[],pdfs:[],svgs:[]}; const original=window.fetch.bind(window);
    window.fetch=async(...args)=>{const response=await original(...args);const raw=typeof args[0]==='string'?args[0]:args[0]?.url??String(args[0]);if(raw.includes('/__kernelcad/export')){const u=new URL(raw,location.href);let body;try{body=JSON.parse(args[1]?.body??'{}');}catch{}const row={at:new Date().toISOString(),url:u.href,status:response.status,method:(args[1]?.method??args[0]?.method??'GET').toUpperCase(),format:u.searchParams.get('format'),options:body?.options,sourceShaInput:body?.source??body?.code};window.__functional.requests.push(row);if(!response.ok)row.failureBody=await response.clone().text();if(u.searchParams.get('review')==='1'){const data=await response.clone().json();row.drawingReport=data.drawingReport;row.diagnostics=data.diagnostics;row.error=data.error;if(data.svg)window.__functional.svgs.push(data.svg);}}return response;};
    const create=URL.createObjectURL.bind(URL);URL.createObjectURL=b=>{if(b.type.startsWith('application/pdf'))window.__functional.pdfs.push(b);return create(b);};
  },{origin:new URL(baseUrl).origin,id:ownedId,code});
  await page.goto(baseUrl+'/studio',{waitUntil:'domcontentloaded',timeout:30000});
  await button('Export').waitFor({timeout:50000}); await button('Export').click(); await button('Drawing settings').click();
  await preview(true);
  recorder=lifecycle.observe((async()=>{recording=true;let n=0;while(recording){const begin=Date.now();const image=await page.locator('[role=dialog]').screenshot({type:'jpeg',quality:88});await writeFile(resolve(out,'frames',String(n++).padStart(5,'0')+'.jpg'),image);receipt.samples.push((Date.now()-started)/1000);await sleep(Math.max(0,500-(Date.now()-begin)));}})());
  // Suppress actual report-derived automatic rows for this narrowly declared
  // tutorial sheet. No numerical label edits and no mocked review response.
  const initialRows=await page.evaluate(()=>window.__functional.requests.filter(r=>r.drawingReport).at(-1).drawingReport.annotations);
  receipt.suppressedAutomaticRows=initialRows.filter(a=>a.source==='auto').map(a=>({id:a.id,text:a.text,reason:'Keep this interface-only sheet focused on its declared measurements; automatic heuristic GD&T is outside the brief.'}));
  for(let i=0;i<initialRows.length;i++)if(initialRows[i].source==='auto') {
    await page.evaluate(i=>{const h=[...document.querySelectorAll('[role=dialog] h3')].find(e=>e.textContent==='Annotations');h.nextElementSibling.querySelectorAll('li button')[i].click();},i);
    await page.getByLabel('Hide annotation',{exact:true}).check();
  }
  if(kind==='plate') {
    // Use the real annotation editor to place the measured rows on the top view.
    for(const [id,offset] of [['authored:pitch-x',0],['authored:pitch-y',0],['authored:mounting-diameter',4],['authored:bore-diameter',20]]) {
      await page.locator('[role=dialog] li button').filter({hasText:id}).first().click();
      await page.getByLabel('Annotation view',{exact:true}).selectOption('top');
      await page.getByLabel('Extra offset (sheet mm)',{exact:true}).fill(String(offset));
    }
    await preview();
    const r=await page.evaluate(()=>window.__functional.requests.filter(r=>r.drawingReport).at(-1).drawingReport.review);
    if(r.status!=='complete'||r.coveredCriticalCount!==4)throw Error('Plate preview not complete: '+JSON.stringify(r));
    await stage('01-complete','Four critical callouts are measured and covered; missing reference stock width is advisory.');
    await page.locator('[role=dialog] li button').filter({hasText:'authored:pitch-x'}).first().click();
    await page.getByLabel('Hide annotation',{exact:true}).check(); await gateDisabled(); await preview();
    const hidden=await page.evaluate(()=>window.__functional.requests.filter(r=>r.drawingReport).at(-1).drawingReport.review);
    if(hidden.status!=='incomplete'||hidden.requirements.find(r=>r.requirementId==='pitch-x').status!=='hidden')throw Error('Hidden status missing');
    if(!await button('Mark reviewed').isDisabled())throw Error('Hidden critical allowed review');
    await stage('02-hidden','Hide X pitch: the solid remains identical, but 3/4 critical coverage blocks reviewed export.');
    await button('Download PDF').click(); await savePdf('ordinary-hidden.pdf');
    await stage('03-ordinary','An ordinary PDF remains available with an incomplete report.');
    await page.getByLabel('Hide annotation',{exact:true}).uncheck(); await preview(); await button('Mark reviewed').click();
    await stage('04-reviewed','Restore X pitch, refresh the real sheet, then mark this preview reviewed.');
    await button('Export reviewed PDF').click(); await savePdf('reviewed-plate.pdf'); await stage('05-exported','Strict reviewed PDF downloads actual bytes after complete coverage.');
  } else {
    await page.locator('[role=dialog] li button').filter({hasText:'authored:throat-diameter'}).first().click();
    await page.getByLabel('Extra offset (sheet mm)',{exact:true}).fill('20');
    await preview();
    const r=await page.evaluate(()=>window.__functional.requests.filter(r=>r.drawingReport).at(-1).drawingReport.review);
    if(r.coveredCriticalCount!==2||r.unresolvedDecisionCount!==1)throw Error('Bearing initial review wrong '+JSON.stringify(r));
    await stage('01-pending','Measured seat and throat are covered; one unresolved retention decision blocks review.');
    await page.getByLabel('Decision note',{exact:true}).fill('Illustrative insert intended to be removable. Numerical clearance and retention hardware remain outside this exercise.');
    await page.getByLabel('Decision provenance',{exact:true}).fill('Tutorial design brief, 2026-10-12; no catalog or physical fit verification.');
    await stage('02-draft','A decision draft is not a recorded resolution.');
    await button('Record decision').click(); await gateDisabled(); await stage('03-recorded','Record intent and provenance; refresh to evaluate that record against the source plan.');
    await preview(); const complete=await page.evaluate(()=>window.__functional.requests.filter(r=>r.drawingReport).at(-1).drawingReport.review);
    if(complete.status!=='complete'||complete.unresolvedDecisionCount!==0)throw Error('Recorded decision did not complete review');
    await stage('04-complete','The refreshed report has 2/2 critical callouts and zero unresolved decisions.');
    await button('Mark reviewed').click(); await button('Export reviewed PDF').click(); await savePdf('reviewed-bearing.pdf');
    await stage('05-exported','Reviewed PDF exports; the note does not change the solid or certify a production fit.');
  }
  recording=false;await recorder;lifecycle.signal.throwIfAborted();receipt.success=true;
}).catch(error=>console.error(error));
