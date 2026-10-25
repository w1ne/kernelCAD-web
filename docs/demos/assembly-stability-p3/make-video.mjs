// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Compose the P3 demo from local kernelcad renders and the P3 evidence.
// Not a screen recording and not a physics simulation. Run from the repo root:
//   node docs/demos/assembly-stability-p3/make-video.mjs
// Set FFMPEG to an ffmpeg binary if it is not on PATH.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import sharp from 'sharp';

const HERE = dirname(new URL(import.meta.url).pathname);
const FRAMES = join(HERE, 'frames');
const OUT = join(HERE, 'demo.mp4');
const W = 1920;
const H = 1080;
const INK = '#1c2026';
const GREY = '#5b636e';
const ACCENT = '#2b6cb0';

mkdirSync(FRAMES, { recursive: true });
const evidence = JSON.parse(readFileSync(join(HERE, 'stability-evidence.json'), 'utf8'));

const escape = text => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const textLines = (lines, x, y, size, color = INK) => lines
  .map((line, i) => `<text x="${x}" y="${y + i * size * 1.45}" font-family="DejaVu Sans" font-size="${size}" fill="${color}">${escape(line)}</text>`)
  .join('');

function baseSvg(title, lines, footer) {
  return Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${W}" height="${H}" fill="#ffffff"/>
    <text x="120" y="108" font-family="DejaVu Sans" font-size="58" font-weight="bold" fill="${INK}">${escape(title)}</text>
    ${textLines(lines, 120, 172, 34, INK)}
    <text x="120" y="${H - 76}" font-family="DejaVu Sans" font-size="25" fill="${GREY}">${escape(footer)}</text>
  </svg>`);
}

async function slide(name, { title, lines = [], footer, accent, image, imageBox = { left: 120, top: 250, width: 1680, height: 650 } }) {
  const composites = [];
  if (image) {
    const resized = await sharp(image)
      .resize({ width: imageBox.width, height: imageBox.height, fit: 'contain', background: '#ffffff' })
      .toBuffer();
    const meta = await sharp(resized).metadata();
    composites.push({
      input: resized,
      left: Math.round(imageBox.left + (imageBox.width - meta.width) / 2),
      top: Math.round(imageBox.top + (imageBox.height - meta.height) / 2),
    });
  }
  let svg = baseSvg(title, lines, footer);
  if (accent) {
    svg = Buffer.from(svg.toString().replace('</svg>', `<rect x="0" y="${H - 140}" width="${W}" height="6" fill="${ACCENT}"/></svg>`));
  }
  const path = join(FRAMES, `${name}.png`);
  await sharp(svg).composite(composites).png().toFile(path);
  return path;
}

function stepLine(step) {
  const state = step.stability === 'needs-hold' ? 'NEEDS-HOLD' : 'stable';
  const held = step.heldBy?.length ? ` held by ${step.heldBy.join(', ')}` : '';
  return `${String(step.index).padStart(2, ' ')}  + ${step.adds.join(' + ').padEnd(16)} ${state.padEnd(11)}${held}`;
}

const need = evidence.needsHold[0];
const slides = [];
slides.push([3.5, await slide('00-title', {
  title: 'Approximate static stability (P3)',
  lines: [
    "verify({ check: 'assembly-path', sequence: true, stability: true })",
    'Centre-of-mass projection over contacts with already-stable parts.',
    'Approximate support test. No gravity simulation, friction or fixture solve.',
  ],
  accent: true,
  footer: 'kernelCAD · examples/assemblies/assembly-stability-bracket.kcad.ts',
})]);
slides.push([4.5, await slide('01-assembled', {
  title: 'Cantilever on a pedestal, support built later',
  lines: [
    'Base: left pedestal, lower shelf, tall post. Cantilever rests on the pedestal.',
    'Narrow support stands on the shelf under the free end.',
  ],
  footer: 'Assembled render · local kernelcad render --preset publish',
  image: join(HERE, 'bracket-assembled.png'),
  imageBox: { left: 120, top: 280, width: 1680, height: 620 },
})]);
slides.push([4.5, await slide('02-exploded', {
  title: 'Part identity, not an assembly claim',
  lines: ['The exploded view is evidence only; the planner works from the assembled meshes.'],
  footer: 'Render invocation: --explode 0.8',
  image: join(HERE, 'bracket-exploded.png'),
  imageBox: { left: 120, top: 280, width: 1680, height: 620 },
})]);
slides.push([5.0, await slide('03-steps', {
  title: 'Build sequence · the cantilever comes first',
  lines: [
    ...evidence.steps.map(stepLine),
    '',
    `model.gravity: ${evidence.model.gravity}`,
    `seed: ${evidence.model.stability.seed.join(', ')} (${evidence.model.stability.seedSource})`,
  ],
  footer: 'stability-evidence.json · verify assembly-path sequence:true stability:true',
})]);
slides.push([5.0, await slide('04-finding', {
  title: 'Step 1 is needs-hold',
  lines: [
    `part: ${need.part}`,
    `reason: ${need.reason}`,
    `stable contacts: ${need.supports.join(', ')}`,
    `centre of mass: [${need.centerOfMass.map(v => v.toFixed(2)).join(', ')}]`,
    `support polygon points: ${need.supportPolygon.length}`,
    '',
    'The free-end support is not in the partial assembly at this step.',
  ],
  footer: 'A needs-hold is an external action the model cannot prove; it is not "will fall".',
})]);
slides.push([5.0, await slide('05-stamp', {
  title: 'Model stamp says exactly how far the claim goes',
  lines: [
    `gravity: ${evidence.model.gravity}`,
    `model: ${evidence.model.stability.model}`,
    `gravity direction: ${JSON.stringify(evidence.model.stability.gravity)}`,
    `contact tolerance: ${evidence.model.stability.contactToleranceMm} mm`,
    `mass basis: ${evidence.model.stability.massBasis}`,
    `basis: ${evidence.model.basis}`,
    '',
    'Rigid meshes, sampled contacts, projection only. No friction, tipping, compliance or hardware acceptance.',
  ],
  accent: true,
  footer: 'Orientation is declared: a different gravity re-seeds the base and changes the result.',
})]);
slides.push([3.5, await slide('06-end', {
  title: 'Evidence and limits',
  lines: [
    `ok: ${evidence.ok} · unknown: ${evidence.unknown.length}`,
    'Source, exact invocation and result: docs/demos/assembly-stability-p3/',
    'Guide: docs/guide/assembly-path.md',
    '',
    'Not a deployed-platform capture, physical build or strength test.',
  ],
  footer: 'kernelCAD P3 · approximate static stability',
})]);

const list = [];
for (const [duration, path] of slides)
  list.push(`file '${basename(path)}'`, `duration ${duration}`);
list.push(`file '${basename(slides[slides.length - 1][1])}'`);
const listPath = join(FRAMES, 'slides.txt');
writeFileSync(listPath, list.join('\n') + '\n');

const ffmpeg = process.env.FFMPEG || 'ffmpeg';
execFileSync(ffmpeg, [
  '-y', '-f', 'concat', '-safe', '0', '-i', listPath,
  '-vf', 'format=yuv420p', '-r', '30', '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart', OUT,
], { stdio: 'inherit' });

const sha256 = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const videoEvidence = {
  checkedAt: new Date().toISOString(),
  video: 'demo.mp4',
  videoSha256: sha256(OUT),
  canvas: `${W}x${H}`,
  sourceModels: { 'assembly-stability-bracket.kcad.ts': evidence.sourceSha256 },
  stabilityEvidence: 'stability-evidence.json',
  inputSha256: Object.fromEntries(
    ['bracket-assembled.png', 'bracket-exploded.png'].map(name => [name, sha256(join(HERE, name))]),
  ),
  slides: slides.map(([duration, path]) => ({ image: path.split('/').pop(), durationSec: duration })),
  invocations: [
    'npm run build:player',
    'npx tsx src/agent/cli/index.ts render examples/assemblies/assembly-stability-bracket.kcad.ts --preset publish -o docs/demos/assembly-stability-p3/bracket-assembled.png',
    'npx tsx src/agent/cli/index.ts render examples/assemblies/assembly-stability-bracket.kcad.ts --preset publish --explode 0.8 -o docs/demos/assembly-stability-p3/bracket-exploded.png',
    'npx tsx docs/demos/assembly-stability-p3/make-evidence.ts',
    'node docs/demos/assembly-stability-p3/make-video.mjs',
  ],
  provenance: 'Annotated still sequence composed from local kernelcad renders and the real P3 verifier result. Not a screen recording, turntable, deployed-platform capture, physical hardware or strength test. Static stability is an approximate support projection, not a physics simulation.',
};
writeFileSync(join(HERE, 'video-evidence.json'), JSON.stringify(videoEvidence, null, 2) + '\n');
console.log(`wrote ${OUT} (${videoEvidence.videoSha256})`);
