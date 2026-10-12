// Bounded article readback through an owned tab in the already-running Chrome.
import { attach } from './cdp.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const base=process.env.SITE_BASE_URL??'http://127.0.0.1:8000';
const out=resolve(new URL('./article-readback/',import.meta.url).pathname);await mkdir(out,{recursive:true});
const c=await attach(process.env.CDP_URL??'http://127.0.0.1:9444');
const deadline=setTimeout(()=>{void c.close().finally(()=>process.exit(124));},120000);deadline.unref();
const evidence={startedAt:new Date().toISOString(),base,existingChrome:c.browser,ownedTarget:c.targetId,articles:[]};
async function until(expression){const end=Date.now()+20000;while(Date.now()<end){if(await c.evaluate(expression))return;await new Promise(r=>setTimeout(r,200));}throw Error('Readback timeout '+expression);}
try {
 await c.send('Page.enable');
 for(const slug of ['functional-drafting','drawing-decisions']){
  const row={slug,views:[],downloads:[]};
  for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
   await c.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:name==='mobile'});
   await c.send('Page.navigate',{url:base+'/blog/'+slug+'/'});
   await until("document.readyState==='complete' && !!document.querySelector('video')");
   await c.evaluate("[...document.images].forEach(i=>i.loading='eager')");
   await until("[...document.images].every(i=>i.complete&&i.naturalWidth>0)");
   await c.evaluate('window.scrollTo(0,0)');
   const layout=await c.evaluate("({title:document.title,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,imageCount:document.images.length,videoSource:document.querySelector('video').currentSrc||document.querySelector('video source')?.src})");
   if(layout.scrollWidth>width)throw Error('Horizontal overflow '+slug+' '+name);
   const shot=await c.send('Page.captureScreenshot',{format:'png'});await writeFile(out+'/'+slug+'-'+name+'.png',Buffer.from(shot.data,'base64'));
   await c.evaluate("(()=>{const v=document.querySelector('video');v.muted=true;v.scrollIntoView({block:'center'});return v.play();})()");
   await until("document.querySelector('video').currentTime>0.15 && !document.querySelector('video').paused");
   row.views.push({name,...layout,playback:await c.evaluate("(()=>{const v=document.querySelector('video');const r={currentTime:v.currentTime,paused:v.paused,readyState:v.readyState,duration:v.duration};v.pause();return r;})()")});
   const playing=await c.send('Page.captureScreenshot',{format:'png'});await writeFile(out+'/'+slug+'-'+name+'-video.png',Buffer.from(playing.data,'base64'));
  }
  const urls=await c.evaluate("[...new Set([...document.querySelectorAll('a[href]')].map(a=>a.href).filter(u=>u.startsWith(location.origin+'/blog/')&&!u.endsWith('/')))]");
  for(const url of urls){const response=await fetch(url,{signal:AbortSignal.timeout(10000)});const bytes=Buffer.from(await response.arrayBuffer());if(response.status!==200||!bytes.length)throw Error('Bad download '+url);if(url.endsWith('.pdf')&&!bytes.subarray(0,5).equals(Buffer.from('%PDF-')))throw Error('Bad PDF '+url);row.downloads.push({url,status:response.status,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
  const video=await fetch(base+'/blog/'+slug+'/video.mp4');const bytes=Buffer.from(await video.arrayBuffer());if(video.status!==200||bytes.subarray(4,8).toString()!=='ftyp')throw Error('Bad movie');row.video={status:video.status,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
  evidence.articles.push(row);
 }
 evidence.success=true;
} finally {await c.close();clearTimeout(deadline);evidence.ownedTabClosed=true;evidence.finishedAt=new Date().toISOString();await writeFile(out+'/receipt.json',JSON.stringify(evidence,null,2)+'\n');}
console.log('Two desktop/mobile articles, actual video playback and downloads pass');
