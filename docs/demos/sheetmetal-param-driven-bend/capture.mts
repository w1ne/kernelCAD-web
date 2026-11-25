// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Param-driven sheet-metal demo. Captures one script whose thickness,
// k-factor, bend line, radius and angle are param(), then re-lowers the same
// captured records after moving the table. Draws the real flattened Region and
// the measured volumes as a short MP4. No browser or GPU context is used.
// Run with an outer fixed timeout.

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
import type { FeatureRecord } from '../../../src/shared/intent/featureRecord';
import type { ParamTable } from '../../../src/shared/runtime/paramTable';

const OUTPUT = resolve('docs/demos/sheetmetal-param-driven-bend');
const SOURCE = 'examples/sheet-metal-param-driven-bend.kcad.ts';
const WIDTH = 1280;
const HEIGHT = 720;
const FPS = 10;
const FRAMES_PER_STAGE = 18;
const SCALE = 5.2;
const ORIGIN: Vec2 = [140, 540];

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

interface Stage {
  region: { outer: Vec2[]; holes: Vec2[][]; bendLines: Array<{ start: Vec2; end: Vec2 }> };
  volumeMm3: number;
  faceCount: number;
  valid: boolean;
  bbox: { min: [number, number, number]; max: [number, number, number] };
  thickness: number;
  kFactor: number;
  bendAt: number;
  radius: number;
  angle: number;
}

function captionOf(stage: number): { title: string; step: string; detail: string } {
  if (stage === 0) {
    return {
      title: 'Every dimension is a param()',
      step: '01 / CAPTURE + LOWER',
      detail: 'thickness 2 · k 0.38 · bend x 55 · r 3 · 90°',
    };
  }
  if (stage === 1) {
    return {
      title: 'Slider sweep on captured records',
      step: '02 / RE-LOWER',
      detail: 'Thickness 3 · BendLine 55 → 20 · no re-capture',
    };
  }
  return {
    title: 'Flat pattern follows the table',
    step: '03 / FLATTEN',
    detail: 'bend line at 20 mm · 3 mm blank',
  };
}

function makeSvg(stage: Stage, index: number, pulse: number): string {
  const { region, volumeMm3, faceCount, valid, bbox, thickness, kFactor, bendAt, radius, angle } = stage;
  const caption = captionOf(index);
  const bend = region.bendLines[0];
  const bendLine = bend
    ? `<path d="M${screen(bend.start).map((v) => v.toFixed(2)).join(' ')} L${screen(bend.end).map((v) => v.toFixed(2)).join(' ')}" stroke="#f5a623" stroke-width="${(2 + pulse).toFixed(2)}" stroke-dasharray="9 7"/>`
    : '';
  const dims = index === 2
    ? `<g stroke="#9eafc2" stroke-width="1.2" fill="#c9d6e3" font-size="17" font-family="Inter, sans-serif">
        <path d="M${screen([0, 0])[0]} ${screen([0, 0])[1] + 34}H${screen([110, 0])[0]}" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
        <text x="${(screen([0, 0])[0] + screen([110, 0])[0]) / 2 - 30}" y="${screen([0, 0])[1] + 60}">110 mm</text>
        <text x="${screen([bendAt, 40])[0] + 8}" y="${screen([bendAt, 40])[1] - 12}" fill="#f5a623">bend line x = ${bendAt}</text>
        <text x="${screen([70, 52])[0]}" y="${screen([70, 52])[1]}" fill="#63c8e4">thickness ${thickness} mm</text>
      </g>`
    : '';
  const code = [
    'const thickness  = param(',
    "  'Thickness', 2, { unit: 'mm' });",
    'const kFactor    = param(',
    "  'KFactor', 0.38);",
    'const bendLine   = param(',
    "  'BendLine', 55, { unit: 'mm' });",
    'const bendRadius = param(',
    "  'BendRadius', 3, { unit: 'mm' });",
    'const bendAngle  = param(',
    "  'BendAngle', 90, { unit: 'deg' });",
    'return sheetMetal(profile, {',
    '  thickness, kFactor })',
    '  .bend({ atX: bendLine },',
    '    bendAngle, bendRadius);',
  ].map((line, i) => `<text x="884" y="${300 + i * 17}" class="code">${xml(line)}</text>`).join('');

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
  <text x="48" y="127" class="eyebrow">ISSUE #1763 · LOCAL OCCT REPLAY</text>
  <text x="48" y="165" class="title">${xml(caption.title)}</text>
  <text x="48" y="201" class="subtitle">${xml(caption.detail)}</text>
  <rect x="854" y="105" width="380" height="473" rx="14" fill="#131d29" stroke="#2a394b"/>
  <text x="886" y="151" class="eyebrow">${xml(caption.step)}</text>
  <text x="886" y="190" class="step">t ${thickness} mm · k ${kFactor} · r ${radius} mm · ${angle}°</text>
  <text x="886" y="226" class="metric">${volumeMm3.toLocaleString('en-US', { maximumFractionDigits: 1 })} mm³ · ${faceCount} faces</text>
  <path d="M886 246H1202" stroke="#344558"/>
  ${code}
  <path d="M886 570H1202" stroke="#344558"/>
  <circle cx="900" cy="601" r="6" fill="${valid ? '#70d6ad' : '#f87171'}"/>
  <text x="918" y="606" class="status">${valid ? 'VALID B-REP · LOCAL CHECK' : 'B-REP CHECK FAILED'}</text>
  <text x="886" y="553" class="small">bbox ${(bbox.max[0] - bbox.min[0]).toFixed(1)} × ${(bbox.max[1] - bbox.min[1]).toFixed(1)} × ${(bbox.max[2] - bbox.min[2]).toFixed(1)} mm</text>
  <path d="${pathData(region.outer)}" fill="#1b2a3b" stroke="#e6edf5" stroke-width="2.6"/>
  ${bendLine}
  ${dims}
  <text x="48" y="655" class="footer">paramTable.set('Thickness', 3); paramTable.set('BendLine', 20) → re-lower → flattenPatternWithHoles</text>
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
    .footer { fill:#a9b9ca; font:13px ui-monospace, SFMono-Regular, Menlo, monospace; }
    .disclaimer { fill:#718397; font-size:12px; }
  </style>
  </svg>`;
}

async function lower(records: readonly FeatureRecord[], paramTable: ParamTable) {
  const result = await new RecomputeEngine(new OcctLowerer()).run(records, { paramTable });
  const errors = result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
  if (errors.length) throw new Error(`Local OCCT build failed: ${JSON.stringify(errors)}`);
  return result;
}

async function main(): Promise<void> {
  mkdirSync(OUTPUT, { recursive: true });
  const framesDir = mkdtempSync(join(tmpdir(), 'kernelcad-param-bend-demo-'));
  let frameIndex = 0;
  try {
    await initOcct();
    const code = readFileSync(resolve(SOURCE), 'utf8');
    const run = await runScript({ code, fileName: SOURCE });
    const terminalId = run.records[run.records.length - 1]!.id;

    const measure = async (): Promise<Stage> => {
      const built = await lower(run.records, run.paramTable);
      const terminal = built.shapes.get(terminalId);
      if (!(terminal instanceof OcctBackend)) throw new Error('The folded terminal shape was not lowered');
      const valid = isTopologicallyValid(terminal.getReplicadShape().wrapped);
      if (!valid) throw new Error('Local OCCT result is not topologically valid');
      const region = await flattenPatternWithHoles(run.records, terminalId, built.shapes, run.paramTable);
      return {
        region,
        volumeMm3: terminal.volume(),
        faceCount: terminal.faceHashes().length,
        valid,
        bbox: terminal.boundingBox(),
        thickness: Number(run.paramTable.get('Thickness').value),
        kFactor: Number(run.paramTable.get('KFactor').value),
        bendAt: region.bendLines[0]!.start[0],
        radius: Number(run.paramTable.get('BendRadius').value),
        angle: Number(run.paramTable.get('BendAngle').value),
      };
    };

    const first = await measure();
    run.paramTable.set('Thickness', 3);
    run.paramTable.set('BendLine', 20);
    const second = await measure();

    // The same values as literals must lower to the same solid: the param path
    // is not allowed to change geometry. Compare locally, not against a
    // deployed-version number.
    const literalRun = await runScript({
      code: `
        const profile = path().moveTo(0, 0).lineTo(110, 0).lineTo(110, 60).lineTo(0, 60).close();
        return sheetMetal(profile, { thickness: 2, kFactor: 0.38 }).bend({ atX: 55 }, 90, 3);
      `,
      fileName: 'sheet-metal-literal-baseline.kcad.ts',
    });
    const literalBuilt = await lower(literalRun.records, literalRun.paramTable);
    const literal = literalBuilt.shapes.get(literalRun.records[literalRun.records.length - 1]!.id);
    if (!(literal instanceof OcctBackend)) throw new Error('The literal baseline was not lowered');
    const literalVolumeMm3 = literal.volume();
    if (Math.abs(first.volumeMm3 - literalVolumeMm3) > 1e-6) {
      throw new Error(`Param part volume ${first.volumeMm3} differs from the literal ${literalVolumeMm3} mm³`);
    }
    if (Math.abs(first.bendAt - 55) > 1e-6) throw new Error(`Expected bend line 55, got ${first.bendAt}`);
    if (Math.abs(second.bendAt - 20) > 1e-6) throw new Error(`Expected bend line 20, got ${second.bendAt}`);
    if (second.volumeMm3 <= first.volumeMm3 * 1.3) {
      throw new Error(`Thickness 3 volume ${second.volumeMm3} did not grow over ${first.volumeMm3}`);
    }
    if (second.region.bendLines.length !== 1) throw new Error('Expected one bend line after the sweep');

    const verification = {
      checkedAt: '2026-11-25',
      source: SOURCE,
      issue: 1763,
      kernel: 'occt',
      localBuild: 'passed',
      stages: [first, second].map((stage) => ({
        thickness: stage.thickness,
        kFactor: stage.kFactor,
        bendLineMm: stage.bendAt,
        radiusMm: stage.radius,
        angleDeg: stage.angle,
        volumeMm3: stage.volumeMm3,
        faceCount: stage.faceCount,
        topologicallyValid: stage.valid,
        bboxMm: {
          span: [
            stage.bbox.max[0] - stage.bbox.min[0],
            stage.bbox.max[1] - stage.bbox.min[1],
            stage.bbox.max[2] - stage.bbox.min[2],
          ],
        },
        flatPattern: {
          outerSpanMm: [span(stage.region.outer, 0), span(stage.region.outer, 1)],
          bendLines: stage.region.bendLines.length,
        },
      })),
      literalBaselineMm3: literalVolumeMm3,
      renderer: 'sharp SVG rasterizer fed with the real flattenPatternWithHoles Region.',
      videoProvenance: 'Local script replay and OCCT geometry validation. This is not a simulation, deployment check, or hardware acceptance test.',
    };
    writeFileSync(join(OUTPUT, 'verification.json'), `${JSON.stringify(verification, null, 2)}\n`);

    const writeFrame = async (stage: Stage, index: number, pulse: number): Promise<void> => {
      const png = await sharp(Buffer.from(makeSvg(stage, index, pulse))).png().toBuffer();
      writeFileSync(join(framesDir, `frame-${String(frameIndex).padStart(4, '0')}.png`), png);
      frameIndex++;
    };
    for (let i = 0; i < FRAMES_PER_STAGE; i++) await writeFrame(first, 0, 0.2);
    for (let i = 0; i < FRAMES_PER_STAGE; i++) {
      await writeFrame(second, 1, 0.5 + 0.5 * Math.sin((i / FRAMES_PER_STAGE) * Math.PI * 2));
    }
    for (let i = 0; i < FRAMES_PER_STAGE; i++) await writeFrame(second, 2, 0.2);
    writeFileSync(
      join(OUTPUT, 'hero-frame.png'),
      readFileSync(join(framesDir, `frame-${String(FRAMES_PER_STAGE * 2).padStart(4, '0')}.png`)),
    );

    const mp4 = join(OUTPUT, 'demo.mp4');
    execFileSync('ffmpeg', [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-framerate', String(FPS), '-i', join(framesDir, 'frame-%04d.png'),
      '-c:v', 'libx264', '-crf', '22', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart', mp4,
    ]);
    console.log(JSON.stringify({ video: mp4, frameCount: frameIndex, verification }, null, 2));
  } finally {
    rmSync(framesDir, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
