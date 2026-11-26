// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Generated technical demo for `Sketch.revolve({ axis })`.
// Geometry and every number in the frames come from a local OCCT build of
// `stepped-shaft.kcad.ts`; this is not a browser or deployment recording.
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { getOC } from 'replicad';
import { initOcct, OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { isValidShape } from '../../../src/kernel/backends/occt/booleanRecovery';
import { buildModel } from '../../../src/modeling/buildModel';

const outputDir = resolve('docs/demos/revolve-axis');
const frameDir = resolve(outputDir, 'frames');

const LENGTH_MM = 100;
const FLANGE_RADIUS_MM = 30;
const MID_RADIUS_MM = 20;
const END_RADIUS_MM = 10;
const FLANGE_LENGTH_MM = 20;
const MID_LENGTH_MM = 40;
const END_LENGTH_MM = 40;
const ANALYTIC_VOLUME_MM3 =
  Math.PI *
  (FLANGE_RADIUS_MM ** 2 * FLANGE_LENGTH_MM +
    MID_RADIUS_MM ** 2 * MID_LENGTH_MM +
    END_RADIUS_MM ** 2 * END_LENGTH_MM);

export const SHAFT_SCRIPT = `// Stepped shaft revolved about the sketch X axis (through y = 0).
return path()
  .moveTo(0, 0)
  .lineTo(0, ${FLANGE_RADIUS_MM})
  .lineTo(${FLANGE_LENGTH_MM}, ${FLANGE_RADIUS_MM})
  .lineTo(${FLANGE_LENGTH_MM}, ${MID_RADIUS_MM})
  .lineTo(${FLANGE_LENGTH_MM + MID_LENGTH_MM}, ${MID_RADIUS_MM})
  .lineTo(${FLANGE_LENGTH_MM + MID_LENGTH_MM}, ${END_RADIUS_MM})
  .lineTo(${LENGTH_MM}, ${END_RADIUS_MM})
  .lineTo(${LENGTH_MM}, 0)
  .close()
  .revolve({ axis: { through: [0, 0], direction: [1, 0] } });
`;

const ORIGIN = { x: 110, y: 390 };
const SCALE = 5.4;

function map(x: number, y: number): [number, number] {
  return [ORIGIN.x + x * SCALE, ORIGIN.y - y * SCALE];
}

function points(list: Array<[number, number]>): string {
  return list.map(([x, y]) => map(x, y).join(',')).join(' ');
}

function text(x: number, y: number, value: string, size = 20, fill = '#d8e1e8', weight = 500): string {
  return `<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" font-weight="${weight}" font-family="Inter, Arial, sans-serif">${value}</text>`;
}

const PROFILE: Array<[number, number]> = [
  [0, 0],
  [0, FLANGE_RADIUS_MM],
  [FLANGE_LENGTH_MM, FLANGE_RADIUS_MM],
  [FLANGE_LENGTH_MM, MID_RADIUS_MM],
  [FLANGE_LENGTH_MM + MID_LENGTH_MM, MID_RADIUS_MM],
  [FLANGE_LENGTH_MM + MID_LENGTH_MM, END_RADIUS_MM],
  [LENGTH_MM, END_RADIUS_MM],
  [LENGTH_MM, 0],
];

const MIRRORED: Array<[number, number]> = PROFILE.map(([x, y]) => [x, -y]);

function frame(phase: 0 | 1 | 2, measured: { volume: number; openEdges: number }): string {
  const [ax0, ay0] = map(-5, 0);
  const [ax1, ay1] = map(105, 0);
  const phaseCopy = [
    ['01 / HALF-SECTION', 'The profile stays on one side of the line y = 0.'],
    ['02 / EXPLICIT AXIS', 'through [0, 0], direction [1, 0] turns the section about X.'],
    ['03 / ONE VALID SOLID', 'The default Z axis would build a different shape; this is a shaft along X.'],
  ][phase];
  const flange = map(FLANGE_LENGTH_MM / 2, FLANGE_RADIUS_MM);
  const mid = map(FLANGE_LENGTH_MM + MID_LENGTH_MM / 2, MID_RADIUS_MM);
  const end = map(FLANGE_LENGTH_MM + MID_LENGTH_MM + END_LENGTH_MM / 2, END_RADIUS_MM);
  const showResult = phase >= 1;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#101a24"/><stop offset="1" stop-color="#1d2b38"/></linearGradient>
      <linearGradient id="steel" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#7f98aa"/><stop offset="1" stop-color="#344a5c"/></linearGradient>
      <marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto"><path d="M0,0 L12,6 L0,12 Z" fill="#ffb85c"/></marker>
    </defs>
    <rect width="1280" height="720" fill="url(#bg)"/>
    <rect x="40" y="34" width="8" height="34" rx="4" fill="#52e0c4"/>
    ${text(66, 58, 'KERNELCAD  /  REVOLVE AXIS', 16, '#9fb2c2', 700)}
    ${text(60, 116, 'A half-section turned about an explicit in-plane line.', 32, '#f3f7fa', 700)}
    ${text(60, 151, phaseCopy[1], 18, '#aebdca', 500)}
    <rect x="60" y="184" width="760" height="410" rx="18" fill="#172531" stroke="#344655"/>
    ${text(86, 218, 'SKETCH XY  ·  PROFILE AND AXIS', 14, '#9fb2c2', 700)}
    ${showResult ? `<polygon points="${points(MIRRORED)}" fill="url(#steel)" opacity="0.72" stroke="#8aa2b4" stroke-width="1.5"/>` : ''}
    <polygon points="${points(PROFILE)}" fill="url(#steel)" opacity="0.92" stroke="#d4e0e8" stroke-width="2"/>
    <line x1="${ax0}" y1="${ay0}" x2="${ax1}" y2="${ay1}" stroke="#ffb85c" stroke-width="2.5" stroke-dasharray="10 7" marker-end="url(#arrow)"/>
    ${text(ax1 - 16, ay1 + 30, 'axis X', 15, '#ffb85c', 700)}
    ${text(ax0 + 4, ay0 + 30, '[0, 0]', 13, '#ffb85c', 600)}
    ${text(flange[0] - 26, flange[1] + 24, `R${FLANGE_RADIUS_MM}`, 15, '#d4e0e8', 700)}
    ${text(mid[0] - 22, mid[1] - 14, `R${MID_RADIUS_MM}`, 15, '#d4e0e8', 700)}
    ${text(end[0] - 20, end[1] - 14, `R${END_RADIUS_MM}`, 15, '#d4e0e8', 700)}
    ${text(108, ay0 + 46, '0', 13, '#9fb2c2', 600)}
    ${text(108 + LENGTH_MM * SCALE - 18, ay0 + 46, `${LENGTH_MM} mm`, 13, '#9fb2c2', 600)}
    ${showResult ? `<line x1="${map(0, 0)[0]}" y1="${map(0, 0)[1]}" x2="${map(0, 0)[0]}" y2="${map(0, -FLANGE_RADIUS_MM)[1]}" stroke="#52e0c4" stroke-width="1.4" stroke-dasharray="5 5"/>` : ''}
    <rect x="850" y="184" width="370" height="410" rx="18" fill="#172531" stroke="#344655"/>
    ${text(878, 218, 'MEASURED  ·  LOCAL OCCT', 14, '#9fb2c2', 700)}
    ${text(878, 266, `${ANALYTIC_VOLUME_MM3.toFixed(2)} mm³`, 28, '#f3f7fa', 700)}
    ${text(878, 291, 'analytic volume', 14, '#9fb2c2', 500)}
    ${text(878, 346, phase === 2 ? `${measured.volume.toFixed(2)} mm³` : '—', 28, phase === 2 ? '#a6f06b' : '#f3f7fa', 700)}
    ${text(878, 371, 'measured volume', 14, '#9fb2c2', 500)}
    ${text(878, 426, `bbox  ${LENGTH_MM} × ${2 * FLANGE_RADIUS_MM} × ${2 * FLANGE_RADIUS_MM} mm`, 15, '#d8e1e8', 500)}
    ${text(878, 454, `solid BRepCheck ${phase === 2 ? 'valid' : '—'}`, 15, '#d8e1e8', 500)}
    ${text(878, 482, `mesh open edges ${phase === 2 ? measured.openEdges : '—'}`, 15, '#d8e1e8', 500)}
    ${text(878, 510, `STEP export ${phase === 2 ? 'ok' : '—'}`, 15, '#d8e1e8', 500)}
    <rect x="60" y="620" width="1160" height="60" rx="14" fill="#223442" stroke="#344655"/>
    ${text(86, 656, phaseCopy[0], 17, '#52e0c4', 700)}
    ${text(406, 656, phaseCopy[1], 16, '#d8e1e8', 500)}
    ${text(60, 704, 'LOCAL OCCT MODEL RESULT  ·  NOT A DEPLOYMENT OR HARDWARE ACCEPTANCE CLAIM', 12, '#899aa8', 700)}
    ${text(1140, 704, `0${phase + 1} / 03`, 12, '#899aa8', 700)}
  </svg>`;
}

export async function captureRevolveAxisDemo() {
  await mkdir(frameDir, { recursive: true });
  await initOcct();

  const model = await buildModel({ code: SHAFT_SCRIPT, fileName: 'stepped-shaft.kcad.ts' });
  const errors = model.diagnostics.filter((d) => d.severity === 'error');
  if (errors.length > 0) throw new Error(`stepped shaft build failed: ${JSON.stringify(errors)}`);
  const shape = model.rootShape as OcctBackend;
  if (!(shape instanceof OcctBackend)) throw new Error('stepped shaft did not produce an OcctBackend root shape');
  try {
    const volume = shape.volume();
    if (Math.abs(volume - ANALYTIC_VOLUME_MM3) / ANALYTIC_VOLUME_MM3 > 0.005) {
      throw new Error(`volume ${volume} differs from analytic ${ANALYTIC_VOLUME_MM3}`);
    }
    if (!isValidShape(getOC(), (shape.getReplicadShape() as unknown as { wrapped: unknown }).wrapped)) {
      throw new Error('stepped shaft failed solid-level BRepCheck');
    }
    if (shape.solidComponents().length !== 1) throw new Error('stepped shaft is not one solid');
    const { report } = await shape.exportSTLWithReportAsync();
    if (!report.ok || report.openEdgeCount !== 0) throw new Error(`mesh not watertight: ${JSON.stringify(report)}`);
    const step = await shape.exportSTEPAsync();
    if (step.byteLength === 0) throw new Error('STEP export returned no bytes');
    const bb = shape.boundingBox();
    const size: [number, number, number] = [
      bb.max[0] - bb.min[0],
      bb.max[1] - bb.min[1],
      bb.max[2] - bb.min[2],
    ];

    const verification = {
      recordedDate: '2026-11-26',
      kernel: 'Local OCCT model geometry',
      script: 'stepped-shaft.kcad.ts',
      input: {
        profile: 'stepped half-section, 100 mm long, radii 30 / 20 / 10 mm',
        axis: { through: [0, 0], direction: [1, 0] },
      },
      result: {
        analyticVolumeMm3: ANALYTIC_VOLUME_MM3,
        volumeMm3: volume,
        volumeRelativeError: Math.abs(volume - ANALYTIC_VOLUME_MM3) / ANALYTIC_VOLUME_MM3,
        bboxMm: size,
        solidComponents: shape.solidComponents().length,
        brepCheckValid: true,
        meshOpenEdgeCount: report.openEdgeCount,
        stepBytes: step.byteLength,
      },
      checks: {
        volumeWithin0p5Percent: true,
        bboxExact: size.every((value, i) => Math.abs(value - [100, 60, 60][i]) < 1e-3),
        brepCheckValid: true,
        oneSolid: true,
        watertightMesh: true,
        stepExportOk: true,
      },
      scope: 'Local model validation only; not a deployed-behavior or hardware-acceptance claim.',
    };
    for (const [name, ok] of Object.entries(verification.checks)) {
      if (!ok) throw new Error(`${name} failed`);
    }
    await writeFile(resolve(outputDir, 'verification.json'), `${JSON.stringify(verification, null, 2)}\n`);

    for (const phase of [0, 1, 2] as const) {
      const png = await sharp(Buffer.from(frame(phase, { volume, openEdges: report.openEdgeCount }))).png().toBuffer();
      await writeFile(resolve(frameDir, `frame-0${phase + 1}.png`), png);
    }
    return verification;
  } finally {
    shape.dispose?.();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  captureRevolveAxisDemo().then(
    (verification) => console.log(JSON.stringify(verification, null, 2)),
    (error) => {
      console.error(error);
      process.exitCode = 1;
    },
  );
}
