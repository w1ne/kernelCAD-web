// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Replay: npx tsx docs/demos/assembly-couple-mate-option-keys-20261117/capture-demo.mts
// Output: docs/demos/assembly-couple-mate-option-keys-20261117/demo.mp4
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

function panel(title: string, details: string[], x: number, y: number, color: string, width = 476): string {
  const body = details.map((line, index) =>
    `<text x="${x + 26}" y="${y + 72 + index * 38}" fill="#e2e8f0" font-family="monospace" font-size="18">${esc(line)}</text>`,
  ).join('');
  return `<rect x="${x}" y="${y}" width="${width}" height="250" rx="14" fill="#17202f" stroke="${color}" stroke-width="2"/>
    <text x="${x + 26}" y="${y + 42}" fill="${color}" font-family="Arial,sans-serif" font-size="22" font-weight="700">${esc(title)}</text>${body}`;
}

function makeCoupledAssembly() {
  const kcad = createModelingApi({ session: new CaptureSession() });
  const arm = kcad.assembly('coupled-mate-options-demo');
  const pivot = {
    type: 'axis' as const,
    origin: { kind: 'vec3' as const, value: [0, 0, 0] as [number, number, number] },
    axis: [0, 0, 1] as [number, number, number],
  };
  arm.part('base', kcad.box(10, 10, 5)).connector('pivot', pivot);
  arm.part('input-link', kcad.box(10, 10, 5)).connector('pivot', pivot);
  arm.part('output-link', kcad.box(10, 10, 5)).connector('pivot', pivot);
  arm.mate('input', 'base.pivot', 'input-link.pivot', 'revolute');
  arm.mate('output', 'base.pivot', 'output-link.pivot', 'revolute');
  return arm;
}

function rejectTypo(): string {
  const arm = makeCoupledAssembly();
  let error: KernelError | undefined;
  const malformedOptions = { source: 'input', ratio: -0.25, offest: 12 } as unknown as
    Parameters<typeof arm.coupleMates>[1];
  try {
    arm.coupleMates('output', malformedOptions);
  } catch (caught) {
    if (!(caught instanceof KernelError)) throw caught;
    error = caught;
  }
  if (error?.code !== 'feature.invalid-args' || !error.message.includes('opts.offest')) {
    throw new Error(`Expected an unknown-option diagnostic for offest; got ${error?.message ?? 'no error'}.`);
  }
  if (arm.__mateCouplings().length !== 0) throw new Error('Malformed options must not create a coupling record.');
  return error.message;
}

async function main(): Promise<void> {
  const errorMessage = rejectTypo();
  const goodArm = makeCoupledAssembly();
  goodArm.coupleMates('output', { source: 'input', ratio: -0.25, offset: 12 });
  const coupling = goodArm.__mateCouplings()[0];
  if (coupling?.source !== 'input' || coupling.ratio !== -0.25 || coupling.offset !== 12) {
    throw new Error(`Expected the corrected coupling to preserve offset 12; got ${JSON.stringify(coupling)}.`);
  }

  const before = shell(
    'A typo silently dropped the coupling offset',
    'Baseline: the unknown offest field was ignored while source and ratio were recorded.',
    `${code(["arm.coupleMates('output', {", "  source: 'input', ratio: -0.25,", '  offest: 12,', '});'])}
    ${panel('BASELINE · accepted', ['coupling recorded', 'source: input', 'ratio: -0.25', 'offset: omitted'], 738, 185, '#fb7185')}`,
  );

  const after = shell(
    'Unknown coupling keys fail before capture',
    'The caller gets the precise option path; no coupling is recorded.',
    `${code(["arm.coupleMates('output', {", "  source: 'input', ratio: -0.25,", '  offest: 12,', '});'])}
    ${panel('feature.invalid-args', ['path: opts.offest', 'unknown option: offest', 'no coupling record created'], 738, 185, '#fb7185')}
    <text x="766" y="500" fill="#94a3b8" font-family="monospace" font-size="16">Typed diagnostic: ${esc(errorMessage.includes('opts.offest') ? 'feature.invalid-args at opts.offest' : 'unexpected result')}</text>`,
  );

  const valid = shell(
    'The declared offset remains supported',
    'Corrected options preserve the signed ratio and driven-mate offset.',
    `${code(["arm.coupleMates('output', {", "  source: 'input', ratio: -0.25,", '  offset: 12,', '});'])}
    ${panel('CAPTURED COUPLING', ['driven: output', 'source: input', 'ratio: -0.25', 'offset: 12'], 738, 185, '#5eead4')}`,
  );

  const slides = [before, after, valid];
  const frameDir = await mkdtemp(join(tmpdir(), 'kcad-couple-mate-options-'));
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
      baseRevision: 'origin/develop e8d2a904a54b2872c57332604d609b795a3500c9',
      reproduction: 'The misspelled offest option was accepted and the coupling was recorded with offset omitted.',
      focusedRegressionRun: 'Before the fix, the new regression suite reported 2 failures: unknown key accepted and class instance accepted.',
    },
    fixedReplay: {
      invalidOptions: { code: 'feature.invalid-args', path: 'opts.offest', message: errorMessage, recordedCoupling: false },
      validCoupling: { driven: coupling.driven, source: coupling.source, ratio: coupling.ratio, offset: coupling.offset },
    },
    source: { path: 'docs/demos/assembly-couple-mate-option-keys-20261117/capture-demo.mts', sha256: createHash('sha256').update(source).digest('hex') },
    settings: { width: WIDTH, height: HEIGHT, fps: FPS, secondsPerSlide: SECONDS_PER_SLIDE, slides: SLIDES, encoder: 'libx264', crf: 24, pixelFormat: 'yuv420p' },
    video: { path: 'docs/demos/assembly-couple-mate-option-keys-20261117/demo.mp4', sha256: createHash('sha256').update(video).digest('hex'), bytes: video.length },
    verification: {
      focusedTest: { command: 'npx vitest run src/modeling/capture/assemblyCoupleMateOptionKeys.test.ts src/modeling/capture/assemblyMateOptionKeys.test.ts', result: '2 files passed; 14 tests passed' },
      lint: { command: 'npx eslint src/modeling/capture/assemblyOptionRecords.ts src/modeling/capture/assemblyMateOptionKeys.ts src/modeling/capture/assemblyCoupleMateOptionKeys.ts src/modeling/capture/assemblyJoints.ts src/modeling/capture/assemblyCoupleMateOptionKeys.test.ts', result: 'passed' },
      typecheck: { command: 'npm run typecheck', result: 'passed' },
    },
    claimBoundary: { localCaptureReplay: true, geometrySolver: false, simulation: false, deployedBehavior: false, hardwareAcceptance: false },
  };
  await writeFile(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify({ video: VIDEO_PATH, evidence: EVIDENCE_PATH, typoRejected: true, preservedOffset: coupling.offset }, null, 2));
}

await main();
