// Actual local Studio workflow. Attach to existing Chrome; own only this tab.
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { attach } from './capture-cdp.mjs';
const output = new URL('./', import.meta.url);
const timer = setTimeout(async () => {
  running = false;
  setTimeout(() => process.exit(124), 4000);
  await c?.close().catch(() => {});
  process.exit(124);
}, 150000); timer.unref();
const sleep = ms => new Promise(r => setTimeout(r, ms));
let c, running = false, recorder;
const stages = [], samples = [];
let started;
async function waitFor(expression, timeout = 40000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (await c.evaluate(expression)) return; await sleep(250); }
  throw Error('Timeout: ' + expression);
}
async function click(text) {
  const point = await c.evaluate(`(()=>{const bs=[...document.querySelectorAll('button')];const b=bs.find(b=>b.textContent.trim()===${JSON.stringify(text)})||bs.find(b=>b.textContent.trim().startsWith(${JSON.stringify(text)}));if(!b||b.disabled)throw Error('Missing '+${JSON.stringify(text)});const r=b.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
  await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
  await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
}
async function stage(name) {
  stages.push({ name, seconds: (Date.now()-started)/1000, text: await c.evaluate(`document.querySelector('[role=dialog]')?.innerText ?? document.body.innerText`) });
  await writeFile(new URL(name+'.png',output), Buffer.from((await c.send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  console.log(name);
}
async function savePdf(name) {
  await waitFor('window.__pdfs.length>0');
  const pdf = Buffer.from(await c.evaluate(`(async()=>{const b=window.__pdfs.shift();const a=new Uint8Array(await b.arrayBuffer());let s='';for(const x of a)s+=String.fromCharCode(x);return btoa(s)})()`),'base64');
  if (pdf.subarray(0,5).toString() !== '%PDF-') throw Error('Invalid PDF');
  await writeFile(new URL(name,output),pdf);
  return {name,bytes:pdf.length,sha256:createHash('sha256').update(pdf).digest('hex')};
}
try {
  await mkdir(new URL('frames/',output),{recursive:true});
  c=await attach(); await c.send('Page.enable');
  await c.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
  await c.send('Page.navigate',{url:'http://127.0.0.1:5248/p/12HP6xje?version=2&view=studio'});
  await waitFor(`document.body && !document.body.innerText.includes('Loading...') && /[1-9][0-9]* bod/.test(document.body.innerText) && [...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Export')`);
  await sleep(1000); await click('Export');
  await waitFor(`!!document.querySelector('[data-testid=export-pdf-drawing]')`);
  // Remove this demo project's callout edit from the previous local recording.
  await click('Drawing settings'); await click('Generate preview');
  await waitFor(`document.querySelector('[role=dialog]').innerText.includes('Preview up to date')`);
  await c.evaluate(`(()=>{const b=[...document.querySelectorAll('[role=dialog] li button')].find(b=>b.textContent.includes('THRU'));if(!b)throw Error('No hole callout');b.click()})()`);
  await click('Reset annotation');
  await c.evaluate(`document.querySelector('[aria-label="Close drawing settings"]').click()`);
  await c.evaluate(`(()=>{const f=URL.createObjectURL.bind(URL);window.__pdfs=[];URL.createObjectURL=b=>{if(b.type==='application/pdf')window.__pdfs.push(b);return f(b)}})()`);
  started=Date.now();running=true;
  recorder=(async()=>{let n=0;while(running){const t=Date.now();const shot=await c.send('Page.captureScreenshot',{format:'jpeg',quality:88});await writeFile(new URL('frames/'+String(n++).padStart(5,'0')+'.jpg',output),Buffer.from(shot.data,'base64'));samples.push((Date.now()-started)/1000);await sleep(Math.max(0,400-(Date.now()-t)));}})();
  await stage('01-export'); await sleep(1800); await click('Drawing (PDF)');
  const direct=await savePdf('one-click-drawing.pdf');
  if(await c.evaluate(`!!document.querySelector('[role=dialog]')`)) throw Error('Unexpected review dialog');
  await stage('02-downloaded'); await sleep(2200); await click('Drawing settings');
  await stage('03-settings'); await sleep(1200); await click('Generate preview');
  await waitFor(`document.querySelector('[role=dialog]').innerText.includes('Preview up to date')`);
  await stage('04-preview'); await sleep(1800);
  await c.evaluate(`(()=>{const b=[...document.querySelectorAll('[role=dialog] li button')].find(b=>b.textContent.includes('THRU'));if(!b)throw Error('No hole callout');b.click()})()`);
  for(const [label,value] of [['Annotation text','4 × Ø9 THRU — M8 CLEARANCE'],['Extra offset (sheet mm)','8']]) {
    await c.evaluate(`(()=>{const l=[...document.querySelectorAll('[role=dialog] label')].find(l=>l.firstChild?.textContent===${JSON.stringify(label)});const i=l.querySelector('input');i.focus();i.select()})()`);
    await c.send('Input.insertText',{text:value}); await sleep(300);
  }
  await click('Refresh preview');
  await waitFor(`document.querySelector('[role=dialog]').innerText.includes('Preview up to date')`);
  await stage('05-edited'); await sleep(2200); await click('Download PDF');
  const edited=await savePdf('edited-drawing.pdf');
  await stage('06-downloaded'); await sleep(2500);
  running=false;await recorder;
  await writeFile(new URL('receipt.json',output),JSON.stringify({checkedAt:new Date().toISOString(),environment:'LOCAL Studio validation; actual UI recording; illustrative model',url:'http://127.0.0.1:5248/p/12HP6xje?version=2&view=studio',cdpPort:9444,viewport:{width:1440,height:1100},samples,stages,pdf:[direct,edited],ownedTarget:c.targetId},null,2));
} finally {running=false;await recorder?.catch(()=>{});await c?.close();clearTimeout(timer);}
