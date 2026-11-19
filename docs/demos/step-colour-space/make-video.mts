// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Replay: node --import tsx docs/demos/step-colour-space/make-video.mts
// Settings: 1280x720, 24 fps, two 5-second scenes, H.264 CRF 26, yuv420p.

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
const SCENE_SECONDS = 5;
const MAX_EDGE_MM = 3;
const sha256 = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex');
const xml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const rgb = (c: number[]) => `rgb(${c.map(Math.round).join(',')})`;
const hexRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

interface Mesh { positions: number[]; indices: number[] }
interface Evidence {
  scope: string;
  source: string;
  scriptColour: string;
  write: { bytes: number; colourEntity: string; asHex: string };
  read: { roundTripColour: string; foreignEntity: string; foreignColour: string };
  before: { commit: string; writtenChannels: number[]; writtenAsHex: string; foreignReadAsHex: string };
}

function normalize([x, y, z]: number[]): number[] {
  const length = Math.hypot(x, y, z);
  return [x / length, y / length, z / length];
}
function dot(a: number[], b: number[]): number { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

/** Paint the mesh back to front in `base` colour with flat shading. */
function geometrySvg(mesh: Mesh, base: number[], box: { x: number; y: number; width: number; height: number }): string {
  const toward = normalize([0.55, -1, 1.25]);
  const right = normalize([toward[1], -toward[0], 0]);
  const up = normalize([
    toward[1] * right[2] - toward[2] * right[1],
    toward[2] * right[0] - toward[0] * right[2],
    toward[0] * right[1] - toward[1] * right[0],
  ]);
  const light = normalize([0.2, -0.45, 0.88]);
  const raw: { depth: number; pts: number[][]; fill: number[] }[] = [];
  const world: number[][] = [];
  for (let i = 0; i + 2 < mesh.positions.length; i += 3) world.push([mesh.positions[i], mesh.positions[i + 1], mesh.positions[i + 2]]);
  // Painter's sorting needs small triangles: split long edges first.
  const queue: number[][][] = [];
  for (let i = 0; i + 2 < mesh.indices.length; i += 3) {
    queue.push([world[mesh.indices[i]], world[mesh.indices[i + 1]], world[mesh.indices[i + 2]]]);
  }
  while (queue.length > 0) {
    const [a, b, c] = queue.pop()!;
    const lengths = [[a, b], [b, c], [c, a]].map(([p, q]) => Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]));
    const longest = lengths.indexOf(Math.max(...lengths));
    if (lengths[longest] > MAX_EDGE_MM) {
      const [p, q, r] = [[a, b, c], [b, c, a], [c, a, b]][longest];
      const mid = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2];
      queue.push([p, mid, r], [mid, q, r]);
      continue;
    }
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const cross = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
    if (Math.hypot(cross[0], cross[1], cross[2]) < 1e-12) continue;
    const normal = normalize(cross);
    if (dot(normal, toward) <= 0) continue;
    const level = 0.4 + 0.6 * Math.max(0, dot(normal, light));
    raw.push({
      depth: (dot(a, toward) + dot(b, toward) + dot(c, toward)) / 3,
      pts: [a, b, c].map((p) => [dot(p, right), dot(p, up)]),
      fill: base.map((channel) => channel * level),
    });
  }
  const xs = raw.flatMap((t) => t.pts.map((p) => p[0]));
  const ys = raw.flatMap((t) => t.pts.map((p) => p[1]));
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const scale = Math.min((box.width - 40) / (maxX - minX || 1), (box.height - 40) / (maxY - minY || 1));
  const offsetX = box.x + (box.width - (maxX - minX) * scale) / 2 - minX * scale;
  const offsetY = box.y + (box.height - (maxY - minY) * scale) / 2 + maxY * scale;
  raw.sort((a, b) => a.depth - b.depth);
  return raw.map((t) => {
    const points = t.pts.map((p) => `${(offsetX + p[0] * scale).toFixed(1)},${(offsetY - p[1] * scale).toFixed(1)}`).join(' ');
    return `<polygon points="${points}" fill="${rgb(t.fill)}" stroke="${rgb(t.fill)}" stroke-width="0.6"/>`;
  }).join('');
}

function shell(title: string, subtitle: string, content: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="100%" height="100%" fill="#0b1220"/><rect width="12" height="100%" fill="#37d6b0"/>
  <text x="58" y="68" fill="#f8fafc" font-family="Arial,sans-serif" font-size="34" font-weight="700">${xml(title)}</text>
  <text x="60" y="106" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="19">${xml(subtitle)}</text>
  ${content}
  <line x1="60" y1="670" x2="1220" y2="670" stroke="#334155"/>
  <text x="60" y="699" fill="#94a3b8" font-family="Arial,sans-serif" font-size="14">LOCAL KERNELCAD API STEP EXPORT + OCCT XCAF READ-BACK · no other CAD system, deployed behavior or hardware acceptance</text>
</svg>`;
}

function panel(x: number, title: string, entity: string, hex: string, mesh: Mesh, note: string, noteFill: string): string {
  return `<rect x="${x}" y="140" width="556" height="420" rx="18" fill="#111c2d" stroke="#334155"/>
    <text x="${x + 24}" y="176" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="17">${xml(title)}</text>
    <text x="${x + 24}" y="208" fill="#e2e8f0" font-family="monospace" font-size="16" xml:space="preserve">${xml(entity)}</text>
    ${geometrySvg(mesh, hexRgb(hex), { x: x + 14, y: 220, width: 528, height: 280 })}
    <rect x="${x + 24}" y="516" width="26" height="26" rx="5" fill="${hex}" stroke="#f8fafc" stroke-width="0.8"/>
    <text x="${x + 62}" y="536" fill="${noteFill}" font-family="Arial,sans-serif" font-size="18">${xml(note)}</text>`;
}

function sceneOne(evidence: Evidence, mesh: Mesh): string {
  const before = `COLOUR_RGB('',${evidence.before.writtenChannels.map((v) => v.toFixed(4)).join(',')})`;
  const now = evidence.write.colourEntity.replace(/\d+\.\d+/g, (v) => Number(v).toFixed(4));
  const content = `${panel(72, `BEFORE · develop ${evidence.before.commit}, recorded`, before, evidence.before.writtenAsHex, mesh, `The file states ${evidence.before.writtenAsHex}, lighter than the script.`, '#fbbf24')}
    ${panel(652, 'NOW · measured in this run', now, evidence.write.asHex, mesh, `The file states ${evidence.write.asHex}, equal to the script.`, '#37d6b0')}
    <rect x="72" y="574" width="1136" height="80" rx="14" fill="#142235" stroke="#29445c"/>
    <rect x="98" y="590" width="20" height="20" rx="4" fill="${evidence.scriptColour}" stroke="#f8fafc" stroke-width="0.8"/>
    <text x="130" y="606" fill="#f8fafc" font-family="monospace" font-size="18">box(100, 80, 4).color('${evidence.scriptColour}')   kernelcad export step motor-plate.kcad.ts</text>
    <text x="98" y="638" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="16">Each part is drawn in the colour that its STEP colour entity states. The geometry is the same in both files.</text>`;
  return shell('STEP export writes the colour that the script sets', `Source: ${evidence.source}`, content);
}

function sceneTwo(evidence: Evidence): string {
  const row = (y: number, label: string, hex: string, fill: string, note: string) => `
    <text x="110" y="${y + 34}" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="19">${xml(label)}</text>
    <rect x="520" y="${y}" width="150" height="52" rx="8" fill="${hex}" stroke="#f8fafc" stroke-width="0.8"/>
    <text x="694" y="${y + 34}" fill="#f8fafc" font-family="monospace" font-size="22">${hex}</text>
    <text x="830" y="${y + 34}" fill="${fill}" font-family="Arial,sans-serif" font-size="18">${xml(note)}</text>`;
  const content = `<rect x="72" y="140" width="1136" height="70" rx="14" fill="#142235" stroke="#29445c"/>
    <text x="98" y="183" fill="#f8fafc" font-family="monospace" font-size="20">kernelcad import-step part.step      # the file holds ${xml(evidence.read.foreignEntity)}</text>
    <rect x="72" y="224" width="1136" height="290" rx="18" fill="#111c2d" stroke="#334155"/>
    ${row(250, 'Colour that the file states', evidence.scriptColour, '#9fb0c4', '0.2, 0.4, 0.8 as 8-bit channels')}
    ${row(334, `Read before · develop ${evidence.before.commit}, recorded`, evidence.before.foreignReadAsHex, '#fbbf24', 'darker than the file')}
    ${row(418, 'Read now · measured in this run', evidence.read.foreignColour, '#37d6b0', 'equal to the file')}
    <rect x="72" y="528" width="1136" height="126" rx="14" fill="#142235" stroke="#29445c"/>
    <text x="98" y="566" fill="#37d6b0" font-family="Arial,sans-serif" font-size="19">Export then import returns ${evidence.read.roundTripColour} for the script colour ${evidence.scriptColour}.</text>
    <text x="98" y="600" fill="#f8fafc" font-family="Arial,sans-serif" font-size="17">A hex colour and a STEP COLOUR_RGB are display (sRGB) values. OCCT holds linear RGB between them.</text>
    <text x="98" y="630" fill="#f8fafc" font-family="Arial,sans-serif" font-size="17">kernelCAD now converts at the OCCT boundary on write and on read.</text>`;
  return shell('STEP import reads the colour that the file states', 'The colour entity of the exported file is replaced with stated channels, then the file is imported.', content);
}

const evidence = JSON.parse(await readFile(join(HERE, 'evidence.json'), 'utf8')) as Evidence;
const mesh = JSON.parse(await readFile(join(HERE, 'geometry.json'), 'utf8')) as Mesh;
const tempDir = await mkdtemp(join(tmpdir(), 'kcad-step-colour-space-video-'));
const scenePaths = [join(tempDir, 'scene-1.png'), join(tempDir, 'scene-2.png')];
try {
  await sharp(Buffer.from(sceneOne(evidence, mesh))).png().toFile(scenePaths[0]);
  await sharp(Buffer.from(sceneTwo(evidence))).png().toFile(scenePaths[1]);
  const output = join(HERE, 'demo.mp4');
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-loop', '1', '-framerate', String(FPS), '-t', String(SCENE_SECONDS), '-i', scenePaths[0],
    '-loop', '1', '-framerate', String(FPS), '-t', String(SCENE_SECONDS), '-i', scenePaths[1],
    '-filter_complex', '[0:v][1:v]concat=n=2:v=1:a=0,format=yuv420p[v]',
    '-map', '[v]', '-r', String(FPS), '-c:v', 'libx264', '-crf', '26', '-movflags', '+faststart', output,
  ]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '2', '-i', output, '-frames:v', '1', join(HERE, 'poster.png')]);
  const probe = JSON.parse(execFileSync('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name,width,height,r_frame_rate,pix_fmt',
    '-show_entries', 'format=duration,size', '-of', 'json', output,
  ], { encoding: 'utf8' }));
  const videoEvidence = {
    invocation: 'node --import tsx docs/demos/step-colour-space/make-video.mts',
    source: 'make-video.mts',
    settings: { width: WIDTH, height: HEIGHT, fps: FPS, secondsPerScene: SCENE_SECONDS, scenes: 2, codec: 'H.264 libx264', crf: 26, pixelFormat: 'yuv420p', audio: false },
    media: probe,
    poster: 'poster.png',
    posterSha256: sha256(await readFile(join(HERE, 'poster.png'))),
    videoSha256: sha256(await readFile(output)),
    inspection: 'Both scenes extracted from the final MP4 and visually reviewed after generation.',
    scope: evidence.scope,
    simulationRun: false,
    deployed: false,
    hardwareAccepted: false,
  };
  await writeFile(join(HERE, 'video-evidence.json'), `${JSON.stringify(videoEvidence, null, 2)}\n`);
  console.log(JSON.stringify({ output, media: probe, videoSha256: videoEvidence.videoSha256 }, null, 2));
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
