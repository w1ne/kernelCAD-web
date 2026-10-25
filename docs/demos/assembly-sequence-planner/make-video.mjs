// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Compose the P2 demo from local kernelcad renders and the planner evidence.
// Not a screen recording. Run from the repository root:
//   node docs/demos/assembly-sequence-planner/make-video.mjs
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
const evidence = JSON.parse(readFileSync(join(HERE, 'sequence-evidence.json'), 'utf8'));

function escape(text) {
  return String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function textLines(lines, x, y, size, color = INK, family = 'DejaVu Sans') {
  return lines.map((line, i) => `<text x="${x}" y="${y + i * size * 1.45}" font-family="${family}" font-size="${size}" fill="${color}">${escape(line)}</text>`).join('');
}

function baseSvg(title, lines, footer) {
  return Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${W}" height="${H}" fill="#ffffff"/>
    <text x="120" y="108" font-family="DejaVu Sans" font-size="58" font-weight="bold" fill="${INK}">${escape(title)}</text>
    ${textLines(lines, 120, 172, 34, INK)}
    <text x="120" y="${H - 76}" font-family="DejaVu Sans" font-size="25" fill="${GREY}">${escape(footer)}</text>
  </svg>`);
}

async function slide(name, { title, lines = [], footer, image, imageBox = { left: 120, top: 250, width: 1680, height: 650 } }) {
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
  const path = join(FRAMES, `${name}.png`);
  await sharp(baseSvg(title, lines, footer)).composite(composites).png().toFile(path);
  return path;
}

function motionLabel(step) {
  if (step.motion === 'helical') return 'helical';
  if (step.motion === 'requires-force') return 'requires-force';
  if (step.motion === 'search') return 'found-by-search';
  return 'straight';
}
function listLines(steps, from, to) {
  return steps.slice(from, to).map(s => `${String(s.index).padStart(2, ' ')}  + ${s.adds.join(' + ').padEnd(16)} ${motionLabel(s).padEnd(14)} insert ${JSON.stringify(s.direction)}`);
}

const slides = [];
slides.push([3.5, await slide('00-title', {
  title: 'Fastener precedence and tool reach (P2)',
  lines: [
    "verify({ check: 'assembly-path', sequence: true })",
    'Declared helical bolts, press fits and swept tool envelopes; no fake proof.',
    'Local triangle-mesh evidence. Not a deployed capture or hardware test.',
  ],
  footer: 'kernelCAD · examples/assemblies/assembly-sequence-gearbox.kcad.ts',
})]);
slides.push([4.5, await slide('01-assembled', {
  title: 'Gearbox with four bolts, a press fit and a tool-clearance rib',
  lines: [
    'Cover, four posts, two shafts, four gears, base, four bolts, one rib.',
    'Rib sits beside bolt A: the screw leaves, the driver envelope does not.',
  ],
  footer: 'Assembled render · local kernelcad render --preset publish',
  image: join(HERE, 'gearbox-assembled.png'),
  imageBox: { left: 120, top: 280, width: 1680, height: 620 },
})]);
slides.push([4.5, await slide('02-internals', {
  title: 'Internals',
  lines: ['Cover hidden. Metal shafts, brass gear rings, aluminium posts.'],
  footer: 'Render invocation: --hide cover',
  image: join(HERE, 'gearbox-internals.png'),
  imageBox: { left: 120, top: 280, width: 1680, height: 620 },
})]);
slides.push([4.5, await slide('03-exploded', {
  title: 'The planner explodes nothing; it peels the blocking graph',
  lines: ['The exploded view is only evidence of part identity.'],
  footer: 'Render invocation: --explode 0.6',
  image: join(HERE, 'gearbox-exploded.png'),
  imageBox: { left: 120, top: 280, width: 1680, height: 620 },
})]);
slides.push([5.0, await slide('04-steps-a', {
  title: 'Build sequence · steps 1–10',
  lines: [
    'Heuristic removal order is reversed; direction is the insertion direction.',
    '',
    ...listLines(evidence.result.steps, 0, 10),
    '',
    `model: ${evidence.result.model.motionModels.join(' · ')}`,
  ],
  footer: 'sequence-evidence.json · verify assembly-path sequence:true',
})]);
slides.push([5.0, await slide('05-steps-b', {
  title: 'Build sequence · steps 11–19',
  lines: [
    ...listLines(evidence.result.steps, 10, 19),
    '',
    `unknown: ${evidence.result.unknown.length === 0 ? '[]' : evidence.result.unknown.join(', ')}`,
    `ok: ${evidence.result.ok} · toolBlocked: ${(evidence.result.toolBlocked ?? []).length} · requiresForce: ${(evidence.result.requiresForce ?? []).length}`,
  ],
  footer: 'Nineteen steps: seventeen part additions plus two subassembly installs.',
})]);
slides.push([5.0, await slide('05a-fasteners', {
  title: 'P2 · helical motion, tool reach and declared force',
  lines: [
    ...evidence.result.steps
      .filter(step => step.motion === 'helical' || step.requiresForce || step.tool)
      .map(step => {
        if (step.tool) return `${String(step.index).padStart(2, ' ')}  ${step.adds[0]}  helical · TOOL-BLOCKED by ${step.tool.blockers.join(', ')}`;
        if (step.requiresForce) return `${String(step.index).padStart(2, ' ')}  ${step.adds[0]}  requires-force ${step.requiresForce.kind} (declared, not simulated)`;
        return `${String(step.index).padStart(2, ' ')}  ${step.adds[0]}  helical · pitch ${step.fastener?.pitchMm} mm · ${step.fastener?.turns.toFixed(2)} turns`;
      }),
    '',
    `model stamp: ${evidence.result.model.motionModels.join(' · ')}`,
    `toolReach: ${evidence.result.model.toolReach}`,
    'Helical = declared axis/pitch sweep, never thread engagement.',
    'requires-force = declared, never proven; tool-blocked = swept envelope.',
  ],
  footer: 'sequence.toolBlocked names tool-clearance-rib; sequence.requiresForce names the press-fit gear.',
})]);
slides.push([5.0, await slide('05b-subassemblies', {
  title: 'Subassembly planned inside, installed as one unit',
  lines: [
    ...evidence.result.steps
      .filter(step => step.subassembly)
      .map(step => step.adds[0] === step.subassembly
        ? `${String(step.index).padStart(2, ' ')}  install ${step.subassembly} as one unit`
        : `${String(step.index).padStart(2, ' ')}  add ${step.adds.join(' + ').padEnd(20)} inside ${step.subassembly}`),
    '',
    'Internal steps are tagged; the unit install step adds the subassembly name.',
    'Deterministic heuristics: subassemblies first, outside-in, fewest reorientations, fewest tool changes.',
  ],
  footer: 'Fastened mates define the clusters; no mate solve is claimed.',
})]);
slides.push([5.0, await slide('06-states', {
  title: 'States and fallback labels are never collapsed',
  lines: [
    'removable { direction, testedDirections, motion? } — straight or declared helical.',
    'requires-force { fit }                          — press/snap declared, never simulated.',
    'blocked { blockersByDirection }                 — trapped pin in two interlocking halves.',
    'unknown { reason }                              — budget, multi-part move, non-straight path.',
    '',
    'Tool reach: clear or tool-blocked { fastener, blockers }; unmodelled tools add nothing.',
    'Sampling fallback: sequence.search[].status = found-by-search, never proven.',
  ],
  footer: 'Unit tests: helical path, tool pass/fail, requires-force step, sequence integration.',
})]);
slides.push([4.0, await slide('07-end', {
  title: 'Model stamp',
  lines: [
    `basis: ${evidence.result.model.basis}`,
    `motionModels: ${evidence.result.model.motionModels.join(', ')}`,
    `toolReach: ${evidence.result.model.toolReach} · gravity: ${evidence.result.model.gravity}`,
    `tessellation: ${evidence.result.model.tessellation.source}`,
    `clearance: ${evidence.result.model.clearanceMm} mm — ${evidence.result.model.clearancePolicy}`,
    '',
    'Source and evidence: docs/demos/assembly-sequence-planner/',
  ],
  footer: 'Declared fastener/fit metadata, sampled rotation and swept tool envelopes; no hardware claim.',
})]);

const list = [];
for (const [duration, path] of slides) {
  list.push(`file '${basename(path)}'`, `duration ${duration}`);
}
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
  sourceModels: { 'assembly-sequence-gearbox.kcad.ts': evidence.sourceSha256 },
  sequenceEvidence: 'sequence-evidence.json',
  inputSha256: Object.fromEntries(
    ['gearbox-assembled.png', 'gearbox-internals.png', 'gearbox-exploded.png']
      .map(name => [name, sha256(join(HERE, name))]),
  ),
  slides: slides.map(([duration, path]) => ({ image: path.split('/').pop(), durationSec: duration })),
  invocations: [
    'npx tsx src/agent/cli/index.ts render examples/assemblies/assembly-sequence-gearbox.kcad.ts --preset publish -o docs/demos/assembly-sequence-planner/gearbox-assembled.png',
    'npx tsx src/agent/cli/index.ts render examples/assemblies/assembly-sequence-gearbox.kcad.ts --preset publish --hide cover -o docs/demos/assembly-sequence-planner/gearbox-internals.png',
    'npx tsx src/agent/cli/index.ts render examples/assemblies/assembly-sequence-gearbox.kcad.ts --preset publish --explode 0.6 -o docs/demos/assembly-sequence-planner/gearbox-exploded.png',
    "verify({ check: 'assembly-path', file: 'examples/assemblies/assembly-sequence-gearbox.kcad.ts', sequence: true })",
    'node docs/demos/assembly-sequence-planner/make-video.mjs',
  ],
  provenance: 'Annotated still sequence composed from local kernelcad renders and the planner evidence JSON. Not a screen recording, turntable, deployed-platform capture, physical hardware or strength test.',
};
writeFileSync(join(HERE, 'video-evidence.json'), JSON.stringify(videoEvidence, null, 2) + '\n');
console.log(`wrote ${OUT} (${videoEvidence.videoSha256})`);
