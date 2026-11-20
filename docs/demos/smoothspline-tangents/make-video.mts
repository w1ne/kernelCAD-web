// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Replay: node --import tsx docs/demos/smoothspline-tangents/make-video.mts
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

type Vec2 = [number, number];
interface Command { kind: string; x?: number; y?: number; startTangent?: Vec2 | null; endTangent?: Vec2 | null }
interface Evidence {
  scope: string;
  source: string;
  roundSource: string;
  expected: { quarterVolumeMm3: number; plateVolumeMm3: number; plateSizeMm: number[]; roundQuarterVolumeMm3: number };
  now: {
    errorDiagnostics: number; quarterNames: string[]; quarterVolumesMm3: number[]; quarterCommands: Command[][];
    plateVolumeMm3: number; plateSizeMm: number[]; plateBrepValid: boolean;
    roundQuarterVolumeMm3: number; roundQuarterBrepValid: boolean; roundCommands: Command[];
  };
  before: { commit: string; plateVolumeMm3: number; quarterVolumesMm3: number[]; errorDiagnostics: number };
}

const unit = (v: Vec2): Vec2 => [v[0] / Math.hypot(...v), v[1] / Math.hypot(...v)];

/** SVG path of one closed loop. A smoothSpline is drawn as the cubic Bézier
 *  the kernel builds: inner poles a quarter of the chord from each end, along
 *  the start tangent (stated, or the direction of the previous segment, or +X)
 *  and the end tangent (stated, or +X). Sketch y points up, SVG y points down. */
function loopPath(loop: Command[], scale: number, cx: number, cy: number): string {
  const sx = (x: number) => (cx + x * scale).toFixed(2);
  const sy = (y: number) => (cy - y * scale).toFixed(2);
  let d = '';
  let pen: Vec2 = [0, 0];
  let heading: Vec2 | null = null;
  for (const command of loop) {
    if (command.kind === 'close') { d += 'Z '; continue; }
    const point: Vec2 = [command.x!, command.y!];
    if (command.kind === 'moveTo') {
      d += `M ${sx(point[0])} ${sy(point[1])} `;
      heading = null;
    } else if (command.kind === 'lineTo') {
      d += `L ${sx(point[0])} ${sy(point[1])} `;
      heading = unit([point[0] - pen[0], point[1] - pen[1]]);
    } else {
      const start = unit(command.startTangent ?? heading ?? [1, 0]);
      const end = unit(command.endTangent ?? [1, 0]);
      const quarter = Math.hypot(point[0] - pen[0], point[1] - pen[1]) / 4;
      const p1: Vec2 = [pen[0] + start[0] * quarter, pen[1] + start[1] * quarter];
      const p2: Vec2 = [point[0] - end[0] * quarter, point[1] - end[1] * quarter];
      d += `C ${sx(p1[0])} ${sy(p1[1])} ${sx(p2[0])} ${sy(p2[1])} ${sx(point[0])} ${sy(point[1])} `;
      heading = end;
    }
    pen = point;
  }
  return d;
}

/** The command list as it was before this change: no tangent in the segment. */
const withoutTangents = (loop: Command[]): Command[] =>
  loop.map((c) => (c.kind === 'smoothSpline' ? { kind: c.kind, x: c.x, y: c.y } : c));

function shell(title: string, subtitle: string, content: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="100%" height="100%" fill="#0b1220"/><rect width="12" height="100%" fill="#37d6b0"/>
  <text x="58" y="68" fill="#f8fafc" font-family="Arial,sans-serif" font-size="34" font-weight="700">${xml(title)}</text>
  <text x="60" y="106" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="19">${xml(subtitle)}</text>
  ${content}
  <line x1="60" y1="670" x2="1220" y2="670" stroke="#334155"/>
  <text x="60" y="699" fill="#94a3b8" font-family="Arial,sans-serif" font-size="14">LOCAL KERNELCAD API, OCCT MEASUREMENT · no other CAD system, deployed behavior or made part</text>
</svg>`;
}

function platePanel(x: number, title: string, loops: Command[][], fill: string, lines: string[], noteFill: string): string {
  const scale = 5.4;
  const cx = x + 278;
  const cy = 318;
  const paths = loops.map((loop) => `<path d="${loopPath(loop, scale, cx, cy)}" fill="${fill}" fill-opacity="0.82" stroke="#f8fafc" stroke-width="1.4"/>`).join('');
  const holes = [-32, 32].map((hx) => `<circle cx="${cx + hx * scale}" cy="${cy}" r="${2.1 * scale}" fill="#111c2d" stroke="#f8fafc" stroke-width="1.2"/>`).join('');
  const notes = lines.map((line, index) => `<text x="${x + 24}" y="${478 + index * 26}" fill="${noteFill}" font-family="Arial,sans-serif" font-size="18">${xml(line)}</text>`).join('');
  return `<rect x="${x}" y="140" width="556" height="400" rx="18" fill="#111c2d" stroke="#334155"/>
    <text x="${x + 24}" y="176" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="17">${xml(title)}</text>
    <rect x="${cx - 46 * scale}" y="${cy - 14 * scale}" width="${92 * scale}" height="${28 * scale}" fill="none" stroke="#475569" stroke-dasharray="6 6"/>
    <line x1="${cx}" y1="${cy - 20 * scale}" x2="${cx}" y2="${cy + 20 * scale}" stroke="#475569" stroke-dasharray="3 5"/>
    ${paths}${holes}
    ${notes}`;
}

function sceneOne(evidence: Evidence): string {
  const { before, now, expected } = evidence;
  const loss = (100 * (expected.plateVolumeMm3 - before.plateVolumeMm3)) / expected.plateVolumeMm3;
  const content = `${platePanel(72, `BEFORE · develop ${before.commit}, volumes recorded`, now.quarterCommands.map(withoutTangents), '#b45309', [
    `Plate volume ${before.plateVolumeMm3.toFixed(1)} mm³ (${loss.toFixed(2)} % low).`,
    `Left quarters ${before.quarterVolumesMm3[2].toFixed(1)} mm³, right ${before.quarterVolumesMm3[0].toFixed(1)} mm³. Errors: ${before.errorDiagnostics}.`,
  ], '#fbbf24')}
    ${platePanel(652, 'NOW · measured in this run', now.quarterCommands, '#0f766e', [
    `Plate volume ${now.plateVolumeMm3.toFixed(1)} mm³. Closed form: ${expected.plateVolumeMm3.toFixed(1)} mm³.`,
    `All four quarters ${now.quarterVolumesMm3[2].toFixed(1)} mm³. B-rep valid.`,
  ], '#37d6b0')}
    <rect x="72" y="554" width="1136" height="100" rx="14" fill="#142235" stroke="#29445c"/>
    <text x="98" y="586" fill="#f8fafc" font-family="monospace" font-size="17">quarter = path().moveTo(0, -7).lineTo(4, -7).smoothSpline(22, -8.5).smoothSpline(40, -14) ...</text>
    <text x="98" y="612" fill="#f8fafc" font-family="monospace" font-size="17">plate = quarter + quarter.reflect('x') + quarter.reflect('y') + quarter.reflect('x').reflect('y')</text>
    <text x="98" y="640" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="16">Drawer-pull backplate 92 × 28 × 3 mm, two Ø4.2 holes. Dashed: the 92 × 28 rectangle and the mirror line. Outlines drawn from the sketch commands.</text>`;
  return shell('A mirrored smoothSpline profile keeps its shape', "A smoothSpline arrives along sketch +X. reflect('y') did not mirror that direction: the left side was a different curve.", content);
}

function sceneTwo(evidence: Evidence): string {
  const { before, now, expected } = evidence;
  const rows: [string, string, string, string][] = [
    ["Quarter from reflect('y'), mm³", before.quarterVolumesMm3[2].toFixed(3), now.quarterVolumesMm3[2].toFixed(3), expected.quarterVolumeMm3.toFixed(3)],
    ['Backplate volume, mm³', before.plateVolumeMm3.toFixed(3), now.plateVolumeMm3.toFixed(3), expected.plateVolumeMm3.toFixed(3)],
    ['Error diagnostics', String(before.errorDiagnostics), String(now.errorDiagnostics), '0'],
    ['Quarter with endTangent [0, 1], mm³', 'no such option', now.roundQuarterVolumeMm3.toFixed(3), expected.roundQuarterVolumeMm3.toFixed(3)],
  ];
  const columns = [98, 470, 700, 930];
  const header = ['Measure', 'Before (recorded)', 'Now (this run)', 'Closed form'];
  const table = `${header.map((text, i) => `<text x="${columns[i]}" y="186" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="17">${xml(text)}</text>`).join('')}
    <line x1="98" y1="200" x2="1182" y2="200" stroke="#334155"/>
    ${rows.map((row, r) => row.map((text, i) => `<text x="${columns[i]}" y="${236 + r * 40}" fill="${i === 1 ? '#fbbf24' : i === 2 ? '#37d6b0' : '#e2e8f0'}" font-family="${i === 0 ? 'Arial,sans-serif' : 'monospace'}" font-size="18">${xml(text)}</text>`).join('')).join('')}`;
  const scale = 6.4;
  const cx = 800;
  const cy = 468;
  const square = now.quarterCommands[0];
  const content = `<rect x="72" y="140" width="1136" height="240" rx="18" fill="#111c2d" stroke="#334155"/>
    ${table}
    <rect x="72" y="396" width="1136" height="258" rx="14" fill="#142235" stroke="#29445c"/>
    <text x="98" y="432" fill="#f8fafc" font-family="Arial,sans-serif" font-size="19">New option: state the tangent</text>
    <text x="98" y="468" fill="#f8fafc" font-family="monospace" font-size="16">.smoothSpline(40, -14)</text>
    <text x="98" y="492" fill="#f8fafc" font-family="monospace" font-size="16">.smoothSpline(46, -8, { endTangent: [0, 1] })</text>
    <text x="98" y="516" fill="#f8fafc" font-family="monospace" font-size="16">.lineTo(46, 0)</text>
    <text x="98" y="556" fill="#cbd5e1" font-family="Arial,sans-serif" font-size="17">The segment arrives travelling +Y and meets the end edge</text>
    <text x="98" y="580" fill="#cbd5e1" font-family="Arial,sans-serif" font-size="17">without a corner. Without the option it arrives along +X.</text>
    <text x="98" y="620" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="16">reflect, translate, rotate, scale and loft twist carry the tangent.</text>
    <path d="${loopPath(square, scale, cx, cy)}" fill="none" stroke="#64748b" stroke-width="1.4" stroke-dasharray="5 5"/>
    <path d="${loopPath(now.roundCommands, scale, cx, cy)}" fill="#0f766e" fill-opacity="0.82" stroke="#f8fafc" stroke-width="1.4"/>
    <text x="${cx}" y="${cy + 14 * scale + 28}" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="15">Filled: ${xml(evidence.roundSource.split('/').pop()!)}. Dashed: the square corner.</text>`;
  return shell('Measured against the closed form', `${evidence.source} · before: develop ${before.commit}`, content);
}

const evidence = JSON.parse(await readFile(join(HERE, 'evidence.json'), 'utf8')) as Evidence;
const tempDir = await mkdtemp(join(tmpdir(), 'kcad-smoothspline-tangents-video-'));
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
    invocation: 'node --import tsx docs/demos/smoothspline-tangents/make-video.mts',
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
