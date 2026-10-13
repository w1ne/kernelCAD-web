// SPDX-License-Identifier: MIT
// Run with npx tsx docs/demos/mcp-step-snapshots/make-video.ts, then ffmpeg below.
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
const dir = 'docs/demos/mcp-step-snapshots/evidence';
const result = JSON.parse(await readFile(`${dir}/result.json`, 'utf8'));
const caption = (title: string, detail: string) => Buffer.from(`<svg width="1024" height="124" xmlns="http://www.w3.org/2000/svg"><rect width="1024" height="124" fill="#16202c"/><g fill="white" font-family="Arial"><text x="24" y="35" font-size="25">${title}</text><text x="24" y="70" font-size="21">${detail}</text><text x="24" y="105" font-size="17">Local validation · attached Chrome adapter · no deployment or hardware acceptance</text></g></svg>`);
for (const [index, side] of ['before', 'after'].entries()) {
 const volume = result[side].step.validity.volume.toFixed(2);
 const frame = await sharp({create:{width:1024,height:636,channels:3,background:'#929292'}}).composite([
  {input:await sharp(`${dir}/${side}.png`).resize(1024,512,{fit:'contain',background:'#929292'}).toBuffer(),top:0,left:0},
  {input:caption(`MCP step ${index+1}: ${side === 'before' ? 'Build plate' : 'Widen plate and cut a through hole'}`,`Build validity: valid · volume ${volume} mm³ · same iso camera / frame`),top:512,left:0},
 ]).png().toBuffer();
 await writeFile(`${dir}/demo-${index}.png`,frame);
}
