// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Generated technical demo for `Sketch.sweep(rail, { bendRadius })` (#1785).
// The geometry and every number in the frames come from a local OCCT build of
// the script in `elbow.kcad.ts`; this is not a browser or deployment recording.
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { getOC } from 'replicad';
import { initOcct, OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { isValidShape } from '../../../src/kernel/backends/occt/booleanRecovery';
import { buildModel } from '../../../src/modeling/buildModel';

const outputDir = resolve('docs/demos/sweep-bend-radius');
const frameDir = resolve(outputDir, 'frames');
const PROFILE_RADIUS_MM = 4;
const BEND_RADIUS_MM = 6;
const RAIL = [[0, 0, 0], [30, 0, 0], [30, 30, 0]] as const;
const ANALYTIC_LENGTH_MM = (30 - BEND_RADIUS_MM) * 2 + (BEND_RADIUS_MM * Math.PI) / 2;
const ANALYTIC_VOLUME_MM3 = Math.PI * PROFILE_RADIUS_MM ** 2 * ANALYTIC_LENGTH_MM;

export const ELBOW_SCRIPT = `// Circular-profile pipe elbow with a declared 6 mm centreline bend radius.
return path().circle(0, 0, ${PROFILE_RADIUS_MM}).sweep(
  ${JSON.stringify(RAIL)},
  { bendRadius: ${BEND_RADIUS_MM} },
);
`;

function map(x: number, y: number): [number, number] {
  return [300 + x * 11, 620 - y * 11];
}

function text(x: number, y: number, value: string, size = 20, fill = '#d8e1e8', weight = 500): string {
  return `<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" font-weight="${weight}" font-family="Inter, Arial, sans-serif">${value}</text>`;
}

/** Frame 0: the sharp `right` corner with the full 60 mm swept path.
 *  Frame 1: tangent-arc construction at the corner.
 *  Frame 2: the built solid and its measured result. */
function frame(phase: 0 | 1 | 2, measured: { volume: number; openEdges: number }): string {
  const [x0, y0] = map(0, 0);
  const [x1, y1] = map(30, 0);
  const [x2, y2] = map(30, 30);
  const [tx0, ty0] = map(24, 0);
  const [tx1, ty1] = map(30, 6);
  const [cx, cy] = map(24, 6);
  const band = PROFILE_RADIUS_MM * 2 * 11;
  const cornerPhase = phase === 0;
  const bodyPath = cornerPhase
    ? `<polyline points="${x0},${y0} ${x1},${y1} ${x2},${y2}" fill="none" stroke="#9fb0bc" stroke-width="${band}" stroke-linejoin="miter" />`
    : `<path d="M ${x0} ${y0} L ${tx0} ${ty0} A ${BEND_RADIUS_MM * 11} ${BEND_RADIUS_MM * 11} 0 0 0 ${tx1} ${ty1} L ${x2} ${y2}" fill="none" stroke="#b8c7d2" stroke-width="${band}" stroke-linejoin="round" />`;
  const centreline = cornerPhase
    ? `<polyline points="${x0},${y0} ${x1},${y1} ${x2},${y2}" fill="none" stroke="#24333f" stroke-width="2" stroke-dasharray="8 6" />`
    : `<path d="M ${x0} ${y0} L ${tx0} ${ty0} A ${BEND_RADIUS_MM * 11} ${BEND_RADIUS_MM * 11} 0 0 0 ${tx1} ${ty1} L ${x2} ${y2}" fill="none" stroke="#24333f" stroke-width="2" stroke-dasharray="8 6" />`;
  const phaseCopy = [
    ['01 / SHARP MITRE', 'The right corner keeps 60 mm of path but folds the wall at the corner.'],
    ['02 / TANGENT ARCS', 'bendRadius replaces each corner with an arc tangent to both legs.'],
    ['03 / ONE VALID SOLID', 'The exact line/arc spine sews and exports; volume matches the analytic bend.'],
  ][phase];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#101a24"/><stop offset="1" stop-color="#1d2b38"/></linearGradient>
      <marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto"><path d="M0,0 L12,6 L0,12 Z" fill="#ffb85c"/></marker>
    </defs>
    <rect width="1280" height="720" fill="url(#bg)"/>
    <rect x="40" y="34" width="8" height="34" rx="4" fill="#52e0c4"/>
    ${text(66, 58, 'KERNELCAD  /  SWEEP BEND RADIUS', 16, '#9fb2c2', 700)}
    ${text(60, 116, 'A round profile on an exact line-and-arc spine.', 32, '#f3f7fa', 700)}
    ${text(60, 151, phaseCopy[1], 18, '#aebdca', 500)}
    <rect x="60" y="184" width="760" height="410" rx="18" fill="#172531" stroke="#344655"/>
    ${text(86, 218, 'TOP VIEW  ·  centreline and tube silhouette', 14, '#9fb2c2', 700)}
    ${bodyPath}
    ${centreline}
    ${phase >= 1 ? `<circle cx="${cx}" cy="${cy}" r="${BEND_RADIUS_MM * 11}" fill="none" stroke="#52e0c4" stroke-width="2" stroke-dasharray="7 7" />` : ''}
    ${phase >= 1 ? `<circle cx="${tx0}" cy="${ty0}" r="5" fill="#52e0c4" /><circle cx="${tx1}" cy="${ty1}" r="5" fill="#52e0c4" />` : ''}
    ${phase >= 1 ? text(tx0 - 58, ty0 + 34, 'tangent', 14, '#52e0c4', 600) : text(x1 + 58, y1 - 8, 'sharp corner', 14, '#ffb85c', 600)}
    ${phase >= 1 ? text(cx - 42, cy - 18, `R${BEND_RADIUS_MM}`, 16, '#52e0c4', 700) : ''}
    ${text(x0 - 4, y0 + 42, 'Ø8 tube', 15, '#ffca82', 600)}
    ${text(x1 - 44, y2 - 18, '30 mm', 14, '#9fb2c2', 500)}
    ${text(x1 + 10, y1 + 60, '30 mm', 14, '#9fb2c2', 500)}
    <rect x="850" y="184" width="370" height="410" rx="18" fill="#172531" stroke="#344655"/>
    ${text(878, 218, 'MEASURED  ·  LOCAL OCCT', 14, '#9fb2c2', 700)}
    ${text(878, 266, cornerPhase ? '60.000 mm' : `${ANALYTIC_LENGTH_MM.toFixed(4)} mm`, 30, '#f3f7fa', 700)}
    ${text(878, 291, 'bent centreline length', 14, '#9fb2c2', 500)}
    ${text(878, 346, cornerPhase ? `${(60 * Math.PI * PROFILE_RADIUS_MM ** 2).toFixed(2)} mm³` : `${measured.volume.toFixed(2)} mm³`, 30, phase === 2 ? '#a6f06b' : '#f3f7fa', 700)}
    ${text(878, 371, cornerPhase ? 'sharp-corner volume' : 'analytic and measured volume', 14, '#9fb2c2', 500)}
    ${text(878, 426, `analytic ${ANALYTIC_VOLUME_MM3.toFixed(2)} mm³`, 15, '#d8e1e8', 500)}
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

export async function captureSweepBendRadiusDemo() {
  await mkdir(frameDir, { recursive: true });
  await initOcct();

  const model = await buildModel({ code: ELBOW_SCRIPT, fileName: 'elbow.kcad.ts' });
  const errors = model.diagnostics.filter((d) => d.severity === 'error');
  if (errors.length > 0) throw new Error(`elbow build failed: ${JSON.stringify(errors)}`);
  const shape = model.rootShape as OcctBackend;
  if (!(shape instanceof OcctBackend)) throw new Error('elbow did not produce an OcctBackend root shape');
  try {
    const volume = shape.volume();
    if (Math.abs(volume - ANALYTIC_VOLUME_MM3) / ANALYTIC_VOLUME_MM3 > 0.005) {
      throw new Error(`volume ${volume} differs from analytic ${ANALYTIC_VOLUME_MM3}`);
    }
    if (!isValidShape(getOC(), (shape.getReplicadShape() as unknown as { wrapped: unknown }).wrapped)) {
      throw new Error('elbow failed solid-level BRepCheck');
    }
    if (shape.solidComponents().length !== 1) throw new Error('elbow is not one solid');
    const { report } = await shape.exportSTLWithReportAsync();
    if (!report.ok || report.openEdgeCount !== 0) throw new Error(`mesh not watertight: ${JSON.stringify(report)}`);
    const step = await shape.exportSTEPAsync();
    if (step.byteLength === 0) throw new Error('STEP export returned no bytes');

    const verification = {
      recordedDate: '2026-11-25',
      kernel: 'Local OCCT model geometry',
      script: 'elbow.kcad.ts',
      input: {
        profile: `circle r=${PROFILE_RADIUS_MM} mm`,
        rail: RAIL,
        bendRadiusMm: BEND_RADIUS_MM,
        transitionMode: 'right (default)',
      },
      result: {
        analyticCutLengthMm: ANALYTIC_LENGTH_MM,
        volumeMm3: volume,
        volumeRelativeError: Math.abs(volume - ANALYTIC_VOLUME_MM3) / ANALYTIC_VOLUME_MM3,
        solidComponents: shape.solidComponents().length,
        brepCheckValid: true,
        meshOpenEdgeCount: report.openEdgeCount,
        stepBytes: step.byteLength,
      },
      checks: {
        volumeWithin0p5Percent: true,
        brepCheckValid: true,
        oneSolid: true,
        watertightMesh: true,
        stepExportOk: true,
      },
      scope: 'Local model validation only; not a deployed-behavior or hardware-acceptance claim.',
    };
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
  captureSweepBendRadiusDemo().then(
    (verification) => console.log(JSON.stringify(verification, null, 2)),
    (error) => {
      console.error(error);
      process.exitCode = 1;
    },
  );
}
