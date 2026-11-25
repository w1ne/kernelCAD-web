// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Rounded sheet-metal blank demo. Replays the example through the local OCCT
// build, folds it, calls the real flattenPatternWithHoles path, and draws the
// returned Region (sampled rounded outline + bend line) as a short MP4. No
// browser or GPU context is used. Run with an outer fixed timeout.

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
import { ARC_CHORD_TOL_MM } from '../../../src/kernel/backends/occt/flatBlankOutline';
import type { Vec2 } from '../../../src/shared/intent/region';

const OUTPUT = resolve('docs/demos/sheetmetal-rounded-blank-flat-pattern');
const SOURCE = 'examples/sheet-metal-rounded-blank.kcad.ts';
const WIDTH = 1280;
const HEIGHT = 720;
const FPS = 10;
const FRAMES_PER_STAGE = 20;
const SCALE = 5.6;
const ORIGIN: Vec2 = [120, 600];

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

function distanceToRoundedRect(p: Vec2, w: number, h: number, r: number): number {
  const dx = Math.max(Math.abs(p[0] - w / 2) - (w / 2 - r), 0);
  const dy = Math.max(Math.abs(p[1] - h / 2) - (h / 2 - r), 0);
  return Math.abs(Math.hypot(dx, dy) - r);
}

interface DemoData {
  region: { outer: Vec2[]; bendLines: Array<{ start: Vec2; end: Vec2 }> };
  volumeMm3: number;
  expectedVolumeMm3: number;
  faceCount: number;
  valid: boolean;
  maxChordSagittaMm: number;
}

function stageCaption(stage: number): { title: string; step: string; detail: string } {
  if (stage === 0) {
    return {
      title: 'Rounded blank folds',
      step: '01 / FLAT BLANK',
      detail: '100 x 60 x 2 mm blank · four R10 corners',
    };
  }
  if (stage === 1) {
    return {
      title: 'Arc corners reach the flat pattern',
      step: '02 / FLATTEN',
      detail: '4 tangent arcs sampled at 0.005 mm chord sagitta',
    };
  }
  return {
    title: 'Laser-cut DXF',
    step: '03 / CUT LAYER',
    detail: '100 × 60 mm · R10 corners · one bend line',
  };
}

function makeSvg(data: DemoData, stage: number, pulse: number): string {
  const { region, volumeMm3, valid } = data;
  const caption = stageCaption(stage);
  const bend = region.bendLines[0];
  const cornerAlpha = stage === 0 ? 0.35 : 1;
  const cornerCentres: Array<[number, number]> = [[10, 10], [90, 10], [90, 50], [10, 50]];
  const corners = cornerCentres.map(([cx, cy], index) =>
    `<circle cx="${screen([cx, cy])[0]}" cy="${screen([cx, cy])[1]}" r="${(2 + pulse).toFixed(2)}" fill="#54c8e6" opacity="${cornerAlpha}" data-corner="${index}"/>`,
  ).join('');
  const upperRight = screen([90, 10]);
  const cornerLabel = `<g stroke="#54c8e6" stroke-width="1.2" fill="#8fd8ec" font-size="14" font-family="Inter, sans-serif" opacity="${cornerAlpha}">
    <path d="M${(upperRight[0] + 18).toFixed(2)} ${(upperRight[1] - 18).toFixed(2)}L${(upperRight[0] + 58).toFixed(2)} ${(upperRight[1] - 42).toFixed(2)}"/>
    <text x="${(upperRight[0] + 62).toFixed(2)}" y="${(upperRight[1] - 44).toFixed(2)}">R10 arc centres</text>
  </g>`;
  const bendLine = bend
    ? `<path d="M${screen(bend.start).map((v) => v.toFixed(2)).join(' ')} L${screen(bend.end).map((v) => v.toFixed(2)).join(' ')}" stroke="#f5a623" stroke-width="2" stroke-dasharray="9 7"/>`
    : '';
  const dims = stage === 2
    ? `<g stroke="#9eafc2" stroke-width="1.2" fill="#c9d6e3" font-size="17" font-family="Inter, sans-serif">
        <path d="M${screen([0, 0])[0]} ${screen([0, 0])[1] + 34}H${screen([100, 0])[0]}" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
        <text x="${(screen([0, 0])[0] + screen([100, 0])[0]) / 2 - 30}" y="${screen([0, 0])[1] + 60}">100 mm</text>
        <path d="M${screen([0, 0])[0] - 34} ${screen([0, 0])[1]}V${screen([0, 60])[1]}" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
        <text x="${screen([0, 0])[0] - 92}" y="${(screen([0, 0])[1] + screen([0, 60])[1]) / 2}">60 mm</text>
        <text x="${screen([60, 46])[0]}" y="${screen([60, 46])[1]}">4 × R10 sampled</text>
        <text x="${screen([60, 50])[0]}" y="${screen([60, 50])[1] + 18}" fill="#f5a623">bend line x = 50</text>
      </g>`
    : '';
  const code = [
    'const profile = path()',
    '  .moveTo(10, 0).lineTo(90, 0)',
    '  .tangentArc(100, 10).lineTo(100, 50)',
    '  .tangentArc(90, 60).lineTo(10, 60)',
    '  .tangentArc(0, 50).lineTo(0, 10)',
    '  .tangentArc(10, 0).close();',
    'return sheetMetal(profile, {',
    '  thickness: 2, kFactor: 0.38 })',
    '  .bend({ atX: 50 }, 90, 3);',
  ].map((line, index) => `<text x="884" y="${294 + index * 21}" class="code">${xml(line)}</text>`).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x2="0" y2="1"><stop stop-color="#121b28"/><stop offset="1" stop-color="#0a1018"/></linearGradient>
    <radialGradient id="glow"><stop stop-color="#24435b" stop-opacity=".65"/><stop offset="1" stop-color="#101722" stop-opacity="0"/></radialGradient>
    <marker id="arrow" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7" fill="none" stroke="#9eafc2"/></marker>
  </defs>
  <rect width="1280" height="720" fill="url(#bg)"/>
  <ellipse cx="430" cy="380" rx="430" ry="310" fill="url(#glow)"/>
  <path d="M0 84H1280" stroke="#253344"/>
  <text x="48" y="53" class="brand">KERNELCAD <tspan fill="#54c8e6">/</tspan> SHEET METAL</text>
  <text x="48" y="127" class="eyebrow">FOUNDATION FIX · LOCAL OCCT REPLAY</text>
  <text x="48" y="165" class="title">${xml(caption.title)}</text>
  <text x="48" y="201" class="subtitle">${xml(caption.detail)}</text>
  <rect x="854" y="105" width="380" height="473" rx="14" fill="#131d29" stroke="#2a394b"/>
  <text x="886" y="151" class="eyebrow">${xml(caption.step)}</text>
  <text x="886" y="190" class="step">outer ${span(region.outer, 0).toFixed(0)} × ${span(region.outer, 1).toFixed(0)} mm · ${region.outer.length} pts</text>
  <text x="886" y="226" class="metric">${volumeMm3.toLocaleString('en-US', { maximumFractionDigits: 1 })} mm³ · ${data.faceCount} faces</text>
  <path d="M886 246H1202" stroke="#344558"/>
  ${code}
  <path d="M886 475H1202" stroke="#344558"/>
  <circle cx="900" cy="514" r="6" fill="${valid ? '#70d6ad' : '#f87171'}"/>
  <text x="918" y="519" class="status">${valid ? 'VALID B-REP · LOCAL CHECK' : 'B-REP CHECK FAILED'}</text>
  <text x="886" y="546" class="small">max chord sagitta ${data.maxChordSagittaMm.toFixed(4)} mm</text>
  <path d="${pathData(region.outer)}" fill="#1b2938" stroke="#e6edf5" stroke-width="2.6"/>
  ${corners}
  ${cornerLabel}
  ${bendLine}
  ${dims}
  <text x="48" y="655" class="footer">flattenPatternWithHoles(records) → Region → DXF cut layer</text>
  <text x="48" y="681" class="disclaimer">Local script replay and geometry validation. Not a simulation, deployment check, or hardware acceptance test.</text>
  <style>
    text { font-family: Inter, 'Segoe UI', sans-serif; }
    .brand { fill:#e6edf5; font-size:17px; font-weight:700; letter-spacing:2px; }
    .eyebrow { fill:#61c9e8; font-size:12px; font-weight:700; letter-spacing:1.8px; }
    .title { fill:#f4f7fb; font-size:34px; font-weight:650; }
    .subtitle { fill:#9eafc2; font-size:17px; }
    .step { fill:#f3f6fa; font-size:16px; font-weight:600; }
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
  const framesDir = mkdtempSync(join(tmpdir(), 'kernelcad-rounded-blank-demo-'));
  let frameIndex = 0;
  try {
    await initOcct();
    const code = readFileSync(resolve(SOURCE), 'utf8');
    const run = await runScript({ code, fileName: SOURCE });
    const built = await new RecomputeEngine(new OcctLowerer()).run(run.records, { paramTable: run.paramTable });
    const errors = built.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
    if (errors.length) throw new Error(`Local OCCT build failed: ${JSON.stringify(errors)}`);
    const terminalId = run.records[run.records.length - 1]!.id;
    const terminal = built.shapes.get(terminalId);
    if (!(terminal instanceof OcctBackend)) throw new Error('The folded terminal shape was not lowered');
    const valid = isTopologicallyValid(terminal.getReplicadShape().wrapped);
    if (!valid) throw new Error('Local OCCT result is not topologically valid');

    const region = await flattenPatternWithHoles(run.records, terminalId, built.shapes, run.paramTable);
    if (region.bendLines.length !== 1) throw new Error(`Expected one bend line, got ${region.bendLines.length}`);
    if (region.holes.length !== 0) throw new Error(`Expected no holes, got ${region.holes.length}`);

    // Every sampled vertex sits on the authored arc; the polyline chords cut
    // inside it. Measure the chord midpoints, which carry the sagitta.
    const maxDeviation = Math.max(...region.outer.map((p, i) => {
      const q = region.outer[(i + 1) % region.outer.length];
      return distanceToRoundedRect([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], 100, 60, 10);
    }));
    if (maxDeviation > ARC_CHORD_TOL_MM + 1e-6) {
      throw new Error(`Sampled chord deviates ${maxDeviation} mm from the authored arc`);
    }

    // Blank area (rounded corners) x thickness, plus the K-factor bend delta.
    const blankArea = 100 * 60 - (4 - Math.PI) * 100;
    const bendAllowance = (Math.PI / 2) * (0.38 * 2 + 3);
    const sectorVolume = (Math.PI / 2) * 60 * 2 * (3 + 2 / 2);
    const expectedVolumeMm3 = blankArea * 2 - bendAllowance * 60 * 2 + sectorVolume;
    const data: DemoData = {
      region,
      volumeMm3: terminal.volume(),
      expectedVolumeMm3,
      faceCount: terminal.faceHashes().length,
      valid,
      maxChordSagittaMm: maxDeviation,
    };
    if (Math.abs(data.volumeMm3 - expectedVolumeMm3) > 1) {
      throw new Error(`Folded volume ${data.volumeMm3} is not within 1 mm³ of ${expectedVolumeMm3}`);
    }

    const verification = {
      checkedAt: '2026-11-25',
      source: SOURCE,
      kernel: 'occt',
      localBuild: 'passed',
      diagnostics: built.diagnostics.map((diagnostic) => ({ code: diagnostic.code, severity: diagnostic.severity })),
      topologicallyValid: valid,
      volumeMm3: data.volumeMm3,
      expectedVolumeMm3,
      flatPattern: {
        outerPoints: region.outer.length,
        outerSpanMm: [span(region.outer, 0), span(region.outer, 1)],
        cornerRadiusMm: 10,
        maxChordSagittaMm: maxDeviation,
        chordToleranceMm: ARC_CHORD_TOL_MM,
        bendLines: region.bendLines.length,
        holes: region.holes.length,
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
