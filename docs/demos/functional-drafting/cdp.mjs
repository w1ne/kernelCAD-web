// Attach only to existing Chrome. Every command has a 10-second idle timeout.
export async function attach(cdpUrl,{signal}={}) {
  signal?.throwIfAborted();
  const version=await(await fetch(cdpUrl+'/json/version',{signal:signal?AbortSignal.any([signal,AbortSignal.timeout(3000)]):AbortSignal.timeout(3000)})).json();
  const ws=new WebSocket(version.webSocketDebuggerUrl);
  let ownedTarget, call;
  try {
  await new Promise((r,j)=>{const timer=setTimeout(()=>j(Error('CDP attach timeout')),10000);ws.onopen=()=>{clearTimeout(timer);r();};ws.onerror=error=>{clearTimeout(timer);j(error);};});
  let seq=0;const pending=new Map();
  ws.onmessage=e=>{const m=JSON.parse(e.data);const p=pending.get(m.id);if(p){clearTimeout(p.timer);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}};
  call=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++seq;const timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP idle timeout '+method));},10000);pending.set(id,{resolve,reject,timer});try{ws.send(JSON.stringify({id,method,params,...sessionId?{sessionId}:{}}));}catch(error){clearTimeout(timer);pending.delete(id);reject(error);}});
  signal?.throwIfAborted();
  const {targetInfos}=await call('Target.getTargets');
  signal?.throwIfAborted();
  const target=await call('Target.createTarget',{url:'about:blank',browserContextId:targetInfos.find(t=>t.type==='page')?.browserContextId});
  const targetId=target.targetId;ownedTarget=targetId;
  signal?.throwIfAborted();
  const {sessionId}=await call('Target.attachToTarget',{targetId,flatten:true});
  signal?.throwIfAborted();
  const send=(method,params)=>call(method,params,sessionId);
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  const close=async()=>{await call('Target.closeTarget',{targetId}).catch(()=>{});ws.close();};
  return {send,evaluate,close,targetId,browser:version.Browser};
  } catch(error) {
    if(ownedTarget)await call('Target.closeTarget',{targetId:ownedTarget}).catch(()=>{});
    ws.close();throw error;
  }
}
// Small DOM driver over the same owned tab; actions target actual native controls.
export function domPage(c) {
 const expression=(fn,arg)=>typeof fn==='string'?fn:`(${fn.toString()})(${JSON.stringify(arg)??''})`;
 const wait=async(fn,{timeout=50000}={})=>{const end=Date.now()+timeout;while(Date.now()<end){if(await c.evaluate(expression(fn)))return;await new Promise(r=>setTimeout(r,250));}throw Error('DOM wait timed out '+expression(fn));};
 const locate=selector=>({
  first(){return this;},filter({hasText}){return locate(`(${selector}).filter(e=>e.textContent.includes(${JSON.stringify(hasText)}))`);},
  async waitFor(opts){await wait(`(${selector}).length>0`,opts);},
  async click(){await c.evaluate(`(()=>{const e=(${selector})[0];if(!e||e.disabled)throw Error('Unavailable control');e.click();})()`);},
  async innerText(){return c.evaluate(`(${selector})[0].innerText`);},
  async isDisabled(){return c.evaluate(`!!(${selector})[0]?.disabled`);},
  async fill(value){await c.evaluate(`(()=>{const e=(${selector})[0];if(!e||e.disabled)throw Error('Unavailable field');const proto=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);},
  async selectOption(value){await c.evaluate(`(()=>{const e=(${selector})[0];if(!e)throw Error('Unavailable select');e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);},
  async check(){await c.evaluate(`(()=>{const e=(${selector})[0];if(!e.checked)e.click();})()`);},
  async uncheck(){await c.evaluate(`(()=>{const e=(${selector})[0];if(e.checked)e.click();})()`);},
  async screenshot(opts){const clip=await c.evaluate(`(()=>{const r=(${selector})[0].getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scale:1}})()`);const shot=await c.send('Page.captureScreenshot',{format:opts.type??'png',...opts.type==='jpeg'?{quality:opts.quality??88}:{},clip});const bytes=Buffer.from(shot.data,'base64');if(opts.path){const {writeFile}=await import('node:fs/promises');await writeFile(opts.path,bytes);}return bytes;}
 });
 return {
  setDefaultTimeout(){},setViewportSize:({width,height})=>c.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false}),
  addInitScript:(fn,arg)=>c.send('Page.addScriptToEvaluateOnNewDocument',{source:expression(fn,arg)}),
  goto:url=>c.send('Page.navigate',{url}),evaluate:(fn,arg)=>c.evaluate(expression(fn,arg)),waitForFunction:wait,
  locator:css=>locate(`[...document.querySelectorAll(${JSON.stringify(css)})]`),
  getByRole:(role,{name})=>locate(`[...document.querySelectorAll(${JSON.stringify(role==='button'?'button':`[role=${role}]`)})].filter(e=>e.textContent.trim()===${JSON.stringify(name)})`),
  getByText:text=>locate(`[...document.querySelectorAll('p')].filter(e=>e.textContent.trim()===${JSON.stringify(text)})`),
  getByLabel:label=>locate(`[...document.querySelectorAll('[role=dialog] label')].filter(e=>(e.firstChild?.textContent?.trim()===${JSON.stringify(label)}||e.textContent.trim()===${JSON.stringify(label)})).map(e=>e.querySelector('input,textarea,select')).filter(Boolean)`),
  screenshot:opts=>locate('[document.documentElement]').screenshot(opts),close:c.close
 };
}
