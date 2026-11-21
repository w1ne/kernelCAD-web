// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Replay: node --import tsx docs/demos/edge-labels-through-chamfer/make-video.mts
// Settings: 1280x720, 24 fps, four 4-second scenes, H.264 CRF 26, yuv420p.
//
// The three renders are inputs. They come from the built CLI
// (`npm run build:cli`), 640 × 480 per tile:
//   kernelcad render mount-plate.kcad.ts -o plate.png --pose 30,40   -> plate-top.png
//   kernelcad render mount-plate.kcad.ts -o plate.png --pose 30,-40  -> plate-bottom.png
//   kernelcad render rim-closeup.kcad.ts -o c.png --pose 30,-35      -> rim-closeup.png

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const HERE = dirname(fileURLToPath(import.meta.url));
const WIDTH = 1280;
const HEIGHT = 720;
const FPS = 24;
const SCENE_SECONDS = 4;
const sha256 = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex');
const xml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

const evidence = JSON.parse(await readFile(join(HERE, 'evidence.json'), 'utf8'));
const now = evidence.now;

function card(title: string, lines: string[], withTile: boolean): string {
  const textX = withTile ? 760 : 80;
  const body = lines.map((l, i) => `<text x="${textX}" y="${250 + i * 44}" font-family="DejaVu Sans, sans-serif" font-size="${withTile ? 22 : 26}" fill="#e2e8f0">${xml(l)}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <rect width="100%" height="100%" fill="#0b1220"/><rect width="12" height="100%" fill="#37d6b0"/>
  <text x="${withTile ? 760 : 80}" y="110" font-family="DejaVu Sans, sans-serif" font-size="34" font-weight="bold" fill="#f8fafc">${xml(title)}</text>
  <text x="${withTile ? 760 : 80}" y="160" font-family="DejaVu Sans, sans-serif" font-size="20" fill="#94a3b8">edge labels through fillet / chamfer</text>
  ${body}</svg>`;
}

const scenes: Array<{ svg: string; tile?: string }> = [
  { svg: card('Before (develop 8d535d15a)', [
    "plate.chamfer(0.5, rims('entry-rim')).chamfer(0.3, rims('exit-rim'))",
    '-> query.empty: edge ref resolved to zero edges',
    'The first chamfer dropped the exit-rim labels,',
    'although it did not touch those edges.',
  ], false) },
  { svg: card('Entry rims: 0.5 mm', [
    'NEMA 17 plate, 60 × 60 × 6 mm, R5 corners',
    'Ø22.5 pilot + 4 × Ø3.4 clearance, through',
    "first chamfer: q.withLabel('entry-rim')",
    `${now.entryConeCentreZ.length} chamfer cones in the top 0.5 mm`,
  ], true), tile: 'plate-top.png' },
  { svg: card('Exit rims: 0.3 mm, later', [
    "second chamfer: q.withLabel('exit-rim')",
    `${now.exitConeCentreZ.length} chamfer cones in the bottom 0.3 mm`,
    `Volume ${now.volumeMm3.toFixed(6)} mm³`,
    `Closed form ${evidence.expected.volumeMm3.toFixed(6)} mm³`,
    `Valid B-rep: ${now.brepValid}`,
  ], true), tile: 'plate-bottom.png' },
  { svg: card('Labels kept', [
    ...Object.entries(now.edgeLabelsAfterEntryChamfer as Record<string, number>).map(([k, v]) => `${k}: ${v}`),
    '(after the entry chamfer)',
    'Close-up: Ø6 hole, exit rim 1 mm by name.',
  ], true), tile: 'rim-closeup.png' },
];

const work = await mkdtemp(join(tmpdir(), 'edge-label-video-'));
try {
  const frames: string[] = [];
  for (const [i, scene] of scenes.entries()) {
    const layers: sharp.OverlayOptions[] = [];
    if (scene.tile) layers.push({ input: join(HERE, scene.tile), left: 60, top: 120 });
    const out = join(work, `scene-${i}.png`);
    await sharp(Buffer.from(scene.svg)).composite(layers).png().toFile(out);
    frames.push(out);
    if (i === 1) await sharp(out).toFile(join(HERE, 'poster.png'));
  }
  const list = frames.map((f) => `file '${f}'\nduration ${SCENE_SECONDS}`).join('\n') + `\nfile '${frames[frames.length - 1]}'\n`;
  await writeFile(join(work, 'list.txt'), list);
  const mp4 = join(HERE, 'demo.mp4');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(work, 'list.txt'),
    '-vf', `fps=${FPS},format=yuv420p`, '-c:v', 'libx264', '-crf', '26', '-t', String(SCENE_SECONDS * scenes.length), mp4]);
  const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries',
    'stream=codec_name,width,height,pix_fmt,r_frame_rate:format=duration,size', '-of', 'json', mp4]).toString());
  const inputs = Object.fromEntries(await Promise.all(['plate-top.png', 'plate-bottom.png', 'rim-closeup.png', 'evidence.json']
    .map(async (f) => [f, sha256(await readFile(join(HERE, f)))] as const)));
  await writeFile(join(HERE, 'video-evidence.json'), `${JSON.stringify({
    invocation: 'node --import tsx docs/demos/edge-labels-through-chamfer/make-video.mts',
    source: 'make-video.mts',
    settings: { width: WIDTH, height: HEIGHT, fps: FPS, secondsPerScene: SCENE_SECONDS, scenes: scenes.length, codec: 'H.264 libx264', crf: 26, pixelFormat: 'yuv420p', audio: false },
    renderInvocations: [
      'node dist/cli/index.js render mount-plate.kcad.ts -o plate.png --pose 30,40 --width 640 --height 480',
      'node dist/cli/index.js render mount-plate.kcad.ts -o plate.png --pose 30,-40 --width 640 --height 480',
      'node dist/cli/index.js render rim-closeup.kcad.ts -o c.png --pose 30,-35 --width 640 --height 480',
    ],
    media: probe,
    inputSha256: inputs,
    outputSha256: { 'demo.mp4': sha256(await readFile(mp4)), 'poster.png': sha256(await readFile(join(HERE, 'poster.png'))) },
  }, null, 2)}\n`);
  console.log(JSON.stringify(probe));
} finally {
  await rm(work, { recursive: true, force: true });
}
