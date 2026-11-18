// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Replays the cookbook example through the local OCCT build + mesh pipeline,
// then software-renders those actual triangles to a short MP4. No browser or
// GPU context is used. Run with an outer fixed timeout.

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { isTopologicallyValid } from '../../../src/kernel/backends/occt/edgeFeatureValidity';
import { buildModel } from '../../../src/modeling/buildModel';
import { loadScriptFeatures } from '../../../scripts/lib/scriptLoader';
import { meshFeaturesPerFeature, type FeatureMesh } from '../../../src/modeling/capture/featureMeshing';

const OUTPUT = resolve('docs/demos/symmetric-extrude');
const MODEL = resolve('examples/cookbook-parity/mid-plane-link.kcad.ts');
const THICKNESS = 8;
const WIDTH = 1280;
const HEIGHT = 720;
const FPS = 12;

interface Triangle {
  points: Array<{ x: number; y: number; depth: number }>;
  color: [number, number, number];
}

function svgText(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function meshBounds(mesh: FeatureMesh): { min: number[]; max: number[] } {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const face of mesh.faces) {
    for (let i = 0; i + 2 < face.vertices.length; i += 3) {
      for (let axis = 0; axis < 3; axis++) {
        min[axis] = Math.min(min[axis]!, face.vertices[i + axis]!);
        max[axis] = Math.max(max[axis]!, face.vertices[i + axis]!);
      }
    }
  }
  return { min, max };
}

function renderMesh(
  mesh: FeatureMesh,
  azimuth: number,
  globalBounds: { min: number[]; max: number[] },
  elevation = 0.57,
  planeZ?: number,
): Buffer {
  const triangles: Triangle[] = [];
  const pixels = Buffer.alloc(WIDTH * HEIGHT * 4);
  const zBuffer = new Float32Array(WIDTH * HEIGHT);
  zBuffer.fill(Number.NEGATIVE_INFINITY);
  const cosAz = Math.cos(azimuth);
  const sinAz = Math.sin(azimuth);
  const center = globalBounds.min.map((v, i) => (v + globalBounds.max[i]!) / 2);
  const maxSpan = Math.max(...globalBounds.max.map((v, i) => v - globalBounds.min[i]!));
  const scale = 470 / Math.max(1, maxSpan * 1.6);
  const light: [number, number, number] = [-0.35, -0.45, 0.82];
  const lightLength = Math.hypot(...light);

  const project = (point: [number, number, number]): { x: number; y: number; depth: number } => {
    const x = point[0] - center[0]!;
    const y = point[1] - center[1]!;
    const z = point[2] - center[2]!;
    const rotatedX = cosAz * x - sinAz * y;
    const rotatedY = sinAz * x + cosAz * y;
    return {
      x: 452 + scale * rotatedX,
      y: 414 - scale * (rotatedY * Math.sin(elevation) + z * Math.cos(elevation)),
      depth: z * Math.sin(elevation) - rotatedY * Math.cos(elevation),
    };
  };

  const baseColor: [number, number, number] = mesh.featureKind === 'extrude' ? [51, 160, 211] : [113, 157, 200];
  for (const face of mesh.faces) {
    let faceNx = face.plane?.normal[0] ?? 0;
    let faceNy = face.plane?.normal[1] ?? 0;
    let faceNz = face.plane?.normal[2] ?? 0;
    if (!face.plane) {
      const normalCount = Math.floor(face.normals.length / 3);
      for (let vertexIndex = 0; vertexIndex < normalCount; vertexIndex++) {
        faceNx += face.normals[vertexIndex * 3] ?? 0;
        faceNy += face.normals[vertexIndex * 3 + 1] ?? 0;
        faceNz += face.normals[vertexIndex * 3 + 2] ?? 0;
      }
    }
    const normalLength = Math.hypot(faceNx, faceNy, faceNz) || 1;
    const diffuse = Math.max(0, (faceNx * light[0] + faceNy * light[1] + faceNz * light[2]) / (normalLength * lightLength));
    const brightness = 0.55 + diffuse * 0.45;
    for (let index = 0; index + 2 < face.indices.length; index += 3) {
      const indices = [face.indices[index]!, face.indices[index + 1]!, face.indices[index + 2]!];
      const points = indices.map((vertexIndex) => [
        face.vertices[vertexIndex * 3]!,
        face.vertices[vertexIndex * 3 + 1]!,
        face.vertices[vertexIndex * 3 + 2]!,
      ] as [number, number, number]);
      const projected = points.map(project);
      triangles.push({
        points: projected,
        color: baseColor.map((channel) => Math.max(0, Math.min(255, Math.round(channel * brightness)))) as [number, number, number],
      });
    }
  }

  // A depth buffer prevents triangles from disconnected/intersecting feature
  // history surfaces from painting through the visible side of the result.
  for (const triangle of triangles) {
    const [a, b, c] = triangle.points as [typeof triangle.points[number], typeof triangle.points[number], typeof triangle.points[number]];
    const edge = (p: typeof a, q: typeof a, x: number, y: number): number => (x - p.x) * (q.y - p.y) - (y - p.y) * (q.x - p.x);
    const area = edge(a, b, c.x, c.y);
    if (Math.abs(area) < 0.001) continue;
    const minX = Math.max(0, Math.floor(Math.min(a.x, b.x, c.x)));
    const maxX = Math.min(WIDTH - 1, Math.ceil(Math.max(a.x, b.x, c.x)));
    const minY = Math.max(0, Math.floor(Math.min(a.y, b.y, c.y)));
    const maxY = Math.min(HEIGHT - 1, Math.ceil(Math.max(a.y, b.y, c.y)));
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5;
        const py = y + 0.5;
        const wa = edge(b, c, px, py) / area;
        const wb = edge(c, a, px, py) / area;
        const wc = edge(a, b, px, py) / area;
        if (wa < -0.0001 || wb < -0.0001 || wc < -0.0001) continue;
        const depth = wa * a.depth + wb * b.depth + wc * c.depth;
        const offset = y * WIDTH + x;
        if (depth <= zBuffer[offset]!) continue;
        zBuffer[offset] = depth;
        const byte = offset * 4;
        pixels[byte] = triangle.color[0];
        pixels[byte + 1] = triangle.color[1];
        pixels[byte + 2] = triangle.color[2];
        pixels[byte + 3] = 255;
      }
    }
  }

  // The sketch plane (z = planeZ) as an orange outline drawn over the part,
  // padded around the part bounds, so the mid-plane split stays readable.
  if (planeZ !== undefined) {
    const pad = 0.18 * maxSpan;
    const [x0, y0] = [globalBounds.min[0]! - pad, globalBounds.min[1]! - pad];
    const [x1, y1] = [globalBounds.max[0]! + pad, globalBounds.max[1]! + pad];
    const corners = ([[x0, y0], [x1, y0], [x1, y1], [x0, y1]] as const).map(([x, y]) => project([x, y, planeZ]));
    for (let side = 0; side < 4; side++) {
      const p = corners[side]!;
      const q = corners[(side + 1) % 4]!;
      const steps = Math.ceil(Math.hypot(q.x - p.x, q.y - p.y));
      for (let step = 0; step <= steps; step++) {
        const t = step / Math.max(1, steps);
        for (let thick = -1; thick <= 1; thick++) {
          const x = Math.round(p.x + (q.x - p.x) * t);
          const y = Math.round(p.y + (q.y - p.y) * t) + thick;
          if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) continue;
          const byte = (y * WIDTH + x) * 4;
          pixels[byte] = 245;
          pixels[byte + 1] = 166;
          pixels[byte + 2] = 35;
          pixels[byte + 3] = 255;
        }
      }
    }
  }
  return pixels;
}

function makeSvg(options: {
  feature: FeatureMesh;
  azimuth: number;
  bounds: { min: number[]; max: number[] };
  stage: number;
  volume: number;
  barVolume: number;
  valid: boolean;
}): string {
  const captions = [
    ['01 / SYMMETRIC EXTRUDE, SIDE VIEW', 'z = −4 … +4 mm', `8 mm total · ${options.barVolume.toLocaleString('en-US', { maximumFractionDigits: 1 })} mm³`],
    ['02 / BORES CUT THROUGH', '2 × Ø5.2 mm, 60 mm apart', `${options.volume.toLocaleString('en-US', { maximumFractionDigits: 1 })} mm³`],
    ['03 / RESULT, ALL SIDES', '72 × 12 × 8 mm envelope', `${options.volume.toLocaleString('en-US', { maximumFractionDigits: 1 })} mm³`],
  ][options.stage]!;
  const codeLines = [
    'const bar = path().moveTo(0, -6)',
    '  .lineTo(60, -6)...close()',
    '  .extrude(8, { symmetric: true });',
    'const bore = path()...close()',
    '  .extrude(10, { symmetric: true });',
    'return bar.subtract(bore)...;',
  ];
  const code = codeLines.map((line, index) => `<text x="906" y="${304 + index * 28}" class="code">${svgText(line)}</text>`).join('');
  const activeLine = options.stage === 0 ? 2 : options.stage === 1 ? 4 : 5;
  const activeY = 286 + activeLine * 28;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x2="0" y2="1"><stop stop-color="#121b28"/><stop offset="1" stop-color="#0a1018"/></linearGradient>
    <radialGradient id="glow"><stop stop-color="#24435b" stop-opacity=".7"/><stop offset="1" stop-color="#101722" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#bg)"/>
  <ellipse cx="442" cy="359" rx="445" ry="330" fill="url(#glow)"/>
  <path d="M0 84H1280" stroke="#253344"/>
  <text x="48" y="53" class="brand">KERNELCAD <tspan fill="#54c8e6">/</tspan> GEOMETRY</text>
  <text x="48" y="127" class="eyebrow">FOUNDATION FEATURE · LOCAL OCCT REPLAY</text>
  <text x="48" y="165" class="title">Symmetric extrude</text>
  <text x="48" y="201" class="subtitle">Centre a sketch extrude on its plane · orange = sketch plane z = 0</text>
  <rect x="854" y="105" width="380" height="473" rx="14" fill="#131d29" stroke="#2a394b"/>
  <text x="886" y="151" class="eyebrow">${captions[0]}</text>
  <text x="886" y="190" class="step">${captions[1]}</text>
  <text x="886" y="226" class="metric">${captions[2]}</text>
  <path d="M886 246H1202" stroke="#344558"/>
  <rect x="894" y="${activeY}" width="304" height="27" rx="5" fill="#18384b"/>
  ${code}
  <path d="M886 475H1202" stroke="#344558"/>
  <circle cx="900" cy="514" r="6" fill="${options.valid ? '#70d6ad' : '#f87171'}"/>
  <text x="918" y="519" class="status">${options.valid ? 'VALID B-REP · LOCAL CHECK' : 'B-REP CHECK FAILED'}</text>
  <text x="886" y="546" class="small">Replay + geometry validation only</text>
  <text x="48" y="655" class="footer">sketch.extrude(depth, { symmetric: true })</text>
  <text x="48" y="681" class="disclaimer">Not a simulation, deployment check, or hardware acceptance test.</text>
  <style>
    text { font-family: Inter, 'Segoe UI', sans-serif; }
    .brand { fill:#e6edf5; font-size:17px; font-weight:700; letter-spacing:2px; }
    .eyebrow { fill:#61c9e8; font-size:12px; font-weight:700; letter-spacing:1.8px; }
    .title { fill:#f4f7fb; font-size:34px; font-weight:650; }
    .subtitle { fill:#9eafc2; font-size:17px; }
    .step { fill:#f3f6fa; font-size:21px; font-weight:600; }
    .metric { fill:#63c8e4; font-size:20px; font-weight:650; }
    .code { fill:#d8e4ef; font:13px ui-monospace, SFMono-Regular, Menlo, monospace; }
    .status { fill:#c9e8dc; font:700 13px ui-monospace, SFMono-Regular, Menlo, monospace; }
    .small { fill:#9eafc2; font-size:13px; }
    .footer { fill:#a9b9ca; font:14px ui-monospace, SFMono-Regular, Menlo, monospace; }
    .disclaimer { fill:#718397; font-size:12px; }
  </style>
  </svg>`;
}

async function main(): Promise<void> {
  mkdirSync(OUTPUT, { recursive: true });
  const framesDir = mkdtempSync(join(tmpdir(), 'kernelcad-symmetric-extrude-demo-'));
  let frameIndex = 0;

  try {
    await initOcct();
    const code = readFileSync(MODEL, 'utf8');
    const model = await buildModel({ fileName: MODEL, code, kernel: 'occt' });
    const errors = model.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
    if (errors.length || !model.tailShape) throw new Error(`Local OCCT build failed: ${JSON.stringify(errors)}`);
    const wrapped = (model.tailShape as unknown as { getReplicadShape(): { wrapped: unknown } }).getReplicadShape().wrapped;
    const bbox = model.tailShape.boundingBox();
    const volumeMm3 = model.tailShape.volume();
    const topologicallyValid = isTopologicallyValid(wrapped);
    if (!topologicallyValid) throw new Error('Local OCCT result is not topologically valid');

    const loaded = await loadScriptFeatures(MODEL);
    const meshed = await meshFeaturesPerFeature(
      loaded.features.map((feature) => feature.record),
      loaded.paramTable,
      loaded.session,
    );
    if (meshed.failedFeatureIds.length) throw new Error(`Demo meshing failed: ${meshed.failedFeatureIds.join(', ')}`);
    const bar = meshed.features.find((feature) => feature.featureKind === 'extrude');
    const result = meshed.features.at(-1);
    if (!bar || !result) throw new Error('Expected a symmetric extrude and a final result in OCCT feature history');
    const barBounds = meshBounds(bar);
    const barVolume = (60 * 12 + Math.PI * 6 * 6) * THICKNESS;
    const faceCount = model.tailShape.faceHashes().length;

    const verification = {
      checkedAt: '2026-11-16',
      source: 'examples/cookbook-parity/mid-plane-link.kcad.ts',
      kernel: 'occt',
      localBuild: 'passed',
      diagnostics: model.diagnostics.map((diagnostic) => ({ code: diagnostic.code, severity: diagnostic.severity })),
      topologicallyValid,
      volumeMm3,
      expectedVolumeMm3: barVolume - 2 * Math.PI * 2.6 * 2.6 * THICKNESS,
      barVolumeMm3: barVolume,
      barBoundsMm: barBounds,
      faceCount,
      boundsMm: { min: bbox.min, max: bbox.max },
      meshedFeatureCount: meshed.features.length,
      failedFeatureIds: meshed.failedFeatureIds,
      renderer: 'Software z-buffered triangle rasterizer using sharp; source triangles from meshFeaturesPerFeature.',
      videoProvenance: 'Local script replay and OCCT geometry validation. This is not a simulation, deployment check, or hardware acceptance test.',
    };
    writeFileSync(join(OUTPUT, 'verification.json'), `${JSON.stringify(verification, null, 2)}\n`);

    const stages: Array<{ feature: FeatureMesh; label: string }> = [
      { feature: bar, label: '01 symmetric bar' },
      { feature: result, label: '02 bar with bores' },
      { feature: result, label: '03 result, all sides' },
    ];
    const globalBounds = { min: bbox.min as number[], max: bbox.max as number[] };
    const writeFrame = async (stage: number, azimuth: number): Promise<Buffer> => {
      const current = stages[stage]!;
      const svg = makeSvg({
        feature: current.feature, azimuth, bounds: globalBounds, stage, volume: volumeMm3,
        barVolume, valid: topologicallyValid,
      });
      const filename = join(framesDir, `frame-${String(frameIndex).padStart(4, '0')}.png`);
      frameIndex++;
      const background = await sharp(Buffer.from(svg)).png().toBuffer();
      // The bar is seen nearly side-on so the sketch plane visibly splits its
      // thickness in half; every stage draws the z = 0 sketch plane.
      const meshPixels = stage === 0
        ? renderMesh(current.feature, azimuth, barBounds, 0.12, 0)
        : renderMesh(current.feature, azimuth, globalBounds, 0.57, 0);
      const meshPng = await sharp(meshPixels, { raw: { width: WIDTH, height: HEIGHT, channels: 4 } }).png().toBuffer();
      const png = await sharp(background).composite([{ input: meshPng }]).png().toBuffer();
      writeFileSync(filename, png);
      return png;
    };
    const repeatStage = async (stage: number, frames: number, azimuth = Math.PI / 4): Promise<Buffer> => {
      let latest = Buffer.alloc(0);
      for (let index = 0; index < frames; index++) latest = await writeFrame(stage, azimuth);
      return latest;
    };

    const firstFrame = await repeatStage(0, FPS * 2);
    writeFileSync(join(OUTPUT, 'hero-frame.png'), await repeatStage(1, 1));
    await repeatStage(1, FPS * 3);
    for (let index = 0; index < FPS * 3; index++) {
      const azimuth = Math.PI / 4 + (2 * Math.PI * index) / (FPS * 3);
      await writeFrame(2, azimuth);
    }
    if (!firstFrame.length || frameIndex < FPS * 8) throw new Error('Demo renderer produced too few frames');

    const mp4 = join(OUTPUT, 'demo.mp4');
    execFileSync('ffmpeg', [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-framerate', String(FPS), '-i', join(framesDir, 'frame-%04d.png'),
      '-c:v', 'libx264', '-crf', '22', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart', mp4,
    ]);
    console.log(JSON.stringify({ video: mp4, frameCount: frameIndex, verification }));
  } finally {
    rmSync(framesDir, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
