// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Rebuild the named parting-plane draft evidence from the real lowered model:
// verification.json and three 1280x720 frames. Run from the repository root:
//   npx tsx docs/demos/draft-neutral-plane/capture.mts
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { getOC } from 'replicad';
import { initOcct, type OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { isValidShape } from '../../../src/kernel/backends/occt/booleanRecovery';
import { buildModel } from '../../../src/modeling/buildModel';

const outputDir = resolve('docs/demos/draft-neutral-plane');
const frameDir = resolve(outputDir, 'frames');
const fixturePath = resolve(outputDir, 'draft-neutral-plane.kcad.ts');

const BOX = 'box(40, 30, 20)';
const DERIVED = `return ${BOX}.draft(10, { face: 'front' });`;
const TAPER_DEG = 10;
const TOP_EDGE_SWING_MM = 20 * Math.tan((TAPER_DEG * Math.PI) / 180);

function wrapped(shape: OcctBackend): unknown {
  return (shape.getReplicadShape() as unknown as { wrapped: unknown }).wrapped;
}

async function measure(code: string) {
  const model = await buildModel({ code, fileName: 'draft-neutral-plane.kcad.ts' });
  const errors = model.diagnostics.filter((d) => d.severity === 'error');
  if (errors.length > 0) throw new Error(errors.map((d) => d.message).join('\n'));
  const shape = model.rootShape as OcctBackend;
  const box = shape.boundingBox();
  const result = {
    volumeMm3: shape.volume(),
    yMinMm: box.min[1]!,
    yMaxMm: box.max[1]!,
    zMinMm: box.min[2]!,
    zMaxMm: box.max[2]!,
    solidComponents: shape.solidComponents().length,
    valid: isValidShape(getOC(), wrapped(shape)),
  };
  shape.dispose?.();
  return result;
}

export async function captureDraftNeutralPlaneDemo() {
  await mkdir(frameDir, { recursive: true });
  await initOcct();

  const fixture = await readFile(fixturePath, 'utf8');
  const before = await measure(`return ${BOX};`);
  const after = await measure(fixture);
  const derived = await measure(DERIVED);

  const exactWedge = 40 * 0.5 * 20 * TOP_EDGE_SWING_MM;
  const namedDelta = after.volumeMm3 - before.volumeMm3;
  const derivedDelta = derived.volumeMm3 - before.volumeMm3;
  const checks = {
    beforeVolumeMm3: Number(before.volumeMm3.toFixed(4)),
    namedTopVolumeMm3: Number(after.volumeMm3.toFixed(4)),
    namedTopDeltaMm3: Number(namedDelta.toFixed(4)),
    exactWedgeMm3: Number(exactWedge.toFixed(4)),
    namedTopDeltaMatchesWedge: Math.abs(namedDelta - exactWedge) < 1e-3,
    derivedVolumeMm3: Number(derived.volumeMm3.toFixed(4)),
    derivedDeltaMm3: Number(derivedDelta.toFixed(4)),
    derivedDeltaIsOpposite: Math.abs(derivedDelta + exactWedge) < 1e-3,
    topEdgeStaysFixed: Math.abs(after.yMinMm + TOP_EDGE_SWING_MM) < 1e-4,
    derivedEdgeMovesInside: Math.abs(derived.yMinMm) < 1e-6,
    namedTopSolidValid: after.valid && after.solidComponents === 1,
    derivedSolidValid: derived.valid && derived.solidComponents === 1,
  };
  for (const [name, ok] of Object.entries(checks)) {
    if (typeof ok === 'boolean' && !ok) throw new Error(`${name} failed`);
  }

  const verification = {
    recordedDate: '2026-11-25',
    kernel: 'Local OCCT model geometry',
    fixture: 'draft-neutral-plane.kcad.ts',
    input: {
      boxMm: [40, 30, 20],
      draftedFace: 'front',
      neutralPlane: 'top',
      angleDeg: TAPER_DEG,
    },
    before: {
      volumeMm3: Number(before.volumeMm3.toFixed(4)),
      bboxYMm: [Number(before.yMinMm.toFixed(4)), Number(before.yMaxMm.toFixed(4))],
    },
    afterNamedTop: {
      volumeMm3: Number(after.volumeMm3.toFixed(4)),
      bboxYMm: [Number(after.yMinMm.toFixed(4)), Number(after.yMaxMm.toFixed(4))],
      solidComponents: after.solidComponents,
      valid: after.valid,
    },
    afterDerivedPlane: {
      volumeMm3: Number(derived.volumeMm3.toFixed(4)),
      bboxYMm: [Number(derived.yMinMm.toFixed(4)), Number(derived.yMaxMm.toFixed(4))],
      solidComponents: derived.solidComponents,
      valid: derived.valid,
    },
    checks,
    scope: 'Local model validation only; not a deployed-behavior or hardware-acceptance claim.',
  };
  await writeFile(resolve(outputDir, 'verification.json'), `${JSON.stringify(verification, null, 2)}\n`);

  const W = 1280;
  const H = 720;
  const text = (x: number, y: number, value: string, size = 20, fill = '#d8e1e8', weight = 500) =>
    `<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" font-weight="${weight}" font-family="Inter, Arial, sans-serif">${value}</text>`;

  // Side view down -X. World y maps to screen x, world z to screen y (up).
  const X0 = 170;
  const Y0 = 500;
  const SCALE = 13;
  const sx = (y: number) => X0 + y * SCALE;
  const sy = (z: number) => Y0 - z * SCALE;
  const outline = (points: Array<[number, number]>, fill: string, stroke: string, dashed = false, opacity = 1) =>
    `<polygon points="${points.map(([y, z]) => `${sx(y)},${sy(z)}`).join(' ')}" fill="${fill}" fill-opacity="${opacity}" stroke="${stroke}" stroke-width="3"${dashed ? ' stroke-dasharray="10 7"' : ''}/>`;

  const DRAFTED: Array<[number, number]> = [
    [-TOP_EDGE_SWING_MM, 0],
    [0, 20],
    [30, 20],
    [30, 0],
  ];
  const DERIVED_SHAPE: Array<[number, number]> = [
    [0, 0],
    [TOP_EDGE_SWING_MM, 20],
    [30, 20],
    [30, 0],
  ];

  function view(phase: 0 | 1 | 2): string {
    if (phase === 2) {
      return `${outline(DRAFTED, '#1b2c3a', '#52e0c4', false, 0.55)}
        ${outline(DERIVED_SHAPE, 'none', '#ffb85c', true)}`;
    }
    const shape = phase === 0 ? [[0, 0], [0, 20], [30, 20], [30, 0]] as Array<[number, number]> : DRAFTED;
    const front = phase === 0
      ? `<line x1="${sx(0)}" y1="${sy(0)}" x2="${sx(0)}" y2="${sy(20)}" stroke="#ffb85c" stroke-width="4"/>`
      : `<line x1="${sx(-TOP_EDGE_SWING_MM)}" y1="${sy(0)}" x2="${sx(0)}" y2="${sy(20)}" stroke="#52e0c4" stroke-width="4"/>`;
    const bottomLabel = phase === 1
      ? `<circle cx="${sx(-TOP_EDGE_SWING_MM)}" cy="${sy(0)}" r="6" fill="#52e0c4"/>
        <line x1="${sx(-TOP_EDGE_SWING_MM)}" y1="${sy(0)}" x2="${sx(6.2)}" y2="${sy(3.2)}" stroke="#52e0c4" stroke-width="2"/>
        ${text(sx(6.8), sy(3.4), 'bottom edge  y = -3.527', 14, '#52e0c4', 500)}`
      : '';
    return `${outline(shape, '#1b2c3a', '#4e6679')}
      ${front}
      <circle cx="${sx(0)}" cy="${sy(20)}" r="6" fill="#f3f7fa"/>
      ${text(sx(1.2), sy(18.9), 'top edge fixed  y = 0, z = 20', 14, '#c7d3dd', 500)}
      ${bottomLabel}`;
  }

  function frame(phase: 0 | 1 | 2): string {
    const copy = [
      ['01 / BEFORE', 'A 40 × 30 × 20 box. The front face is vertical: 24000.0 mm³.'],
      ['02 / DRAFT ABOUT THE NAMED TOP PLANE', 'The top edge stays at y = 0; the bottom edge swings out 3.527 mm.'],
      ['03 / THE PARTING PLANE CHANGES THE RESULT', 'Green = named top plane (+1410.6 mm³); amber dashed = omitted neutralPlane, derived bottom plane (−1410.6 mm³).'],
    ][phase];
    const measurement = phase === 0
      ? `${text(760, 250, 'FRONT FACE', 16, '#9fb2c2', 700)}
         ${text(760, 292, 'vertical', 34, '#ffca82', 700)}
         ${text(760, 336, 'height 20.000 mm', 18, '#aebdca', 500)}
         ${text(760, 398, 'VOLUME', 16, '#9fb2c2', 700)}
         ${text(760, 436, `${before.volumeMm3.toFixed(1)} mm³`, 26, '#f3f7fa', 700)}
         ${text(760, 468, 'one valid solid', 17, '#aebdca', 500)}`
      : phase === 1
        ? `${text(760, 250, 'VOLUME', 16, '#9fb2c2', 700)}
         ${text(760, 292, `${after.volumeMm3.toFixed(1)} mm³`, 30, '#52e0c4', 700)}
         ${text(760, 336, `+${namedDelta.toFixed(1)} mm³`, 18, '#aebdca', 500)}
         ${text(760, 380, '= 40 × ½ × 20 × 20·tan 10°', 16, '#aebdca', 500)}
         ${text(760, 430, 'BOTTOM EDGE', 16, '#9fb2c2', 700)}
         ${text(760, 468, `y = ${after.yMinMm.toFixed(3)} mm`, 24, '#f3f7fa', 700)}
         ${text(760, 500, 'top edge y = 0.000 mm', 16, '#52e0c4', 500)}`
        : `${text(760, 248, 'NAMED TOP PLANE', 15, '#9fb2c2', 700)}
         ${text(760, 282, `+${namedDelta.toFixed(1)} mm³`, 24, '#52e0c4', 700)}
         ${text(760, 306, `${after.volumeMm3.toFixed(1)} mm³`, 15, '#aebdca', 500)}
         ${text(760, 356, 'DERIVED PLANE', 15, '#9fb2c2', 700)}
         ${text(760, 390, `${derivedDelta.toFixed(1)} mm³`, 24, '#ffb85c', 700)}
         ${text(760, 414, `${derived.volumeMm3.toFixed(1)} mm³`, 15, '#aebdca', 500)}
         ${text(760, 462, 'the same 10° face,', 15, '#aebdca', 500)}
         ${text(760, 484, 'a different fixed edge', 15, '#aebdca', 500)}`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#111b26"/><stop offset="1" stop-color="#1d2b38"/></linearGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#bg)"/>
      <rect x="40" y="34" width="8" height="34" rx="4" fill="#52e0c4"/>
      ${text(66, 58, 'KERNELCAD  /  DRAFT ABOUT A NAMED NEUTRAL PLANE', 16, '#9fb2c2', 700)}
      ${text(60, 116, 'Name the parting line, get that parting line.', 34, '#f3f7fa', 700)}
      ${text(60, 151, 'draft() now honors a planar neutralPlane face instead of deriving one.', 18, '#aebdca', 500)}
      <rect x="60" y="184" width="640" height="330" rx="18" fill="#172531" stroke="#344655"/>
      ${text(86, 218, phase === 2 ? 'SIDE VIEW  ·  both results' : 'SIDE VIEW  ·  front face at y = 0', 14, '#9fb2c2', 700)}
      ${view(phase)}
      <rect x="730" y="184" width="490" height="330" rx="18" fill="#172531" stroke="#344655"/>
      ${text(756, 218, 'MEASURED', 14, '#9fb2c2', 700)}
      ${measurement}
      <rect x="60" y="546" width="1160" height="92" rx="16" fill="#223442" stroke="#344655"/>
      ${text(88, 582, copy[0], 17, '#52e0c4', 700)}
      ${text(88, 610, copy[1], 16, '#c7d3dd', 500)}
      ${text(1090, 610, 'local OCCT', 13, '#9fb2c2', 600)}
    </svg>`;
  }

  for (const phase of [0, 1, 2] as const) {
    const svg = frame(phase);
    await sharp(Buffer.from(svg)).png().toFile(resolve(frameDir, `frame-${String(phase + 1).padStart(2, '0')}.png`));
  }
  return { verification, frameDir };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  captureDraftNeutralPlaneDemo()
    .then(({ verification }) => console.log(JSON.stringify(verification, null, 2)))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
