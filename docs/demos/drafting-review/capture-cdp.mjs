export async function attach(){
 const v=await(await fetch('http://127.0.0.1:9444/json/version')).json();
 const ws=new WebSocket(v.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
 let seq=0;const pending=new Map();
 ws.onmessage=e=>{const msg=JSON.parse(e.data);const p=pending.get(msg.id);if(p){clearTimeout(p.timer);pending.delete(msg.id);msg.error?p.reject(new Error(JSON.stringify(msg.error))):p.resolve(msg.result);}};
 const call=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++seq;const timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout '+method));},10000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params,...sessionId?{sessionId}:{}}));});
 const {targetInfos}=await call('Target.getTargets');
 const {targetId}=await call('Target.createTarget',{url:'about:blank',browserContextId:targetInfos.find(t=>t.type==='page')?.browserContextId});
 const {sessionId}=await call('Target.attachToTarget',{targetId,flatten:true});
 const send=(method,params)=>call(method,params,sessionId);
 const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));return result.result.value;};
 const close=async()=>{await call('Target.closeTarget',{targetId}).catch(()=>{});ws.close();};
 return {send,evaluate,close,targetId};
}
