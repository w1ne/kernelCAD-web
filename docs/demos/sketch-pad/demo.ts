// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Generated technical demo for `Shape.pad(profile, opts)`.
// Every number shown comes from a local OCCT build of the two demo scripts;
// this is not a browser, deployment or hardware recording.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { getOC } from 'replicad';
import { initOcct, OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { isValidShape } from '../../../src/kernel/backends/occt/booleanRecovery';
import { buildModel } from '../../../src/modeling/buildModel';

const outputDir = resolve('docs/demos/sketch-pad');
const frameDir = resolve(outputDir, 'frames');

const PLATE = { x: 40, y: 30, z: 10 };
const TOWER = { x0: 30, x1: 40, z1: 20 };
const PAD = 10;
const BOSS_DEPTH = 5;
const BRIDGE_TOP = 20;
const ANALYTIC_BLIND = PLATE.x * PLATE.y * PLATE.z + PAD * PAD * BOSS_DEPTH;
const ANALYTIC_BRIDGE =
  PLATE.x * PLATE.y * PLATE.z +
  (TOWER.x1 - TOWER.x0) * PLATE.y * (TOWER.z1 - PLATE.z) +
  PAD * PAD * (BRIDGE_TOP - PLATE.z);
const ANALYTIC_COMBINED = ANALYTIC_BRIDGE + PAD * PAD * BOSS_DEPTH;

const SQUARE = (cx: number) => `path()
  .moveTo(${cx - 5}, -5)
  .lineTo(${cx + 5}, -5)
  .lineTo(${cx + 5}, 5)
  .lineTo(${cx - 5}, 5)
  .close()`;

const BLIND_SCRIPT = `const base = box(40, 30, 10);
const square = ${SQUARE(-10)};
return base.pad(square, { face: 'top', depth: ${BOSS_DEPTH} });
`;

const BRIDGE_SCRIPT = `const base = box(40, 30, 10).union(box(10, 30, 10).translate(30, 0, 10));
const square = ${SQUARE(0)};
return base.pad(square, { face: { byNormal: 'Z', atZ: 10 }, upToFace: { atZ: 20, parallelTo: 'XY' } });
`;

function text(x: number, y: number, value: string, size = 18, fill = '#d8e1e8', weight = 500): string {
  return `<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" font-weight="${weight}" font-family="Inter, Arial, sans-serif">${value}</text>`;
}

// Top view: 40 x 30 mm plate mapped into a 440 x 330 panel.
const TOP = { x: 100, y: 240, s: 10 };
const top = (x: number, y: number): [number, number] => [TOP.x + x * TOP.s, TOP.y + (PLATE.y - y) * TOP.s];
// Side view: 40 x 20 mm elevation mapped into the same panel width.
const SIDE = { x: 620, y: 560, s: 7 };
const side = (x: number, z: number): [number, number] => [SIDE.x + x * SIDE.s, SIDE.y - z * SIDE.s];
const poly = (points: Array<[number, number]>): string => points.map(([x, y]) => `${x},${y}`).join(' ');

function frame(
  phase: 0 | 1 | 2,
  measured: { blind: number; bridge: number; combined: number; openEdges: number; stepBytes: number; valid: boolean },
): string {
  const captions = [
    ['01 / PROFILE ON FACE', 'The closed profile is drawn in the selected face frame.'],
    ['02 / BLIND PAD', 'A positive depth grows outward and fuses into one solid.'],
    ['03 / UP TO FACE', 'The second pad ends exactly on the tower top at z = 20.'],
  ][phase];
  const showBoss = phase >= 1;
  const showBridge = phase >= 2;
  const showTower = phase >= 2;
  const pA = top(5, 15);
  const pB = top(15, 15);
  const sidePlate = [side(0, 0), side(40, 0), side(40, 10), side(0, 10)];
  const sideTower = [side(30, 10), side(40, 10), side(40, 20), side(30, 20)];
  const sideBoss = [side(0, 10), side(10, 10), side(10, 15), side(0, 15)];
  const sideBridge = [side(10, 10), side(20, 10), side(20, 20), side(10, 20)];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#101a24"/><stop offset="1" stop-color="#1d2b38"/></linearGradient>
    <linearGradient id="steel" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#829bb0"/><stop offset="1" stop-color="#344a5c"/></linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#bg)"/>
  <rect x="40" y="34" width="8" height="34" rx="4" fill="#52e0c4"/>
  ${text(66, 58, 'KERNELCAD  /  SKETCH PAD', 16, '#9fb2c2', 700)}
  ${text(60, 116, 'Add a profile to a face, not a second loose body.', 32, '#f3f7fa', 700)}
  ${text(60, 151, captions[1], 18, '#aebdca', 500)}

  <rect x="60" y="180" width="500" height="410" rx="18" fill="#172531" stroke="#344655"/>
  ${text(86, 214, 'TOP VIEW  ·  FACE FRAME', 14, '#9fb2c2', 700)}
  <polygon points="${poly([top(0, 0), top(40, 0), top(40, 30), top(0, 30)])}" fill="#243744" stroke="#587084" stroke-width="1.5"/>
  ${showTower ? `<polygon points="${poly([top(30, 0), top(40, 0), top(40, 30), top(30, 30)])}" fill="#2e4658" stroke="#6b8398" stroke-width="1.5"/>` : ''}
  <rect x="${pA[0] - 50}" y="${pA[1] - 50}" width="100" height="100" fill="#52e0c4" opacity="${showBoss ? 0.35 : 0.12}" stroke="#52e0c4" stroke-width="2"/>
  <rect x="${pB[0] - 50}" y="${pB[1] - 50}" width="100" height="100" fill="#ffb85c" opacity="${showBridge ? 0.35 : 0.12}" stroke="#ffb85c" stroke-width="2"/>
  ${text(pA[0] - 18, pA[1] - 60, 'pad A', 14, '#52e0c4', 700)}
  ${text(pB[0] - 18, pB[1] - 60, 'pad B', 14, '#ffb85c', 700)}
  ${text(100, 566, '40 mm', 12, '#9fb2c2', 600)}
  ${text(456, 566, '30 mm', 12, '#9fb2c2', 600)}

  <rect x="580" y="180" width="640" height="410" rx="18" fill="#172531" stroke="#344655"/>
  ${text(606, 214, 'SIDE VIEW  ·  OUTWARD +Z', 14, '#9fb2c2', 700)}
  <polygon points="${poly(sidePlate)}" fill="url(#steel)" stroke="#b9cad6" stroke-width="1.5"/>
  ${showTower ? `<polygon points="${poly(sideTower)}" fill="#40592f" stroke="#a6f06b" stroke-width="1.5"/>` : ''}
  ${showBoss ? `<polygon points="${poly(sideBoss)}" fill="#2f6b62" stroke="#52e0c4" stroke-width="2"/>` : ''}
  ${showBridge ? `<polygon points="${poly(sideBridge)}" fill="#7a5a2d" stroke="#ffb85c" stroke-width="2"/>` : ''}
  <line x1="${side(0, 10)[0]}" y1="${side(0, 10)[1]}" x2="${side(40, 10)[0]}" y2="${side(40, 10)[1]}" stroke="#899aa8" stroke-width="1" stroke-dasharray="6 5"/>
  ${showTower ? `<line x1="${side(0, 20)[0]}" y1="${side(0, 20)[1]}" x2="${side(40, 20)[0]}" y2="${side(40, 20)[1]}" stroke="#ffb85c" stroke-width="1" stroke-dasharray="6 5"/>` : ''}
  ${showTower ? text(side(28, 20)[0], side(28, 20)[1] - 10, 'z = 20  target plane', 11, '#ffb85c', 700) : ''}
  ${text(624, 508, 'z = 10  entry face', 10, '#cfe0ea', 700)}
  ${text(side(5, 12.5)[0] - 18, side(5, 12.5)[1] + 4, showBoss ? '5 mm' : '', 12, '#52e0c4', 700)}
  ${text(side(15, 15)[0] - 20, side(15, 15)[1] + 4, showBridge ? '10 mm' : '', 12, '#ffb85c', 700)}

  <rect x="930" y="206" width="264" height="168" rx="12" fill="#1d303e" stroke="#344655"/>
  ${text(948, 232, 'MEASURED  ·  LOCAL OCCT', 11, '#9fb2c2', 700)}
  ${text(948, 266, phase === 0 ? '—' : `${(phase === 1 ? measured.blind : measured.combined).toFixed(2)} mm³`, 23, '#f3f7fa', 700)}
  ${text(948, 286, phase === 0 ? 'profiles declared' : phase === 1 ? 'blind pad volume (analytic 12500)' : 'combined volume (analytic 16500)', 10, '#9fb2c2', 500)}
  ${phase === 0 ? '' : text(948, 312, phase === 1 ? 'bbox 40 × 30 × 15' : 'bbox 40 × 30 × 20', 11, '#d8e1e8', 600)}
  ${phase === 2 ? text(948, 334, `BRepCheck ${measured.valid ? 'valid' : 'failed'}`, 11, '#d8e1e8', 600) : ''}
  ${phase === 2 ? text(948, 356, `mesh open edges ${measured.openEdges}`, 11, '#d8e1e8', 600) : ''}

  <rect x="60" y="620" width="1160" height="60" rx="14" fill="#223442" stroke="#344655"/>
  ${text(86, 656, captions[0], 17, '#52e0c4', 700)}
  ${text(406, 656, captions[1], 16, '#d8e1e8', 500)}
  ${text(60, 704, 'LOCAL OCCT MODEL RESULT  ·  NOT A DEPLOYMENT OR HARDWARE ACCEPTANCE CLAIM', 12, '#899aa8', 700)}
  ${text(1140, 704, `0${phase + 1} / 03`, 12, '#899aa8', 700)}
  </svg>`;
}

async function buildOne(script: string, fileName: string, analytic: number) {
  const model = await buildModel({ code: script, fileName });
  const errors = model.diagnostics.filter((d) => d.severity === 'error');
  if (errors.length > 0) throw new Error(`${fileName} failed: ${JSON.stringify(errors)}`);
  const shape = model.rootShape as OcctBackend;
  if (!(shape instanceof OcctBackend)) throw new Error(`${fileName} did not produce an OcctBackend root shape`);
  const volume = shape.volume();
  if (Math.abs(volume - analytic) > 1e-3) {
    throw new Error(`${fileName}: volume ${volume} differs from analytic ${analytic}`);
  }
  const raw = (shape.getReplicadShape() as unknown as { wrapped: unknown }).wrapped;
  if (!isValidShape(getOC(), raw)) throw new Error(`${fileName} failed solid-level BRepCheck`);
  if (shape.solidComponents().length !== 1) throw new Error(`${fileName} is not one solid`);
  const size = shape.boundingBox();
  return {
    shape,
    volume,
    bboxMm: [size.max[0] - size.min[0], size.max[1] - size.min[1], size.max[2] - size.min[2]] as [number, number, number],
  };
}

export async function capturePadDemo() {
  await mkdir(frameDir, { recursive: true });
  await initOcct();
  const blind = await buildOne(BLIND_SCRIPT, 'blind-boss.kcad.ts', ANALYTIC_BLIND);
  const bridge = await buildOne(BRIDGE_SCRIPT, 'up-to-face-bridge.kcad.ts', ANALYTIC_BRIDGE);
  const combined = await buildOne(
    await readFile(resolve(outputDir, 'boss-and-bridge.kcad.ts'), 'utf8'),
    'boss-and-bridge.kcad.ts',
    ANALYTIC_COMBINED,
  );
  const { report } = await combined.shape.exportSTLWithReportAsync();
  const step = await combined.shape.exportSTEPAsync();
  if (!report.ok || report.openEdgeCount !== 0) {
    throw new Error(`combined mesh is not watertight: ${JSON.stringify(report)}`);
  }
  if (step.byteLength === 0) throw new Error('STEP export returned no bytes');
  const bboxOk = combined.bboxMm.every((value, i) => Math.abs(value - [40, 30, 20][i]) < 1e-3);

  const verification = {
    recordedDate: '2026-11-26',
    kernel: 'Local OCCT model geometry',
    scripts: ['blind-boss.kcad.ts', 'up-to-face-bridge.kcad.ts', 'boss-and-bridge.kcad.ts'],
    api: 'Shape.pad(profile, { face, depth | upToFace })',
    cases: {
      blind: { analyticVolumeMm3: ANALYTIC_BLIND, volumeMm3: blind.volume, bboxMm: blind.bboxMm },
      upToFace: { analyticVolumeMm3: ANALYTIC_BRIDGE, volumeMm3: bridge.volume, bboxMm: bridge.bboxMm },
      combined: { analyticVolumeMm3: ANALYTIC_COMBINED, volumeMm3: combined.volume, bboxMm: combined.bboxMm },
    },
    result: {
      solidComponents: 1,
      brepCheckValid: true,
      meshOpenEdgeCount: report.openEdgeCount,
      stepBytes: step.byteLength,
    },
    checks: {
      volumeExactBlind: Math.abs(blind.volume - ANALYTIC_BLIND) < 1e-3,
      volumeExactUpToFace: Math.abs(bridge.volume - ANALYTIC_BRIDGE) < 1e-3,
      volumeExactCombined: Math.abs(combined.volume - ANALYTIC_COMBINED) < 1e-3,
      bboxExact: bboxOk,
      brepCheckValid: true,
      oneSolid: true,
      watertightMesh: report.openEdgeCount === 0,
      stepExportOk: step.byteLength > 0,
    },
    scope: 'Local model validation only; not a deployed-behavior or hardware-acceptance claim.',
  };
  for (const [name, ok] of Object.entries(verification.checks)) {
    if (!ok) throw new Error(`${name} failed`);
  }
  await writeFile(resolve(outputDir, 'verification.json'), `${JSON.stringify(verification, null, 2)}\n`);
  for (const phase of [0, 1, 2] as const) {
    const png = await sharp(Buffer.from(frame(phase, {
      blind: blind.volume,
      bridge: bridge.volume,
      combined: combined.volume,
      openEdges: report.openEdgeCount,
      stepBytes: step.byteLength,
      valid: true,
    }))).png().toBuffer();
    await writeFile(resolve(frameDir, `frame-0${phase + 1}.png`), png);
  }
  blind.shape.dispose?.();
  bridge.shape.dispose?.();
  combined.shape.dispose?.();
  return verification;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  capturePadDemo().then(
    (verification) => console.log(JSON.stringify(verification, null, 2)),
    (error) => {
      console.error(error);
      process.exitCode = 1;
    },
  );
}
