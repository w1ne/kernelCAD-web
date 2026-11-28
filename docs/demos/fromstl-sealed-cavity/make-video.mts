// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Replay: node --import tsx docs/demos/fromstl-sealed-cavity/make-video.mts
// Settings: 1280x720, 24 fps, two 4-second scenes, H.264 CRF 26, yuv420p.

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

interface MeshData { positions: number[]; indices: number[] }
interface Measure { volumeMm3: number; solidCount: number; shellCount: number; brepCheckValid: boolean }
interface Evidence {
  scope: string;
  input: { triangleCount: number; meshShells: number };
  beforeChange: { float: { solidCount: number }; ported: { volumeMm3: number; solidCount: number } };
  float: Measure;
  ported: Measure & { removedVolumeMm3: number };
}

function normalize([x, y, z]: number[]): number[] {
  const length = Math.hypot(x, y, z);
  return [x / length, y / length, z / length];
}

function dot(a: number[], b: number[]): number { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

function geometrySvg(mesh: MeshData, box: { x: number; y: number; width: number; height: number }, base: [number, number, number]): string {
  const toward = normalize([0.5, -1, 0.55]);
  // Right-handed camera frame: screen right, screen up, and toward the viewer.
  const right = normalize([-toward[1], toward[0], 0]);
  const up = normalize([
    toward[1] * right[2] - toward[2] * right[1],
    toward[2] * right[0] - toward[0] * right[2],
    toward[0] * right[1] - toward[1] * right[0],
  ]);
  const project = (index: number) => {
    const point = [mesh.positions[index * 3], mesh.positions[index * 3 + 1], mesh.positions[index * 3 + 2]];
    return { x: dot(point, right), y: dot(point, up), depth: dot(point, toward), point };
  };
  const raw = Array.from({ length: mesh.positions.length / 3 }, (_unused, index) => project(index));
  const minX = Math.min(...raw.map((point) => point.x));
  const maxX = Math.max(...raw.map((point) => point.x));
  const minY = Math.min(...raw.map((point) => point.y));
  const maxY = Math.max(...raw.map((point) => point.y));
  const scale = Math.min((box.width - 38) / (maxX - minX || 1), (box.height - 38) / (maxY - minY || 1));
  const offsetX = box.x + (box.width - (maxX - minX) * scale) / 2 - minX * scale;
  const offsetY = box.y + (box.height - (maxY - minY) * scale) / 2 + maxY * scale;
  const screen = raw.map((point) => ({ ...point, sx: offsetX + point.x * scale, sy: offsetY - point.y * scale }));
  const light = normalize([0.55, -0.6, 0.58]);
  const triangles = [] as Array<{ depth: number; points: string; fill: string }>;
  for (let i = 0; i + 2 < mesh.indices.length; i += 3) {
    const a = screen[mesh.indices[i]];
    const b = screen[mesh.indices[i + 1]];
    const c = screen[mesh.indices[i + 2]];
    if (!a || !b || !c) continue;
    const ab = [b.point[0] - a.point[0], b.point[1] - a.point[1], b.point[2] - a.point[2]];
    const ac = [c.point[0] - a.point[0], c.point[1] - a.point[1], c.point[2] - a.point[2]];
    const normal = normalize([
      ab[1] * ac[2] - ab[2] * ac[1],
      ab[2] * ac[0] - ab[0] * ac[2],
      ab[0] * ac[1] - ab[1] * ac[0],
    ]);
    // Closed solids: faces turned away from the camera are hidden by nearer ones.
    if (dot(normal, toward) <= 0) continue;
    const lightLevel = 0.36 + 0.64 * Math.max(0, dot(normal, light));
    const color = base.map((channel) => Math.round(channel * lightLevel));
    triangles.push({
      depth: (a.depth + b.depth + c.depth) / 3,
      points: `${a.sx.toFixed(1)},${a.sy.toFixed(1)} ${b.sx.toFixed(1)},${b.sy.toFixed(1)} ${c.sx.toFixed(1)},${c.sy.toFixed(1)}`,
      fill: `rgb(${color.join(',')})`,
    });
  }
  triangles.sort((a, b) => a.depth - b.depth);
  return triangles.map((triangle) => `<polygon points="${triangle.points}" fill="${triangle.fill}" stroke="#0f172a" stroke-width="0.7"/>`).join('');
}

function shell(title: string, subtitle: string, content: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="100%" height="100%" fill="#0b1220"/><rect width="12" height="100%" fill="#37d6b0"/>
  <text x="58" y="68" fill="#f8fafc" font-family="Arial,sans-serif" font-size="34" font-weight="700">${xml(title)}</text>
  <text x="60" y="106" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="19">${xml(subtitle)}</text>
  ${content}
  <line x1="60" y1="670" x2="1220" y2="670" stroke="#334155"/>
  <text x="60" y="699" fill="#94a3b8" font-family="Arial,sans-serif" font-size="14">LOCAL KERNELCAD API + OCCT RECOMPUTE REPLAY · no solver simulation, deployed behavior or hardware acceptance</text>
</svg>`;
}

const evidence = JSON.parse(await readFile(join(HERE, 'evidence.json'), 'utf8')) as Evidence;

function sceneOne(): string {
  const lines = [
    "const float = await lib.fromSTL('./sealed-float.stl');",
    'const ported = float.subtract(cylinder(50, 3).translate(0, 0, -5));',
    'const front = box(40, 20, 50).translate(-20, -20, -5);',
    'return { float, ported, floatSection: float.subtract(front), ... };',
  ];
  const code = lines.map((line, index) => `<text x="100" y="${256 + index * 46}" fill="#e2e8f0" font-family="monospace" font-size="22">${xml(line)}</text>`).join('');
  const content = `<rect x="72" y="160" width="1136" height="354" rx="20" fill="#111c2d" stroke="#334155"/>
    <text x="102" y="213" fill="#37d6b0" font-family="Arial,sans-serif" font-size="20" font-weight="700">HOLLOW STL → ONE B-REP SOLID WITH AN INNER VOID SHELL</text>${code}
    <rect x="72" y="544" width="348" height="78" rx="14" fill="#142235" stroke="#29445c"/>
    <text x="98" y="577" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="16">FIXTURE · BLENDER 4.0.2</text>
    <text x="98" y="607" fill="#f8fafc" font-family="monospace" font-size="19">sealed float, 3 mm walls</text>
    <rect x="444" y="544" width="348" height="78" rx="14" fill="#142235" stroke="#29445c"/>
    <text x="470" y="577" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="16">INPUT</text>
    <text x="470" y="607" fill="#f8fafc" font-family="monospace" font-size="19">${evidence.input.triangleCount} triangles · ${evidence.input.meshShells} shells</text>
    <rect x="816" y="544" width="392" height="78" rx="14" fill="#142235" stroke="#29445c"/>
    <text x="842" y="577" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="16">RESULT</text>
    <text x="842" y="607" fill="#f8fafc" font-family="Arial,sans-serif" font-size="18">${evidence.float.solidCount} solid · ${evidence.float.shellCount} shells · before: ${evidence.beforeChange.float.solidCount} solids</text>`;
  return shell('Import a hollow STL with its sealed void', 'An inward-facing mesh shell inside an outward-facing one becomes a void of that solid.', content);
}

function sceneTwo(geometry: { floatSection: MeshData; portedSection: MeshData }): string {
  const valid = (measure: { brepCheckValid: boolean }) => (measure.brepCheckValid ? 'B-REP VALID' : 'INVALID');
  const content = `<rect x="72" y="140" width="546" height="398" rx="18" fill="#111c2d" stroke="#334155"/>
    <rect x="662" y="140" width="546" height="398" rx="18" fill="#111c2d" stroke="#334155"/>
    <text x="96" y="179" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="18">IMPORTED · CUTAWAY · ${evidence.float.solidCount} SOLID · ${valid(evidence.float)}</text>
    <text x="686" y="179" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="18">6 MM PORT · CUTAWAY · ${evidence.ported.solidCount} SOLID · ${valid(evidence.ported)}</text>
    ${geometrySvg(geometry.floatSection, { x: 100, y: 194, width: 490, height: 318 }, [78, 170, 204])}
    ${geometrySvg(geometry.portedSection, { x: 690, y: 194, width: 490, height: 318 }, [239, 173, 82])}
    <rect x="72" y="555" width="546" height="82" rx="14" fill="#142235" stroke="#29445c"/>
    <text x="96" y="587" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="16">FLOAT VOLUME (WALLS ONLY)</text>
    <text x="96" y="618" fill="#f8fafc" font-family="monospace" font-size="18">${evidence.float.volumeMm3.toFixed(2)} mm³</text>
    <rect x="662" y="555" width="546" height="82" rx="14" fill="#142235" stroke="#29445c"/>
    <text x="686" y="587" fill="#9fb0c4" font-family="Arial,sans-serif" font-size="16">AFTER THE PORT · BEFORE THIS CHANGE: ${evidence.beforeChange.ported.volumeMm3.toFixed(2)} mm³ LEFT</text>
    <text x="686" y="612" fill="#f8fafc" font-family="monospace" font-size="18">remaining ${evidence.ported.volumeMm3.toFixed(2)} mm³</text>
    <text x="686" y="635" fill="#f8fafc" font-family="monospace" font-size="18">removed ${evidence.ported.removedVolumeMm3.toFixed(2)} mm³ (54π, walls only)</text>`;
  return shell('A bore through the void cuts only the walls', 'OCCT recompute measures the float and the ported float; cutaways show the void.', content);
}

const geometry = JSON.parse(await readFile(join(HERE, 'geometry.json'), 'utf8')) as { floatSection: MeshData; portedSection: MeshData };
const tempDir = await mkdtemp(join(tmpdir(), 'kcad-stl-sealed-cavity-'));
const scenePaths = [join(tempDir, 'scene-1.png'), join(tempDir, 'scene-2.png')];
try {
  await sharp(Buffer.from(sceneOne())).png().toFile(scenePaths[0]);
  await sharp(Buffer.from(sceneTwo(geometry))).png().toFile(scenePaths[1]);
  const output = join(HERE, 'demo.mp4');
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-loop', '1', '-framerate', String(FPS), '-t', String(SCENE_SECONDS), '-i', scenePaths[0],
    '-loop', '1', '-framerate', String(FPS), '-t', String(SCENE_SECONDS), '-i', scenePaths[1],
    '-filter_complex', '[0:v][1:v]concat=n=2:v=1:a=0,format=yuv420p[v]',
    '-map', '[v]', '-r', String(FPS), '-c:v', 'libx264', '-crf', '26', '-movflags', '+faststart', output,
  ]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '6', '-i', output, '-frames:v', '1', join(HERE, 'poster.png')]);
  const probe = JSON.parse(execFileSync('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name,width,height,r_frame_rate,pix_fmt',
    '-show_entries', 'format=duration,size', '-of', 'json', output,
  ], { encoding: 'utf8' }));
  const videoBytes = await readFile(output);
  const videoEvidence = {
    invocation: 'node --import tsx docs/demos/fromstl-sealed-cavity/make-video.mts',
    source: 'make-video.mts',
    settings: { width: WIDTH, height: HEIGHT, fps: FPS, secondsPerScene: SCENE_SECONDS, scenes: 2, codec: 'H.264 libx264', crf: 26, pixelFormat: 'yuv420p', audio: false },
    media: probe,
    poster: 'poster.png',
    posterSha256: sha256(await readFile(join(HERE, 'poster.png'))),
    videoSha256: sha256(videoBytes),
    inspection: 'The first-scene source frame and final-scene poster extracted from the MP4 were visually reviewed after generation.',
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
