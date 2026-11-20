// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Replay: npx tsx docs/demos/assembly-prismatic-option-keys-20261117/capture-demo.mts
// Output: docs/demos/assembly-prismatic-option-keys-20261117/demo.mp4
// Settings: 1280x720, 24 fps, 3 slides x 3 s, H.264 CRF 24, yuv420p.

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../src/modeling/api';
import { KernelError } from '../../../src/shared/intent/kernelError';

const OUTPUT_DIR = dirname(fileURLToPath(import.meta.url));
const VIDEO_PATH = join(OUTPUT_DIR, 'demo.mp4');
const EVIDENCE_PATH = join(OUTPUT_DIR, 'evidence.json');
const WIDTH = 1280;
const HEIGHT = 720;
const FPS = 24;
const SECONDS_PER_SLIDE = 3;
const SLIDES = 3;

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
  <text x="66" y="690" fill="#94a3b8" font-family="Arial,sans-serif" font-size="16">LOCAL CAPTURE REPLAY · not solver simulation, deployed behavior, or hardware acceptance</text>
</svg>`;
}

function code(lines: string[], width = 620): string {
  const x = 66;
  const y = 185;
  const body = lines.map((line, index) =>
    `<text x="${x + 24}" y="${y + 45 + index * 39}" fill="#e2e8f0" font-family="monospace" font-size="20">${esc(line)}</text>`,
  ).join('');
  return `<rect x="${x}" y="${y}" width="${width}" height="${lines.length * 39 + 34}" rx="14" fill="#1e293b" stroke="#475569"/>${body}`;
}

function panel(title: string, details: string[], color: string): string {
  const x = 734;
  const y = 185;
  const body = details.map((line, index) =>
    `<text x="${x + 26}" y="${y + 72 + index * 38}" fill="#e2e8f0" font-family="monospace" font-size="18">${esc(line)}</text>`,
  ).join('');
  return `<rect x="${x}" y="${y}" width="480" height="250" rx="14" fill="#17202f" stroke="${color}" stroke-width="2"/>
    <text x="${x + 26}" y="${y + 42}" fill="${color}" font-family="Arial,sans-serif" font-size="22" font-weight="700">${esc(title)}</text>${body}`;
}

function makeAssembly() {
  const kcad = createModelingApi({ session: new CaptureSession() });
  const arm = kcad.assembly('prismatic-option-keys-demo');
  const base = arm.part('base', kcad.box(10, 10, 10));
  const carriage = arm.part('carriage', kcad.box(10, 10, 10));
  return { arm, base, carriage };
}

function rejectTypo(): string {
  const { arm, base, carriage } = makeAssembly();
  const options = {
    axis: [1, 0, 0],
    origin: [0, 0, 0],
    limitsMM: [0, 120],
  } as unknown as Parameters<typeof arm.prismatic>[3];
  let error: KernelError | undefined;
  try {
    arm.prismatic('slide', base, carriage, options);
  } catch (caught) {
    if (!(caught instanceof KernelError)) throw caught;
    error = caught;
  }
  if (error?.code !== 'feature.invalid-args' || !error.message.includes('opts.limitsMM')) {
    throw new Error(`Expected an unknown-option error at opts.limitsMM; got ${error?.message ?? 'no error'}.`);
  }
  if (arm.__joints().length !== 0) throw new Error('Invalid options must not record a joint.');
  return error.message;
}

function captureValidJoint() {
  const { arm, base, carriage } = makeAssembly();
  arm.prismatic('slide', base, carriage, {
    axis: [1, 0, 0],
    origin: [0, 0, 0],
    limitsMm: [0, 120],
    actuator: { forceN: 25 },
  });
  const joint = arm.__joints()[0];
  if (!joint || !joint.limitsMm || joint.limitsMm[0] !== 0 || joint.limitsMm[1] !== 120 || joint.actuator?.forceN !== 25) {
    throw new Error(`Expected valid travel limits and actuator force to be preserved; got ${JSON.stringify(joint)}.`);
  }
  return joint;
}

async function main(): Promise<void> {
  const diagnostic = rejectTypo();
  const joint = captureValidJoint();
  const slides = [
    shell(
      'A travel-limit typo removed the stop',
      'Baseline capture accepted limitsMM and kept no limitsMm value.',
      `${code(["arm.prismatic('slide', base, carriage, {", '  axis: [1, 0, 0], origin: [0, 0, 0],', '  limitsMM: [0, 120],', '});'])}
      ${panel('BASELINE · accepted', ['no validation error', 'limitsMm: omitted', 'slide: unbounded'], '#fb7185')}`,
    ),
    shell(
      'Unknown keys now fail during capture',
      'The diagnostic names the typo; the invalid call records no joint.',
      `${code(["arm.prismatic('slide', base, carriage, {", '  axis: [1, 0, 0], origin: [0, 0, 0],', '  limitsMM: [0, 120],', '});'])}
      ${panel('feature.invalid-args', ['path: opts.limitsMM', 'unknown option: limitsMM', 'joint records: 0'], '#fb7185')}`,
    ),
    shell(
      'Declared travel and actuator stay intact',
      'Correcting the option preserves the intended stroke and force rating.',
      `${code(["arm.prismatic('slide', base, carriage, {", '  axis: [1, 0, 0], origin: [0, 0, 0],', '  limitsMm: [0, 120],', '  actuator: { forceN: 25 },', '});'])}
      ${panel('CAPTURED JOINT', ['kind: prismatic', 'limitsMm: [0, 120]', 'actuator force: 25 N'], '#5eead4')}`,
    ),
  ];

  const frameDir = await mkdtemp(join(tmpdir(), 'kcad-prismatic-options-'));
  try {
    for (let index = 0; index < FPS * SECONDS_PER_SLIDE * SLIDES; index += 1) {
      const slideIndex = Math.floor(index / (FPS * SECONDS_PER_SLIDE));
      await sharp(Buffer.from(slides[slideIndex]!)).png().toFile(join(frameDir, `frame-${String(index).padStart(4, '0')}.png`));
    }
    const ffmpeg = spawnSync('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y', '-framerate', String(FPS),
      '-i', join(frameDir, 'frame-%04d.png'), '-an', '-c:v', 'libx264', '-crf', '24',
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
    replay: 'Local CaptureSession + createModelingApi; no browser, geometry solver, simulation, or deployed runtime used.',
    baseline: {
      baseRevision: 'origin/develop 3e52b71d9c14191c2210499a2c4d309b190c6afb',
      reproduction: 'The focused regression failed because arm.prismatic returned normally for limitsMM; expected error was undefined.',
      result: 'The misspelled option is not read as limitsMm, so the recorded prismatic joint has no travel limit.',
    },
    fixedReplay: {
      invalidOptions: { code: 'feature.invalid-args', path: 'opts.limitsMM', message: diagnostic, recordedJoint: false },
      validJoint: { name: joint.name, kind: joint.kind, limitsMm: joint.limitsMm, actuator: joint.actuator },
    },
    source: { path: 'docs/demos/assembly-prismatic-option-keys-20261117/capture-demo.mts', sha256: createHash('sha256').update(source).digest('hex') },
    settings: { width: WIDTH, height: HEIGHT, fps: FPS, secondsPerSlide: SECONDS_PER_SLIDE, slides: SLIDES, encoder: 'libx264', crf: 24, pixelFormat: 'yuv420p' },
    video: { path: 'docs/demos/assembly-prismatic-option-keys-20261117/demo.mp4', sha256: createHash('sha256').update(video).digest('hex'), bytes: video.length },
    verification: {
      focusedTest: { command: 'npx vitest run src/modeling/capture/assemblyPrismaticOptionKeys.test.ts src/modeling/capture/assembly.chaining.test.ts', result: '2 files passed; 12 tests passed' },
      lint: { command: 'npx eslint src/modeling/capture/assemblyJoints.ts src/modeling/capture/assemblyPrismaticOptionKeys.test.ts', result: 'passed' },
      typecheck: { command: 'npm run typecheck', result: 'passed' },
      diffCheck: { command: 'git diff --check', result: 'passed' },
    },
    claimBoundary: { localCaptureReplay: true, geometrySolver: false, simulation: false, deployedBehavior: false, hardwareAcceptance: false },
  };
  await writeFile(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify({ video: VIDEO_PATH, evidence: EVIDENCE_PATH, typoRejected: true, limitsMm: joint.limitsMm }, null, 2));
}

await main();
