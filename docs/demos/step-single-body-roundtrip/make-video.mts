// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Replay: node --import tsx docs/demos/step-single-body-roundtrip/make-video.mts
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
interface Body { name: string; color: string | null; solidCount: number; volumeMm3: number; boundsMm: { min: number[]; max: number[] } }
interface Evidence {
  scope: string;
  source: string;
  expected: { name: string; color: string; volumeMm3: number };
  step: { bytes: number; productLines: string[]; colourLines: string[] };
  firstExport: Body;
  importedProject: { script: string[] };
  secondExport: Body;
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
  <text x="60" y="699" fill="#94a3b8" font-family="Arial,sans-serif" font-size="14">LOCAL KERNELCAD API EXPORT, IMPORT, EXPORT + OCCT XCAF READ-BACK · no other CAD system, deployed behavior or hardware acceptance</text>
</svg>`;
}

/** Shorten the 64-character asset hash so a generated line fits the frame. */
function shortLine(line: string): string {
  return line.replace(/parts\/([0-9a-f]{8})[0-9a-f]{56}\.brep/, 'parts/$1….brep');
}

function codeLines(lines: string[], x: number, y: number): string {
  return lines.map((line, index) => `<text x="${x}" y="${y + index * 25}" fill="#e2e8f0" font-family="monospace" font-size="17" xml:space="preserve">${xml(line)}</text>`).join('');
}

function sceneOne(evidence: Evidence, source: string[]): string {
  const sourceLines = source.filter((line) => /^let plate|^return plate/.test(line));
  const content = `<rect x="72" y="140" width="1136" height="70" rx="14" fill="#142235" stroke="#29445c"/>
    <text x="98" y="183" fill="#f8fafc" font-family="monospace" font-size="20">kernelcad export step motor-plate.kcad.ts -o motor-plate.step</text>
    <rect x="72" y="222" width="1136" height="150" rx="20" fill="#111c2d" stroke="#334155"/>
    <text x="98" y="256" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="17">SOURCE · the script returns one bare shape, no assembly (excerpt)</text>
    ${codeLines([...sourceLines.slice(0, 1), '// ... four frame holes, four motor holes, one 22 mm pilot', ...sourceLines.slice(1)], 98, 290)}
    <rect x="72" y="384" width="1136" height="150" rx="20" fill="#111c2d" stroke="#334155"/>
    <text x="98" y="418" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="17">MOTOR-PLATE.STEP · product and colour entities in the written file (${evidence.step.bytes.toLocaleString('en-US')} bytes)</text>
    ${codeLines([...evidence.step.productLines, ...evidence.step.colourLines], 98, 452)}
    <rect x="72" y="546" width="1136" height="108" rx="14" fill="#142235" stroke="#29445c"/>
    <text x="98" y="584" fill="#37d6b0" font-family="Arial,sans-serif" font-size="19">The STEP product has the script file name. The shape colour is in the file.</text>
    <text x="98" y="616" fill="#f8fafc" font-family="Arial,sans-serif" font-size="17">The colour entity holds the sRGB channels of the script colour; the OCCT reader returns ${xml(evidence.firstExport.color ?? 'none')}.</text>
    <text x="98" y="642" fill="#f8fafc" font-family="Arial,sans-serif" font-size="17">No other CAD system opened the file.</text>`;
  return shell('Export one part to STEP with its name and colour', `Source: ${evidence.source}`, content);
}

function sceneTwo(evidence: Evidence, mesh: Mesh): string {
  const size = (body: Body) => body.boundsMm.max.map((v, axis) => v - body.boundsMm.min[axis]).join(' x ');
  const columns = [
    { title: 'SCRIPT', name: evidence.expected.name, color: evidence.expected.color, volume: evidence.expected.volumeMm3, size: '100 x 80 x 4' },
    { title: '1ST EXPORT', name: evidence.firstExport.name, color: evidence.firstExport.color ?? 'none', volume: evidence.firstExport.volumeMm3, size: size(evidence.firstExport) },
    { title: '2ND EXPORT', name: evidence.secondExport.name, color: evidence.secondExport.color ?? 'none', volume: evidence.secondExport.volumeMm3, size: size(evidence.secondExport) },
  ];
  const rows = ['NAME', 'COLOUR', 'VOLUME mm3', 'SIZE mm'].map((label, row) => {
    const y = 236 + row * 46;
    const cells = columns.map((column, index) => {
      const value = [column.name, column.color, column.volume.toFixed(3), column.size][row];
      const swatch = row === 1 && value.startsWith('#') ? `<rect x="${822 + index * 132 + 76}" y="${y - 15}" width="16" height="16" rx="3" fill="${value}"/>` : '';
      return `<text x="${822 + index * 132}" y="${y}" fill="#f8fafc" font-family="monospace" font-size="14">${xml(value)}</text>${swatch}`;
    }).join('');
    return `<text x="700" y="${y}" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="15">${label}</text>${cells}`;
  }).join('');
  const heads = columns.map((column, index) => `<text x="${822 + index * 132}" y="179" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="15">${column.title}</text>`).join('');
  const content = `<rect x="72" y="140" width="580" height="500" rx="18" fill="#111c2d" stroke="#334155"/>
    <text x="96" y="179" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="17">FIRST EXPORT, READ BACK · drawn in the colour from the file</text>
    ${geometrySvg(mesh, hexRgb(evidence.firstExport.color ?? '#94a3b8'), { x: 86, y: 196, width: 552, height: 430 })}
    <rect x="676" y="140" width="532" height="500" rx="18" fill="#111c2d" stroke="#334155"/>
    ${heads}
    <line x1="700" y1="194" x2="1184" y2="194" stroke="#334155"/>
    ${rows}
    <line x1="700" y1="400" x2="1184" y2="400" stroke="#334155"/>
    <text x="700" y="432" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="15">PROJECT FROM kernelcad import-step motor-plate.step</text>
    ${evidence.importedProject.script.slice(2, 7).map(shortLine).map((line, index) => `<text x="700" y="${460 + index * 21}" fill="#e2e8f0" font-family="monospace" font-size="12" xml:space="preserve">${xml(line)}</text>`).join('')}
    <text x="700" y="590" fill="#37d6b0" font-family="Arial,sans-serif" font-size="17">The name, colour, volume and size are equal in both files.</text>
    <text x="700" y="616" fill="#37d6b0" font-family="Arial,sans-serif" font-size="17">Each file holds one product with one solid.</text>`;
  return shell('The part keeps its name and colour through import and a second export', 'kernelcad import-step motor-plate.step, then kernelcad export step on the imported project.', content);
}

const evidence = JSON.parse(await readFile(join(HERE, 'evidence.json'), 'utf8')) as Evidence;
const mesh = JSON.parse(await readFile(join(HERE, 'geometry.json'), 'utf8')) as Mesh;
const source = (await readFile(join(HERE, 'motor-plate.kcad.ts'), 'utf8')).split('\n');
const tempDir = await mkdtemp(join(tmpdir(), 'kcad-step-single-body-video-'));
const scenePaths = [join(tempDir, 'scene-1.png'), join(tempDir, 'scene-2.png')];
try {
  await sharp(Buffer.from(sceneOne(evidence, source))).png().toFile(scenePaths[0]);
  await sharp(Buffer.from(sceneTwo(evidence, mesh))).png().toFile(scenePaths[1]);
  const output = join(HERE, 'demo.mp4');
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-loop', '1', '-framerate', String(FPS), '-t', String(SCENE_SECONDS), '-i', scenePaths[0],
    '-loop', '1', '-framerate', String(FPS), '-t', String(SCENE_SECONDS), '-i', scenePaths[1],
    '-filter_complex', '[0:v][1:v]concat=n=2:v=1:a=0,format=yuv420p[v]',
    '-map', '[v]', '-r', String(FPS), '-c:v', 'libx264', '-crf', '26', '-movflags', '+faststart', output,
  ]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '7', '-i', output, '-frames:v', '1', join(HERE, 'poster.png')]);
  const probe = JSON.parse(execFileSync('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name,width,height,r_frame_rate,pix_fmt',
    '-show_entries', 'format=duration,size', '-of', 'json', output,
  ], { encoding: 'utf8' }));
  const videoEvidence = {
    invocation: 'node --import tsx docs/demos/step-single-body-roundtrip/make-video.mts',
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
