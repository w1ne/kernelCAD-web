// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Replay: node --import tsx docs/demos/sketch-offset/make-video.mts
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
const SECTION_INVOCATION =
  'kernelcad render docs/demos/sketch-offset/tray-and-lid.kcad.ts -o section.png --section y=0 --section-flip --pose 12,18 --width 1000 --height 640';
const sha256 = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex');
const xml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

type Loop = (string | number)[][];
interface Profile { areaMm2: number; cornerRadiiMm: number[]; loop: Loop }
interface Evidence {
  scope: string;
  source: string;
  dimensionsMm: { width: number; depth: number; cornerRadius: number; wall: number; clearance: number };
  expected: Record<string, number>;
  measured: {
    errorDiagnostics: number; outlineLoop: Loop; cavity: Profile; plug: Profile;
    trayVolumeMm3: number; lidVolumeMm3: number; trayValid: boolean; lidValid: boolean;
    trayLidOverlapMm3: number; plugToWallGapMm: number;
  };
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
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="100%" height="100%" fill="#0b1220"/><rect width="12" height="100%" fill="#37d6b0"/>
  <text x="58" y="68" fill="#f8fafc" font-family="Arial,sans-serif" font-size="34" font-weight="700">${xml(title)}</text>
  <text x="60" y="106" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="19">${xml(subtitle)}</text>
  ${content}
  <line x1="60" y1="670" x2="1220" y2="670" stroke="#334155"/>
  <text x="60" y="699" fill="#94a3b8" font-family="Arial,sans-serif" font-size="14">LOCAL KERNELCAD API, OCCT MEASUREMENT · no printed or machined part, no fit test on hardware, no deployed behavior</text>
</svg>`;
}

const OUTLINE = '#f8fafc';
const CAVITY = '#60a5fa';
const PLUG = '#fbbf24';

function sceneOne(evidence: Evidence): string {
  const { measured, dimensionsMm: dim } = evidence;
  const loops: [Loop, string][] = [[measured.outlineLoop, OUTLINE], [measured.cavity.loop, CAVITY], [measured.plug.loop, PLUG]];
  // Whole profile, to scale.
  const scale = 7.6;
  const cx = 72 + 262;
  const cy = 334;
  const whole = loops.map(([loop, colour]) => `<path d="${loopPath(loop, scale, cx, cy)}" fill="none" stroke="${colour}" stroke-width="1.8"/>`).join('');
  // The corner region x 20..30.5, y 10..20.5 mm, magnified. The three arcs
  // share the centre (24, 14).
  const zoom = 24;
  const zx = 640 - 20 * zoom;
  const zy = 200 + 20.5 * zoom;
  const corner = loops.map(([loop, colour]) => `<path d="${loopPath(loop, zoom, zx, zy)}" fill="none" stroke="${colour}" stroke-width="2.4"/>`).join('');
  const centre = `<circle cx="${zx + 24 * zoom}" cy="${zy - 14 * zoom}" r="4" fill="#94a3b8"/>`;
  const legend = [
    [OUTLINE, `outline · R${dim.cornerRadius} corners`],
    [CAVITY, `outline.offset(-${dim.wall}) · R${measured.cavity.cornerRadiiMm[0]} corners`],
    [PLUG, `outline.offset(-${dim.wall + dim.clearance}) · R${measured.plug.cornerRadiiMm[0]} corners`],
  ].map(([colour, text], i) => `<rect x="910" y="${190 + i * 34}" width="26" height="4" fill="${colour}"/><text x="948" y="${197 + i * 34}" fill="#e2e8f0" font-family="Arial,sans-serif" font-size="17">${xml(text)}</text>`).join('');
  const content = `<rect x="72" y="140" width="524" height="400" rx="18" fill="#111c2d" stroke="#334155"/>
    <text x="96" y="176" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="17">Profiles, to scale (${dim.width} × ${dim.depth} mm)</text>
    ${whole}
    <rect x="${cx + 20 * scale}" y="${cy - 20.5 * scale}" width="${10.5 * scale}" height="${10.5 * scale}" fill="none" stroke="#94a3b8" stroke-dasharray="5 5"/>
    <rect x="616" y="140" width="592" height="400" rx="18" fill="#111c2d" stroke="#334155"/>
    <text x="640" y="176" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="17">Top-right corner, magnified</text>
    <clipPath id="zoom"><rect x="640" y="200" width="252" height="252"/></clipPath>
    <rect x="640" y="200" width="252" height="252" fill="none" stroke="#94a3b8" stroke-dasharray="5 5"/>
    <text x="640" y="480" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="15">Dot: the common arc centre.</text>
    <g clip-path="url(#zoom)">${corner}${centre}</g>
    ${legend}
    <text x="910" y="318" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="16">The three arcs share one centre.</text>
    <text x="910" y="342" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="16">Lines stay lines, arcs stay arcs.</text>
    <text x="910" y="390" fill="#37d6b0" font-family="Arial,sans-serif" font-size="17">Wall ${dim.wall} mm everywhere.</text>
    <text x="910" y="416" fill="#37d6b0" font-family="Arial,sans-serif" font-size="17">Plug to wall: ${measured.plugToWallGapMm} mm measured.</text>
    <rect x="72" y="556" width="1136" height="98" rx="14" fill="#142235" stroke="#29445c"/>
    <text x="98" y="590" fill="#f8fafc" font-family="monospace" font-size="18">const cavity = await outline.offset(-${dim.wall});     const plug = await outline.offset(-${dim.wall + dim.clearance});</text>
    <text x="98" y="624" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="16">A negative distance shrinks the profile. A positive distance grows it. The result is a new sketch; the outline is unchanged.</text>`;
  return shell('Sketch.offset: a wall and a lid plug from one outline', 'The tray cavity and the lid plug are parallel curves of the same 60 × 40 mm outline.', content);
}

function sceneTwo(evidence: Evidence, sectionPng: Buffer): string {
  const { measured, expected } = evidence;
  const rows: [string, string, string][] = [
    ['Cavity area, mm²', measured.cavity.areaMm2.toFixed(3), expected.cavityAreaMm2.toFixed(3)],
    ['Plug area, mm²', measured.plug.areaMm2.toFixed(3), expected.plugAreaMm2.toFixed(3)],
    ['Tray volume, mm³', measured.trayVolumeMm3.toFixed(3), expected.trayVolumeMm3.toFixed(3)],
    ['Lid volume, mm³', measured.lidVolumeMm3.toFixed(3), expected.lidVolumeMm3.toFixed(3)],
    ['Plug to wall gap, mm', measured.plugToWallGapMm.toFixed(3), expected.plugToWallGapMm.toFixed(3)],
    ['Tray and lid overlap, mm³', measured.trayLidOverlapMm3.toFixed(3), '0.000'],
    ['B-rep valid (tray, lid)', `${measured.trayValid}, ${measured.lidValid}`, 'true, true'],
    ['Error diagnostics', String(measured.errorDiagnostics), '0'],
  ];
  const columns = [660, 930, 1070];
  const header = ['Measure', 'This run', 'Closed form'];
  const table = `${header.map((text, i) => `<text x="${columns[i]}" y="182" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="16">${xml(text)}</text>`).join('')}
    <line x1="660" y1="196" x2="1186" y2="196" stroke="#334155"/>
    ${rows.map((row, r) => row.map((text, i) => `<text x="${columns[i]}" y="${230 + r * 38}" fill="${i === 1 ? '#37d6b0' : '#e2e8f0'}" font-family="${i === 0 ? 'Arial,sans-serif' : 'monospace'}" font-size="16">${xml(text)}</text>`).join('')).join('')}`;
  const content = `<rect x="72" y="140" width="548" height="400" rx="18" fill="#111c2d" stroke="#334155"/>
    <image x="84" y="172" width="524" height="335" xlink:href="data:image/png;base64,${sectionPng.toString('base64')}"/>
    <text x="96" y="166" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="16">kernelcad render, section at y = 0 (cut faces are not filled)</text>
    <text x="96" y="528" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="16">Blue: tray. Orange: lid, seated on the rim, plug inside the wall.</text>
    <rect x="636" y="140" width="572" height="400" rx="18" fill="#111c2d" stroke="#334155"/>
    ${table}
    <rect x="72" y="556" width="1136" height="98" rx="14" fill="#142235" stroke="#29445c"/>
    <text x="98" y="590" fill="#cbd5e1" font-family="Arial,sans-serif" font-size="17">An offset that is not one profile is refused: nothing left, a neck that closes, a hole that reaches the boundary.</text>
    <text x="98" y="624" fill="#cbd5e1" font-family="Arial,sans-serif" font-size="17">The offset is computed when the script runs. A param() distance or coordinate, and a spline segment, are refused.</text>`;
  return shell('Measured against the closed form', `${evidence.source} · tray 20 mm tall, 2 mm floor; lid 2 mm plate, 3 mm plug`, content);
}

const evidence = JSON.parse(await readFile(join(HERE, 'evidence.json'), 'utf8')) as Evidence;
const sectionPng = await readFile(join(HERE, 'section.png'));
const tempDir = await mkdtemp(join(tmpdir(), 'kcad-sketch-offset-video-'));
const scenePaths = [join(tempDir, 'scene-1.png'), join(tempDir, 'scene-2.png')];
try {
  await sharp(Buffer.from(sceneOne(evidence))).png().toFile(scenePaths[0]);
  await sharp(Buffer.from(sceneTwo(evidence, sectionPng))).png().toFile(scenePaths[1]);
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
    invocation: 'node --import tsx docs/demos/sketch-offset/make-video.mts',
    source: 'make-video.mts',
    settings: { width: WIDTH, height: HEIGHT, fps: FPS, secondsPerScene: SCENE_SECONDS, scenes: 2, codec: 'H.264 libx264', crf: 26, pixelFormat: 'yuv420p', audio: false },
    media: probe,
    section: { file: 'section.png', invocation: SECTION_INVOCATION, sha256: sha256(sectionPng) },
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
