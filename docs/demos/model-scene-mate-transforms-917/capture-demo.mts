// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { execFileSync } from 'node:child_process';
import { copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend.ts';
import { isSceneBackend, type SceneBackend } from '../../../src/kernel/backends/sceneBackend.ts';
import { buildModel } from '../../../src/modeling/buildModel.ts';
import type { Scene } from '../../../src/modeling/validation/scene.ts';
import type { Transform } from '../../../src/shared/runtime/se3.ts';

const bundleDir = dirname(fileURLToPath(import.meta.url));
const sourcePath = resolve(bundleDir, 'model-scene-mate-transforms.kcad.ts');
const videoPath = resolve(bundleDir, 'demo.mp4');
const width = 1280;
const height = 720;
const fps = 24;
const holdFrames = 48;
const frameDir = await mkdtemp(join(tmpdir(), 'kcad-model-scene-mate-'));

type V3 = [number, number, number];
interface Bounds3 { min: V3; max: V3 }
interface PartEvidence {
  name: string;
  color: string;
  captureOriginMm: V3;
  lowerOriginMm: V3;
  captureBoundsMm: Bounds3;
  lowerBoundsMm: Bounds3;
  transformDelta: number;
}

const colors: Record<string, string> = {
  base: '#3978ce',
  child: '#ee9943',
  tip: '#55a88a',
};

function corners(bounds: Bounds3): V3[] {
  const [x0, y0, z0] = bounds.min;
  const [x1, y1, z1] = bounds.max;
  return [
    [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0],
    [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1],
  ];
}

function worldBounds(bounds: Bounds3, transform: Transform): Bounds3 {
  const points = corners(bounds).map((point) => transform.point(point) as V3);
  return {
    min: [0, 1, 2].map((axis) => Math.min(...points.map((point) => point[axis]))) as V3,
    max: [0, 1, 2].map((axis) => Math.max(...points.map((point) => point[axis]))) as V3,
  };
}

function maxTransformDelta(a: Transform, b: Transform): number {
  const am = a.toMat4();
  const bm = b.toMat4();
  return Math.max(...am.map((value, index) => Math.abs(value - bm[index])));
}

function closeVec(a: readonly number[], b: readonly number[], tolerance = 1e-7): boolean {
  return a.length === b.length && a.every((value, index) => Math.abs(value - b[index]) <= tolerance);
}

function assertVec(actual: readonly number[], expected: readonly number[], label: string): void {
  if (!closeVec(actual, expected)) throw new Error(`${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
}

function fmt(value: number): string {
  return `${Math.abs(value) < 0.0005 ? 0 : value.toFixed(3)}`;
}

function escapeXml(value: unknown): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function codeBlock(stage: number): string {
  const lines = [
    "const arm = assembly('model-scene-handoff');",
    "const base = arm.part('base', box(10, 10, 10));",
    "base.connector('p', {",
    "  type: 'frame',",
    "  origin: { kind: 'vec3', value: [5, 0, 0] },",
    "});",
    "const child = arm.part('child', box(10, 10, 10));",
    "child.connector('q', {",
    "  type: 'frame',",
    "  origin: { kind: 'vec3', value: [-5, 0, 0] },",
    "});",
    "arm.mate('seat', 'base.p', 'child.q', 'fastened');",
    "const scene = arm.model();",
    "scene.part('child').worldTransform",
  ];
  return lines.map((line, index) => {
    const y = 238 + index * 21;
    const selected = stage === 1 ? index >= 12 : stage === 0 ? index < 12 : index >= 12;
    return `<text x="104" y="${y}" font-family="monospace" font-size="14" fill="${selected ? '#172d4d' : '#8996a8'}">${escapeXml(line)}</text>`;
  }).join('\n');
}

function sceneSvg(stage: number, parts: PartEvidence[]): string {
  const grid: string[] = [];
  const graph = { x: 720, y: 244, width: 438, height: 228 };
  const xScale = graph.width / 24;
  const zScale = graph.height / 12;
  const sx = (x: number) => graph.x + x * xScale;
  const sy = (z: number) => graph.y + (10 - z) * zScale;

  for (let x = 0; x <= 20; x += 5) {
    const px = sx(x);
    grid.push(`<line x1="${px}" y1="${graph.y}" x2="${px}" y2="${graph.y + graph.height}" stroke="#e7edf5"/>`);
    grid.push(`<text x="${px}" y="${graph.y + graph.height + 27}" text-anchor="middle" font-family="monospace" font-size="13" fill="#75859c">${x}</text>`);
  }
  for (let z = 0; z <= 10; z += 5) {
    const py = sy(z);
    grid.push(`<line x1="${graph.x}" y1="${py}" x2="${graph.x + graph.width}" y2="${py}" stroke="#e7edf5"/>`);
    grid.push(`<text x="${graph.x - 14}" y="${py + 4}" text-anchor="end" font-family="monospace" font-size="13" fill="#75859c">${z}</text>`);
  }

  const boxes = parts.map((part) => {
    const bounds = stage === 1 ? part.captureBoundsMm : part.lowerBoundsMm;
    const x = sx(bounds.min[0]);
    const y = sy(bounds.max[2]);
    const w = (bounds.max[0] - bounds.min[0]) * xScale;
    const h = (bounds.max[2] - bounds.min[2]) * zScale;
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${part.color}" fill-opacity=".88" stroke="#20324b" stroke-width="2"/>
      <text x="${x + w / 2}" y="${y - 12}" text-anchor="middle" font-family="Arial,sans-serif" font-size="15" font-weight="700" fill="#26364d">${escapeXml(part.name)}</text>`;
  }).join('\n');

  const transformRows = parts.map((part, index) => {
    const y = 526 + index * 18;
    const origin = stage === 1 ? part.captureOriginMm : part.lowerOriginMm;
    const equal = part.transformDelta <= 1e-7;
    const values = `T(${origin.map(fmt).join(', ')}) mm`;
    return `<text x="708" y="${y}" font-family="monospace" font-size="13" fill="#36475f">${escapeXml(part.name.padEnd(7))} ${escapeXml(values)} <tspan fill="${equal ? '#16754c' : '#ac3d36'}">${equal ? 'MATCH' : 'CHECK'}</tspan></text>`;
  }).join('\n');

  const title = stage === 0
    ? '1 · Author parts and their mate connectors'
    : stage === 1
      ? '2 · Read transforms from the returned Scene'
      : '3 · Compare with the lowered SceneBackend';
  const summary = stage === 0
    ? 'Fastened mate aligns base.p to child.q; the connected tip follows child.'
    : stage === 1
      ? 'Capture-time default-pose FK places the child and connected tip.'
      : 'The same pure mate FK gives matching capture and lowerer transforms.';
  const section = stage === 2
    ? 'LOCAL CAD BUILD · TRANSFORM COMPARISON'
    : stage === 1
      ? 'CAPTURE-TIME SCENE · DEFAULT MATE POSE'
      : 'KERNELCAD MODEL SOURCE · MILLIMETRES';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="#f4f7fb"/>
    <rect width="100%" height="12" fill="#2866d5"/>
    <text x="70" y="72" font-family="Arial,sans-serif" font-size="33" font-weight="700" fill="#17243a">${title}</text>
    <text x="72" y="112" font-family="Arial,sans-serif" font-size="19" fill="#586a83">${escapeXml(summary)}</text>

    <rect x="64" y="155" width="606" height="440" rx="20" fill="#fff" stroke="#d9e2ee"/>
    <text x="98" y="201" font-family="Arial,sans-serif" font-size="15" font-weight="700" letter-spacing="1" fill="#52647c">${section}</text>
    ${codeBlock(stage)}
    <rect x="98" y="543" width="535" height="24" rx="12" fill="#eaf0f8"/>
    <text x="365" y="560" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" font-weight="700" fill="#31547f">${stage === 2 ? 'NO SIMULATION · NO DEPLOYMENT · NO HARDWARE CLAIM' : 'NATIVE KERNELCAD ASSEMBLY AND SCENE API'}</text>

    <rect x="694" y="155" width="522" height="440" rx="20" fill="#fff" stroke="#d9e2ee"/>
    <text x="724" y="201" font-family="Arial,sans-serif" font-size="15" font-weight="700" letter-spacing="1" fill="#52647c">ACTUAL LOWERED BREP BOUNDS · XZ VIEW</text>
    ${grid.join('\n')}
    ${boxes}
    <text x="1160" y="570" text-anchor="end" font-family="monospace" font-size="12" fill="#8190a4">X → mm</text>
    <text x="708" y="231" text-anchor="end" font-family="monospace" font-size="12" fill="#8190a4">Z ↑ mm</text>
    ${transformRows}

    <rect x="64" y="630" width="1152" height="34" rx="17" fill="#e0e9f7"/>
    <text x="84" y="652" font-family="Arial,sans-serif" font-size="13" font-weight="700" letter-spacing=".4" fill="#31547f">LOCAL CAD CAPTURE + LOWERER VALIDATION · TOPOLOGY CONNECTORS RESOLVE DURING RECOMPUTE</text>
    <text x="1210" y="696" text-anchor="end" font-family="Arial,sans-serif" font-size="14" fill="#66758b">kernelCAD · issue #917</text>
  </svg>`;
}

async function savePng(path: string, svg: string): Promise<void> {
  await sharp(Buffer.from(svg)).png().toFile(path);
}

try {
  const code = await readFile(sourcePath, 'utf8');
  await initOcct();
  const built = await buildModel({ code, fileName: sourcePath });
  const errors = built.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
  if (errors.length > 0) throw new Error(`Model build errors: ${JSON.stringify(errors)}`);

  const captureScene = built.returnValue as Scene;
  const featureId = captureScene.__sourceFeatureId();
  const lowered = featureId === undefined ? undefined : built.shapes.get(featureId);
  if (!isSceneBackend(lowered)) throw new Error('Expected model() to lower to a SceneBackend');

  const captureByName = new Map(captureScene.parts.map((part) => [part.name, part]));
  const lowerByName = new Map(lowered.parts.map((part) => [part.name, part]));
  const partEvidence: PartEvidence[] = ['base', 'child', 'tip'].map((name) => {
    const captured = captureByName.get(name);
    const loweredPart = lowerByName.get(name);
    if (!captured || !loweredPart) throw new Error(`Missing '${name}' from one of the model scenes`);
    const bb = loweredPart.shape.boundingBox();
    const localBounds: Bounds3 = {
      min: [bb.min[0], bb.min[1], bb.min[2]],
      max: [bb.max[0], bb.max[1], bb.max[2]],
    };
    const captureOriginMm = captured.worldTransform.point([0, 0, 0]) as V3;
    const lowerOriginMm = loweredPart.worldTransform.point([0, 0, 0]) as V3;
    const captureBoundsMm = worldBounds(localBounds, captured.worldTransform);
    const lowerBoundsMm = worldBounds(localBounds, loweredPart.worldTransform);
    const transformDelta = maxTransformDelta(captured.worldTransform, loweredPart.worldTransform);
    if (transformDelta > 1e-7) throw new Error(`${name} capture/lowerer transforms differ by ${transformDelta}`);
    if (!closeVec(captureOriginMm, lowerOriginMm)) throw new Error(`${name} transform origins differ`);
    return { name, color: colors[name], captureOriginMm, lowerOriginMm, captureBoundsMm, lowerBoundsMm, transformDelta };
  });

  assertVec(partEvidence.find((part) => part.name === 'child')!.captureOriginMm, [10, 0, 0], 'child transform');
  assertVec(partEvidence.find((part) => part.name === 'tip')!.captureOriginMm, [10, 0, 0], 'connected tip transform');
  assertVec(partEvidence.find((part) => part.name === 'base')!.lowerBoundsMm.min, [0, 0, 0], 'base lower bound');
  assertVec(partEvidence.find((part) => part.name === 'child')!.lowerBoundsMm.min, [10, 0, 0], 'child lower bound');
  assertVec(partEvidence.find((part) => part.name === 'tip')!.lowerBoundsMm.min, [20, 0, 0], 'tip lower bound');

  const frames = [sceneSvg(0, partEvidence), sceneSvg(1, partEvidence), sceneSvg(2, partEvidence)];
  const previewPaths = [
    resolve(bundleDir, 'preview-author.png'),
    resolve(bundleDir, 'preview-capture-scene.png'),
    resolve(bundleDir, 'preview-lowered-scene.png'),
  ];
  for (let stage = 0; stage < frames.length; stage++) {
    await savePng(previewPaths[stage], frames[stage]);
    for (let hold = 0; hold < holdFrames; hold++) {
      const frameNumber = stage * holdFrames + hold;
      await copyFile(previewPaths[stage], join(frameDir, `frame-${String(frameNumber).padStart(4, '0')}.png`));
    }
  }

  const settings = {
    invocation: 'npx tsx docs/demos/model-scene-mate-transforms-917/capture-demo.mts',
    resolution: `${width}x${height}`,
    fps,
    stages: ['author mate graph', 'inspect returned capture Scene', 'compare lowered SceneBackend'],
    stageHoldFrames: holdFrames,
    projection: 'XZ projection of actual local BREP bounds transformed by Scene part worldTransform',
    encoder: 'H.264, yuv420p, CRF 27',
  };
  await writeFile(resolve(bundleDir, 'settings.json'), `${JSON.stringify(settings, null, 2)}\n`);

  execFileSync('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-framerate', String(fps),
    '-i', join(frameDir, 'frame-%04d.png'),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '27',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    videoPath,
  ], { stdio: 'inherit' });

  const verification = {
    status: 'local-cad-capture-and-lowerer-transforms-verified',
    source: 'model-scene-mate-transforms.kcad.ts',
    sourceSha256: execFileSync('sha256sum', [sourcePath], { encoding: 'utf8' }).split(/\s+/)[0],
    build: 'buildModel + OCCT lowerer',
    replay: 'compare returned Scene.part.worldTransform with lowered SceneBackend transforms',
    parts: partEvidence,
    checks: {
      childDefaultMateTransformIsTenMm: true,
      connectedTipInheritsChildMotion: true,
      captureAndLoweredTransformsMatch: true,
      actualLoweredBrepBoundsFollowSolvedTransforms: true,
    },
    scope: {
      physicsSimulation: false,
      deployedBehavior: false,
      hardwareAcceptance: false,
    },
  };
  await writeFile(resolve(bundleDir, 'verification.json'), `${JSON.stringify(verification, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ video: videoPath, verification }, null, 2)}\n`);
} finally {
  await rm(frameDir, { recursive: true, force: true });
}
