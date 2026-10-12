// Canonical CAD channels in the user's existing Chrome, never a launch fallback.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { meshForHeadlessRender, normalizeInspectionTileForTest } from '../../../src/agent/render/headlessRender';
// @ts-expect-error Bounded CDP helper is native JavaScript.
import { attach } from './cdp.mjs';
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');
const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:5248';
const cdpUrl = process.env.CDP_URL ?? 'http://127.0.0.1:9444';
const name = process.argv[2] ?? 'fixture-plate';
if (!['fixture-plate', 'bearing-seat'].includes(name)) throw Error('Expected a named example');
const source = resolve(root, 'examples/functional-drafting', name+'.kcad.ts');
const out = resolve(here, 'inspection', name); await mkdir(out, { recursive:true });
let c: Awaited<ReturnType<typeof attach>>;
const deadline = setTimeout(()=>{void c?.close().finally(()=>process.exit(124));},120000); deadline.unref();
const artifacts: Array<Record<string, unknown>> = [];
const views = ['iso','front','top','left'] as const;
const size = {width:800,height:800};
async function save(path: string, bytes: Buffer) {await writeFile(resolve(out,path),bytes);artifacts.push({path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
try {
 await initOcct();
 const { meshing, serialized } = await meshForHeadlessRender({ scriptPath:source, baseUrl, viewportWidth:800, viewportHeight:800 });
 c=await attach(cdpUrl);await c.send('Page.enable');await c.send('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
 await c.send('Page.navigate',{url:baseUrl+'/demo-player?headless=1'});
 const until=Date.now()+45000;while(Date.now()<until){if(await c.evaluate('!!window.__demoPlayer'))break;await new Promise(r=>setTimeout(r,250));}
 if(!await c.evaluate('!!window.__demoPlayer'))throw Error('Existing-tab demo-player not ready');
 await c.evaluate(`window.__demoPlayer.loadFeatureMeshes(${JSON.stringify(serialized)},${JSON.stringify(meshing.bounds)})`);
 await c.evaluate('window.__demoPlayer.forceFullOpacity();window.__demoPlayer.showOnlyTailFeatures();window.__demoPlayer.setReferenceImagesVisible(false)');
 let maskObjects; const channelMetadata: Record<string, unknown> = {};
 for(const view of views) {
  await c.evaluate(`window.__demoPlayer.setRenderView(${JSON.stringify(view)},1)`);
  await c.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
  const shot=await c.send('Page.captureScreenshot',{format:'png'});
  const rgb=await sharp(Buffer.from(shot.data,'base64')).resize(size.width,size.height,{fit:'cover'}).png().toBuffer();
  await save(view+'.rgb.png',rgb);
  const mask=await c.evaluate('window.__demoPlayer.captureMaskPng(800)');maskObjects=mask.objects;
  await save(view+'.mask.png',await normalizeInspectionTileForTest(Buffer.from(mask.pngDataUrl.split(',')[1],'base64'),{viewportWidth:800,viewportHeight:800,channel:'mask'}));
  const capture=await c.evaluate(`window.__demoPlayer.captureInspectionChannels({channels:['depth','normals'],width:1920,height:1080})`);channelMetadata[view]=capture.metadata;
  for(const channel of ['depth','normals'] as const)await save(view+'.'+channel+'.png',await normalizeInspectionTileForTest(Buffer.from(capture.channels[channel].pngDataUrl.split(',')[1],'base64'),{viewportWidth:800,viewportHeight:800,channel}));
 }
 await writeFile(resolve(out,'manifest.json'),JSON.stringify({source:'examples/functional-drafting/'+name+'.kcad.ts',sourceSha256:createHash('sha256').update(await readFile(source)).digest('hex'),command:`npx tsx docs/demos/functional-drafting/inspect.ts ${name}`,baseUrl,backendSha:process.env.BACKEND_SHA??null,existingChrome:c.browser,ownedTarget:c.targetId,channels:['rgb','mask','depth','normals'],views,size,bounds:meshing.bounds,maskObjects,channelMetadata,artifacts,limits:['Local deterministic CAD inspection; no physical acceptance.','Canonical channels use existing browser attachment; CLI launch path intentionally unused.','Top RGB has identical flat color on horizontal roof/base; depth distinguishes the pedestal elevation.']},null,2)+'\n');
 console.log(name+': 4 canonical RGB + mask/depth/normals views captured');
} finally {await c?.close();clearTimeout(deadline);}
