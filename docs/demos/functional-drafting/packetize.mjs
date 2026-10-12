// Publish only real generated/exported files; refresh downloadable hash inventories.
import { readFile, writeFile, copyFile, readdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const root=resolve(new URL('../../../',import.meta.url).pathname);
for(const [kind,slug,shots] of [
 ['plate','functional-drafting',{'04-reviewed.png':'studio-complete.png','02-hidden.png':'studio-hidden.png'}],
 ['bearing','drawing-decisions',{'01-pending.png':'studio-pending.png','04-complete.png':'studio-resolved.png'}],
]) {
 const from=resolve(root,'docs/demos/functional-drafting',kind),to=resolve(root,'site/blog',slug);
 const receipt=JSON.parse(await readFile(from+'/receipt.json','utf8'));
 if(!receipt.success||!receipt.projectCleanup||!receipt.ownedTabClosed)throw Error('Refuse failed or unclean capture');
 for(const [source,dest] of Object.entries(shots))await copyFile(from+'/'+source,to+'/'+dest);
 await copyFile(from+'/receipt.json',to+'/studio-receipt.json');
 for(const pdf of receipt.pdfs)await copyFile(from+'/'+pdf.name,to+'/'+pdf.name);
 const limits=['Local Studio demonstration; no deployment or physical acceptance claim.','Studio prints inherited ISO2768-mK exporter default; it was not chosen or approved as engineering acceptance.'];
 await writeFile(to+'/studio-evidence.json',JSON.stringify({sourceSha256:receipt.sourceSha256,exportSourceSha256:receipt.exportSourceSha256,sourceNormalization:receipt.sourceNormalization,transport:receipt.transport,limits},null,2)+'\n');
 const manifest=JSON.parse(await readFile(to+'/manifest.json','utf8'));
 manifest.packetizeCommand='node docs/demos/functional-drafting/packetize.mjs';manifest.limits=limits;manifest.files=[];
 for(const path of (await readdir(to)).sort())if(/\.(png|svg|pdf|json|ts)$/.test(path)&&path!=='manifest.json'){
  const bytes=await readFile(to+'/'+path);manifest.files.push({path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
 }
 await writeFile(to+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');
}
// An unsuccessful attempt is retained under diagnostics, never in a success packet.
await rm(resolve(root,'docs/demos/functional-drafting/plate/failure.png'),{force:true});
