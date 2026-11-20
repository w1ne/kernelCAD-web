// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Replay: node --import tsx docs/demos/sketch-transform/make-video.mts
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
  'kernelcad render docs/demos/sketch-transform/fan-guard.kcad.ts -o view.png --pose 25,55 --width 1000 --height 640';
const sha256 = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex');
const xml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

type Loop = (string | number)[][];
interface Measured { areaMm2: number; radiusMm: number; angleDeg: number; loop: Loop }
interface Evidence {
  scope: string;
  source: string;
  dimensionsMm: Record<string, number>;
  transforms: { slotCount: number; slotStepDeg: number; innerScale: number; innerTurnDeg: number };
  expected: Record<string, number>;
  measured: {
    errorDiagnostics: number;
    profile: { areaMm2: number; loopCount: number; holeCount: number };
    outline: Measured; mounts: Measured[]; outerRing: Measured[]; innerRing: Measured[];
    ventOpenAreaMm2: number; plateVolumeMm3: number; plateValid: boolean;
    pins: { pinToHoleGapMm: number; pinPlateOverlapMm3: number }[];
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
  <text x="60" y="699" fill="#94a3b8" font-family="Arial,sans-serif" font-size="14">LOCAL KERNELCAD API, OCCT MEASUREMENT · no printed or machined part, no air-flow test, no deployed behavior</text>
</svg>`;
}

const SOURCE_COLOUR = '#fbbf24';
const RESULT = '#37d6b0';
const EARLIER = '#64748b';

function sceneOne(evidence: Evidence): string {
  const { measured, dimensionsMm: dim, transforms: t } = evidence;
  const scale = 4.6;
  const cy = 318;
  const paths = (loops: Measured[], cx: number, colour: string, fill: boolean) =>
    loops.map((l) => `<path d="${loopPath(l.loop, scale, cx, cy)}" fill="${fill ? 'rgba(55,214,176,0.16)' : 'none'}" stroke="${colour}" stroke-width="${fill ? 2.2 : 1.4}"/>`).join('');
  // The profile each source primitive is drawn as in the script, at the origin.
  const sourceHole = (cx: number) =>
    `<circle cx="${cx}" cy="${cy}" r="${(dim.holeDiameter / 2) * scale}" fill="none" stroke="${SOURCE_COLOUR}" stroke-width="2" stroke-dasharray="5 4"/>`;
  const sourceSlot = (cx: number) =>
    `<path d="${loopPath(measured.outerRing[0].loop, scale, cx, cy)}" fill="none" stroke="${SOURCE_COLOUR}" stroke-width="2" stroke-dasharray="5 4"/>`;
  const panel = (x: number, heading: string, code: string, note: string, drawing: string) =>
    `<rect x="${x}" y="140" width="368" height="400" rx="18" fill="#111c2d" stroke="#334155"/>
    <text x="${x + 22}" y="174" fill="#f8fafc" font-family="Arial,sans-serif" font-size="19" font-weight="700">${xml(heading)}</text>
    ${drawing}
    <text x="${x + 22}" y="490" fill="#f8fafc" font-family="monospace" font-size="14">${xml(code)}</text>
    <text x="${x + 22}" y="518" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="15">${xml(note)}</text>`;
  const outline = (cx: number) => paths([measured.outline], cx, EARLIER, false);

  const c1 = 72 + 184;
  const one = outline(c1) + paths(measured.mounts, c1, RESULT, true) + sourceHole(c1);
  const c2 = 456 + 184;
  const two = outline(c2) + paths(measured.mounts, c2, EARLIER, false) + paths(measured.outerRing, c2, RESULT, true) + sourceSlot(c2);
  const c3 = 840 + 184;
  const three = outline(c3) + paths([...measured.mounts, ...measured.outerRing], c3, EARLIER, false)
    + paths(measured.innerRing, c3, RESULT, true) + sourceSlot(c3);

  const outer = measured.outerRing[1];
  const inner = measured.innerRing[0];
  const content = panel(72, '1. translate', 'hole.translate(x, y)', `4 copies of one Ø${dim.holeDiameter} hole on the ${dim.holeSquare} mm square`, one)
    + panel(456, '2. rotate', 'slot.rotate(45 * i)', `${t.slotCount} copies, ${t.slotStepDeg}° apart · each ${outer.areaMm2.toFixed(3)} mm²`, two)
    + panel(840, '3. scale, then rotate', `s.scale(${t.innerScale}).rotate(${t.innerTurnDeg})`, `${t.slotCount} copies at ${inner.radiusMm.toFixed(1)} mm · each ${inner.areaMm2.toFixed(3)} mm²`, three)
    + `<rect x="72" y="556" width="1136" height="98" rx="14" fill="#142235" stroke="#29445c"/>
    <rect x="98" y="580" width="26" height="4" fill="${SOURCE_COLOUR}"/><text x="134" y="587" fill="#e2e8f0" font-family="Arial,sans-serif" font-size="16">dashed: the profile as drawn in the script</text>
    <rect x="470" y="580" width="26" height="4" fill="${RESULT}"/><text x="506" y="587" fill="#e2e8f0" font-family="Arial,sans-serif" font-size="16">solid: the copies in the kernel result, drawn from its loops</text>
    <text x="98" y="626" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="16">One hole and one slot are drawn once. Each copy is a new sketch; arcs stay exact arcs. The script states no turned coordinate.</text>`;
  return shell('Sketch transforms: a 60 mm fan guard from one hole and one slot', `A ${dim.plate} × ${dim.plate} × ${dim.thickness} mm plate with ${measured.profile.holeCount} openings, placed with translate, rotate and scale.`, content);
}

function sceneTwo(evidence: Evidence, viewPng: Buffer): string {
  const { measured, expected } = evidence;
  const rows: [string, string, string][] = [
    ['Outer slot area, mm²', measured.outerRing[3].areaMm2.toFixed(3), expected.outerSlotAreaMm2.toFixed(3)],
    ['Inner slot area, mm²', measured.innerRing[3].areaMm2.toFixed(3), expected.innerSlotAreaMm2.toFixed(3)],
    ['Inner slot centre radius, mm', measured.innerRing[3].radiusMm.toFixed(3), expected.innerSlotCentreRadiusMm.toFixed(3)],
    ['Vent open area, mm²', measured.ventOpenAreaMm2.toFixed(3), expected.ventOpenAreaMm2.toFixed(3)],
    ['Plate volume, mm³', measured.plateVolumeMm3.toFixed(3), expected.plateVolumeMm3.toFixed(3)],
    ['Pin to hole gap, mm', measured.pins[0].pinToHoleGapMm.toFixed(3), expected.pinToHoleGapMm.toFixed(3)],
    ['B-rep valid (plate)', String(measured.plateValid), 'true'],
    ['Error diagnostics', String(measured.errorDiagnostics), '0'],
  ];
  const columns = [660, 950, 1080];
  const header = ['Measure', 'This run', 'Closed form'];
  const table = `${header.map((text, i) => `<text x="${columns[i]}" y="182" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="16">${xml(text)}</text>`).join('')}
    <line x1="660" y1="196" x2="1186" y2="196" stroke="#334155"/>
    ${rows.map((row, r) => row.map((text, i) => `<text x="${columns[i]}" y="${230 + r * 38}" fill="${i === 1 ? '#37d6b0' : '#e2e8f0'}" font-family="${i === 0 ? 'Arial,sans-serif' : 'monospace'}" font-size="16">${xml(text)}</text>`).join('')).join('')}`;
  const content = `<rect x="72" y="140" width="548" height="400" rx="18" fill="#111c2d" stroke="#334155"/>
    <image x="84" y="172" width="524" height="335" xlink:href="data:image/png;base64,${viewPng.toString('base64')}"/>
    <text x="96" y="166" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="16">kernelcad render of the extruded profile, 2 mm thick</text>
    <text x="96" y="528" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="16">Blue: plate. Grey: Ø4 pin gauges in the four mounting holes.</text>
    <rect x="636" y="140" width="572" height="400" rx="18" fill="#111c2d" stroke="#334155"/>
    ${table}
    <rect x="72" y="556" width="1136" height="98" rx="14" fill="#142235" stroke="#29445c"/>
    <text x="98" y="590" fill="#cbd5e1" font-family="Arial,sans-serif" font-size="17">Deltas, centres, the scale factor and param() coordinates stay symbolic. The rotation angle must be a plain number.</text>
    <text x="98" y="624" fill="#cbd5e1" font-family="Arial,sans-serif" font-size="17">Refused: a factor that is not > 0, rotate on a smoothSpline profile, and a sketch.text sketch.</text>`;
  return shell('Measured against the closed form', `${evidence.source} · the pins are hand-modelled cylinders, not catalog screws`, content);
}

const evidence = JSON.parse(await readFile(join(HERE, 'evidence.json'), 'utf8')) as Evidence;
const viewPng = await readFile(join(HERE, 'view.png'));
const tempDir = await mkdtemp(join(tmpdir(), 'kcad-sketch-transform-video-'));
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
    invocation: 'node --import tsx docs/demos/sketch-transform/make-video.mts',
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
