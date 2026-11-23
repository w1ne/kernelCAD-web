// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const temp = join(here, '.frames');
const diagnostics = JSON.parse(await readFile(join(here, 'diagnostics.json'), 'utf8'));
const verification = JSON.parse(await readFile(join(here, 'verification.json'), 'utf8'));
const stage = await readFile(join(here, 'stage.usda'), 'utf8');
const warning = diagnostics.find((item) => item.code === 'export.usd.coupling-dropped');
const drivenJoint = stage.split('\n').find((line) => line.includes('PhysicsRevoluteJoint "output"'));
if (!warning || !drivenJoint) throw new Error('Generate the serializer evidence before rendering the demo.');

const width = 1280;
const height = 720;
const font = 'DejaVu Sans, sans-serif';
const esc = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const wrap = (value, limit) => {
  const lines = [];
  let line = '';
  for (const word of value.split(/\s+/)) {
    if (line && `${line} ${word}`.length > limit) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
};
const xmlLines = (lines, x, y, size, color, lineHeight, weight = 400) => lines
  .map((line, index) => `<text x="${x}" y="${y + index * lineHeight}" font-family="${font}" font-size="${size}" font-weight="${weight}" fill="${color}">${esc(line)}</text>`)
  .join('');
const base = (title, kicker, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<rect width="100%" height="100%" fill="#0b1220"/><rect width="12" height="100%" fill="#5eead4"/>
<text x="70" y="72" font-family="${font}" font-size="19" letter-spacing="2" fill="#5eead4">KERNELCAD · USD ISAAC EXPORT</text>
<text x="70" y="142" font-family="${font}" font-size="44" font-weight="700" fill="#f8fafc">${esc(title)}</text>
<text x="70" y="186" font-family="${font}" font-size="22" fill="#94a3b8">${esc(kicker)}</text>
${body}
<rect x="0" y="664" width="1280" height="56" fill="#111c2e"/>
<text x="70" y="700" font-family="${font}" font-size="15" fill="#cbd5e1">LOCAL SERIALIZATION VERIFIED · SIMULATION/REPLAY NOT RUN · DEPLOYMENT NOT CHECKED · HARDWARE NOT ACCEPTED</text>
</svg>`;

await rm(temp, { recursive: true, force: true });
await mkdir(temp, { recursive: true });
const frames = [
  base('Coupled revolute mates', 'One local export run, from authored relation to emitted stage.', `
    <rect x="70" y="236" width="1140" height="308" rx="18" fill="#142238" stroke="#263954"/>
    <text x="110" y="292" font-family="${font}" font-size="20" fill="#94a3b8">FIXTURE</text>
    <text x="110" y="344" font-family="${font}" font-size="27" fill="#e2e8f0">Two revolute mates named input and output</text>
    <text x="110" y="410" font-family="monospace" font-size="28" fill="#5eead4">arm.coupleMates('output', { source: 'input', ratio: -0.5 });</text>
    <text x="110" y="478" font-family="${font}" font-size="20" fill="#94a3b8">Command: npx tsx docs/demos/usd-coupling-warning-20261115/capture-demo.ts</text>
    <text x="110" y="520" font-family="${font}" font-size="18" fill="#64748b">The cylinder pair is a topology fixture; it does not model gear teeth or contact.</text>
  `),
  base('The exporter reports the dropped relation', `Severity: ${warning.severity.toUpperCase()} · Code: ${warning.code}`, `
    <rect x="70" y="232" width="1140" height="364" rx="18" fill="#142238" stroke="#fbbf24" stroke-width="2"/>
    <circle cx="112" cy="278" r="12" fill="#fbbf24"/>
    ${xmlLines(wrap(warning.message, 78), 145, 286, 22, '#f8fafc', 38, 500)}
    <text x="110" y="542" font-family="${font}" font-size="19" fill="#fbbf24">The authored ratio is named; the warning does not claim runtime enforcement.</text>
  `),
  base('Stage remains valid; joint is independent', 'Serializer checks from the generated USDA and diagnostics.', `
    <rect x="70" y="232" width="1140" height="356" rx="18" fill="#142238" stroke="#263954"/>
    <text x="110" y="292" font-family="${font}" font-size="20" fill="#94a3b8">EMITTED JOINT</text>
    <text x="110" y="346" font-family="monospace" font-size="25" fill="#5eead4">${esc(drivenJoint.trim())}</text>
    <text x="110" y="414" font-family="${font}" font-size="24" fill="#e2e8f0">Stage written: ${verification.localSerializer.outputWritten ? 'yes' : 'no'} · Coupling warning: ${verification.localSerializer.couplingWarnings}</text>
    <text x="110" y="464" font-family="${font}" font-size="22" fill="#e2e8f0">Mimic API in this export: ${verification.localSerializer.mimicApiPresent ? 'yes' : 'no'}</text>
    <text x="110" y="526" font-family="${font}" font-size="18" fill="#94a3b8">This verifies local serialization only; no Isaac Sim runtime was launched.</text>
  `),
];

for (let index = 0; index < frames.length; index += 1) {
  await sharp(Buffer.from(frames[index])).png().toFile(join(temp, `frame-${String(index + 1).padStart(2, '0')}.png`));
}
const ffmpeg = process.env.KCAD_FFMPEG ?? 'ffmpeg';
const args = [
  '-hide_banner', '-loglevel', 'error', '-y',
  '-loop', '1', '-framerate', '24', '-t', '3', '-i', join(temp, 'frame-01.png'),
  '-loop', '1', '-framerate', '24', '-t', '3', '-i', join(temp, 'frame-02.png'),
  '-loop', '1', '-framerate', '24', '-t', '3', '-i', join(temp, 'frame-03.png'),
  '-filter_complex', '[0:v][1:v][2:v]concat=n=3:v=1:a=0,format=yuv420p[v]',
  '-map', '[v]', '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '27',
  '-movflags', '+faststart', join(here, 'demo.mp4'),
];
const result = spawnSync(ffmpeg, args, { encoding: 'utf8' });
if (result.status !== 0) throw new Error(`${ffmpeg} failed: ${result.stderr || result.error}`);
await rm(temp, { recursive: true, force: true });
console.log(`Wrote ${join(here, 'demo.mp4')}`);
