// SPDX-License-Identifier: MIT
// Run from repository root: npx tsx docs/demos/assembly-path/generate.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { verifyTool } from '../../../src/agent/mcp/tools/verify';
import type { AssemblyPathReport } from '../../../src/modeling/runtime/assemblyPath';
const dir = 'docs/demos/assembly-path';
const source = readFileSync(`${dir}/source.kcad.ts`, 'utf8');
const reports: Record<string, AssemblyPathReport> = {};
const titles = ['Blind pocket: peg leaves only along +Z', 'Captured peg: no straight removal path', 'Separate lid: iteratively free the assembly'];
const label = (v: number[]) => v.map(n => n === 0 ? '0' : n === 1 ? '+1' : String(n)).join(', ');
for (const [index, mode] of ['blind', 'captured', 'order'].entries()) {
  const code = source.replace("const mode = 'blind';", `const mode = '${mode}';`);
  const input = {check: 'assembly-path' as const, code, assembly: 'assembly-path-demo', disassemblyOrder: mode !== 'blind'};
  const result = await verifyTool(input) as AssemblyPathReport;
  if (!result.parts) throw new Error(JSON.stringify(result));
  reports[mode] = result;
  if (mode === 'blind' && JSON.stringify(result.parts[0].validDirections) !== '[[0,0,1]]') throw new Error('Blind peg expectation failed');
  if (mode === 'captured' && result.stuckParts?.length !== 2) throw new Error('Capture expectation failed');
  if (mode === 'order' && result.removalOrder?.map(s=>s.part).join(',') !== 'lid,peg,housing') throw new Error('Order expectation failed');
  const peg = result.parts.find(p=>p.part==='peg')!;
  const lines = [
    "verify({ check: 'assembly-path', code, disassemblyOrder: " + input.disassemblyOrder + ' })',
    `PEG removable: ${peg.removable ? 'YES' : 'NO'}   |   valid directions: ${peg.validDirections.map(label).join(' / ') || 'none'}`,
    ...peg.directions.map(d=>`[${label(d.direction)}]   ${d.clear ? 'CLEAR' : 'BLOCKED by ' + d.blockingParts.join(', ')}   |   travel ${d.distanceMm.toFixed(3)} mm`),
    ...(result.removalOrder ? [`Order: ${result.removalOrder.map(s=>s.part).join(' -> ') || 'none'}`,`Stuck: ${result.stuckParts?.join(', ') || 'none'}`] : []),
  ];
  const escape = (s: string) => s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="1280" height="720" fill="#101827"/><text x="48" y="62" fill="#7de4cd" font-size="24" font-family="sans-serif">kernelCAD / ASSEMBLY PATH CHECK</text><text x="48" y="115" fill="white" font-size="34" font-family="sans-serif">${titles[index]}</text>${lines.map((line,i)=>`<text x="48" y="${180+i*39}" fill="${i===1 ? '#7de4cd':'#d9e1ef'}" font-size="21" font-family="monospace">${escape(line)}</text>`).join('')}<text x="48" y="684" fill="#a8b5c9" font-size="19" font-family="sans-serif">Actual local checker output • continuous mesh validation • no deployment or hardware acceptance</text></svg>`;
  writeFileSync(`${dir}/frame${index}.svg`,svg);
  await sharp(Buffer.from(svg)).png().toFile(`${dir}/frame${index}.png`);
}
writeFileSync(`${dir}/results.json`, JSON.stringify(reports,null,2)+'\n');
execFileSync('ffmpeg',['-y','-loglevel','error','-framerate','1/4','-i',`${dir}/frame%d.png`,'-c:v','mpeg4','-q:v','2','-pix_fmt','yuv420p','-r','24','-movflags','+faststart',`${dir}/demo.mp4`]);
const probe=JSON.parse(execFileSync('ffprobe',['-v','quiet','-show_format','-show_streams','-of','json',`${dir}/demo.mp4`],{encoding:'utf8'}));
writeFileSync(`${dir}/verification.json`,JSON.stringify({sourceSha256:createHash('sha256').update(source).digest('hex'), invocation:'npx tsx docs/demos/assembly-path/generate.ts',settings:{resolution:'1280x720',fps:24,secondsPerCard:4,codec:'mpeg4',synthetic:true,basis:'actual local verify output'},expectations:'blind peg +Z only; captured stuck peg/housing; separate lid order lid,peg,housing',probe},null,2)+'\n');
