// Abort the workflow, then restore/save/close in that order. No process exit skips cleanup.
export function abortable(promise, signal) {
 signal.throwIfAborted();
 return new Promise((resolve,reject)=>{
  const aborted=()=>reject(signal.reason);signal.addEventListener('abort',aborted,{once:true});
  Promise.resolve(promise).then(resolve,reject).finally(()=>signal.removeEventListener('abort',aborted));
 });
}
export function captureLifecycle({timeoutMs=240000,cleanupMs=30000,cleanup,save,close,onFailure=()=>{},listenSignals=false}) {
 const controller=new AbortController();let failure;
 const abort=error=>{if(!controller.signal.aborted){failure=error;onFailure(error);controller.abort(error);}};
 const observe=promise=>Promise.resolve(promise).catch(error=>{abort(error);});
 async function run(work) {
  const timer=setTimeout(()=>abort(Object.assign(Error('Capture deadline exceeded'),{exitCode:124})),timeoutMs);
  const handlers={SIGINT:()=>abort(Object.assign(Error('SIGINT'),{exitCode:130})),SIGTERM:()=>abort(Object.assign(Error('SIGTERM'),{exitCode:143}))};
  if(listenSignals)for(const [name,handler] of Object.entries(handlers))process.on(name,handler);
  try{controller.signal.throwIfAborted();await abortable(work(),controller.signal);}catch(error){failure??=error;onFailure(error);}finally{
   clearTimeout(timer);
   for(const action of [cleanup,save,close,save]){
    let bound;try{await Promise.race([Promise.resolve().then(action),new Promise((_,reject)=>{bound=setTimeout(()=>reject(Error('Capture cleanup deadline exceeded')),cleanupMs);})]);}
    catch(error){failure??=error;onFailure(error);}finally{clearTimeout(bound);}
   }
  }
  if(listenSignals)for(const [name,handler] of Object.entries(handlers))process.off(name,handler);
  if(failure)throw failure;
 }
 return {signal:controller.signal,abort,observe,run};
}
// This function is also evaluated in the browser. It removes only owned project keys.
export function restoreTemporaryProject(id) {
 const p=window.__functionalPrevious;if(!p)return null;
 let index=JSON.parse(localStorage.getItem('kernelcad_project_index')??'[]');index=index.filter(x=>x.id!==id);
 if(JSON.stringify(index)===JSON.stringify(JSON.parse(p.index??'[]'))){p.index===null?localStorage.removeItem('kernelcad_project_index'):localStorage.setItem('kernelcad_project_index',p.index);}else localStorage.setItem('kernelcad_project_index',JSON.stringify(index));
 for(const key of Object.keys(localStorage))if(key.includes(id))localStorage.removeItem(key);
 if(localStorage.getItem('kernelcad_last_project_id')===id){p.last===null?localStorage.removeItem('kernelcad_last_project_id'):localStorage.setItem('kernelcad_last_project_id',p.last);}
 if(p.legacy!==null&&!localStorage.getItem('kernelcad_current_project'))localStorage.setItem('kernelcad_current_project',p.legacy);
 return true;
}

// Poll/download GETs have no source; retain them without treating them as source POSTs.
export function sourceRequestsMatch(rows, expected) {
 const posts=rows.filter(row=>row.method==='POST');
 return posts.length>0 && posts.every(row=>row.sourceSha256===expected);
}

export async function restoreCaptureProject(page, id, receipt) {
 receipt.projectCleanup=false;
 const restored=await page.evaluate(restoreTemporaryProject,id);
 receipt.projectStateCreated=restored!==null;
 if(restored!==true && restored!==null)throw Error('Temporary project restoration failed');
 receipt.projectCleanup=true;
}
