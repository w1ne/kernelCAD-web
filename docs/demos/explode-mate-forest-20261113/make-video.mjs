// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Build a labeled diagram replay from the exact assertions in explodedPoses.test.ts.
// Run: node docs/demos/explode-mate-forest-20261113/make-video.mjs
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const HERE = dirname(new URL(import.meta.url).pathname);
const FRAMES = join(HERE, 'frames');
const WIDTH = 1920;
const HEIGHT = 1080;
const INK = '#18212b';
const MUTED = '#52606d';
const COLORS = { aluminum: '#98a4ad', pla: '#e79846', steel: '#4b6d8c' };

mkdirSync(FRAMES, { recursive: true });
const escapeXml = text => String(text)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;');
const text = (value, x, y, size, color = INK, weight = 400) =>
  `<text x="${x}" y="${y}" font-family="DejaVu Sans" font-size="${size}" font-weight="${weight}" fill="${color}">${escapeXml(value)}</text>`;
const box = ({ x, y, w = 300, h = 132, d = 52, color, name, material }) => {
  const dark = color === COLORS.aluminum ? '#727e87' : color === COLORS.pla ? '#b96925' : '#344f69';
  return `<g>
    <polygon points="${x},${y} ${x + d},${y - d} ${x + w + d},${y - d} ${x + w},${y}" fill="#cbd2d8" stroke="#394652" stroke-width="3"/>
    <polygon points="${x + w},${y} ${x + w + d},${y - d} ${x + w + d},${y + h - d} ${x + w},${y + h}" fill="${dark}" stroke="#394652" stroke-width="3"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}" stroke="#394652" stroke-width="3"/>
    ${text(name, x + 22, y + 58, 32, '#ffffff', 700)}
    ${text(material, x + 22, y + 102, 22, '#ffffff')}
  </g>`;
};
const arrow = (x, y1, y2, label) => `<g stroke="#2563a6" stroke-width="5" fill="none">
  <line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}"/>
  <path d="M ${x - 12} ${y2 + 18} L ${x} ${y2} L ${x + 12} ${y2 + 18}"/>
</g>${text(label, x + 22, (y1 + y2) / 2, 24, '#2563a6', 700)}`;
const background = (title, subtitle, slideNo) => `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#ffffff"/>
  ${text(title, 100, 100, 52, INK, 700)}
  ${text(subtitle, 102, 150, 26, MUTED)}
  <line x1="100" y1="${HEIGHT - 92}" x2="${WIDTH - 100}" y2="${HEIGHT - 92}" stroke="#d6dce1" stroke-width="2"/>
  ${text('Schematic from passing geometry regression · not a renderer capture · mechanism status unverified', 100, HEIGHT - 48, 19, MUTED)}
  ${text(String(slideNo).padStart(2, '0'), WIDTH - 132, HEIGHT - 48, 19, MUTED)}
`;

const slideSvgs = [
  `${background('Mate-axis explode · standalone first part', 'Regression: an unmated context part must not hide the mates in another component.', 1)}
    <rect x="100" y="250" width="1720" height="560" rx="18" fill="#f5f7f9" stroke="#d6dce1" stroke-width="2"/>
    ${text('MODEL ORDER', 160, 330, 25, MUTED, 700)}
    ${text('table (unmated)  →  base  →  mid  →  top', 160, 405, 42, INK, 700)}
    ${text('Mates: base–mid and mid–top · fastened · connector axis +Z', 160, 490, 30, MUTED)}
    ${text('The test checks the resulting offsets in millimetres.', 160, 610, 30, INK)}
  </svg>`,
  `${background('Input · table is declared before the mated stack', 'Four 10 mm parts; table has no mate. The stack follows two fastened mates.', 2)}
    ${box({ x: 240, y: 780, color: COLORS.aluminum, name: 'table', material: 'aluminum · no mate' })}
    ${box({ x: 1090, y: 780, color: COLORS.aluminum, name: 'base', material: 'aluminum · anchor' })}
    ${box({ x: 1090, y: 648, color: COLORS.pla, name: 'mid', material: 'pla' })}
    ${box({ x: 1090, y: 516, color: COLORS.steel, name: 'top', material: 'steel' })}
    ${text('MATED STACK', 1090, 445, 24, MUTED, 700)}
  </svg>`,
  `${background('Result · mate-axis factor 1', 'Offsets applied to the mated component; the standalone table and base stay still.', 3)}
    ${box({ x: 240, y: 780, color: COLORS.aluminum, name: 'table', material: 'offset [0, 0, 0] mm' })}
    ${box({ x: 1090, y: 780, color: COLORS.aluminum, name: 'base', material: 'offset [0, 0, 0] mm' })}
    ${box({ x: 1090, y: 516, color: COLORS.pla, name: 'mid', material: 'offset [0, 0, 10] mm' })}
    ${box({ x: 1090, y: 252, color: COLORS.steel, name: 'top', material: 'offset [0, 0, 20] mm' })}
    ${arrow(930, 648, 516, '+10 mm Z')}
    ${arrow(930, 516, 252, '+20 mm Z')}
  </svg>`,
  `${background('Verification · local regression', 'Exact assertions from tests/unit/modeling/explodedPoses.test.ts', 4)}
    <rect x="100" y="230" width="1720" height="560" rx="18" fill="#f5f7f9" stroke="#d6dce1" stroke-width="2"/>
    ${text('PASS', 160, 340, 46, '#167447', 700)}
    ${text('3 / 3 explodedPoses tests', 160, 420, 40, INK, 700)}
    ${text('Example typecheck: OK · 1 file checked', 160, 495, 30, INK)}
    ${text('CLI renderer capture: not produced on this host (filesystem I/O wait).', 160, 610, 26, MUTED)}
    ${text('No simulation, deployment, or hardware acceptance claim.', 160, 665, 26, MUTED)}
  </svg>`,
];

const framePaths = [];
for (let index = 0; index < slideSvgs.length; index++) {
  const svgPath = join(FRAMES, `slide-${String(index).padStart(2, '0')}.svg`);
  const pngPath = join(FRAMES, `slide-${String(index).padStart(2, '0')}.png`);
  writeFileSync(svgPath, slideSvgs[index]);
  await sharp(Buffer.from(slideSvgs[index])).png().toFile(pngPath);
  framePaths.push({ svgPath, pngPath });
}
await sharp(framePaths[2].pngPath).png().toFile(join(HERE, 'poster.png'));

const videoPath = join(HERE, 'demo.mp4');
execFileSync(process.env.FFMPEG || 'ffmpeg', [
  '-y', '-framerate', '1/2', '-start_number', '0', '-i', join(FRAMES, 'slide-%02d.png'),
  '-vf', 'fps=24,format=yuv420p', '-c:v', 'libx264', '-crf', '25',
  '-movflags', '+faststart', videoPath,
], { stdio: 'inherit' });

const sha256 = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const probe = JSON.parse(execFileSync(process.env.FFPROBE || 'ffprobe', [
  '-v', 'error', '-show_entries', 'format=duration,size', '-of', 'json', videoPath,
], { encoding: 'utf8' }));
const evidence = {
  createdAt: new Date().toISOString(),
  type: 'schematic replay from passing regression assertions; not a renderer capture',
  model: 'tests/unit/modeling/explodedPoses.test.ts :: TABLE_FIRST',
  input: 'table, base, mid, top; 10 mm box parts; table unmated; two fastened +Z mates',
  assertedOffsetsMm: {
    table: [0, 0, 0],
    base: [0, 0, 0],
    mid: [0, 0, 10],
    top: [0, 0, 20],
  },
  verification: {
    unitTest: 'npx vitest run tests/unit/modeling/explodedPoses.test.ts — 3/3 passed',
    exampleTypecheck: 'npx tsx scripts/typecheckExamples.ts examples/exploded/clamshell-table-first.kcad.ts — OK',
    mechanism: 'unverified; probe skipped for the attempted render',
    renderCapture: 'not produced; CLI was interrupted after 2m53s with process state wait_on_buffer before opening a CDP tab',
  },
  retainedCaptureScript: 'PW_CDP_URL=http://127.0.0.1:9223 bash docs/demos/explode-mate-forest-20261113/capture.sh (factor 1; 180-second cap; not rerun after the earlier I/O wait)',
  attemptedRenderInvocation: 'npx tsx src/agent/cli/index.ts render examples/exploded/clamshell-table-first.kcad.ts --separate --pose 35,25 --explode 0 --explode-mode mate-axis --width 1200 --height 800 --environment studio --no-watermark --no-mechanism-check --base-url http://127.0.0.1:5173 --out docs/demos/explode-mate-forest-20261113/step-0.png',
  encodedSlides: framePaths.map(({ svgPath, pngPath }) => ({
    svg: svgPath.split('/').at(-1),
    png: pngPath.split('/').at(-1),
    svgSha256: sha256(svgPath),
    pngSha256: sha256(pngPath),
    seconds: 2,
  })),
  video: {
    file: 'demo.mp4',
    sha256: sha256(videoPath),
    durationSeconds: Number(probe.format.duration),
    bytes: Number(probe.format.size),
    encoder: 'libx264, CRF 25, 24 fps, yuv420p',
  },
};
writeFileSync(join(HERE, 'video-evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
