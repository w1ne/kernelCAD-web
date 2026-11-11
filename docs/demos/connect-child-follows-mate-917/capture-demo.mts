// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend.ts';
import { isSceneBackend, type SceneBackend } from '../../../src/kernel/backends/sceneBackend.ts';
import { buildModel } from '../../../src/modeling/buildModel.ts';
import type { Assembly } from '../../../src/modeling/capture/assembly.ts';
import { reposedLoweredAssemblyScene } from '../../../src/modeling/mates/loweredAssemblyScene.ts';
import { solveMates } from '../../../src/modeling/mates/solver.ts';
import type { Scene } from '../../../src/modeling/validation/scene.ts';
import type { Transform } from '../../../src/shared/runtime/se3.ts';

const bundleDir = dirname(fileURLToPath(import.meta.url));
const sourcePath = resolve(bundleDir, 'connect-parent-motion.kcad.ts');
const videoPath = resolve(bundleDir, 'demo.mp4');
const fps = 20;
const width = 1280;
const height = 720;
const frameCount = 41;
const frameDir = await mkdtemp(join(tmpdir(), 'kcad-connected-child-'));

type V3 = [number, number, number];
type XY = [number, number];
interface Bounds3 {
  min: V3;
  max: V3;
}
interface PartFrame {
  name: string;
  color: string;
  bounds: Bounds3;
  topFace: XY[];
}

const colors: Record<string, string> = {
  root: '#8b99aa',
  parent: '#3978ce',
  child: '#ee9943',
};

function corners(bounds: Bounds3): V3[] {
  const [x0, y0, z0] = bounds.min;
  const [x1, y1, z1] = bounds.max;
  return [
    [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0],
    [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1],
  ];
}

function transformedBounds(local: Bounds3, transform: Transform): Bounds3 {
  const points = corners(local).map((point) => transform.point(point) as V3);
  return {
    min: [0, 1, 2].map((axis) => Math.min(...points.map((point) => point[axis]))) as V3,
    max: [0, 1, 2].map((axis) => Math.max(...points.map((point) => point[axis]))) as V3,
  };
}

function sampleScene(scene: SceneBackend): PartFrame[] {
  return scene.parts.map((part) => {
    const local = part.shape.boundingBox();
    const bounds = transformedBounds({
      min: [local.min[0], local.min[1], local.min[2]],
      max: [local.max[0], local.max[1], local.max[2]],
    }, part.worldTransform);
    const topFace = [
      [local.min[0], local.min[1], local.max[2]],
      [local.max[0], local.min[1], local.max[2]],
      [local.max[0], local.max[1], local.max[2]],
      [local.min[0], local.max[1], local.max[2]],
    ].map((point) => {
      const world = part.worldTransform.point(point as V3);
      return [world[0], world[1]] as XY;
    });
    return { name: part.name, color: colors[part.name] ?? '#68758a', bounds, topFace };
  });
}

function closeVec(actual: readonly number[], expected: readonly number[], tolerance = 1e-6): boolean {
  return actual.length === expected.length
    && actual.every((value, index) => Math.abs(value - expected[index]) <= tolerance);
}

function assertBounds(actual: Bounds3 | undefined, expected: Bounds3, label: string): void {
  if (!actual || !closeVec(actual.min, expected.min) || !closeVec(actual.max, expected.max)) {
    throw new Error(`${label} bounds differ: ${JSON.stringify(actual)}; expected ${JSON.stringify(expected)}`);
  }
}

function esc(value: unknown): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function screen(point: XY): XY {
  const scale = 2.65;
  return [825 + point[0] * scale, 535 - point[1] * scale];
}

function fmt(value: number): string {
  return Math.abs(value) < 0.05 ? '0.0' : value.toFixed(1);
}

function partRows(parts: PartFrame[]): string {
  const byName = new Map(parts.map((part) => [part.name, part]));
  return ['root', 'parent', 'child'].map((name, index) => {
    const part = byName.get(name);
    if (!part) return '';
    const y = 421 + index * 48;
    const { min, max } = part.bounds;
    const role = name === 'root' ? 'ground' : name === 'parent' ? 'revolute parent' : 'connect child';
    return `<rect x="105" y="${y - 20}" width="18" height="18" rx="4" fill="${part.color}"/>
      <text x="140" y="${y - 4}" font-family="Arial,sans-serif" font-size="18" font-weight="700" fill="#26364d">${esc(name)} <tspan font-weight="400" fill="#6c7b91">· ${esc(role)}</tspan></text>
      <text x="140" y="${y + 24}" font-family="monospace" font-size="14" fill="#52627a">X ${fmt(min[0])}…${fmt(max[0])} · Y ${fmt(min[1])}…${fmt(max[1])} mm</text>`;
  }).join('\n');
}

function gridSvg(): string {
  const lines: string[] = [];
  for (let mm = 0; mm <= 120; mm += 20) {
    const x = screen([mm, 0])[0];
    const y = screen([0, mm])[1];
    lines.push(`<line x1="${x}" y1="220" x2="${x}" y2="540" stroke="${mm === 0 ? '#aab8ca' : '#e8edf4'}" stroke-width="${mm === 0 ? 2 : 1}"/>`);
    lines.push(`<line x1="800" y1="${y}" x2="1188" y2="${y}" stroke="${mm === 0 ? '#aab8ca' : '#e8edf4'}" stroke-width="${mm === 0 ? 2 : 1}"/>`);
    if (mm > 0) {
      lines.push(`<text x="${x}" y="565" text-anchor="middle" font-family="monospace" font-size="12" fill="#8190a4">${mm}</text>`);
      lines.push(`<text x="790" y="${y + 4}" text-anchor="end" font-family="monospace" font-size="12" fill="#8190a4">${mm}</text>`);
    }
  }
  return lines.join('\n');
}

function svgFrame(poseDeg: number, parts: PartFrame[], mountPoint: XY): string {
  const polygons = parts.map((part) => {
    const points = part.topFace.map(screen).map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
    const center: XY = [
      (part.bounds.min[0] + part.bounds.max[0]) / 2,
      (part.bounds.min[1] + part.bounds.max[1]) / 2,
    ];
    const [labelX, labelY] = screen(center);
    return `<polygon points="${points}" fill="${part.color}" fill-opacity=".82" stroke="#27384f" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="${labelX}" cy="${labelY}" r="3.5" fill="#fff"/>`;
  }).join('\n');
  const mount = screen(mountPoint);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="#f4f7fb"/>
    <rect width="100%" height="12" fill="#2866d5"/>
    <text x="72" y="74" font-family="Arial,sans-serif" font-size="34" font-weight="700" fill="#17243a">A connected child follows its moving parent</text>
    <text x="74" y="112" font-family="Arial,sans-serif" font-size="19" fill="#586a83">Actual lowered BREP bounds · mate pose ${poseDeg.toFixed(0)}° · XY top view, millimetres</text>

    <rect x="72" y="157" width="430" height="432" rx="22" fill="#fff" stroke="#d9e2ee"/>
    <text x="104" y="201" font-family="Arial,sans-serif" font-size="16" font-weight="700" letter-spacing="1" fill="#52647c">ASSEMBLY RELATIONSHIPS</text>
    <text x="114" y="249" font-family="monospace" font-size="18" fill="#26364d">root</text>
    <text x="137" y="279" font-family="monospace" font-size="17" fill="#3978ce">└─ parent · revolute</text>
    <text x="160" y="307" font-family="monospace" font-size="15" fill="#ee9943">└─ child · connect</text>
    <text x="104" y="382" font-family="Arial,sans-serif" font-size="16" font-weight="700" letter-spacing="1" fill="#52647c">MEASURED WORLD BOUNDS</text>
    ${partRows(parts)}
    <rect x="104" y="558" width="356" height="20" rx="10" fill="#eaf0f8"/>
    <text x="282" y="572" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" font-weight="700" fill="#52647c">PARENT MOUNT AND CHILD ROOT STAY COINCIDENT</text>

    <rect x="526" y="157" width="682" height="432" rx="22" fill="#fff" stroke="#d9e2ee"/>
    <text x="560" y="201" font-family="Arial,sans-serif" font-size="16" font-weight="700" letter-spacing="1" fill="#52647c">LOWERED SCENE · TOP VIEW</text>
    ${gridSvg()}
    ${polygons}
    <circle cx="${mount[0]}" cy="${mount[1]}" r="7" fill="#fff" stroke="#c66e16" stroke-width="3"/>
    <text x="1180" y="581" text-anchor="end" font-family="monospace" font-size="12" fill="#8190a4">X →</text>
    <text x="798" y="236" text-anchor="end" font-family="monospace" font-size="12" fill="#8190a4">Y ↑</text>

    <rect x="72" y="625" width="592" height="34" rx="17" fill="#e0e9f7"/>
    <text x="92" y="647" font-family="Arial,sans-serif" font-size="13" font-weight="700" letter-spacing=".5" fill="#31547f">LOCAL CAD LOWERER + FORWARD-KINEMATICS REPLAY · NO PHYSICS RUN</text>
    <text x="1208" y="648" text-anchor="end" font-family="Arial,sans-serif" font-size="15" fill="#66758b">kernelCAD · issue #917</text>
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

  const scene = built.returnValue as Scene;
  const featureId = scene.__sourceFeatureId();
  const lowered = featureId === undefined ? undefined : built.shapes.get(featureId);
  if (!isSceneBackend(lowered)) throw new Error('Expected the assembly to lower to a SceneBackend');
  const arm = built.session.assemblies.get('rig') as Assembly | undefined;
  if (!arm) throw new Error('The captured assembly was not available in the build session');

  const snapshots: Array<{ poseDeg: number; parts: PartFrame[]; parentMount: V3; childRoot: V3 }> = [];
  const svgs: string[] = [];
  for (let frame = 0; frame < frameCount; frame++) {
    const poseDeg = 90 * frame / (frameCount - 1);
    const solved = await solveMates(arm, { turn: poseDeg });
    if (solved.status !== 'solved' && solved.status !== 'redundant-ok') {
      throw new Error(`Mate solve at ${poseDeg}° returned ${solved.status}`);
    }
    const posed = reposedLoweredAssemblyScene(arm, lowered, solved.poses);
    if (!posed) throw new Error(`Could not re-pose the lowered scene at ${poseDeg}°`);
    const parts = sampleScene(posed);
    const parent = posed.parts.find((part) => part.name === 'parent');
    const child = posed.parts.find((part) => part.name === 'child');
    if (!parent || !child) throw new Error('Expected parent and child in the lowered scene');
    const parentMount = parent.worldTransform.point([120, 0, 0]) as V3;
    const childRoot = child.worldTransform.point([120, 0, 0]) as V3;
    snapshots.push({ poseDeg, parts, parentMount, childRoot });
    svgs.push(svgFrame(poseDeg, parts, [parentMount[0], parentMount[1]]));
  }

  const start = snapshots[0];
  const end = snapshots[snapshots.length - 1];
  const boundsByName = (snapshot: typeof start) => Object.fromEntries(
    snapshot.parts.map((part) => [part.name, part.bounds]),
  );
  assertBounds(boundsByName(start).parent as Bounds3, { min: [100, 0, 0], max: [120, 4, 2] }, 'parent at 0°');
  assertBounds(boundsByName(start).child as Bounds3, { min: [120, 0, 0], max: [130, 2, 2] }, 'child at 0°');
  assertBounds(boundsByName(end).parent as Bounds3, { min: [-4, 100, 0], max: [0, 120, 2] }, 'parent at 90°');
  assertBounds(boundsByName(end).child as Bounds3, { min: [-2, 120, 0], max: [0, 130, 2] }, 'child at 90°');
  if (!closeVec(start.parentMount, start.childRoot) || !closeVec(end.parentMount, end.childRoot)) {
    throw new Error('Parent and child connector points separated in the local pose replay');
  }
  if (!closeVec(end.parentMount, [0, 120, 0])) {
    throw new Error(`Expected the shared connector at [0, 120, 0]; got ${JSON.stringify(end.parentMount)}`);
  }

  const verification = {
    status: 'local-cad-lowerer-and-forward-kinematics-verified',
    source: 'connect-parent-motion.kcad.ts',
    sourceSha256: execFileSync('sha256sum', [sourcePath], { encoding: 'utf8' }).split(/\s+/)[0],
    assembly: 'rig',
    replay: 'solveMates pose overrides plus reposedLoweredAssemblyScene',
    poseSamples: frameCount,
    endpointHoldFrames: 20,
    poses: [start, end].map((snapshot) => ({
      turnDeg: snapshot.poseDeg,
      worldBoundsMm: boundsByName(snapshot),
      parentMountMm: snapshot.parentMount,
      childRootMm: snapshot.childRoot,
    })),
    checks: {
      parentRotatesFromPositiveXToPositiveY: true,
      childRetainsItsAuthoredDimensions: true,
      parentMountAndChildRootRemainCoincident: true,
    },
    scope: {
      physicsSimulation: false,
      deployedBehavior: false,
      hardwareAcceptance: false,
    },
  };
  await writeFile(resolve(bundleDir, 'verification.json'), `${JSON.stringify(verification, null, 2)}\n`);
  await savePng(resolve(bundleDir, 'preview-start.png'), svgs[0]);
  await savePng(resolve(bundleDir, 'preview-end.png'), svgs[svgs.length - 1]);
  const displayFrames = [
    ...Array.from({ length: 20 }, () => svgs[0]),
    ...svgs,
    ...Array.from({ length: 20 }, () => svgs[svgs.length - 1]),
  ];
  for (let i = 0; i < displayFrames.length; i++) {
    await savePng(join(frameDir, `frame-${String(i).padStart(4, '0')}.png`), displayFrames[i]);
  }
  execFileSync('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-framerate', String(fps),
    '-i', join(frameDir, 'frame-%04d.png'),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '27',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    videoPath,
  ], { stdio: 'inherit' });
  process.stdout.write(`${JSON.stringify({
    video: videoPath,
    frames: frameCount,
    start: verification.poses[0],
    end: verification.poses[1],
  }, null, 2)}\n`);
} finally {
  await rm(frameDir, { recursive: true, force: true });
}
