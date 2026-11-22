// SPDX-License-Identifier: MIT
// Executes the existing MCP handler locally, renders the exact source, then encodes the measured result.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { callMcpTool } from '../../../src/agent/mcp/toolRegistry';
import type { FastenerInstallationReport } from '../../../src/modeling/runtime/fastenerInstallationTypes';

const OUT = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(OUT, '../../..');
const MODEL = join(ROOT, 'examples/fastener-installation/local-feature-mount.kcad.ts');
const hash = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
const source = await readFile(MODEL, 'utf8');
const fasteners = [{ part: 'screw', against: ['plate'] }];
const cases = [
  { name: 'remote-notch', kind: 'remote-notch', lift: 0, expected: 'pass',
    title: 'An intact local bore remains measurable',
    note: 'The remote edge notch does not invalidate the screw station.' },
  { name: 'split-bearing', kind: 'split-bearing', lift: 0, expected: 'pass',
    title: 'Coplanar trimmed faces support one head',
    note: 'Both trimmed faces contribute to the same measured bearing plane.' },
  { name: 'lifted-head', kind: 'split-bearing', lift: 1.5, expected: 'fail',
    title: 'A lifted head still fails the gap check',
    note: 'The same station measures a 1.500 mm gap after the source edit.' },
  { name: 'narrow-breach', kind: 'narrow-breach', lift: 0, expected: 'partial',
    title: 'A narrow side pocket stays unverified',
    note: 'A 0.4 mm slot through half the depth removes actual bore-wall area.' },
];
const evidence = [];
const env = { ...process.env };
delete env.PW_CDP_URL;
for (const item of cases) {
  const code = source.replace("const fixtureCase: string = 'split-bearing';", "const fixtureCase: string = '" + item.kind + "';")
    .replace("param('liftedHeadMm', 0,", "param('liftedHeadMm', " + item.lift + ",");
  const file = join(OUT, item.name + '.kcad.ts');
  await writeFile(file, code);
  const report = await callMcpTool('verify', { check: 'fastener-installation', code, fasteners }) as FastenerInstallationReport;
  if (report.status !== item.expected) throw new Error(JSON.stringify({ item, report }));
  const inspection = join(OUT, item.name + '-inspection');
  const args = ['180', process.execPath, join(ROOT, 'dist/cli/index.js'), 'render', 'inspect', file, inspection, '--width', '680', '--height', '450'];
  execFileSync('timeout', args, { cwd: ROOT, env, stdio: 'inherit', timeout: 185000 });
  const manifest = JSON.parse(await readFile(join(inspection, 'manifest.json'), 'utf8'));
  evidence.push({ ...item, file, sourceSha256: hash(code), report, render: { args, manifest } });
}
const esc = (text: string) => text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
for (const [index, item] of evidence.entries()) {
  const metrics = item.report.stations[0].metrics;
  const metric = (name: string) => metrics.find(m => m.name === name)!;
  const gap = metric('bearing-gap');
  const bore = metric('bore-diameter');
  const lines = [
    "verify('fastener-installation')",
    'Explicit stations: 1',
    'Result: ' + item.report.status.toUpperCase(),
    'Bore: ' + (bore.value === null ? bore.status : bore.value.toFixed(3) + ' mm'),
    'Head gap: ' + (gap.value === null ? gap.status : gap.value.toFixed(3) + ' mm'),
    'Source lift: ' + item.lift.toFixed(3) + ' mm',
  ];
  const color = item.report.status === 'pass' ? '#136b4b' : item.report.status === 'fail' ? '#a2342c' : '#8a5914';
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">'
    + '<rect width="1280" height="720" fill="#f3f6fa"/><rect width="1280" height="8" fill="' + color + '"/>'
    + '<text x="46" y="64" style="font:700 34px Arial;fill:#152a43">' + esc(item.title) + '</text>'
    + '<text x="47" y="105" style="font:20px Arial;fill:#53677c">Existing MCP verify handler · local OCCT evaluation · exact source render</text>'
    + '<rect x="40" y="135" width="700" height="470" rx="12" fill="white" stroke="#d6e0eb"/>'
    + '<text x="770" y="176" style="font:700 16px Arial;fill:#53677c">MEASURED RESULT</text>'
    + lines.map((line,i)=>'<text x="770" y="' + (226+i*52) + '" style="font:19px DejaVu Sans Mono;fill:' + (i===2?color:'#193953') + '">' + esc(line) + '</text>').join('')
    + '<text x="46" y="642" style="font:700 21px Arial;fill:#152a43">' + esc(item.note) + '</text>'
    + '<text x="46" y="688" style="font:16px Arial;fill:#53677c">Geometry audit only · simplified catalog threads · no load, torque, deployed-runtime or hardware qualification</text></svg>';
  const png = await sharp(join(OUT, item.name + '-inspection/channels/rgb/iso.png')).resize(680,450).png().toBuffer();
  await sharp(Buffer.from(svg)).composite([{ input: png, left: 50, top: 145 }]).png().toFile(join(OUT,'frame-' + (index+1) + '.png'));
}
const list = cases.map((_, i) => "file 'frame-" + (i+1) + ".png'\nduration 4").join('\n');
await writeFile(join(OUT,'slides.txt'), list + "\nfile 'frame-4.png'\n");
const ffmpegArgs = ['-y','-v','error','-f','concat','-safe','0','-i','slides.txt','-t','16','-vf','fps=20,format=yuv420p','-c:v','libx264','-preset','medium','-crf','22','-movflags','+faststart','demo.mp4'];
execFileSync('ffmpeg',ffmpegArgs,{cwd:OUT,stdio:'pipe'});
await mkdir(join(OUT,'decoded'),{recursive:true});
for (let i=0;i<4;i++) execFileSync('ffmpeg',['-y','-v','error','-ss',String(i*4+2),'-i',join(OUT,'demo.mp4'),'-frames:v','1',join(OUT,'decoded/frame-'+(i+1)+'.png')],{stdio:'pipe'});
const implementationPaths = ['src/modeling/runtime/fastenerInstallation.ts','src/kernel/backends/occt/holeDetection.ts'];
const implementationHashes = Object.fromEntries(await Promise.all(implementationPaths.map(async p=>[p,hash(await readFile(join(ROOT,p)))])));
const stream = JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','stream=codec_name,width,height,r_frame_rate,duration','-of','json',join(OUT,'demo.mp4')],{encoding:'utf8'}));
await writeFile(join(OUT,'verification.json'),JSON.stringify({ checkedAt:new Date().toISOString(), invocation:'npx tsx docs/demos/fastener-local-features-20261122/capture-demo.mts',
  exampleSha256:hash(source),generatorSha256:hash(await readFile(fileURLToPath(import.meta.url))),implementationHashes,evidence,
  video:{...stream.streams[0],ffmpegArgs},scope:{localMcpHandler:true,actualOcct:true,canonicalViews:true,deployedRuntime:false,physicalQualification:false}},null,2)+'\n');
console.log('Recorded four measured local MCP cases and a 16-second H.264 demo.');
