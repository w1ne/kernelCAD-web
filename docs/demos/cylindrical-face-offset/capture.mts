// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Rebuild the cylindrical face offset evidence from the real lowered model:
// verification.json and three 1280x720 frames. Run from the repository root:
//   npx tsx docs/demos/cylindrical-face-offset/capture.mts
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { getOC } from 'replicad';
import { initOcct, type OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { isValidShape } from '../../../src/kernel/backends/occt/booleanRecovery';
import { buildModel } from '../../../src/modeling/buildModel';

const outputDir = resolve('docs/demos/cylindrical-face-offset');
const frameDir = resolve(outputDir, 'frames');
const fixturePath = resolve(outputDir, 'cylindrical-face-offset.kcad.ts');

const BASE_BORE = `
  let body = box(40, 40, 10);
  body = body.subtract(cylinder(10, 5).translate(20, 20, 0));
  return body;
`;

function wrapped(shape: OcctBackend): unknown {
  return (shape.getReplicadShape() as unknown as { wrapped: unknown }).wrapped;
}

function boreRadii(shape: OcctBackend): number[] {
  return shape
    .getReplicadShape()
    .faces.filter((face) => face.geomType === 'CYLINDRE')
    .map((face) => {
      const point = face.pointOnSurface(0.5, 0.5);
      const centre = face.center;
      return Math.hypot(point.x - centre.x, point.y - centre.y, point.z - centre.z);
    });
}

async function measure(code: string) {
  const model = await buildModel({ code, fileName: 'cylindrical-face-offset.kcad.ts' });
  const errors = model.diagnostics.filter((d) => d.severity === 'error');
  if (errors.length > 0) throw new Error(errors.map((d) => d.message).join('\n'));
  const shape = model.rootShape as OcctBackend;
  const result = {
    volumeMm3: shape.volume(),
    radiiMm: boreRadii(shape),
    solidComponents: shape.solidComponents().length,
    valid: isValidShape(getOC(), wrapped(shape)),
  };
  shape.dispose?.();
  return result;
}

export async function captureCylindricalFaceOffsetDemo() {
  await mkdir(frameDir, { recursive: true });
  await initOcct();

  const fixture = await readFile(fixturePath, 'utf8');
  const before = await measure(BASE_BORE);
  const after = await measure(fixture);
  const bossBefore = await measure('return cylinder(20, 10);');
  const bossAfter = await measure(`return cylinder(20, 10).offsetFaces({ ofSurfaceType: 'CYLINDER' }, 1);`);

  const expectedBoreDelta = Math.PI * (25 - 16) * 10;
  const measuredBoreDelta = after.volumeMm3 - before.volumeMm3;
  const checks = {
    boreRadiusBeforeMm: Number(before.radiiMm[0]!.toFixed(4)),
    boreRadiusAfterMm: Number(after.radiiMm[0]!.toFixed(4)),
    boreNarrowedByOneMm: Math.abs(before.radiiMm[0]! - 5) < 1e-6 && Math.abs(after.radiiMm[0]! - 4) < 1e-6,
    measuredBoreVolumeDeltaMm3: Number(measuredBoreDelta.toFixed(4)),
    exactAnnularVolumeDeltaMm3: Number(expectedBoreDelta.toFixed(4)),
    boreVolumeDeltaMatchesAnnulus: Math.abs(measuredBoreDelta - expectedBoreDelta) < 1e-3,
    boreSolidValid: before.valid && after.valid,
    boreSolidComponents: after.solidComponents,
    bossRadiusBeforeMm: Number(bossBefore.radiiMm[0]!.toFixed(4)),
    bossRadiusAfterMm: Number(bossAfter.radiiMm[0]!.toFixed(4)),
    bossGrewByOneMm: Math.abs(bossBefore.radiiMm[0]! - 10) < 1e-6 && Math.abs(bossAfter.radiiMm[0]! - 11) < 1e-6,
    bossVolumeMm3: Number(bossAfter.volumeMm3.toFixed(4)),
    bossVolumeMatchesCylinder: Math.abs(bossAfter.volumeMm3 - Math.PI * 121 * 20) < 1e-2,
  };
  for (const [name, ok] of Object.entries(checks)) {
    if (typeof ok === 'boolean' && !ok) throw new Error(`${name} failed`);
  }

  const verification = {
    recordedDate: '2026-11-24',
    kernel: 'Local OCCT model geometry',
    fixture: 'cylindrical-face-offset.kcad.ts',
    input: {
      plateMm: [40, 40, 10],
      boreDiameterMm: 10,
      boreGrowMm: 1,
      bossMm: [20, 20],
    },
    before: {
      boreVolumeMm3: Number(before.volumeMm3.toFixed(4)),
      boreRadiusMm: Number(before.radiiMm[0]!.toFixed(4)),
      boreSolidComponents: before.solidComponents,
      boreValid: before.valid,
    },
    after: {
      boreVolumeMm3: Number(after.volumeMm3.toFixed(4)),
      boreRadiusMm: Number(after.radiiMm[0]!.toFixed(4)),
      boreSolidComponents: after.solidComponents,
      boreValid: after.valid,
    },
    boss: {
      beforeVolumeMm3: Number(bossBefore.volumeMm3.toFixed(4)),
      beforeRadiusMm: Number(bossBefore.radiiMm[0]!.toFixed(4)),
      afterVolumeMm3: Number(bossAfter.volumeMm3.toFixed(4)),
      afterRadiusMm: Number(bossAfter.radiiMm[0]!.toFixed(4)),
    },
    checks,
    scope: 'Local model validation only; not a deployed-behavior or hardware-acceptance claim.',
  };
  await writeFile(resolve(outputDir, 'verification.json'), `${JSON.stringify(verification, null, 2)}\n`);

  const W = 1280;
  const H = 720;
  const text = (x: number, y: number, value: string, size = 20, fill = '#d8e1e8', weight = 500) =>
    `<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" font-weight="${weight}" font-family="Inter, Arial, sans-serif">${value}</text>`;
  const arrow = (x1: number, y1: number, x2: number, y2: number, colour: string) =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${colour}" stroke-width="4" marker-end="url(#head)"/>`;

  function topView(radius: number, showOld: boolean): string {
    const cx = 390;
    const cy = 365;
    const scale = 6.5;
    return `
      <rect x="${cx - 20 * scale}" y="${cy - 20 * scale}" width="${40 * scale}" height="${40 * scale}" rx="4" fill="#233646" stroke="#4e6679" stroke-width="2"/>
      ${showOld ? `<circle cx="${cx}" cy="${cy}" r="${5 * scale}" fill="none" stroke="#ffb85c" stroke-width="3" stroke-dasharray="9 7"/>` : ''}
      <circle cx="${cx}" cy="${cy}" r="${radius * scale}" fill="#111b26" stroke="#52e0c4" stroke-width="4"/>
      <line x1="${cx - 5 * scale}" y1="${cy}" x2="${cx + 5 * scale}" y2="${cy}" stroke="#9fb2c2" stroke-width="1" stroke-dasharray="4 4"/>
      <line x1="${cx}" y1="${cy - 5 * scale}" x2="${cx}" y2="${cy + 5 * scale}" stroke="#9fb2c2" stroke-width="1" stroke-dasharray="4 4"/>
    `;
  }

  function bossView(): string {
    const cx = 330;
    const baseY = 470;
    const topY = 250;
    const rOld = 10 * 8;
    const rNew = 11 * 8;
    return `
      <rect x="${cx - 160}" y="${baseY}" width="320" height="22" rx="4" fill="#233646" stroke="#4e6679" stroke-width="2"/>
      <rect x="${cx - rNew}" y="${topY}" width="${2 * rNew}" height="${baseY - topY}" fill="#1b2c3a" stroke="#52e0c4" stroke-width="3"/>
      <line x1="${cx - rOld}" y1="${topY}" x2="${cx - rOld}" y2="${baseY}" stroke="#ffb85c" stroke-width="2" stroke-dasharray="8 6"/>
      <line x1="${cx + rOld}" y1="${topY}" x2="${cx + rOld}" y2="${baseY}" stroke="#ffb85c" stroke-width="2" stroke-dasharray="8 6"/>
      ${arrow(cx - rOld, 300, cx - rNew, 300, '#52e0c4')}
      ${arrow(cx + rOld, 300, cx + rNew, 300, '#52e0c4')}
    `;
  }

  function frame(phase: 0 | 1 | 2): string {
    const copy = [
      ['01 / BEFORE', `A Ø10 through bore in a 40 × 40 × 10 plate: ${before.volumeMm3.toFixed(1)} mm³.`],
      ['02 / OFFSET +1 MM', `The bore wall moved along its normal: Ø8, ${measuredBoreDelta.toFixed(1)} mm³ more material.`],
      ['03 / THE SAME CALL ON A BOSS', 'A positive distance grows the solid, so a Ø20 boss becomes Ø22.'],
    ][phase];
    const illustration = phase === 2 ? bossView() : topView(phase === 0 ? 5 : 4, phase === 1);
    const measurement = phase === 0
      ? `${text(760, 250, 'BORE', 16, '#9fb2c2', 700)}
         ${text(760, 292, 'Ø10', 40, '#ffca82', 700)}
         ${text(760, 336, 'radius 5.000 mm', 18, '#aebdca', 500)}
         ${text(760, 398, 'VOLUME', 16, '#9fb2c2', 700)}
         ${text(760, 436, `${before.volumeMm3.toFixed(1)} mm³`, 26, '#f3f7fa', 700)}
         ${text(760, 468, 'one valid solid', 17, '#aebdca', 500)}`
      : phase === 1
        ? `${text(760, 250, 'BORE', 16, '#9fb2c2', 700)}
         ${text(760, 292, 'Ø8', 40, '#52e0c4', 700)}
         ${text(760, 336, 'radius 4.000 mm', 18, '#aebdca', 500)}
         ${text(760, 398, 'VOLUME CHANGE', 16, '#9fb2c2', 700)}
         ${text(760, 436, `+${measuredBoreDelta.toFixed(1)} mm³`, 26, '#52e0c4', 700)}
         ${text(760, 468, `= π(5² − 4²) × 10`, 17, '#aebdca', 500)}
         ${text(760, 500, `${after.volumeMm3.toFixed(1)} mm³ total`, 17, '#aebdca', 500)}`
        : `${text(760, 250, 'BOSS', 16, '#9fb2c2', 700)}
         ${text(760, 292, 'Ø20 → Ø22', 34, '#52e0c4', 700)}
         ${text(760, 336, 'radius 10.000 → 11.000 mm', 18, '#aebdca', 500)}
         ${text(760, 398, 'VOLUME', 16, '#9fb2c2', 700)}
         ${text(760, 436, `${bossAfter.volumeMm3.toFixed(1)} mm³`, 26, '#f3f7fa', 700)}
         ${text(760, 468, `= π × 11² × 20`, 17, '#aebdca', 500)}`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#111b26"/><stop offset="1" stop-color="#1d2b38"/></linearGradient>
        <marker id="head" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto"><path d="M0,0 L12,6 L0,12 Z" fill="#52e0c4"/></marker>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#bg)"/>
      <rect x="40" y="34" width="8" height="34" rx="4" fill="#52e0c4"/>
      ${text(66, 58, 'KERNELCAD  /  CYLINDRICAL FACE OFFSET', 16, '#9fb2c2', 700)}
      ${text(60, 116, 'Change a bore or boss diameter.', 34, '#f3f7fa', 700)}
      ${text(60, 151, 'offsetFaces() moves a full cylindrical wall along its normal.', 18, '#aebdca', 500)}
      <rect x="60" y="184" width="640" height="330" rx="18" fill="#172531" stroke="#344655"/>
      ${text(86, 218, phase === 2 ? 'SIDE VIEW  ·  boss radius' : 'TOP VIEW  ·  plate 40 × 40 mm', 14, '#9fb2c2', 700)}
      ${illustration}
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
  captureCylindricalFaceOffsetDemo()
    .then(({ verification }) => console.log(JSON.stringify(verification, null, 2)))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
