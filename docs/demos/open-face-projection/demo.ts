import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../src/modeling/api';

const outputDir = resolve('docs/demos/open-face-projection');
const frameDir = resolve(outputDir, 'frames');
const mm = (value: number) => ({ expression: String(value), unit: 'mm' as const, evaluated: value });
const commands = [
  { kind: 'moveTo' as const, x: mm(-12), y: mm(0) },
  { kind: 'lineTo' as const, x: mm(12), y: mm(0) },
];
const sourcePlane = { origin: [0, 0, 50] as [number, number, number], normal: [0, 0, 1] as [number, number, number], xAxis: [1, 0, 0] as [number, number, number] };
const direction: [number, number, number] = [0, 0, -1];

export async function captureOpenFaceProjectionDemo() {
await mkdir(frameDir, { recursive: true });
await initOcct();
const session = new CaptureSession();
const api = createModelingApi({ session });
const plate = api.box(30, 10, 4)
  .translate(-15, -5, 0)
  .subtract(api.cylinder(6, 3).translate(0, 0, -1));
const curves = await plate.projectCurve({
  source: { kind: 'sketchCommands', commands },
  face: 'top',
  asEdge: true,
  sourcePlane,
  direction,
});

const fragments = curves.map((curve) => ({
  lengthMm: curve.length(),
  start: curve.pointAt(0),
  end: curve.pointAt(1),
  samples: curve.sample(36),
})).sort((a, b) => Math.min(a.start[0], a.end[0]) - Math.min(b.start[0], b.end[0]));
if (fragments.length !== 2 || fragments.some((fragment) => Math.abs(fragment.lengthMm - 9) > 0.1)) {
  throw new Error(`Expected two 9 mm fragments; received ${JSON.stringify(fragments.map(({ lengthMm }) => lengthMm))}`);
}
if (fragments.some((fragment) => fragment.samples.some((point) => Math.abs(point[2] - 4) > 1e-3))) {
  throw new Error('Projected samples did not remain on the selected z=4 mm face.');
}

const verification = {
  recordedDate: '2026-11-18',
  kernel: 'Local OCCT model geometry',
  input: {
    plate: { sizeMm: [30, 10, 4], boundsMm: [[-15, -5, 0], [15, 5, 4]], throughHoleDiameterMm: 6 },
    sourceCommands: commands.map((command) => ({ kind: command.kind, x: 'x' in command ? command.x.evaluated : undefined, y: 'y' in command ? command.y.evaluated : undefined })),
    face: 'top',
    sourcePlane,
    direction,
  },
  result: fragments.map(({ lengthMm, start, end }) => ({ lengthMm, start, end })),
  checks: {
    fragmentCount: fragments.length,
    eachFragmentLengthMm: fragments.map(({ lengthMm }) => lengthMm),
    allSamplesOnTopFaceZ4Mm: true,
    downstreamVariableSweep: 'verified in tests/integration/modeling/projectCurveOpen.test.ts',
  },
  scope: 'Local model validation only; not a deployed-behavior or hardware-acceptance claim.',
};
await writeFile(resolve(outputDir, 'verification.json'), `${JSON.stringify(verification, null, 2)}\n`);

const mapX = (x: number) => 420 + x * 24;
const mapY = (y: number) => 290 - y * 24;
const pathFor = (points: readonly [number, number, number][]) => points
  .map((point, index) => `${index === 0 ? 'M' : 'L'} ${mapX(point[0]).toFixed(2)} ${mapY(point[1]).toFixed(2)}`)
  .join(' ');
const text = (x: number, y: number, value: string, size = 20, fill = '#d8e1e8', weight = 500) =>
  `<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" font-weight="${weight}" font-family="Inter, Arial, sans-serif">${value}</text>`;
const line = (x1: number, y1: number, x2: number, y2: number, stroke: string, width = 3, dash = '') =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${width}" ${dash ? `stroke-dasharray="${dash}"` : ''} />`;

function frame(phase: 0 | 1 | 2): string {
  const actualEdges = phase >= 1 ? fragments.map(({ samples }, index) =>
    `<path d="${pathFor(samples)}" fill="none" stroke="${index === 0 ? '#52e0c4' : '#a6f06b'}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />`,
  ).join('') : '';
  const labels = phase >= 2 ? fragments.map(({ lengthMm, start, end }, index) => {
    const center = (start[0] + end[0]) / 2;
    const color = index === 0 ? '#52e0c4' : '#a6f06b';
    return `${text(mapX(center) - 72, 258, `Curve3D[${index}] · ${lengthMm.toFixed(2)} mm`, 17, color, 700)}`;
  }).join('') : '';
  const phaseCopy = [
    ['01 / INPUT', 'Place one open path in a world-space source plane.'],
    ['02 / PROJECT', 'Send the path along -Z to the selected top face.'],
    ['03 / RESULT', 'Keep both face fragments as separate Curve3D values.'],
  ][phase];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#111b26"/><stop offset="1" stop-color="#1d2b38"/></linearGradient>
      <marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto"><path d="M0,0 L12,6 L0,12 Z" fill="#ffb85c"/></marker>
      <filter id="glow"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <rect width="1280" height="720" fill="url(#bg)"/>
    <rect x="40" y="34" width="8" height="34" rx="4" fill="#52e0c4"/>
    ${text(66, 58, 'KERNELCAD  /  OPEN CURVE PROJECTION', 16, '#9fb2c2', 700)}
    ${text(60, 116, 'One open path. Two face fragments.', 34, '#f3f7fa', 700)}
    ${text(60, 151, phaseCopy[1], 18, '#aebdca', 500)}
    <rect x="60" y="184" width="720" height="320" rx="18" fill="#172531" stroke="#344655"/>
    ${text(86, 218, 'TOP VIEW  ·  selected face z = 4 mm', 14, '#9fb2c2', 700)}
    <rect x="60" y="170" width="720" height="240" rx="4" fill="#9fb0bc" stroke="#d5dee4" stroke-width="2"/>
    <circle cx="420" cy="290" r="72" fill="#172531" stroke="#111b26" stroke-width="3"/>
    ${line(mapX(-12), mapY(0), mapX(12), mapY(0), '#ffb85c', 3, '10 9')}
    ${actualEdges}
    ${labels}
    ${text(88, 460, 'source path  ·  24 mm', 15, '#ffca82', 600)}
    ${text(88, 484, 'through-hole  ·  Ø6 mm', 15, '#aebdca', 500)}
    <rect x="820" y="184" width="400" height="320" rx="18" fill="#172531" stroke="#344655"/>
    ${text(848, 218, 'SIDE VIEW  ·  projection setup', 14, '#9fb2c2', 700)}
    <rect x="930" y="404" width="240" height="62" rx="4" fill="#9fb0bc" stroke="#d5dee4" stroke-width="2"/>
    ${line(880, 250, 1190, 250, '#52e0c4', 3, '9 8')}
    ${text(888, 238, 'source plane  z = 50 mm', 15, '#52e0c4', 600)}
    ${phase >= 1 ? `<line x1="1050" y1="270" x2="1050" y2="390" stroke="#ffb85c" stroke-width="4" marker-end="url(#arrow)" filter="url(#glow)"/>` : ''}
    ${text(1004, 493, 'face  z = 4 mm', 15, '#d8e1e8', 600)}
    <rect x="60" y="530" width="1160" height="94" rx="16" fill="#223442" stroke="#344655"/>
    ${text(88, 568, phaseCopy[0], 17, '#52e0c4', 700)}
    ${text(88, 598, phaseCopy[1], 17, '#d8e1e8', 500)}
    ${phase >= 2 ? text(794, 583, 'Curve3D[]  →  downstream ops', 17, '#a6f06b', 700) : ''}
    ${text(60, 676, 'LOCAL OCCT MODEL RESULT  ·  NOT A DEPLOYMENT OR HARDWARE ACCEPTANCE CLAIM', 13, '#899aa8', 700)}
    ${text(1128, 676, `0${phase + 1} / 03`, 13, '#899aa8', 700)}
  </svg>`;
}

for (const phase of [0, 1, 2] as const) {
  const png = await sharp(Buffer.from(frame(phase))).png().toBuffer();
  await writeFile(resolve(frameDir, `frame-0${phase + 1}.png`), png);
}
console.log(JSON.stringify({
  fragments: verification.result,
  frames: 3,
  evidence: resolve(outputDir, 'verification.json'),
}, null, 2));
return { fragments: verification.result, frameCount: 3 };
}
