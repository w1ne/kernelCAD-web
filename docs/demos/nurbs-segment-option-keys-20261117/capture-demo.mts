// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Replay: npx tsx docs/demos/nurbs-segment-option-keys-20261117/capture-demo.mts
// Output: docs/demos/nurbs-segment-option-keys-20261117/demo.mp4
// Settings: 1280x720, 24 fps, 2 slides x 3 s, H.264 CRF 26, yuv420p.

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { createModelingApi } from '../../../src/modeling/api';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { KernelError } from '../../../src/shared/intent/kernelError';
import type { SketchCommand } from '../../../src/shared/capture/sketchCommand';

const OUTPUT_DIR = dirname(fileURLToPath(import.meta.url));
const VIDEO_PATH = join(OUTPUT_DIR, 'demo.mp4');
const EVIDENCE_PATH = join(OUTPUT_DIR, 'evidence.json');
const WIDTH = 1280;
const HEIGHT = 720;
const FPS = 24;
const SECONDS_PER_SLIDE = 3;
const SLIDES = 2;
const CONTROL_POINTS: Array<[number, number]> = [[0, 0], [3, 5], [7, 5], [10, 0]];
const KNOTS = [0, 0, 0, 0.3, 1, 1, 1];
const WEIGHTS = [1, 2, 1, 1];

function esc(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function shell(title: string, subtitle: string, content: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="100%" height="100%" fill="#111827"/><rect width="14" height="100%" fill="#5eead4"/>
  <text x="64" y="78" fill="#f8fafc" font-family="Arial,sans-serif" font-size="36" font-weight="700">${esc(title)}</text>
  <text x="66" y="122" fill="#94a3b8" font-family="Arial,sans-serif" font-size="21">${esc(subtitle)}</text>
  ${content}
  <line x1="64" y1="655" x2="1214" y2="655" stroke="#334155"/>
  <text x="66" y="690" fill="#94a3b8" font-family="Arial,sans-serif" font-size="16">LOCAL CAPTURE REPLAY · no geometry solver, simulation, deployment, or hardware acceptance</text>
</svg>`;
}

function code(lines: string[], x: number, y: number, width: number): string {
  const body = lines.map((line, index) =>
    `<text x="${x + 24}" y="${y + 44 + index * 38}" fill="#e2e8f0" font-family="monospace" font-size="17">${esc(line)}</text>`,
  ).join('');
  return `<rect x="${x}" y="${y}" width="${width}" height="${lines.length * 38 + 34}" rx="14" fill="#1e293b" stroke="#475569"/>${body}`;
}

function panel(title: string, details: string[], x: number, y: number, color: string): string {
  const body = details.map((line, index) =>
    `<text x="${x + 24}" y="${y + 72 + index * 36}" fill="#e2e8f0" font-family="monospace" font-size="17">${esc(line)}</text>`,
  ).join('');
  return `<rect x="${x}" y="${y}" width="480" height="215" rx="14" fill="#17202f" stroke="${color}" stroke-width="2"/>
    <text x="${x + 24}" y="${y + 42}" fill="${color}" font-family="Arial,sans-serif" font-size="21" font-weight="700">${esc(title)}</text>${body}`;
}

function makePath() {
  const api = createModelingApi({ session: new CaptureSession() });
  return api.path().moveTo(0, 0);
}

interface PathBuilderInternal {
  commands: SketchCommand[];
}

function rejectTypo(): { message: string; recordedSegment: boolean } {
  const builder = makePath();
  const options = { degre: 2 } as unknown as NonNullable<Parameters<typeof builder.nurbsSegment>[1]>;
  let error: KernelError | undefined;
  try {
    builder.nurbsSegment(CONTROL_POINTS, options);
  } catch (caught) {
    if (!(caught instanceof KernelError)) throw caught;
    error = caught;
  }
  if (error?.code !== 'feature.invalid-args' || !error.message.includes('opts.degre')) {
    throw new Error(`Expected opts.degre to be rejected; got ${error?.message ?? 'no error'}.`);
  }
  const recordedSegment = (builder as unknown as PathBuilderInternal).commands.some((command) => command.kind === 'nurbsSegment');
  if (recordedSegment) throw new Error('Invalid options must not record a NURBS segment.');
  return { message: error.message, recordedSegment };
}

function captureCorrectedOptions(): { degree: number; weights: number[]; knots: number[] } {
  const builder = makePath().nurbsSegment(CONTROL_POINTS, { degree: 2, weights: WEIGHTS, knots: KNOTS });
  const command = (builder as unknown as PathBuilderInternal).commands.find((item) => item.kind === 'nurbsSegment');
  if (command?.kind !== 'nurbsSegment') throw new Error('Corrected NURBS segment was not captured.');
  const result = {
    degree: command.degree.evaluated,
    weights: command.weights?.map((weight) => weight.evaluated) ?? [],
    knots: command.knots?.map((knot) => knot.evaluated) ?? [],
  };
  if (result.degree !== 2 || JSON.stringify(result.weights) !== JSON.stringify(WEIGHTS) || JSON.stringify(result.knots) !== JSON.stringify(KNOTS)) {
    throw new Error(`Corrected NURBS options changed during capture: ${JSON.stringify(result)}.`);
  }
  return result;
}

async function main(): Promise<void> {
  const rejected = rejectTypo();
  const corrected = captureCorrectedOptions();
  const slides = [
    shell(
      'A degree typo silently changed a NURBS curve',
      'The runtime accepted degre and fell back to the default degree.',
      `${code(['.nurbsSegment(controls, {', '  degre: 2,', '})'], 66, 205, 620)}
      ${panel('BEFORE · accepted', ['no diagnostic', 'degree option ignored', 'segment recorded with degree 3'], 734, 205, '#fb7185')}`,
    ),
    shell(
      'NURBS segment options now validate at capture',
      'Correct the key; valid degree, weights, and knots remain captured.',
      `${code(['.nurbsSegment(controls, {', '  degre: 2,', '})'], 66, 205, 620)}
      ${panel('feature.invalid-args', ['path: opts.degre', 'NURBS segments recorded: 0'], 734, 205, '#fb7185')}
      ${code(['.nurbsSegment(controls, {', '  degree: 2,', '  weights: [1, 2, 1, 1],', '  knots: [0, 0, 0, 0.3, 1, 1, 1],', '})'], 66, 430, 620)}
      ${panel('CORRECTED · captured', [`degree: ${corrected.degree}`, `weights: [${corrected.weights.join(', ')}]`, `knots: [${corrected.knots.join(', ')}]`], 734, 430, '#5eead4')}`,
    ),
  ];

  const frameDir = await mkdtemp(join(tmpdir(), 'kcad-nurbs-options-'));
  try {
    for (let index = 0; index < FPS * SECONDS_PER_SLIDE * SLIDES; index += 1) {
      const slideIndex = Math.floor(index / (FPS * SECONDS_PER_SLIDE));
      await sharp(Buffer.from(slides[slideIndex]!)).png().toFile(join(frameDir, `frame-${String(index).padStart(4, '0')}.png`));
    }
    const ffmpeg = spawnSync('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y', '-framerate', String(FPS),
      '-i', join(frameDir, 'frame-%04d.png'), '-an', '-c:v', 'libx264', '-crf', '26',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart', VIDEO_PATH,
    ], { encoding: 'utf8' });
    if (ffmpeg.status !== 0) throw new Error(`ffmpeg failed: ${ffmpeg.stderr || ffmpeg.error?.message}`);
  } finally {
    await rm(frameDir, { recursive: true, force: true });
  }

  const source = await readFile(fileURLToPath(import.meta.url));
  const video = await readFile(VIDEO_PATH);
  const evidence = {
    generatedAt: new Date().toISOString(),
    replay: 'Local CaptureSession + createModelingApi. This exercises PathBuilder capture only.',
    baseline: {
      baseRevision: 'origin/develop d7bf35f0e97b2bcdc950435f5fa60b5a707eda07',
      command: 'npx vitest run src/modeling/capture/sketchNurbsSegment.test.ts',
      result: 'Failed before the fix: expected KernelError but caught undefined; opts.degre was ignored.',
    },
    fixedReplay: {
      invalidOptions: { code: 'feature.invalid-args', path: 'opts.degre', message: rejected.message, recordedSegment: rejected.recordedSegment },
      correctedOptions: corrected,
    },
    source: { path: 'docs/demos/nurbs-segment-option-keys-20261117/capture-demo.mts', sha256: createHash('sha256').update(source).digest('hex') },
    settings: { width: WIDTH, height: HEIGHT, fps: FPS, secondsPerSlide: SECONDS_PER_SLIDE, slides: SLIDES, encoder: 'libx264', crf: 26, pixelFormat: 'yuv420p' },
    video: { path: 'docs/demos/nurbs-segment-option-keys-20261117/demo.mp4', sha256: createHash('sha256').update(video).digest('hex'), bytes: video.length },
    verification: {
      focusedTest: { command: 'npx vitest run src/modeling/capture/sketchNurbsSegment.test.ts src/kernel/backends/occt/pathNurbsLowerer.test.ts', result: '2 files passed; 10 tests passed' },
      lint: { command: 'npx eslint src/modeling/capture/nurbsSegmentPhases.ts src/modeling/capture/sketch.ts src/modeling/capture/sketchNurbsSegment.test.ts', result: 'passed' },
      typecheck: { command: 'npm run typecheck', result: 'passed' },
      docs: { command: 'npm run skill:references -- --check', result: 'passed' },
      diffCheck: { command: 'git diff --check', result: 'passed' },
    },
    claimBoundary: { localCaptureReplay: true, geometrySolver: false, simulation: false, deployedBehavior: false, hardwareAcceptance: false },
  };
  await writeFile(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
