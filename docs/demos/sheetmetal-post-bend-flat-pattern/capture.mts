// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Post-bend sheet-metal flat-pattern demo. Replays the example through the
// local OCCT build, calls the real flattenPatternWithHoles path, and draws
// that Region (outer outline, both post-bend holes, bend line) as a short MP4.
// No browser or GPU context is used. Run with an outer fixed timeout.

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import { initOcct, OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { isTopologicallyValid } from '../../../src/kernel/backends/occt/edgeFeatureValidity';
import { runScript } from '../../../src/composition/runScript';
import { RecomputeEngine } from '../../../src/modeling/compute/recomputeEngine';
import { OcctLowerer } from '../../../src/modeling/backends/occt/occtLowerer';
import { flattenPatternWithHoles } from '../../../src/modeling/sheetMetalFlatPattern';
import type { Vec2 } from '../../../src/shared/intent/region';

const OUTPUT = resolve('docs/demos/sheetmetal-post-bend-flat-pattern');
const SOURCE = 'examples/sheet-metal-post-bend-flat-pattern.kcad.ts';
const WIDTH = 1280;
const HEIGHT = 720;
const FPS = 10;
const FRAMES_PER_STAGE = 20;
const SCALE = 5.2;
const ORIGIN: Vec2 = [150, 560];

const xml = (text: string): string =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

const screen = (p: Vec2): Vec2 => [ORIGIN[0] + p[0] * SCALE, ORIGIN[1] - p[1] * SCALE];

function pathData(points: readonly Vec2[]): string {
  return points.map((p, index) => {
    const [x, y] = screen(p);
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(' ') + ' Z';
}

const span = (points: readonly Vec2[], axis: 0 | 1): number =>
  Math.max(...points.map((p) => p[axis])) - Math.min(...points.map((p) => p[axis]));

const centre = (points: readonly Vec2[]): Vec2 => [
  points.reduce((sum, p) => sum + p[0], 0) / points.length,
  points.reduce((sum, p) => sum + p[1], 0) / points.length,
];

interface DemoData {
  region: { outer: Vec2[]; holes: Vec2[][]; bendLines: Array<{ start: Vec2; end: Vec2 }> };
  volumeMm3: number;
  faceCount: number;
  valid: boolean;
}

function stageCaption(stage: number): { title: string; step: string; detail: string } {
  if (stage === 0) {
    return {
      title: 'Cut after the bend',
      step: '01 / FOLDED PART',
      detail: 'two Ø4.4 holes cut on the still-flat base',
    };
  }
  if (stage === 1) {
    return {
      title: 'Holes reach the flat pattern',
      step: '02 / FLATTEN',
      detail: '0 before · 2 recovered from the flat top plane',
    };
  }
  return {
    title: 'Laser cut DXF',
    step: '03 / CUT LAYER',
    detail: 'outer 110 × 60 + 2 holes + one bend line',
  };
}

function makeSvg(data: DemoData, stage: number, pulse: number): string {
  const { region, volumeMm3, valid } = data;
  const caption = stageCaption(stage);
  const holeAlpha = stage === 0 ? 0.18 : 1;
  const holeStroke = stage === 1 ? 3.2 + pulse * 1.2 : 2.6;
  const holes = region.holes.map((hole) =>
    `<path d="${pathData(hole)}" fill="none" stroke="#54c8e6" stroke-width="${holeStroke.toFixed(2)}" opacity="${holeAlpha}"/>`,
  ).join('');
  const bend = region.bendLines[0];
  const bendLine = bend
    ? `<path d="M${screen(bend.start).map((v) => v.toFixed(2)).join(' ')} L${screen(bend.end).map((v) => v.toFixed(2)).join(' ')}" stroke="#f5a623" stroke-width="2" stroke-dasharray="9 7"/>`
    : '';
  const dims = stage === 2
    ? `<g stroke="#9eafc2" stroke-width="1.2" fill="#c9d6e3" font-size="17" font-family="Inter, sans-serif">
        <path d="M${screen([0, 0])[0]} ${screen([0, 0])[1] + 34}H${screen([110, 0])[0]}" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
        <text x="${(screen([0, 0])[0] + screen([110, 0])[0]) / 2 - 30}" y="${screen([0, 0])[1] + 60}">110 mm</text>
        <path d="M${screen([0, 0])[0] - 34} ${screen([0, 0])[1]}V${screen([0, 60])[1]}" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
        <text x="${screen([0, 0])[0] - 96}" y="${(screen([0, 0])[1] + screen([0, 60])[1]) / 2}">60 mm</text>
        <text x="${screen([70, 48])[0]}" y="${screen([70, 48])[1]}">2 × Ø4.4</text>
        <text x="${screen([70, 8])[0]}" y="${screen([70, 8])[1]}" fill="#f5a623">bend line x = 55</text>
      </g>`
    : '';
  const code = [
    'const profile = path()',
    '  .moveTo(0, 0).lineTo(110, 0)',
    '  .lineTo(110, 60).lineTo(0, 60).close();',
    'return sheetMetal(profile, {',
    '  thickness: 2, kFactor: 0.38 })',
    '  .bend({ atX: 55 }, 90, 3)',
    '  .subtract(cylinder(20, 2.2)',
    '    .translate(20, 15, -5))',
    '  .subtract(cylinder(20, 2.2)',
    '    .translate(20, 45, -5));',
  ].map((line, index) => `<text x="884" y="${294 + index * 21}" class="code">${xml(line)}</text>`).join('');
  const holeCentres = region.holes
    .map((hole) => centre(hole).map((v) => Math.round(v)).join(', '))
    .join('  ·  ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x2="0" y2="1"><stop stop-color="#121b28"/><stop offset="1" stop-color="#0a1018"/></linearGradient>
    <radialGradient id="glow"><stop stop-color="#24435b" stop-opacity=".65"/><stop offset="1" stop-color="#101722" stop-opacity="0"/></radialGradient>
    <marker id="arrow" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7" fill="none" stroke="#9eafc2"/></marker>
  </defs>
  <rect width="1280" height="720" fill="url(#bg)"/>
  <ellipse cx="430" cy="370" rx="430" ry="310" fill="url(#glow)"/>
  <path d="M0 84H1280" stroke="#253344"/>
  <text x="48" y="53" class="brand">KERNELCAD <tspan fill="#54c8e6">/</tspan> SHEET METAL</text>
  <text x="48" y="127" class="eyebrow">FOUNDATION FIX · LOCAL OCCT REPLAY</text>
  <text x="48" y="165" class="title">${xml(caption.title)}</text>
  <text x="48" y="201" class="subtitle">${xml(caption.detail)}</text>
  <rect x="854" y="105" width="380" height="473" rx="14" fill="#131d29" stroke="#2a394b"/>
  <text x="886" y="151" class="eyebrow">${xml(caption.step)}</text>
  <text x="886" y="190" class="step">holes ${region.holes.length} · outer ${span(region.outer, 0).toFixed(0)} × ${span(region.outer, 1).toFixed(0)} mm</text>
  <text x="886" y="226" class="metric">${volumeMm3.toLocaleString('en-US', { maximumFractionDigits: 1 })} mm³ · ${data.faceCount} faces</text>
  <path d="M886 246H1202" stroke="#344558"/>
  ${code}
  <path d="M886 475H1202" stroke="#344558"/>
  <circle cx="900" cy="514" r="6" fill="${valid ? '#70d6ad' : '#f87171'}"/>
  <text x="918" y="519" class="status">${valid ? 'VALID B-REP · LOCAL CHECK' : 'B-REP CHECK FAILED'}</text>
  <text x="886" y="546" class="small">hole centres: ${xml(holeCentres)} mm</text>
  <path d="${pathData(region.outer)}" fill="none" stroke="#e6edf5" stroke-width="2.6"/>
  ${bendLine}
  ${holes}
  ${dims}
  <text x="48" y="655" class="footer">flattenPatternWithHoles(records) → Region → DXF cut layer</text>
  <text x="48" y="681" class="disclaimer">Local script replay and geometry validation. Not a simulation, deployment check, or hardware acceptance test.</text>
  <style>
    text { font-family: Inter, 'Segoe UI', sans-serif; }
    .brand { fill:#e6edf5; font-size:17px; font-weight:700; letter-spacing:2px; }
    .eyebrow { fill:#61c9e8; font-size:12px; font-weight:700; letter-spacing:1.8px; }
    .title { fill:#f4f7fb; font-size:34px; font-weight:650; }
    .subtitle { fill:#9eafc2; font-size:17px; }
    .step { fill:#f3f6fa; font-size:18px; font-weight:600; }
    .metric { fill:#63c8e4; font-size:18px; font-weight:650; }
    .code { fill:#d8e4ef; font:12px ui-monospace, SFMono-Regular, Menlo, monospace; }
    .status { fill:#c9e8dc; font:700 13px ui-monospace, SFMono-Regular, Menlo, monospace; }
    .small { fill:#9eafc2; font-size:13px; }
    .footer { fill:#a9b9ca; font:14px ui-monospace, SFMono-Regular, Menlo, monospace; }
    .disclaimer { fill:#718397; font-size:12px; }
  </style>
  </svg>`;
}

async function main(): Promise<void> {
  mkdirSync(OUTPUT, { recursive: true });
  const framesDir = mkdtempSync(join(tmpdir(), 'kernelcad-post-bend-flat-demo-'));
  let frameIndex = 0;
  try {
    await initOcct();
    const code = readFileSync(resolve(SOURCE), 'utf8');
    const run = await runScript({ code, fileName: SOURCE });
    const built = await new RecomputeEngine(new OcctLowerer()).run(run.records, { paramTable: run.paramTable });
    const errors = built.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
    if (errors.length) throw new Error(`Local OCCT build failed: ${JSON.stringify(errors)}`);
    const terminal = built.shapes.get(run.records[run.records.length - 1]!.id);
    if (!(terminal instanceof OcctBackend)) throw new Error('The folded terminal shape was not lowered');
    const wrapped = terminal.getReplicadShape().wrapped;
    const valid = isTopologicallyValid(wrapped);
    if (!valid) throw new Error('Local OCCT result is not topologically valid');

    const region = await flattenPatternWithHoles(
      run.records, run.records[run.records.length - 1]!.id, built.shapes, run.paramTable,
    );
    if (region.holes.length !== 2) throw new Error(`Expected 2 post-bend holes, got ${region.holes.length}`);

    const data: DemoData = {
      region,
      volumeMm3: terminal.volume(),
      faceCount: terminal.faceHashes().length,
      valid,
    };
    // Bending replaces a straight strip with a K-factor arc, so the folded
    // volume is close to, but not exactly, the flat blank minus the two holes.
    const blankMinusHolesMm3 = 110 * 60 * 2 - 2 * Math.PI * 2.2 * 2.2 * 2;
    const bendVolumeDeltaMm3 = data.volumeMm3 - blankMinusHolesMm3;
    if (Math.abs(bendVolumeDeltaMm3) > 100) {
      throw new Error(`Folded volume ${data.volumeMm3} is not within 100 mm³ of ${blankMinusHolesMm3}`);
    }

    const verification = {
      checkedAt: '2026-11-25',
      source: SOURCE,
      kernel: 'occt',
      localBuild: 'passed',
      diagnostics: built.diagnostics.map((diagnostic) => ({ code: diagnostic.code, severity: diagnostic.severity })),
      topologicallyValid: valid,
      volumeMm3: data.volumeMm3,
      blankMinusHolesMm3,
      bendVolumeDeltaMm3,
      flatPattern: {
        outerSpanMm: [span(region.outer, 0), span(region.outer, 1)],
        holes: region.holes.map((hole) => ({ centre: centre(hole), span: [span(hole, 0), span(hole, 1)] })),
        bendLines: region.bendLines.length,
      },
      renderer: 'sharp SVG rasterizer fed with the real flattenPatternWithHoles Region.',
      videoProvenance: 'Local script replay and OCCT geometry validation. This is not a simulation, deployment check, or hardware acceptance test.',
    };
    writeFileSync(join(OUTPUT, 'verification.json'), `${JSON.stringify(verification, null, 2)}\n`);

    const writeFrame = async (stage: number, pulse: number): Promise<void> => {
      const svg = makeSvg(data, stage, pulse);
      const png = await sharp(Buffer.from(svg)).png().toBuffer();
      writeFileSync(join(framesDir, `frame-${String(frameIndex).padStart(4, '0')}.png`), png);
      frameIndex++;
    };
    for (let index = 0; index < FRAMES_PER_STAGE; index++) await writeFrame(0, 0);
    for (let index = 0; index < FRAMES_PER_STAGE; index++) await writeFrame(1, 0.5 + 0.5 * Math.sin((index / FRAMES_PER_STAGE) * Math.PI * 2));
    for (let index = 0; index < FRAMES_PER_STAGE; index++) await writeFrame(2, 0);
    writeFileSync(join(OUTPUT, 'hero-frame.png'), readFileSync(join(framesDir, `frame-${String(FRAMES_PER_STAGE).padStart(4, '0')}.png`)));

    const mp4 = join(OUTPUT, 'demo.mp4');
    execFileSync('ffmpeg', [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-framerate', String(FPS), '-i', join(framesDir, 'frame-%04d.png'),
      '-c:v', 'libx264', '-crf', '22', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart', mp4,
    ]);
    console.log(JSON.stringify({ video: mp4, frameCount: frameIndex, verification }));
  } finally {
    rmSync(framesDir, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
