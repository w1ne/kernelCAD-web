// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Replay: npx tsx docs/demos/assembly-revolute-option-keys-20261117/capture-demo.mts
// Output: docs/demos/assembly-revolute-option-keys-20261117/demo.mp4
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

function code(lines: string[], x = 66, y = 185, width = 630): string {
  const body = lines.map((line, index) =>
    `<text x="${x + 24}" y="${y + 45 + index * 39}" fill="#e2e8f0" font-family="monospace" font-size="20">${esc(line)}</text>`,
  ).join('');
  return `<rect x="${x}" y="${y}" width="${width}" height="${lines.length * 39 + 34}" rx="14" fill="#1e293b" stroke="#475569"/>${body}`;
}

function panel(title: string, details: string[], x: number, y: number, color: string): string {
  const body = details.map((line, index) =>
    `<text x="${x + 26}" y="${y + 72 + index * 38}" fill="#e2e8f0" font-family="monospace" font-size="18">${esc(line)}</text>`,
  ).join('');
  return `<rect x="${x}" y="${y}" width="476" height="250" rx="14" fill="#17202f" stroke="${color}" stroke-width="2"/>
    <text x="${x + 26}" y="${y + 42}" fill="${color}" font-family="Arial,sans-serif" font-size="22" font-weight="700">${esc(title)}</text>${body}`;
}

function makeAssembly() {
  const kcad = createModelingApi({ session: new CaptureSession() });
  const arm = kcad.assembly('revolute-option-keys-demo');
  const base = arm.part('base', kcad.box(10, 10, 10));
  const link = arm.part('link', kcad.box(10, 10, 10));
  return { arm, base, link };
}

function rejectTypo(): string {
  const { arm, base, link } = makeAssembly();
  const options = {
    axis: [0, 0, 1],
    origin: [0, 0, 0],
    limitsDg: [-45, 45],
  } as unknown as Parameters<typeof arm.revolute>[3];
  let error: KernelError | undefined;
  try {
    arm.revolute('hinge', base, link, options);
  } catch (caught) {
    if (!(caught instanceof KernelError)) throw caught;
    error = caught;
  }
  if (error?.code !== 'feature.invalid-args' || !error.message.includes('opts.limitsDg')) {
    throw new Error(`Expected an unknown-option error at opts.limitsDg; got ${error?.message ?? 'no error'}.`);
  }
  if (arm.__joints().length !== 0) throw new Error('Invalid options must not record a joint.');
  return error.message;
}

function captureValidJoint() {
  const { arm, base, link } = makeAssembly();
  arm.revolute('hinge', base, link, {
    axis: [0, 0, 1],
    origin: [0, 0, 0],
    limitsDeg: [-45, 45],
    actuator: { torqueNm: 0.2 },
  });
  const joint = arm.__joints()[0];
  if (!joint || !joint.limitsDeg || joint.limitsDeg[0] !== -45 || joint.limitsDeg[1] !== 45 || joint.actuator?.torqueNm !== 0.2) {
    throw new Error(`Expected the valid joint options to be preserved; got ${JSON.stringify(joint)}.`);
  }
  return joint;
}

async function main(): Promise<void> {
  const diagnostic = rejectTypo();
  const joint = captureValidJoint();

  const slides = [
    shell(
      'A typo silently removed the joint limits',
      'Baseline: limitsDg was ignored and a free revolute was recorded.',
      `${code(["arm.revolute('hinge', base, link, {", "  axis: [0, 0, 1], origin: [0, 0, 0],", '  limitsDg: [-45, 45],', '});'])}
      ${panel('BASELINE · accepted', ['joint recorded', 'limitsDeg: omitted', 'motion range: unbounded'], 738, 185, '#fb7185')}`,
    ),
    shell(
      'Unknown keys fail before capture',
      'The caller gets a path-specific diagnostic; no joint is recorded.',
      `${code(["arm.revolute('hinge', base, link, {", "  axis: [0, 0, 1], origin: [0, 0, 0],", '  limitsDg: [-45, 45],', '});'])}
      ${panel('feature.invalid-args', ['path: opts.limitsDg', 'unknown option: limitsDg', 'no joint record created'], 738, 185, '#fb7185')}`,
    ),
    shell(
      'Declared limits and actuator remain captured',
      'Corrected options preserve the angular range and rated torque.',
      `${code(["arm.revolute('hinge', base, link, {", "  axis: [0, 0, 1], origin: [0, 0, 0],", '  limitsDeg: [-45, 45],', '  actuator: { torqueNm: 0.2 },', '});'])}
      ${panel('CAPTURED JOINT', ['kind: revolute', 'limitsDeg: [-45, 45]', 'actuator torque: 0.2 N·m'], 738, 185, '#5eead4')}`,
    ),
  ];

  const frameDir = await mkdtemp(join(tmpdir(), 'kcad-revolute-options-'));
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
      baseRevision: 'origin/develop e0832c49460d58a49450f61da375555545641172',
      reproduction: 'The misspelled limitsDg option was accepted and the joint was recorded without limitsDeg.',
      focusedRegressionRun: 'Before the fix, the new regression suite reported 1 failure: the unknown option did not produce a KernelError.',
    },
    fixedReplay: {
      invalidOptions: { code: 'feature.invalid-args', path: 'opts.limitsDg', message: diagnostic, recordedJoint: false },
      validJoint: { name: joint.name, kind: joint.kind, limitsDeg: joint.limitsDeg, actuator: joint.actuator },
    },
    source: { path: 'docs/demos/assembly-revolute-option-keys-20261117/capture-demo.mts', sha256: createHash('sha256').update(source).digest('hex') },
    settings: { width: WIDTH, height: HEIGHT, fps: FPS, secondsPerSlide: SECONDS_PER_SLIDE, slides: SLIDES, encoder: 'libx264', crf: 24, pixelFormat: 'yuv420p' },
    video: { path: 'docs/demos/assembly-revolute-option-keys-20261117/demo.mp4', sha256: createHash('sha256').update(video).digest('hex'), bytes: video.length },
    verification: {
      focusedTest: { command: 'npx vitest run src/modeling/capture/assemblyRevoluteOptionKeys.test.ts src/modeling/capture/assembly.chaining.test.ts', result: '2 files passed; 12 tests passed' },
      lint: { command: 'npx eslint src/modeling/capture/assemblyJoints.ts src/modeling/capture/assemblyRevoluteOptionKeys.test.ts', result: 'passed' },
      typecheck: { command: 'npm run typecheck', result: 'passed' },
    },
    claimBoundary: { localCaptureReplay: true, geometrySolver: false, simulation: false, deployedBehavior: false, hardwareAcceptance: false },
  };
  await writeFile(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify({ video: VIDEO_PATH, evidence: EVIDENCE_PATH, typoRejected: true, limitsDeg: joint.limitsDeg }, null, 2));
}

await main();
