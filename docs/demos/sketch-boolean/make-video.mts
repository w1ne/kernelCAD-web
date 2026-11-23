// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Replay: node --import tsx docs/demos/sketch-boolean/make-video.mts
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
const VIEW_INVOCATION =
  'kernelcad render docs/demos/sketch-boolean/keyhole-hanger.kcad.ts -o view.png --pose 25,55 --width 1000 --height 640';
const sha256 = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex');
const xml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

type Loop = (string | number)[][];
interface Profile { areaMm2: number; lines: number; arcs: number; loop: Loop }
interface Screw { shankToSlotGapMm: number; headBearingAreaMm2: number; headToEntryHoleClearanceMm: number; shankPlateOverlapMm3: number }
interface Evidence {
  scope: string;
  source: string;
  dimensionsMm: Record<string, number>;
  expected: Record<string, number>;
  measured: {
    errorDiagnostics: number; outline: Profile; keyholes: Profile[];
    profile: { areaMm2: number; loopCount: number; holeCount: number };
    plateVolumeMm3: number; plateValid: boolean; screws: Screw[];
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

const OPERAND = '#94a3b8';
const RESULT = '#37d6b0';

function sceneOne(evidence: Evidence): string {
  const { measured, dimensionsMm: dim } = evidence;
  const panel = (x: number, heading: string, code: string, note: string, drawing: string) =>
    `<rect x="${x}" y="140" width="368" height="400" rx="18" fill="#111c2d" stroke="#334155"/>
    <text x="${x + 22}" y="174" fill="#f8fafc" font-family="Arial,sans-serif" font-size="19" font-weight="700">${xml(heading)}</text>
    ${drawing}
    <text x="${x + 22}" y="486" fill="#f8fafc" font-family="monospace" font-size="14">${xml(code)}</text>
    <text x="${x + 22}" y="516" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="15">${xml(note)}</text>`;
  const dashed = (shape: string) => shape.replace('/>', ` fill="none" stroke="${OPERAND}" stroke-width="1.6" stroke-dasharray="6 5"/>`);
  const solid = (loop: Loop, scale: number, cx: number, cy: number) =>
    `<path d="${loopPath(loop, scale, cx, cy)}" fill="rgba(55,214,176,0.14)" stroke="${RESULT}" stroke-width="2.4"/>`;

  // 1. intersect: blank ∩ disc, to scale.
  const s1 = 3.4;
  const c1 = [72 + 184, 326];
  const hw = dim.blankWidth / 2;
  const hh = dim.blankHeight / 2;
  const one = dashed(`<rect x="${c1[0] - hw * s1}" y="${c1[1] - hh * s1}" width="${2 * hw * s1}" height="${2 * hh * s1}"/>`)
    + dashed(`<circle cx="${c1[0]}" cy="${c1[1]}" r="${dim.clipRadius * s1}"/>`)
    + solid(measured.outline.loop, s1, c1[0], c1[1]);

  // 2. union: entry ∪ slot ∪ slot end, magnified, drawn about the keyhole at x = -22.
  const s2 = 15;
  const kx = -dim.screwSpacing / 2;
  const c2 = [456 + 184 - kx * s2, 322];
  const er = dim.entryDiameter / 2;
  const sw = dim.slotWidth / 2;
  const two = dashed(`<circle cx="${c2[0] + kx * s2}" cy="${c2[1] + 4 * s2}" r="${er * s2}"/>`)
    + dashed(`<rect x="${c2[0] + (kx - sw) * s2}" y="${c2[1] - 6 * s2}" width="${2 * sw * s2}" height="${dim.slotTravel * s2}"/>`)
    + dashed(`<circle cx="${c2[0] + kx * s2}" cy="${c2[1] - 6 * s2}" r="${sw * s2}"/>`)
    + solid(measured.keyholes[0].loop, s2, c2[0], c2[1]);

  // 3. subtract: outline − keyholes. The keyhole loops are drawn as holes.
  const c3 = [840 + 184, 326];
  const d3 = [measured.outline.loop, ...measured.keyholes.map((k) => k.loop)].map((loop) => loopPath(loop, s1, c3[0], c3[1])).join(' ');
  const three = `<path d="${d3}" fill="rgba(55,214,176,0.14)" fill-rule="evenodd" stroke="${RESULT}" stroke-width="2.4"/>`;

  const content = panel(72, '1. intersect', 'blank.intersect(disc)', `${measured.outline.lines} lines, ${measured.outline.arcs} R${dim.clipRadius} arcs · ${measured.outline.areaMm2.toFixed(3)} mm²`, one)
    + panel(456, '2. union', 'entry.union([slot, slotEnd])', `${measured.keyholes[0].lines} lines, ${measured.keyholes[0].arcs} arcs · ${measured.keyholes[0].areaMm2.toFixed(3)} mm²`, two)
    + panel(840, '3. subtract', 'outline.subtract([keyholeA, keyholeB])', `1 outline, ${measured.profile.holeCount} holes · ${measured.profile.areaMm2.toFixed(3)} mm²`, three)
    + `<rect x="72" y="556" width="1136" height="98" rx="14" fill="#142235" stroke="#29445c"/>
    <rect x="98" y="580" width="26" height="4" fill="${OPERAND}"/><text x="134" y="587" fill="#e2e8f0" font-family="Arial,sans-serif" font-size="16">dashed: the simple profiles in the script</text>
    <rect x="470" y="580" width="26" height="4" fill="${RESULT}"/><text x="506" y="587" fill="#e2e8f0" font-family="Arial,sans-serif" font-size="16">solid: the sketch each boolean returns</text>
    <text x="98" y="626" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="16">Lines stay lines and arcs stay arcs. The kernel finds each crossing point; the script states none. Each call is awaited.</text>`;
  return shell('Sketch booleans: a keyhole hanger plate from simple profiles', `A ${dim.blankWidth} × ${dim.blankHeight} mm plate for two M4 screws ${dim.screwSpacing} mm apart, built with intersect, union and subtract.`, content);
}

function sceneTwo(evidence: Evidence, viewPng: Buffer): string {
  const { measured, expected } = evidence;
  const screw = measured.screws[0];
  const rows: [string, string, string][] = [
    ['Outline area, mm²', measured.outline.areaMm2.toFixed(3), expected.outlineAreaMm2.toFixed(3)],
    ['Keyhole area, mm²', measured.keyholes[0].areaMm2.toFixed(3), expected.keyholeAreaMm2.toFixed(3)],
    ['Plate volume, mm³', measured.plateVolumeMm3.toFixed(3), expected.plateVolumeMm3.toFixed(3)],
    ['Shank to slot gap, mm', screw.shankToSlotGapMm.toFixed(3), expected.shankToSlotGapMm.toFixed(3)],
    ['Head bearing area, mm²', screw.headBearingAreaMm2.toFixed(3), expected.headBearingAreaMm2.toFixed(3)],
    ['Head to entry hole, mm', screw.headToEntryHoleClearanceMm.toFixed(3), expected.entryClearanceMm.toFixed(3)],
    ['B-rep valid (plate)', String(measured.plateValid), 'true'],
    ['Error diagnostics', String(measured.errorDiagnostics), '0'],
  ];
  const columns = [660, 930, 1070];
  const header = ['Measure', 'This run', 'Closed form'];
  const table = `${header.map((text, i) => `<text x="${columns[i]}" y="182" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="16">${xml(text)}</text>`).join('')}
    <line x1="660" y1="196" x2="1186" y2="196" stroke="#334155"/>
    ${rows.map((row, r) => row.map((text, i) => `<text x="${columns[i]}" y="${230 + r * 38}" fill="${i === 1 ? '#37d6b0' : '#e2e8f0'}" font-family="${i === 0 ? 'Arial,sans-serif' : 'monospace'}" font-size="16">${xml(text)}</text>`).join('')).join('')}`;
  const content = `<rect x="72" y="140" width="548" height="400" rx="18" fill="#111c2d" stroke="#334155"/>
    <image x="84" y="172" width="524" height="335" xlink:href="data:image/png;base64,${viewPng.toString('base64')}"/>
    <text x="96" y="166" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="16">kernelcad render of the extruded profile, 3 mm thick</text>
    <text x="96" y="528" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="16">Blue: plate. Grey: Ø4 / Ø8 screw gauges at the hang position.</text>
    <rect x="636" y="140" width="572" height="400" rx="18" fill="#111c2d" stroke="#334155"/>
    ${table}
    <rect x="72" y="556" width="1136" height="98" rx="14" fill="#142235" stroke="#29445c"/>
    <text x="98" y="590" fill="#cbd5e1" font-family="Arial,sans-serif" font-size="17">A result that is not one outline with holes is refused: no area left, separate regions, or a profile that touches itself.</text>
    <text x="98" y="624" fill="#cbd5e1" font-family="Arial,sans-serif" font-size="17">The boolean is computed when the script runs. A param() coordinate and a spline segment are refused.</text>`;
  return shell('Measured against the closed form', `${evidence.source} · the gauges are hand-modelled cylinders, not catalog screws`, content);
}

const evidence = JSON.parse(await readFile(join(HERE, 'evidence.json'), 'utf8')) as Evidence;
const viewPng = await readFile(join(HERE, 'view.png'));
const tempDir = await mkdtemp(join(tmpdir(), 'kcad-sketch-boolean-video-'));
const scenePaths = [join(tempDir, 'scene-1.png'), join(tempDir, 'scene-2.png')];
try {
  await sharp(Buffer.from(sceneOne(evidence))).png().toFile(scenePaths[0]);
  await sharp(Buffer.from(sceneTwo(evidence, viewPng))).png().toFile(scenePaths[1]);
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
    invocation: 'node --import tsx docs/demos/sketch-boolean/make-video.mts',
    source: 'make-video.mts',
    settings: { width: WIDTH, height: HEIGHT, fps: FPS, secondsPerScene: SCENE_SECONDS, scenes: 2, codec: 'H.264 libx264', crf: 26, pixelFormat: 'yuv420p', audio: false },
    media: probe,
    view: { file: 'view.png', invocation: VIEW_INVOCATION, sha256: sha256(viewPng) },
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
