// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Replay: node --import tsx docs/demos/native-cad-import/make-video.mts
// Settings: 1280x720, 24 fps, 3 s title + 6 s model orbit, H.264 CRF 26.

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
const ORBIT_FPS = 8;
const ORBIT_FRAMES = 48;
const sha256 = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex');
const esc = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const rgb = (channels: number[]) => `rgb(${channels.map((channel) => Math.round(channel)).join(',')})`;
const BASE_COLOR = [79, 134, 183];

interface Mesh { positions: number[]; indices: number[] }
interface Evidence {
  cli: { command: string; conversionEngine: string; partAssets: number };
  nativeBody: { solidCount: number; validBrep: boolean; volumeMm3: number; boundsMm: { min: number[]; max: number[] } };
  referenceBody: { volumeMm3: number };
  comparison: { volumeDifferenceMm3: number; maxBoundsDifferenceMm: number };
  scope: string;
}

function normalize([x, y, z]: number[]): number[] {
  const length = Math.hypot(x, y, z);
  return [x / length, y / length, z / length];
}
function dot(a: number[], b: number[]): number { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

/** Paint the imported OCCT mesh back to front in a deterministic orthographic view. */
function meshPolygons(mesh: Mesh, angle: number, box: { x: number; y: number; width: number; height: number }): string {
  const toward = normalize([0.42, -1, 1.12]);
  const right = normalize([toward[1], -toward[0], 0]);
  const up = normalize([
    toward[1] * right[2] - toward[2] * right[1],
    toward[2] * right[0] - toward[0] * right[2],
    toward[0] * right[1] - toward[1] * right[0],
  ]);
  const light = normalize([-0.4, -0.6, 0.9]);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const points: number[][] = [];
  for (let i = 0; i < mesh.positions.length; i += 3) {
    const x = mesh.positions[i];
    const y = mesh.positions[i + 1];
    points.push([x * cos - y * sin, x * sin + y * cos, mesh.positions[i + 2]]);
  }

  const triangles: { depth: number; points: number[][]; color: number[] }[] = [];
  for (let i = 0; i + 2 < mesh.indices.length; i += 3) {
    const a = points[mesh.indices[i]];
    const b = points[mesh.indices[i + 1]];
    const c = points[mesh.indices[i + 2]];
    if (a === undefined || b === undefined || c === undefined) continue;
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const cross = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
    const area = Math.hypot(cross[0], cross[1], cross[2]);
    if (area < 1e-12) continue;
    const normal = cross.map((value) => value / area);
    if (dot(normal, toward) <= 0) continue;
    const shade = 0.34 + 0.66 * Math.max(0, dot(normal, light));
    triangles.push({
      depth: (dot(a, toward) + dot(b, toward) + dot(c, toward)) / 3,
      points: [a, b, c].map((point) => [dot(point, right), dot(point, up)]),
      color: BASE_COLOR.map((channel) => channel * shade),
    });
  }
  if (triangles.length === 0) throw new Error('The imported OCCT mesh produced no visible triangles.');
  const xs = triangles.flatMap((triangle) => triangle.points.map((point) => point[0]));
  const ys = triangles.flatMap((triangle) => triangle.points.map((point) => point[1]));
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const scale = Math.min((box.width - 36) / (maxX - minX || 1), (box.height - 36) / (maxY - minY || 1));
  const offsetX = box.x + (box.width - (maxX - minX) * scale) / 2 - minX * scale;
  const offsetY = box.y + (box.height - (maxY - minY) * scale) / 2 + maxY * scale;
  triangles.sort((a, b) => a.depth - b.depth);
  return triangles.map((triangle) => {
    const polygon = triangle.points.map((point) => `${(offsetX + point[0] * scale).toFixed(2)},${(offsetY - point[1] * scale).toFixed(2)}`).join(' ');
    const fill = rgb(triangle.color);
    return `<polygon points="${polygon}" fill="${fill}" stroke="${fill}" stroke-width="0.5"/>`;
  }).join('');
}

function modelFrame(mesh: Mesh, evidence: Evidence, frame: number): string {
  const angle = Math.PI * 2 * frame / ORBIT_FRAMES;
  const body = evidence.nativeBody;
  const comparison = evidence.comparison;
  const delta = comparison.volumeDifferenceMm3.toFixed(3);
  const bounds = comparison.maxBoundsDifferenceMm.toFixed(6);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
    <rect width="100%" height="100%" fill="#0b1220"/><rect x="0" width="12" height="100%" fill="#37d6b0"/>
    <text x="58" y="63" fill="#f8fafc" font-family="Arial,sans-serif" font-size="31" font-weight="700">Native SolidWorks part → validated B-rep</text>
    <text x="60" y="100" fill="#93a5bb" font-family="Arial,sans-serif" font-size="17">NIST FTC-06 · local import result</text>
    <rect x="60" y="126" width="790" height="470" rx="18" fill="#101c2c" stroke="#31445b"/>
    ${meshPolygons(mesh, angle, { x: 86, y: 144, width: 738, height: 430 })}
    <rect x="878" y="126" width="342" height="470" rx="18" fill="#101c2c" stroke="#31445b"/>
    <text x="906" y="166" fill="#93a5bb" font-family="Arial,sans-serif" font-size="15" letter-spacing="1">CONVERSION</text>
    <text x="906" y="202" fill="#f8fafc" font-family="monospace" font-size="18">${esc(evidence.cli.conversionEngine)}</text>
    <text x="906" y="232" fill="#37d6b0" font-family="Arial,sans-serif" font-size="17">1 closed · valid solid</text>
    <line x1="906" y1="254" x2="1190" y2="254" stroke="#31445b"/>
    <text x="906" y="288" fill="#93a5bb" font-family="Arial,sans-serif" font-size="15">VOLUME DELTA TO NIST STEP TWIN</text>
    <text x="906" y="324" fill="#f8fafc" font-family="monospace" font-size="19">${delta} mm³</text>
    <text x="906" y="356" fill="#93a5bb" font-family="Arial,sans-serif" font-size="15">MAX BOUNDS DELTA</text>
    <text x="906" y="390" fill="#f8fafc" font-family="monospace" font-size="19">${bounds} mm</text>
    <text x="906" y="435" fill="#93a5bb" font-family="Arial,sans-serif" font-size="15">IMPORTED VOLUME</text>
    <text x="906" y="469" fill="#f8fafc" font-family="monospace" font-size="17">${body.volumeMm3.toLocaleString('en-US')} mm³</text>
    <text x="906" y="514" fill="#93a5bb" font-family="Arial,sans-serif" font-size="14">${evidence.cli.partAssets} B-rep asset · original file hash in manifest</text>
    <rect x="60" y="614" width="1160" height="54" rx="12" fill="#142235" stroke="#31445b"/>
    <text x="82" y="638" fill="#37d6b0" font-family="Arial,sans-serif" font-size="15" font-weight="700">LOCAL MODEL VALIDATION</text>
    <text x="82" y="658" fill="#e2e8f0" font-family="Arial,sans-serif" font-size="14">Geometry only: feature history, PMI and assembly relations are not carried. No deployed or hardware result.</text>
  </svg>`;
}

function titleCard(evidence: Evidence): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
    <rect width="100%" height="100%" fill="#0b1220"/><rect x="0" width="12" height="100%" fill="#37d6b0"/>
    <text x="70" y="112" fill="#f8fafc" font-family="Arial,sans-serif" font-size="38" font-weight="700">Import a native SolidWorks part</text>
    <text x="72" y="153" fill="#93a5bb" font-family="Arial,sans-serif" font-size="19">A local CLI workflow with a measured B-rep result</text>
    <rect x="70" y="190" width="1140" height="132" rx="16" fill="#101c2c" stroke="#31445b"/>
    <text x="98" y="230" fill="#e2e8f0" font-family="monospace" font-size="17">kernelcad import-step \</text>
    <text x="98" y="256" fill="#e2e8f0" font-family="monospace" font-size="15">  tests/fixtures/native-cad-import/nist_ftc_06_asme1_rd_sw1802.SLDPRT --out ./native-part --json</text>
    <text x="98" y="294" fill="#37d6b0" font-family="Arial,sans-serif" font-size="16">${esc(evidence.cli.conversionEngine)} → STEP B-rep → OCCT validity check</text>
    <rect x="70" y="344" width="1140" height="180" rx="16" fill="#101c2c" stroke="#31445b"/>
    <text x="98" y="388" fill="#93a5bb" font-family="Arial,sans-serif" font-size="16" letter-spacing="1">MEASURED AGAINST THE NIST STEP GEOMETRY TWIN</text>
    <text x="98" y="440" fill="#f8fafc" font-family="monospace" font-size="23">1 valid solid   ·   volume delta ${evidence.comparison.volumeDifferenceMm3.toFixed(3)} mm³   ·   max bounds delta ${evidence.comparison.maxBoundsDifferenceMm.toFixed(6)} mm</text>
    <text x="98" y="486" fill="#e2e8f0" font-family="Arial,sans-serif" font-size="17">The CLI writes a .kcad.ts project, manifest and native B-rep asset.</text>
    <rect x="70" y="554" width="1140" height="96" rx="16" fill="#142235" stroke="#31445b"/>
    <text x="98" y="593" fill="#37d6b0" font-family="Arial,sans-serif" font-size="17" font-weight="700">GEOMETRY TRANSLATION</text>
    <text x="98" y="623" fill="#e2e8f0" font-family="Arial,sans-serif" font-size="16">SolidWorks feature history, PMI and assembly relations are not carried. No simulation, deployment or hardware acceptance.</text>
  </svg>`;
}

const evidence = JSON.parse(await readFile(join(HERE, 'evidence.json'), 'utf8')) as Evidence;
const mesh = JSON.parse(await readFile(join(HERE, 'geometry.json'), 'utf8')) as Mesh;
const tempDir = await mkdtemp(join(tmpdir(), 'kernelcad-native-cad-video-'));
try {
  const titlePath = join(tempDir, 'title.png');
  const captionPath = join(tempDir, 'blank-caption.png');
  await sharp(Buffer.from(titleCard(evidence))).png().toFile(titlePath);
  await sharp({ create: { width: WIDTH, height: HEIGHT, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toFile(captionPath);
  for (let frame = 0; frame < ORBIT_FRAMES; frame++) {
    await sharp(Buffer.from(modelFrame(mesh, evidence, frame))).png().toFile(join(tempDir, `frame-${String(frame).padStart(3, '0')}.png`));
  }
  const output = join(HERE, 'demo.mp4');
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-loop', '1', '-framerate', String(FPS), '-t', '3', '-i', titlePath,
    '-framerate', String(ORBIT_FPS), '-i', join(tempDir, 'frame-%03d.png'),
    '-i', captionPath,
    '-filter_complex', '[1:v]fps=24,scale=1280:720,setsar=1[orbit];[orbit][2:v]overlay=0:0[model];[0:v][model]concat=n=2:v=1:a=0,format=yuv420p[v]',
    '-map', '[v]', '-r', String(FPS), '-c:v', 'libx264', '-crf', '26', '-movflags', '+faststart', output,
  ]);
  const poster = join(HERE, 'poster.png');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '7', '-i', output, '-frames:v', '1', poster]);
  const media = JSON.parse(execFileSync('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name,width,height,r_frame_rate,pix_fmt',
    '-show_entries', 'format=duration,size', '-of', 'json', output,
  ], { encoding: 'utf8' }));
  const videoEvidence = {
    invocation: 'node --import tsx docs/demos/native-cad-import/make-video.mts',
    sources: ['nist-ftc-06.kcad.ts', 'capture-demo.mts', 'evidence.json', 'geometry.json'],
    settings: { width: WIDTH, height: HEIGHT, fps: FPS, titleSeconds: 3, orbitFrames: ORBIT_FRAMES, orbitFps: ORBIT_FPS, codec: 'H.264 libx264', crf: 26, pixelFormat: 'yuv420p', audio: false },
    rendering: 'Deterministic software projection of the OCCT mesh produced from lib.fromNativeCAD; not a Studio viewport capture.',
    browserCaptureAttempt: 'Existing CDP sessions at 127.0.0.1:9222 and :9223 were reused; Playwright attached to each websocket but timed out before capture. No additional browser was launched.',
    media,
    poster: 'poster.png',
    posterSha256: sha256(await readFile(poster)),
    videoSha256: sha256(await readFile(output)),
    replay: 'Run capture-demo.mts with cadmpeg 0.6.12 on PATH, then make-video.mts. The input fixture is checked in with source and checksum.',
    scope: evidence.scope,
    simulationRun: false,
    deployed: false,
    hardwareAccepted: false,
  };
  await writeFile(join(HERE, 'video-evidence.json'), `${JSON.stringify(videoEvidence, null, 2)}\n`);
  console.log(JSON.stringify({ output, media, videoSha256: videoEvidence.videoSha256 }, null, 2));
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
