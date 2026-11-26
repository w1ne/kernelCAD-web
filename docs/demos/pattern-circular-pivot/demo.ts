// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Generated technical demo for `Shape.patternCircular({ ..., pivot })`.
// Geometry and every number in the frames come from a local OCCT build of
// `flange-bolt-circle.kcad.ts`; this is not a browser or deployment recording.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { getOC } from 'replicad';
import { initOcct, OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { isValidShape } from '../../../src/kernel/backends/occt/booleanRecovery';
import { buildModel } from '../../../src/modeling/buildModel';

const outputDir = resolve('docs/demos/pattern-circular-pivot');
const frameDir = resolve(outputDir, 'frames');

const PLATE = { x: 90, y: 70, z: 10 };
const CENTRE: [number, number, number] = [45, 35, 0];
const BOLT_RADIUS = 25;
const BOSS_RADIUS = 6;
const BOSS_HEIGHT = 8;
const BOSS_COUNT = 4;
const ANALYTIC_VOLUME_MM3 =
  PLATE.x * PLATE.y * PLATE.z +
  BOSS_COUNT * Math.PI * BOSS_RADIUS ** 2 * BOSS_HEIGHT;

const NO_PIVOT_SCRIPT = `const flange = box(90, 70, 10);
const boss = cylinder(8, 6).translate(70, 35, 10);
const bosses = boss.patternCircular({ count: 4, axis: 'Z' });
return flange.union(bosses);
`;

// Top view: 90 x 70 mm flange mapped into the left panel.
const TOP = { x: 110, y: 520, s: 3.8 };
const top = (x: number, y: number): [number, number] => [TOP.x + x * TOP.s, TOP.y - y * TOP.s];
// Side view: 90 x 18 mm elevation across the right panel.
const SIDE = { x: 640, y: 540, s: 4.6 };
const side = (x: number, z: number): [number, number] => [SIDE.x + x * SIDE.s, SIDE.y - z * SIDE.s];
const poly = (points: Array<[number, number]>): string => points.map(([x, y]) => `${x},${y}`).join(' ');
const circle = (cx: number, cy: number, r: number, stroke: string, extra = ''): string =>
  `<circle cx="${cx}" cy="${cy}" r="${r * TOP.s}" fill="none" stroke="${stroke}" stroke-width="1.6" ${extra}/>`;

function text(x: number, y: number, value: string, size = 18, fill = '#d8e1e8', weight = 500): string {
  return `<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" font-weight="${weight}" font-family="Inter, Arial, sans-serif">${value}</text>`;
}

function bossCentre(i: number): [number, number] {
  const angle = (Math.PI / 2) * i;
  return [CENTRE[0] + BOLT_RADIUS * Math.cos(angle), CENTRE[1] + BOLT_RADIUS * Math.sin(angle)];
}

function frame(
  phase: 0 | 1 | 2,
  measured: { volume: number; openEdges: number; noPivot: [number, number, number, number] },
): string {
  const captions = [
    ['01 / BOLT CIRCLE', 'One source boss and the pivot point on the flange centre.'],
    ['02 / FOUR POSITIONS', 'pivot [45, 35, 0] turns the copies about the flange axis, not the world origin.'],
    ['03 / ONE FLANGE', 'Four bosses fuse into the plate: one solid, exact volume.'],
  ][phase];
  const showPattern = phase >= 1;
  const showFused = phase >= 2;
  const plate = [top(0, 0), top(PLATE.x, 0), top(PLATE.x, PLATE.y), top(0, PLATE.y)];
  const sidePlate = [side(0, 0), side(PLATE.x, 0), side(PLATE.x, PLATE.z), side(0, PLATE.z)];
  const centre = top(CENTRE[0], CENTRE[1]);
  const source = bossCentre(0);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#101a24"/><stop offset="1" stop-color="#1d2b38"/></linearGradient>
    <linearGradient id="steel" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#829bb0"/><stop offset="1" stop-color="#344a5c"/></linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#bg)"/>
  <rect x="40" y="34" width="8" height="34" rx="4" fill="#52e0c4"/>
  ${text(66, 58, 'KERNELCAD  /  CIRCULAR PATTERN PIVOT', 16, '#9fb2c2', 700)}
  ${text(60, 116, 'Turn copies about the boss, not the world origin.', 32, '#f3f7fa', 700)}
  ${text(60, 151, captions[1], 18, '#aebdca', 500)}

  <rect x="60" y="184" width="520" height="410" rx="18" fill="#172531" stroke="#344655"/>
  ${text(86, 218, 'TOP VIEW  ·  Z AXIS THROUGH PIVOT', 14, '#9fb2c2', 700)}
  <polygon points="${poly(plate)}" fill="#243744" stroke="#587084" stroke-width="1.5"/>
  ${circle(centre[0], centre[1], BOLT_RADIUS, '#ffb85c', 'stroke-dasharray="6 5" opacity="0.55"')}
  <line x1="${centre[0]}" y1="${centre[1]}" x2="${top(source[0], source[1])[0]}" y2="${top(source[0], source[1])[1]}" stroke="#ffb85c" stroke-width="1.8"/>
  ${text(centre[0] - 8, centre[1] - 8, '+', 20, '#ffb85c', 700)}
  ${text(centre[0] - 26, centre[1] - 26, 'pivot [45, 35, 0]', 12, '#ffb85c', 700)}
  ${text((centre[0] + top(source[0], source[1])[0]) / 2 - 14, (centre[1] + top(source[0], source[1])[1]) / 2 + 16, 'R25', 11, '#ffb85c', 700)}
  ${Array.from({ length: BOSS_COUNT }, (_, i) => {
    const c = top(bossCentre(i)[0], bossCentre(i)[1]);
    const active = i === 0 || showPattern;
    return `<circle cx="${c[0]}" cy="${c[1]}" r="${BOSS_RADIUS * TOP.s}" fill="${active ? '#52e0c4' : 'none'}" fill-opacity="${active ? 0.32 : 0}" stroke="${active ? '#52e0c4' : '#425a6c'}" stroke-width="1.8" ${active ? '' : 'stroke-dasharray="4 4"'}/>`;
  }).join('')}
  ${text(110, 566, '90 mm', 12, '#9fb2c2', 600)}
  ${text(500, 566, '70 mm', 12, '#9fb2c2', 600)}

  <rect x="600" y="184" width="620" height="410" rx="18" fill="#172531" stroke="#344655"/>
  ${text(626, 218, 'SIDE VIEW  ·  BOSSES ON THE PLATE', 14, '#9fb2c2', 700)}
  <polygon points="${poly(sidePlate)}" fill="url(#steel)" stroke="#b9cad6" stroke-width="1.5"/>
  ${showPattern ? [20, 70, 45, 45].map((x) => {
    const [px, py] = side(x, PLATE.z);
    return `<rect x="${px - BOSS_RADIUS * SIDE.s}" y="${py - BOSS_HEIGHT * SIDE.s}" width="${BOSS_RADIUS * 2 * SIDE.s}" height="${BOSS_HEIGHT * SIDE.s}" fill="${showFused ? '#2f6b62' : '#1d4a45'}" stroke="#52e0c4" stroke-width="1.6"/>`;
  }).join('') : ''}
  <line x1="${side(0, PLATE.z)[0]}" y1="${side(0, PLATE.z)[1]}" x2="${side(PLATE.x, PLATE.z)[0]}" y2="${side(PLATE.x, PLATE.z)[1]}" stroke="#899aa8" stroke-width="1" stroke-dasharray="6 5"/>
  ${text(626, 528, 'entry face z = 10', 10, '#cfe0ea', 700)}
  ${showPattern ? text(side(70, 18)[0] - 22, side(70, 18)[1] - 8, '8 mm', 11, '#52e0c4', 700) : ''}
  ${showFused ? text(1072, 528, 'fused flange', 11, '#a6f06b', 700) : ''}

  <rect x="930" y="240" width="264" height="190" rx="12" fill="#1d303e" stroke="#344655"/>
  ${text(948, 266, 'MEASURED  ·  LOCAL OCCT', 11, '#9fb2c2', 700)}
  ${text(948, 300, showFused ? `${measured.volume.toFixed(2)} mm³` : '—', 21, '#f3f7fa', 700)}
  ${text(948, 320, showFused ? `volume (analytic ${ANALYTIC_VOLUME_MM3.toFixed(2)})` : 'fused volume', 10, '#9fb2c2', 500)}
  ${showFused ? text(948, 348, 'bbox 90 × 70 × 18', 11, '#d8e1e8', 600) : ''}
  ${showFused ? text(948, 370, `BRepCheck valid · open edges ${measured.openEdges}`, 10, '#d8e1e8', 600) : ''}
  ${showFused ? text(948, 392, `without pivot x ${measured.noPivot[0].toFixed(0)}..${measured.noPivot[2].toFixed(0)}`, 10, '#9fb2c2', 600) : ''}

  <rect x="60" y="620" width="1160" height="60" rx="14" fill="#223442" stroke="#344655"/>
  ${text(86, 656, captions[0], 17, '#52e0c4', 700)}
  ${text(406, 656, captions[1], 16, '#d8e1e8', 500)}
  ${text(60, 704, 'LOCAL OCCT MODEL RESULT  ·  NOT A DEPLOYMENT OR HARDWARE ACCEPTANCE CLAIM', 12, '#899aa8', 700)}
  ${text(1140, 704, `0${phase + 1} / 03`, 12, '#899aa8', 700)}
  </svg>`;
}

async function measure(script: string, fileName: string) {
  const model = await buildModel({ code: script, fileName });
  const errors = model.diagnostics.filter((d) => d.severity === 'error');
  if (errors.length > 0) throw new Error(`${fileName} failed: ${JSON.stringify(errors)}`);
  const shape = model.rootShape as OcctBackend;
  if (!(shape instanceof OcctBackend)) throw new Error(`${fileName} did not produce an OcctBackend root shape`);
  const raw = (shape.getReplicadShape() as unknown as { wrapped: unknown }).wrapped;
  if (!isValidShape(getOC(), raw)) throw new Error(`${fileName} failed solid-level BRepCheck`);
  return { shape, volume: shape.volume(), bbox: shape.boundingBox() };
}

export async function capturePatternPivotDemo() {
  await mkdir(frameDir, { recursive: true });
  await initOcct();
  const fixture = await readFile(resolve(outputDir, 'flange-bolt-circle.kcad.ts'), 'utf8');
  const result = await measure(fixture, 'flange-bolt-circle.kcad.ts');
  const withoutPivot = await measure(NO_PIVOT_SCRIPT, 'no-pivot.kcad.ts');

  if (Math.abs(result.volume - ANALYTIC_VOLUME_MM3) > 1e-6) {
    throw new Error(`volume ${result.volume} differs from analytic ${ANALYTIC_VOLUME_MM3}`);
  }
  if (result.shape.solidComponents().length !== 1) throw new Error('result is not one solid');
  const bbox = [result.bbox.max[0] - result.bbox.min[0], result.bbox.max[1] - result.bbox.min[1], result.bbox.max[2] - result.bbox.min[2]];
  if (Math.abs(bbox[0] - PLATE.x) > 1e-6 || Math.abs(bbox[1] - PLATE.y) > 1e-6 || Math.abs(bbox[2] - (PLATE.z + BOSS_HEIGHT)) > 1e-6) {
    throw new Error(`bbox ${JSON.stringify(bbox)} is not 90 x 70 x 18`);
  }
  const noPivotBbox = [withoutPivot.bbox.min[0], withoutPivot.bbox.min[1], withoutPivot.bbox.max[0], withoutPivot.bbox.max[1]];
  if (!(noPivotBbox[0] < -20)) throw new Error('the no-pivot control did not scatter past the plate');

  const { report } = await result.shape.exportSTLWithReportAsync();
  const step = await result.shape.exportSTEPAsync();
  if (!report.ok || report.openEdgeCount !== 0) {
    throw new Error(`mesh is not watertight: ${JSON.stringify(report)}`);
  }
  if (step.byteLength === 0) throw new Error('STEP export returned no bytes');

  const verification = {
    recordedDate: '2026-11-26',
    kernel: 'Local OCCT model geometry',
    scripts: ['flange-bolt-circle.kcad.ts', 'no-pivot.kcad.ts'],
    api: 'Shape.patternCircular({ count, axis, pivot })',
    cases: {
      withPivot: {
        analyticVolumeMm3: ANALYTIC_VOLUME_MM3,
        volumeMm3: result.volume,
        bboxMm: bbox,
      },
      withoutPivotControl: {
        note: 'Copies rotate about the world origin, so the bolt circle leaves the flange.',
        bboxMinMaxMm: noPivotBbox,
      },
    },
    result: {
      solidComponents: result.shape.solidComponents().length,
      brepCheckValid: true,
      meshOpenEdgeCount: report.openEdgeCount,
      stepBytes: step.byteLength,
    },
    checks: {
      volumeExact: Math.abs(result.volume - ANALYTIC_VOLUME_MM3) < 1e-6,
      bboxExact: true,
      oneSolid: true,
      brepCheckValid: true,
      watertightMesh: report.openEdgeCount === 0,
      stepExportOk: step.byteLength > 0,
      pivotChangesPlacement: noPivotBbox[0] < -20,
    },
    scope: 'Local model validation only; not a deployed-behavior or hardware-acceptance claim.',
  };
  for (const [name, ok] of Object.entries(verification.checks)) {
    if (!ok) throw new Error(`${name} failed`);
  }
  await writeFile(resolve(outputDir, 'verification.json'), `${JSON.stringify(verification, null, 2)}\n`);
  for (const phase of [0, 1, 2] as const) {
    const png = await sharp(Buffer.from(frame(phase, {
      volume: result.volume,
      openEdges: report.openEdgeCount,
      noPivot: noPivotBbox as [number, number, number, number],
    }))).png().toBuffer();
    await writeFile(resolve(frameDir, `frame-0${phase + 1}.png`), png);
  }
  result.shape.dispose?.();
  withoutPivot.shape.dispose?.();
  return verification;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  capturePatternPivotDemo().then(
    (verification) => console.log(JSON.stringify(verification, null, 2)),
    (error) => {
      console.error(error);
      process.exitCode = 1;
    },
  );
}
