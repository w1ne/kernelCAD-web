// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Replay: node --import tsx docs/demos/path-ellipse/make-video.mts
// Settings: 1280x720, 24 fps, two 5-second scenes, H.264 CRF 26, yuv420p.
//
// The three renders are inputs. They come from the built CLI
// (`npm run build:cli`), 640 × 480 per tile:
//   kernelcad render elliptical-head.kcad.ts -o head.png --pose 25,20            -> head-outside.png
//   kernelcad render elliptical-head.kcad.ts -o head.png --section y=0 --section-flip --pose 0,-18 -> head-section.png
//   kernelcad render handhole-gasket.kcad.ts -o gasket.png --pose 20,55          -> gasket.png

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
const RENDERS = ['head-outside.png', 'head-section.png', 'gasket.png'];
const sha256 = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex');
const xml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

type Vec2 = [number, number];
interface Command { kind: string; x?: number; y?: number; controlPoints?: Vec2[]; weights?: number[] }
interface Evidence {
  scope: string;
  headSource: string;
  gasketSource: string;
  expected: { headVolumeMm3: number; headSizeMm: number[]; gasketVolumeMm3: number; gasketSizeMm: number[] };
  now: {
    errorDiagnostics: number;
    headVolumeMm3: number; headSizeSortedMm: number[]; headBrepValid: boolean; headCommands: Command[];
    gasketVolumeMm3: number; gasketSizeMm: number[]; gasketBrepValid: boolean;
    gasketOuterCommands: Command[]; gasketInnerCommands: Command[];
  };
  before: { commit: string; result: string };
}

/** SVG path of one closed loop. A nurbsSegment here is one rational quadratic
 *  Bézier; it is drawn as 24 chords of the exact curve
 *  (Σ wᵢ·Bᵢ(t)·Pᵢ / Σ wᵢ·Bᵢ(t)). Sketch y points up, SVG y points down. */
function loopPath(loop: Command[], scale: number, cx: number, cy: number): string {
  const at = (p: Vec2) => `${(cx + p[0] * scale).toFixed(2)} ${(cy - p[1] * scale).toFixed(2)}`;
  let d = '';
  for (const command of loop) {
    if (command.kind === 'close') d += 'Z ';
    else if (command.kind === 'moveTo') d += `M ${at([command.x!, command.y!])} `;
    else if (command.kind === 'lineTo') d += `L ${at([command.x!, command.y!])} `;
    else {
      const [p0, p1, p2] = command.controlPoints!;
      const w = command.weights![1];
      for (let i = 1; i <= 24; i++) {
        const t = i / 24;
        const b = [(1 - t) ** 2, 2 * t * (1 - t) * w, t * t];
        const sum = b[0] + b[1] + b[2];
        d += `L ${at([(b[0] * p0[0] + b[1] * p1[0] + b[2] * p2[0]) / sum, (b[0] * p0[1] + b[1] * p1[1] + b[2] * p2[1]) / sum])} `;
      }
    }
  }
  return d;
}

/** The control polygon of every nurbsSegment in the loop, with its poles. */
function controlPolygons(loop: Command[], scale: number, cx: number, cy: number): string {
  return loop.filter((c) => c.kind === 'nurbsSegment').map((c) => {
    const pts = c.controlPoints!.map((p) => [cx + p[0] * scale, cy - p[1] * scale]);
    return `<polyline points="${pts.map((p) => p.map((v) => v.toFixed(2)).join(',')).join(' ')}" fill="none" stroke="#fbbf24" stroke-width="1.2" stroke-dasharray="5 5"/>
      ${pts.map((p) => `<circle cx="${p[0].toFixed(2)}" cy="${p[1].toFixed(2)}" r="3.6" fill="#fbbf24"/>`).join('')}`;
  }).join('');
}

function shell(title: string, subtitle: string, content: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="100%" height="100%" fill="#0b1220"/><rect width="12" height="100%" fill="#37d6b0"/>
  <text x="58" y="68" fill="#f8fafc" font-family="Arial,sans-serif" font-size="34" font-weight="700">${xml(title)}</text>
  <text x="60" y="106" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="19">${xml(subtitle)}</text>
  ${content}
  <line x1="60" y1="670" x2="1220" y2="670" stroke="#334155"/>
  <text x="60" y="699" fill="#94a3b8" font-family="Arial,sans-serif" font-size="14">LOCAL KERNELCAD API AND CLI RENDER, OCCT MEASUREMENT · no other CAD system, deployed behavior or made part</text>
</svg>`;
}

const image = (data: Buffer, x: number, y: number, w: number, h: number) =>
  `<image x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" xlink:href="data:image/png;base64,${data.toString('base64')}"/>`;
const panel = (x: number, y: number, w: number, h: number, label: string) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="#111c2d" stroke="#334155"/>
   <text x="${x + 18}" y="${y + 28}" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="16">${xml(label)}</text>`;
const mono = (x: number, y: number, text: string) =>
  `<text x="${x}" y="${y}" fill="#f8fafc" font-family="monospace" font-size="16" xml:space="preserve">${xml(text)}</text>`;
const note = (x: number, y: number, text: string, fill = '#cbd5e1') =>
  `<text x="${x}" y="${y}" fill="${fill}" font-family="Arial,sans-serif" font-size="17">${xml(text)}</text>`;

function sceneOne(evidence: Evidence, renders: Buffer[]): string {
  const { now, expected } = evidence;
  const scale = 2.9;
  const cx = 110;
  const cy = 410;
  const content = `${panel(60, 130, 400, 316, 'Profile, from the sketch commands (X = radius)')}
    <line x1="${cx}" y1="170" x2="${cx}" y2="${cy + 14}" stroke="#475569" stroke-dasharray="3 5"/>
    <path d="${loopPath(now.headCommands, scale, cx, cy)}" fill="#0f766e" fill-opacity="0.85" stroke="#f8fafc" stroke-width="1.3"/>
    ${controlPolygons(now.headCommands, scale, cx, cy)}
    ${note(78, 436, 'Yellow: the 3 poles of each quarter arc, weight 1, 0.7071, 1.', '#fbbf24').replace('font-size="17"', 'font-size="14"')}
    ${panel(476, 130, 366, 316, 'Revolved solid, CLI render')}
    ${image(renders[0], 484, 166, 350, 272)}
    ${panel(858, 130, 362, 316, 'Section y = 0, seen from the cut side')}
    ${image(renders[1], 866, 166, 346, 272)}
    <rect x="60" y="460" width="1160" height="196" rx="14" fill="#142235" stroke="#29445c"/>
    ${mono(84, 492, 'path().moveTo(96, 0).lineTo(100, 0).lineTo(100, 20)')}
    ${mono(84, 516, '  .ellipseArc(0, 70, 100, 50)                       // outside of the dish')}
    ${mono(84, 540, '  .lineTo(0, 66)')}
    ${mono(84, 564, '  .ellipseArc(96, 20, 96, 46, { clockwise: true })  // inside of the dish')}
    ${mono(84, 588, '  .close().revolve()')}
    ${note(84, 624, `Volume ${now.headVolumeMm3.toFixed(3)} mm³. Closed form ${expected.headVolumeMm3.toFixed(3)} mm³. B-rep valid: ${now.headBrepValid}. Errors: ${now.errorDiagnostics}.`, '#37d6b0')}
    ${note(84, 646, `200 mm outside diameter, 50 mm dish, 4 mm wall, 20 mm flange. Before (develop ${evidence.before.commit}): no ellipse call in a path.`, '#9fb0c4').replace('font-size="17"', 'font-size="15"')}`;
  return shell('An exact elliptical arc in a sketch path', '2:1 semi-elliptical vessel head: two quarter arcs from ellipseArc, revolved about the axis.', content);
}

function sceneTwo(evidence: Evidence, renders: Buffer[]): string {
  const { now, expected } = evidence;
  const scale = 1.12;
  const cx = 260;
  const cy = 306;
  const rows: [string, string, string][] = [
    ['Head volume, mm³', now.headVolumeMm3.toFixed(3), expected.headVolumeMm3.toFixed(3)],
    ['Gasket volume, mm³', now.gasketVolumeMm3.toFixed(3), expected.gasketVolumeMm3.toFixed(3)],
    ['Gasket box X × Y, mm (mesh)', `${now.gasketSizeMm[0].toFixed(3)} × ${now.gasketSizeMm[1].toFixed(3)}`, `${expected.gasketSizeMm[0].toFixed(3)} × ${expected.gasketSizeMm[1].toFixed(3)}`],
    ['B-rep valid, error diagnostics', `${now.headBrepValid && now.gasketBrepValid}, ${now.errorDiagnostics}`, 'true, 0'],
  ];
  const columns = [84, 480, 800];
  const header = ['Measure', 'Now (this run)', 'Closed form'];
  const table = `${header.map((text, i) => `<text x="${columns[i]}" y="494" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="16">${xml(text)}</text>`).join('')}
    <line x1="84" y1="504" x2="1196" y2="504" stroke="#334155"/>
    ${rows.map((row, r) => row.map((text, i) => `<text x="${columns[i]}" y="${532 + r * 30}" fill="${i === 1 ? '#37d6b0' : '#e2e8f0'}" font-family="${i === 0 ? 'Arial,sans-serif' : 'monospace'}" font-size="17">${xml(text)}</text>`).join('')).join('')}`;
  const content = `${panel(60, 130, 400, 316, 'Outlines and outer poles, from the sketch commands')}
    <path d="${loopPath(now.gasketOuterCommands, scale, cx, cy)} ${loopPath(now.gasketInnerCommands, scale, cx, cy)}" fill="#0f766e" fill-opacity="0.85" fill-rule="evenodd" stroke="#f8fafc" stroke-width="1.3"/>
    ${controlPolygons(now.gasketOuterCommands, scale, cx, cy)}
    ${panel(476, 130, 366, 316, 'Solid, CLI render')}
    ${image(renders[2], 484, 166, 350, 272)}
    ${panel(858, 130, 362, 316, 'Source')}
    ${mono(876, 196, 'path().ellipse(0, 0, 95, 70,').replace('font-size="16"', 'font-size="14"')}
    ${mono(876, 218, '    { rotationDeg: 30 })').replace('font-size="16"', 'font-size="14"')}
    ${mono(876, 240, '  .extrude(3)').replace('font-size="16"', 'font-size="14"')}
    ${mono(876, 262, '  .subtract(opening)').replace('font-size="16"', 'font-size="14"')}
    ${note(876, 306, 'opening: the 80 × 55 ellipse,').replace('font-size="17"', 'font-size="15"')}
    ${note(876, 328, 'same turn, extruded through.').replace('font-size="17"', 'font-size="15"')}
    ${note(876, 372, 'cx, cy, rx and ry accept param().', '#9fb0c4').replace('font-size="17"', 'font-size="15"')}
    ${note(876, 394, 'Sketch offset, sketch booleans and', '#9fb0c4').replace('font-size="17"', 'font-size="15"')}
    ${note(876, 416, 'cutout() do not take an ellipse.', '#9fb0c4').replace('font-size="17"', 'font-size="15"')}
    <rect x="60" y="460" width="1160" height="196" rx="14" fill="#142235" stroke="#29445c"/>
    ${table}`;
  return shell('A closed ellipse, turned 30°', 'Handhole gasket 190 × 140 mm, 15 mm land, 3 mm thick. Four exact quarter arcs per ellipse.', content);
}

const evidence = JSON.parse(await readFile(join(HERE, 'evidence.json'), 'utf8')) as Evidence;
const renders = await Promise.all(RENDERS.map((name) => readFile(join(HERE, name))));
const tempDir = await mkdtemp(join(tmpdir(), 'kcad-path-ellipse-video-'));
const scenePaths = [join(tempDir, 'scene-1.png'), join(tempDir, 'scene-2.png')];
try {
  await sharp(Buffer.from(sceneOne(evidence, renders))).png().toFile(scenePaths[0]);
  await sharp(Buffer.from(sceneTwo(evidence, renders))).png().toFile(scenePaths[1]);
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
    invocation: 'node --import tsx docs/demos/path-ellipse/make-video.mts',
    source: 'make-video.mts',
    settings: { width: WIDTH, height: HEIGHT, fps: FPS, secondsPerScene: SCENE_SECONDS, scenes: 2, codec: 'H.264 libx264', crf: 26, pixelFormat: 'yuv420p', audio: false },
    media: probe,
    renders: Object.fromEntries(RENDERS.map((name, i) => [name, sha256(renders[i])])),
    renderInvocations: [
      'kernelcad render docs/demos/path-ellipse/elliptical-head.kcad.ts -o head.png --pose 25,20 --width 640 --height 480',
      'kernelcad render docs/demos/path-ellipse/elliptical-head.kcad.ts -o head.png --section y=0 --section-flip --pose 0,-18 --width 640 --height 480',
      'kernelcad render docs/demos/path-ellipse/handhole-gasket.kcad.ts -o gasket.png --pose 20,55 --width 640 --height 480',
    ],
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
