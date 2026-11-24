// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../src/modeling/api';

const outputDir = resolve('docs/demos/surface-offset');
const frameDir = resolve(outputDir, 'frames');

const controls = [
  [[0, 0, 0], [0, 20, 3], [0, 40, 0]],
  [[15, 0, 3], [15, 20, 6], [15, 40, 3]],
  [[30, 0, 0], [30, 20, 3], [30, 40, 0]],
] as [number, number, number][][];

export async function captureSurfaceOffsetDemo() {
  await mkdir(frameDir, { recursive: true });
  await initOcct();

  const session = new CaptureSession();
  const api = createModelingApi({ session });
  const panel = api.nurbsSurface({ controls, degree: { u: 2, v: 2 } });
  const offset = panel.offset(4);
  const offsetShape = offset.toShape();
  const core = offset.thicken(3);

  const baseBackend = await panel.toShape().lower();
  const offsetBackend = await offsetShape.lower();
  const solidBackend = await core.lower();
  const baseBox = baseBackend.boundingBox();
  const offsetBox = offsetBackend.boundingBox();
  const solidBox = solidBackend.boundingBox();
  const peakDeltaMm = offsetBox.max[2] - baseBox.max[2];
  const baseAreaMm2 = baseBackend.surfaceArea();
  const offsetAreaMm2 = offsetBackend.surfaceArea();
  const coreVolumeMm3 = solidBackend.volume();
  const coreThicknessMm = solidBox.max[2] - offsetBox.max[2];

  const basePeakMm = baseBox.max[2];
  const checks = {
    offsetPeakRisesByRequestedFourMm: Math.abs(peakDeltaMm - 4) < 0.2,
    offsetSurfaceAreaMeasuredMm2: Number(offsetAreaMm2.toFixed(3)),
    offsetSurfaceHasNoSolidComponent: offsetBackend.solidComponents().length === 0,
    coreSolidVolumePositive: coreVolumeMm3 > 0,
    coreThicknessMm: Number(coreThicknessMm.toFixed(3)),
  };
  if (!checks.offsetPeakRisesByRequestedFourMm) {
    throw new Error(`Offset peak moved ${peakDeltaMm.toFixed(3)} mm, expected 4 ± 0.2 mm.`);
  }
  if (!checks.offsetSurfaceHasNoSolidComponent) throw new Error('Offset surface unexpectedly contains a solid.');
  if (!checks.coreSolidVolumePositive) throw new Error('Thickened offset has no volume.');

  const verification = {
    recordedDate: '2026-11-24',
    kernel: 'Local OCCT model geometry',
    input: {
      surface: `nurbsSurface degree 2 x 2, 30 x 40 mm panel, measured peak z = ${basePeakMm.toFixed(3)} mm`,
      controls,
      offsetDistanceMm: 4,
      thickenMm: 3,
    },
    result: {
      baseBoundsMm: [baseBox.min, baseBox.max],
      offsetBoundsMm: [offsetBox.min, offsetBox.max],
      solidBoundsMm: [solidBox.min, solidBox.max],
      offsetPeakDeltaMm: Number(peakDeltaMm.toFixed(4)),
      baseAreaMm2: Number(baseAreaMm2.toFixed(3)),
      offsetAreaMm2: Number(offsetAreaMm2.toFixed(3)),
      coreVolumeMm3: Number(coreVolumeMm3.toFixed(3)),
      coreThicknessMm: Number(coreThicknessMm.toFixed(3)),
    },
    checks,
    scope: 'Local model validation only; not a deployed-behavior or hardware-acceptance claim.',
  };
  await writeFile(resolve(outputDir, 'verification.json'), `${JSON.stringify(verification, null, 2)}\n`);

  const W = 1280;
  const H = 720;
  const text = (x: number, y: number, value: string, size = 20, fill = '#d8e1e8', weight = 500) =>
    `<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" font-weight="${weight}" font-family="Inter, Arial, sans-serif">${value}</text>`;
  const line = (x1: number, y1: number, x2: number, y2: number, stroke: string, width = 3, dash = '', extra = '') =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${width}" ${dash ? `stroke-dasharray="${dash}"` : ''} ${extra} />`;
  const curvePoints = (zOffset: number): Array<[number, number]> => {
    const pts: Array<[number, number]> = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const x = 150 + t * 700;
      const z = basePeakMm * Math.sin(Math.PI * t);
      const y = 500 - (z + zOffset) * 26;
      pts.push([x, y]);
    }
    return pts;
  };
  const curve = (zOffset: number, stroke: string) => {
    const pts = curvePoints(zOffset);
    const d = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
    return `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="5" stroke-linecap="round" />`;
  };
  const band = (z0: number, z1: number) => {
    const lower = curvePoints(z0);
    const upper = curvePoints(z1).reverse();
    const d = [...lower, ...upper]
      .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`)
      .join(' ');
    return `<path d="${d} Z" fill="#52e0c4" fill-opacity="0.16" stroke="#52e0c4" stroke-opacity="0.35" stroke-width="1" />`;
  };

  function frame(phase: 0 | 1 | 2): string {
    const copy = [
      ['01 / BASE SURFACE', `A degree-2 NURBS panel with a measured ${basePeakMm.toFixed(2)} mm peak.`],
      ['02 / OFFSET 4 MM', 'Surface.offset(4) gives a parallel surface 4 mm above it.'],
      ['03 / THICKEN 3 MM', 'The offset feeds a valid 3 mm core skin solid.'],
    ][phase];
    const offsetCurve = phase >= 1 ? curve(4, '#52e0c4') : '';
    const solidBand = phase >= 2 ? band(4, 7) : '';
    const measurement = phase === 0
      ? `${text(944, 300, 'base surface', 18, '#ffca82', 700)}
         ${text(944, 330, `peak ${basePeakMm.toFixed(2)} mm`, 16, '#aebdca', 500)}
         ${text(944, 386, 'area', 18, '#f3f7fa', 700)}
         ${text(944, 416, `${baseAreaMm2.toFixed(1)} mm²`, 16, '#aebdca', 500)}`
      : `${text(944, 300, 'offset', 18, '#52e0c4', 700)}
         ${text(944, 330, `+${peakDeltaMm.toFixed(2)} mm at peak`, 16, '#aebdca', 500)}
         ${text(944, 386, 'area', 18, '#f3f7fa', 700)}
         ${text(944, 416, `${offsetAreaMm2.toFixed(1)} mm²`, 16, '#aebdca', 500)}`;
    const solidMeasurement = phase >= 2
      ? `${text(944, 472, 'thickened core', 18, '#f3f7fa', 700)}
         ${text(944, 502, `${coreVolumeMm3.toFixed(0)} mm³`, 16, '#aebdca', 500)}
         ${text(944, 532, `wall ${coreThicknessMm.toFixed(2)} mm`, 16, '#aebdca', 500)}`
      : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#111b26"/><stop offset="1" stop-color="#1d2b38"/></linearGradient>
        <marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto"><path d="M0,0 L12,6 L0,12 Z" fill="#ffb85c"/></marker>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#bg)"/>
      <rect x="40" y="34" width="8" height="34" rx="4" fill="#52e0c4"/>
      ${text(66, 58, 'KERNELCAD  /  STANDALONE SURFACE OFFSET', 16, '#9fb2c2', 700)}
      ${text(60, 116, 'Offset a surface. Keep it usable.', 34, '#f3f7fa', 700)}
      ${text(60, 151, 'No solid boolean and no second surface authored by hand.', 18, '#aebdca', 500)}
      <rect x="60" y="184" width="820" height="330" rx="18" fill="#172531" stroke="#344655"/>
      ${text(86, 218, 'SIDE VIEW  ·  surface offset along the normal', 14, '#9fb2c2', 700)}
      ${solidBand}
      ${curve(0, '#ffb85c')}
      ${offsetCurve}
      ${line(850, 500, 850, 500 - 4 * 26, '#ffb85c', 2, '7 6')}
      ${phase >= 1 ? `<line x1="866" y1="500" x2="866" y2="${500 - 4 * 26}" stroke="#ffb85c" stroke-width="3" marker-end="url(#arrow)"/>` : ''}
      ${text(88, 482, `base surface  ·  measured peak ${basePeakMm.toFixed(2)} mm`, 15, '#ffca82', 600)}
      ${phase >= 1 ? text(88, 456, 'offset surface  ·  +4 mm', 15, '#52e0c4', 600) : ''}
      <rect x="900" y="184" width="320" height="330" rx="18" fill="#172531" stroke="#344655"/>
      ${text(926, 218, 'MEASURED', 14, '#9fb2c2', 700)}
      ${measurement}
      ${solidMeasurement}
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
  captureSurfaceOffsetDemo()
    .then(({ verification }) => console.log(JSON.stringify(verification, null, 2)))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
