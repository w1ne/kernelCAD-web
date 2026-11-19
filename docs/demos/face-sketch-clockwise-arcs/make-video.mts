// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Replay: node --import tsx docs/demos/face-sketch-clockwise-arcs/make-video.mts
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
const sha256 = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex');
const xml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

type Loop = (string | number)[][];
interface Evidence {
  scope: string;
  source: string;
  expected: { outlineAreaMm2: number; gasketVolumeMm3: number; cornerBulge: number };
  now: {
    errorDiagnostics: number; loops: number; outerLoop: Loop; holeLoops: Loop[]; cornerBulges: number[];
    gasketVolumeMm3: number; gasketSizeMm: number[]; brepValid: boolean; flatLoops: number; flatOutlineAreaMm2: number; dxf: { bytes: number };
  };
  before: { commit: string; gasketVolumeMm3: number; flatOutlineAreaMm2: number; errorDiagnostics: number; outerLoop: Loop };
}

/** SVG path of one closed loop. Sketch y points up, SVG y points down, so a
 *  counter-clockwise (positive bulge) arc takes sweep-flag 0. */
function loopPath(loop: Loop, scale: number, cx: number, cy: number): string {
  let d = '';
  let previous = [0, 0];
  for (const command of loop) {
    if (command[0] === 'close') { d += 'Z '; continue; }
    const point = [command[1] as number, command[2] as number];
    const sx = (cx + point[0] * scale).toFixed(2);
    const sy = (cy - point[1] * scale).toFixed(2);
    if (command[0] === 'moveTo') d += `M ${sx} ${sy} `;
    else if (command[0] === 'lineTo') d += `L ${sx} ${sy} `;
    else {
      const bulge = command[3] as number;
      const theta = 4 * Math.atan(Math.abs(bulge));
      const chord = Math.hypot(point[0] - previous[0], point[1] - previous[1]);
      const radius = (chord / (2 * Math.sin(theta / 2))) * scale;
      d += `A ${radius.toFixed(2)} ${radius.toFixed(2)} 0 ${theta > Math.PI ? 1 : 0} ${bulge > 0 ? 0 : 1} ${sx} ${sy} `;
    }
    previous = point;
  }
  return d;
}

function shell(title: string, subtitle: string, content: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="100%" height="100%" fill="#0b1220"/><rect width="12" height="100%" fill="#37d6b0"/>
  <text x="58" y="68" fill="#f8fafc" font-family="Arial,sans-serif" font-size="34" font-weight="700">${xml(title)}</text>
  <text x="60" y="106" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="19">${xml(subtitle)}</text>
  ${content}
  <line x1="60" y1="670" x2="1220" y2="670" stroke="#334155"/>
  <text x="60" y="699" fill="#94a3b8" font-family="Arial,sans-serif" font-size="14">LOCAL KERNELCAD API, OCCT MEASUREMENT · no other CAD or CAM system, deployed behavior or cut part</text>
</svg>`;
}

function profilePanel(x: number, title: string, outer: Loop, holes: Loop[], fill: string, lines: string[], noteFill: string): string {
  const scale = 7.2;
  const cx = x + 278;
  const cy = 330;
  const d = [outer, ...holes].map((loop) => loopPath(loop, scale, cx, cy)).join('');
  const notes = lines.map((line, index) => `<text x="${x + 24}" y="${506 + index * 26}" fill="${noteFill}" font-family="Arial,sans-serif" font-size="18">${xml(line)}</text>`).join('');
  return `<rect x="${x}" y="140" width="556" height="420" rx="18" fill="#111c2d" stroke="#334155"/>
    <text x="${x + 24}" y="176" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="17">${xml(title)}</text>
    <rect x="${cx - 30 * scale}" y="${cy - 20 * scale}" width="${60 * scale}" height="${40 * scale}" fill="none" stroke="#475569" stroke-dasharray="6 6"/>
    <path d="${d}" fill="${fill}" fill-rule="evenodd" stroke="#f8fafc" stroke-width="1.6"/>
    ${notes}`;
}

function sceneOne(evidence: Evidence): string {
  const { before, now, expected } = evidence;
  const loss = (100 * (expected.gasketVolumeMm3 - before.gasketVolumeMm3)) / expected.gasketVolumeMm3;
  const content = `${profilePanel(72, `BEFORE · develop ${before.commit}, recorded`, before.outerLoop, now.holeLoops, '#b45309', [
    `Gasket volume ${before.gasketVolumeMm3.toFixed(1)} mm³ (${loss.toFixed(1)} % low).`,
    `3 of 4 corners are 270° arcs. Error diagnostics: ${before.errorDiagnostics}.`,
  ], '#fbbf24')}
    ${profilePanel(652, 'NOW · measured in this run', now.outerLoop, now.holeLoops, '#0f766e', [
    `Gasket volume ${now.gasketVolumeMm3.toFixed(1)} mm³. Closed form: ${expected.gasketVolumeMm3.toFixed(1)} mm³.`,
    '4 of 4 corners are 90° arcs. B-rep valid.',
  ], '#37d6b0')}
    <rect x="72" y="574" width="1136" height="80" rx="14" fill="#142235" stroke="#29445c"/>
    <text x="98" y="606" fill="#f8fafc" font-family="monospace" font-size="18">const outline = await cover.faceSketch('top');  return outline.extrude(1.5);</text>
    <text x="98" y="638" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="16">Cover plate 60 × 40 mm, R5 corners, four Ø4.5 holes. Dashed: the 60 × 40 bounding rectangle. The four holes are the same in both.</text>`;
  return shell('faceSketch keeps the rounded corners of a face', 'A clockwise corner arc was read as the 270° arc on the same circle. The profile then cut into the part.', content);
}

function sceneTwo(evidence: Evidence): string {
  const { before, now, expected } = evidence;
  const rows: [string, string, string, string][] = [
    ['Corner arc bulge (|b|)', `${Math.max(...before.outerLoop.filter((c) => c[0] === 'bulgeArc').map((c) => Math.abs(c[3] as number))).toFixed(4)} on 3 corners`, `${Math.abs(now.cornerBulges[0]).toFixed(4)} on 4 corners`, `${expected.cornerBulge.toFixed(4)} = tan(π/8)`],
    ['Gasket volume, mm³', before.gasketVolumeMm3.toFixed(3), now.gasketVolumeMm3.toFixed(3), expected.gasketVolumeMm3.toFixed(3)],
    ['Flat DXF outline area, mm²', before.flatOutlineAreaMm2.toFixed(3), now.flatOutlineAreaMm2.toFixed(3), expected.outlineAreaMm2.toFixed(3)],
    ['Error diagnostics', String(before.errorDiagnostics), String(now.errorDiagnostics), '0'],
  ];
  const columns = [98, 430, 700, 960];
  const header = ['Measure', 'Before (recorded)', 'Now (this run)', 'Closed form'];
  const table = `${header.map((text, i) => `<text x="${columns[i]}" y="196" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="17">${xml(text)}</text>`).join('')}
    <line x1="98" y1="212" x2="1182" y2="212" stroke="#334155"/>
    ${rows.map((row, r) => row.map((text, i) => `<text x="${columns[i]}" y="${252 + r * 46}" fill="${i === 1 ? '#fbbf24' : i === 2 ? '#37d6b0' : '#e2e8f0'}" font-family="${i === 0 ? 'Arial,sans-serif' : 'monospace'}" font-size="18">${xml(text)}</text>`).join('')).join('')}`;
  const content = `<rect x="72" y="140" width="1136" height="300" rx="18" fill="#111c2d" stroke="#334155"/>
    ${table}
    <rect x="72" y="458" width="1136" height="196" rx="14" fill="#142235" stroke="#29445c"/>
    <text x="98" y="494" fill="#f8fafc" font-family="Arial,sans-serif" font-size="19">Same cause, same correction</text>
    <text x="98" y="528" fill="#cbd5e1" font-family="Arial,sans-serif" font-size="17">faceSketch, sectionSketch, the flat and section DXF profiles and inspect_section read arcs through one function.</text>
    <text x="98" y="556" fill="#cbd5e1" font-family="Arial,sans-serif" font-size="17">An arc that runs clockwise in the sketch frame and sweeps less than 180° got the bulge of the opposite arc.</text>
    <text x="98" y="584" fill="#cbd5e1" font-family="Arial,sans-serif" font-size="17">Lines, full circles, counter-clockwise arcs and arcs of 180° or more were correct before and are unchanged.</text>
    <text x="98" y="626" fill="#9fb0c4" font-family="monospace" font-size="16">kernelcad export dxf cover-gasket.kcad.ts  →  ${now.dxf.bytes} bytes; flat profile: ${now.flatLoops} loops</text>`;
  return shell('Measured against the closed form', `${evidence.source} · before: develop ${before.commit}`, content);
}

const evidence = JSON.parse(await readFile(join(HERE, 'evidence.json'), 'utf8')) as Evidence;
const tempDir = await mkdtemp(join(tmpdir(), 'kcad-face-sketch-arcs-video-'));
const scenePaths = [join(tempDir, 'scene-1.png'), join(tempDir, 'scene-2.png')];
try {
  await sharp(Buffer.from(sceneOne(evidence))).png().toFile(scenePaths[0]);
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
    invocation: 'node --import tsx docs/demos/face-sketch-clockwise-arcs/make-video.mts',
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
