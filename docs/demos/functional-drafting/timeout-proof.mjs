// Cleanup regression only: an owned blank origin intentionally has no Export control.
// No CAD response, drawing, geometry or demo artifact is simulated or regenerated.
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { attach, domPage } from './cdp.mjs';
const temporary=await mkdtemp(resolve(tmpdir(),'functional-cleanup-'));
const server=createServer((req,res)=>{res.writeHead(200,{'content-type':'text/html'});res.end('<!doctype html><title>Owned cleanup regression</title><p>Intentionally stalled capture</p>');});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const c=await attach(process.env.CDP_URL??'http://127.0.0.1:9444');const page=domPage(c);let child;
const hard=setTimeout(()=>{child?.kill('SIGKILL');void c.close().finally(()=>server.close());},15000);
try{
 await c.send('Page.enable');await page.goto(origin);await page.waitForFunction(()=>document.readyState==='complete');
 const original={index:' [ ] ',last:'previous-owned-fixture',legacy:'previous-legacy-fixture'};
 await page.evaluate(p=>{localStorage.setItem('kernelcad_project_index',p.index);localStorage.setItem('kernelcad_last_project_id',p.last);localStorage.setItem('kernelcad_current_project',p.legacy);},original);
 const preload=resolve(temporary,'deadline.mjs');await writeFile(preload,"const timeout=globalThis.setTimeout;globalThis.setTimeout=(fn,ms,...args)=>timeout(fn,ms===240000?2000:ms,...args);\n");
 child=spawn(process.execPath,['--import',preload,new URL('./capture.mjs',import.meta.url).pathname,'plate'],{env:{...process.env,BASE_URL:origin,OUTPUT:temporary},stdio:['ignore','pipe','pipe']});
 let stderr='';child.stderr.on('data',b=>stderr+=b);child.stdout.resume();
 const exit=await new Promise((r,j)=>{child.on('error',j);child.on('exit',(code,signal)=>r({code,signal}));});
 assert.equal(exit.code,124,stderr);
 const receipt=JSON.parse(await readFile(resolve(temporary,'plate/receipt.json'),'utf8'));
 assert.equal(receipt.success,false);assert.equal(receipt.projectCleanup,true);assert.equal(receipt.ownedTabClosed,true);assert.match(receipt.error,/deadline/);
 const restored=await page.evaluate(()=>({index:localStorage.getItem('kernelcad_project_index'),last:localStorage.getItem('kernelcad_last_project_id'),legacy:localStorage.getItem('kernelcad_current_project')}));assert.deepEqual(restored,original);
 const version=await(await fetch((process.env.CDP_URL??'http://127.0.0.1:9444')+'/json/list')).json();assert.equal(version.some(t=>t.id===receipt.ownedTarget),false);
 assert.equal(await page.evaluate(id=>Object.keys(localStorage).some(k=>k.includes(id)),receipt.ownedId),false);
 const evidence={verifiedAt:new Date().toISOString(),existingChrome:c.browser,forcedDeadlineMs:2000,exitCode:exit.code,originalStateRestored:true,receiptPersisted:true,ownedTabClosed:true,ownedProjectRemoved:true,exportRequests:receipt.transport.length,original,restored,receipt};
 if(process.env.PROOF_OUTPUT)await writeFile(resolve(process.env.PROOF_OUTPUT),JSON.stringify(evidence,null,2)+'\n');
 console.log(JSON.stringify({...evidence,receipt:undefined}));
}finally{
 child?.kill();await page.evaluate(()=>localStorage.clear()).catch(()=>{});await c.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));clearTimeout(hard);await rm(temporary,{recursive:true,force:true});
}
