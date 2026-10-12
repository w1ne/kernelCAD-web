import { test } from 'node:test';
import assert from 'node:assert/strict';
import { captureLifecycle, sourceRequestsMatch } from './lifecycle.mjs';
import { attach } from './cdp.mjs';
const never=()=>new Promise(()=>{});
for(const failure of ['deadline','interrupt','recorder'])test(`${failure} restores state and persists receipt before closing`,async()=>{
 const events=[];const original={index:' [ ] ',last:'previous',legacy:'legacy'};let state={index:'temporary',last:'owned',legacy:null};
 const life=captureLifecycle({timeoutMs:failure==='deadline'?10:1000,cleanup:async()=>{state={...original};events.push('restore');},save:async()=>events.push('receipt'),close:async()=>events.push('close')});
 const run=life.run(async()=>{if(failure==='interrupt')setTimeout(()=>life.abort(Error('SIGTERM')),5);if(failure==='recorder')life.observe(Promise.reject(Error('recorder write failed')));await never();});
 await assert.rejects(run,failure==='deadline'?/deadline/:failure==='interrupt'?/SIGTERM/:/recorder write failed/);
 assert.deepEqual(state,original);assert.deepEqual(events,['restore','receipt','close','receipt']);
});
test('partial attachment disposes its owned target and socket',async()=>{
 const savedFetch=globalThis.fetch,savedSocket=globalThis.WebSocket,calls=[];let closed=false;
 globalThis.fetch=async()=>({json:async()=>({webSocketDebuggerUrl:'ws://test.invalid',Browser:'test fixture'})});
 globalThis.WebSocket=class {constructor(){queueMicrotask(()=>this.onopen());}send(raw){const m=JSON.parse(raw);calls.push(m.method);queueMicrotask(()=>this.onmessage({data:JSON.stringify({id:m.id,...m.method==='Target.attachToTarget'?{error:{message:'forced attachment failure'}}:{result:m.method==='Target.getTargets'?{targetInfos:[]}:m.method==='Target.createTarget'?{targetId:'only-owned-target'}:{}}})}));}close(){closed=true;}};
 try{await assert.rejects(attach('http://test.invalid'),/forced attachment failure/);assert.equal(closed,true);assert.deepEqual(calls,['Target.getTargets','Target.createTarget','Target.attachToTarget','Target.closeTarget']);}finally{globalThis.fetch=savedFetch;globalThis.WebSocket=savedSocket;}
});

test('async job polling preserves source binding only on source POSTs',()=>{const rows=[{method:'POST',status:202,sourceSha256:'same'},{method:'GET',status:200},{method:'GET',status:200}];assert.equal(sourceRequestsMatch(rows,'same'),true);assert.equal(sourceRequestsMatch(rows,'changed'),false);assert.equal(sourceRequestsMatch(rows.slice(1),'same'),false);});
test('SIGTERM handler stays installed through restore/save/close and is removed afterwards',async()=>{
 const before=process.listenerCount('SIGTERM');const events=[];
 const life=captureLifecycle({timeoutMs:1000,listenSignals:true,cleanup:async()=>{assert.equal(process.listenerCount('SIGTERM'),before+1);events.push('restore');},save:async()=>events.push('receipt'),close:async()=>events.push('close')});
 await assert.rejects(life.run(async()=>{setTimeout(()=>process.emit('SIGTERM'),5);await never();}),/SIGTERM/);
 assert.deepEqual(events,['restore','receipt','close','receipt']);assert.equal(process.listenerCount('SIGTERM'),before);
});
test('cleanup failure still saves a receipt and closes without any attached page',async()=>{
 const events=[];const life=captureLifecycle({timeoutMs:10,cleanup:async()=>{throw Error('No page attached');},save:async()=>events.push('receipt'),close:async()=>events.push('close')});
 await assert.rejects(life.run(never),/deadline/);assert.deepEqual(events,['receipt','close','receipt']);
});

test('a stalled cleanup is bounded and still persists and closes',async()=>{const events=[];const life=captureLifecycle({timeoutMs:1000,cleanupMs:10,cleanup:never,save:async()=>events.push('receipt'),close:async()=>events.push('close')});await assert.rejects(life.run(async()=>{}),/cleanup deadline/);assert.deepEqual(events,['receipt','close','receipt']);});
