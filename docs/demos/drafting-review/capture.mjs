// LOCAL validation capture. Reuses Chrome on 9444; owns only one temporary tab.
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { attach } from './capture-cdp.mjs';
const output = new URL('./', import.meta.url);
const frames = new URL('frames/', output);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const timer = setTimeout(() => process.exit(124), 180000); timer.unref();
let cdp, capturing = false, captureTask, started;
const stages = [], samples = [];
async function waitFor(expression, timeout = 40000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (await cdp.evaluate(expression)) return; await sleep(250); }
  throw Error('Timed out: ' + expression);
}
async function click(text) {
  const point = await cdp.evaluate(`(()=>{const bs=[...document.querySelectorAll('button')];const b=bs.find(b=>b.textContent.trim()===${JSON.stringify(text)})||bs.find(b=>b.textContent.trim().startsWith(${JSON.stringify(text)}));if(!b||b.disabled)throw Error('unavailable button '+${JSON.stringify(text)}+' '+JSON.stringify(bs.map(b=>({text:b.textContent.trim(),disabled:b.disabled}))));const r=b.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  await cdp.send('Input.dispatchMouseEvent', {type:'mouseMoved',...point});
  await cdp.send('Input.dispatchMouseEvent', {type:'mousePressed',button:'left',clickCount:1,...point});
  await cdp.send('Input.dispatchMouseEvent', {type:'mouseReleased',button:'left',clickCount:1,...point});
}
async function stage(label) {
  const state = await cdp.evaluate(`({text:document.querySelector('[role=dialog]').innerText,inputs:[...document.querySelectorAll('[role=dialog] input')].map(i=>({value:i.value,type:i.type})),buttons:[...document.querySelectorAll('[role=dialog] button')].map(b=>({text:b.textContent.trim(),disabled:b.disabled}))})`);
  stages.push({label,seconds:(Date.now()-started)/1000,...state});
  const shot=await cdp.send('Page.captureScreenshot',{format:'png'});
  await writeFile(new URL(label+'.png',output),Buffer.from(shot.data,'base64'));
  console.log(label);
}
async function edit(label, value) {
  await cdp.evaluate(`(()=>{const l=[...document.querySelectorAll('[role=dialog] label')].find(l=>l.firstChild?.textContent===${JSON.stringify(label)});const i=l?.querySelector('input');if(!i||i.disabled)throw Error('missing field');i.focus();i.select();})()`);
  for (const char of value) { await cdp.send('Input.insertText',{text:char}); await sleep(65); }
}
try {
  await mkdir(frames,{recursive:true});
  cdp=await attach(); await cdp.send('Page.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
  await cdp.send('Page.navigate',{url:'http://127.0.0.1:5248/studio?script=examples/drafting-review/mounting-plate.kcad.ts'});
  await waitFor(`document.readyState==='complete' && [...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Export')`);
  await click('Export'); await sleep(500); await click('Drawing (PDF)');
  await waitFor(`!!document.querySelector('[role=dialog]')`);
  // Capture the actual download Blob produced by the UI, without changing export transport.
  await cdp.evaluate(`(()=>{const original=URL.createObjectURL.bind(URL);window.__demoPdf=null;URL.createObjectURL=b=>{if(b.type==='application/pdf')window.__demoPdf=b;return original(b);};})()`);
  started=Date.now(); capturing=true;
  captureTask=(async()=>{let index=0;while(capturing){const time=Date.now();const shot=await cdp.send('Page.captureScreenshot',{format:'jpeg',quality:86});await writeFile(new URL(String(index++).padStart(5,'0')+'.jpg',frames),Buffer.from(shot.data,'base64'));samples.push((Date.now()-started)/1000);await sleep(Math.max(0,250-(Date.now()-time)));}})();
  await stage('01-draft'); await sleep(2000); await click('Generate preview');
  await waitFor(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Mark reviewed'&&!b.disabled)`);
  await stage('02-preview'); await sleep(4000);
  await cdp.evaluate(`(()=>{const b=[...document.querySelectorAll('[role=dialog] li button')].find(b=>b.textContent.includes('THRU'));if(!b)throw Error('no hole callout');b.click();})()`);
  await sleep(1000); await edit('Annotation text','4 × Ø9 THRU — VERIFY'); await edit('Extra offset (sheet mm)','8');
  await stage('03-edited'); await sleep(4000); await click('Refresh preview');
  await waitFor(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Mark reviewed'&&!b.disabled)`);
  await stage('04-refreshed'); await sleep(4000); await click('Mark reviewed');
  await stage('05-reviewed'); await sleep(3000); await click('Export reviewed PDF');
  await waitFor('!!window.__demoPdf');
  const pdf64=await cdp.evaluate(`(async()=>{const a=new Uint8Array(await window.__demoPdf.arrayBuffer());let s='';for(const b of a)s+=String.fromCharCode(b);return btoa(s);})()`);
  const pdf=Buffer.from(pdf64,'base64');
  if(pdf.subarray(0,5).toString()!=='%PDF-')throw Error('Export is not a PDF');
  await writeFile(new URL('reviewed-drawing.pdf',output),pdf);
  await stage('06-exported'); await sleep(Math.max(4000,38000-(Date.now()-started)));
  capturing=false; await captureTask;
  await writeFile(new URL('receipt.json',output),JSON.stringify({capturedAt:new Date().toISOString(),environment:'LOCAL Studio validation; illustrative model; not physical acceptance',url:'http://127.0.0.1:5248/studio?script=examples/drafting-review/mounting-plate.kcad.ts',cdpPort:9444,viewport:{width:1440,height:1100},sampleIntervalMs:250,frameCount:samples.length,durationSeconds:(Date.now()-started)/1000,samples,stages,pdf:{bytes:pdf.length,magic:pdf.subarray(0,8).toString(),sha256:createHash('sha256').update(pdf).digest('hex')},ownedTarget:cdp.targetId},null,2));
} finally { capturing=false; await captureTask?.catch(()=>{}); await cdp?.close(); clearTimeout(timer); }
