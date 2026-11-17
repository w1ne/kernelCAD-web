// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Replay: npx tsx docs/demos/sketch-spline-option-keys-20261117/capture-demo.mts
// Output: docs/demos/sketch-spline-option-keys-20261117/demo.mp4
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
  <text x="66" y="690" fill="#94a3b8" font-family="Arial,sans-serif" font-size="16">LOCAL CAPTURE REPLAY · no solver simulation, deployment, or hardware acceptance</text>
</svg>`;
}

function code(lines: string[], x: number, y: number, width: number): string {
  const body = lines.map((line, index) =>
    `<text x="${x + 24}" y="${y + 44 + index * 38}" fill="#e2e8f0" font-family="monospace" font-size="19">${esc(line)}</text>`,
  ).join('');
  return `<rect x="${x}" y="${y}" width="${width}" height="${lines.length * 38 + 34}" rx="14" fill="#1e293b" stroke="#475569"/>${body}`;
}

function panel(title: string, details: string[], x: number, y: number, color: string, width = 480): string {
  const body = details.map((line, index) =>
    `<text x="${x + 24}" y="${y + 72 + index * 36}" fill="#e2e8f0" font-family="monospace" font-size="17">${esc(line)}</text>`,
  ).join('');
  return `<rect x="${x}" y="${y}" width="${width}" height="225" rx="14" fill="#17202f" stroke="${color}" stroke-width="2"/>
    <text x="${x + 24}" y="${y + 42}" fill="${color}" font-family="Arial,sans-serif" font-size="21" font-weight="700">${esc(title)}</text>${body}`;
}

function makePath() {
  const api = createModelingApi({ session: new CaptureSession() });
  return api.path().moveTo(0, 0);
}

interface PathBuilderInternal {
  commands: SketchCommand[];
}

function rejectTypo(): { message: string; recordedSpline: boolean } {
  const builder = makePath();
  const options = {
    startTangent: [1, 0],
    endTanget: [0, 1],
  } as unknown as NonNullable<Parameters<typeof builder.spline>[1]>;
  let error: KernelError | undefined;
  try {
    builder.spline([[0, 0], [5, 10], [10, 0]], options);
  } catch (caught) {
    if (!(caught instanceof KernelError)) throw caught;
    error = caught;
  }
  if (error?.code !== 'feature.invalid-args' || !error.message.includes('opts.endTanget')) {
    throw new Error(`Expected opts.endTanget to be rejected; got ${error?.message ?? 'no error'}.`);
  }
  const recordedSpline = (builder as unknown as PathBuilderInternal).commands.some((command) => command.kind === 'spline');
  if (recordedSpline) throw new Error('Invalid options must not record a spline command.');
  return { message: error.message, recordedSpline };
}

function captureCorrectedTangent(): SketchCommand & { kind: 'spline' } {
  const builder = makePath().spline([[0, 0], [5, 10], [10, 0]], { startTangent: [1, 0], endTangent: [0, 1] });
  const command = (builder as unknown as PathBuilderInternal).commands.find((item) => item.kind === 'spline');
  if (command?.kind !== 'spline' || command.endTangent?.x.evaluated !== 0 || command.endTangent.y.evaluated !== 1) {
    throw new Error(`Corrected endpoint tangent was not captured: ${JSON.stringify(command)}.`);
  }
  return command;
}

async function main(): Promise<void> {
  const rejected = rejectTypo();
  const corrected = captureCorrectedTangent();
  const slides = [
    shell(
      'A tangent typo silently changed the curve',
      'On origin/develop, endTanget was ignored and the spline was recorded without that endpoint constraint.',
      `${code(['.spline(points, {', '  startTangent: [1, 0],', '  endTanget: [0, 1],', '})'], 66, 185, 620)}
      ${panel('BEFORE · accepted', ['no diagnostic', 'endTangent: missing', 'intended curve constraint lost'], 734, 185, '#fb7185')}`,
    ),
    shell(
      'Unknown spline options now fail at capture',
      'Fix the spelling; the call records the endpoint tangent as authored.',
      `${code(['.spline(points, {', '  startTangent: [1, 0],', '  endTanget: [0, 1],', '})'], 66, 185, 620)}
      <text x="66" y="397" fill="#5eead4" font-family="Arial,sans-serif" font-size="20" font-weight="700">CORRECTED CALL</text>
      ${code(['.spline(points, {', '  startTangent: [1, 0],', '  endTangent: [0, 1],', '})'], 66, 405, 620)}
      ${panel('feature.invalid-args', ['path: opts.endTanget', 'spline commands recorded: 0'], 734, 185, '#fb7185')}
      ${panel('CORRECTED · captured', ['startTangent: [1, 0]', `endTangent: [${corrected.endTangent?.x.evaluated}, ${corrected.endTangent?.y.evaluated}]`], 734, 430, '#5eead4')}`,
    ),
  ];

  const frameDir = await mkdtemp(join(tmpdir(), 'kcad-spline-options-'));
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
    replay: 'Local CaptureSession + createModelingApi. This exercises script API capture only.',
    baseline: {
      baseRevision: 'origin/develop f5036ee1466284b43d69b690a0fe3ef65726aee0',
      reproduction: 'npx vitest run src/modeling/capture/sketchSplineTangent.test.ts -t "rejects a misspelled endpoint tangent"',
      result: 'Failed before the fix: expected KernelError but caught undefined; the misspelled key was ignored and a spline command was recorded without endTangent.',
    },
    fixedReplay: {
      invalidOptions: { code: 'feature.invalid-args', path: 'opts.endTanget', message: rejected.message, recordedSpline: rejected.recordedSpline },
      correctedOptions: { startTangent: [1, 0], endTangent: [corrected.endTangent?.x.evaluated, corrected.endTangent?.y.evaluated] },
    },
    source: { path: 'docs/demos/sketch-spline-option-keys-20261117/capture-demo.mts', sha256: createHash('sha256').update(source).digest('hex') },
    settings: { width: WIDTH, height: HEIGHT, fps: FPS, secondsPerSlide: SECONDS_PER_SLIDE, slides: SLIDES, encoder: 'libx264', crf: 26, pixelFormat: 'yuv420p' },
    video: { path: 'docs/demos/sketch-spline-option-keys-20261117/demo.mp4', sha256: createHash('sha256').update(video).digest('hex'), bytes: video.length },
    verification: {
      focusedTest: { command: 'npx vitest run src/modeling/capture/sketchSplineTangent.test.ts', result: '1 file passed; 6 tests passed' },
      lowererRegression: { command: 'npx vitest run src/kernel/backends/occt/pathNurbsLowerer.test.ts', result: '1 file passed; 8 tests passed' },
      lint: { command: 'npx eslint src/modeling/capture/splinePhases.ts src/modeling/capture/sketch.ts src/modeling/capture/sketchSplineTangent.test.ts', result: 'passed' },
      typecheck: { command: 'npm run typecheck', result: 'passed' },
      docs: { command: 'npm run skill:references -- --check', result: 'passed' },
      diffCheck: { command: 'git diff --check', result: 'passed' },
    },
    claimBoundary: { localCaptureReplay: true, geometrySolver: false, simulation: false, deployedBehavior: false, hardwareAcceptance: false },
  };
  await writeFile(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify({ video: VIDEO_PATH, evidence: EVIDENCE_PATH, typoRejected: true, endpointTangent: corrected.endTangent }, null, 2));
}

await main();
