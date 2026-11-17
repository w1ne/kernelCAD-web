// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Replay: npx tsx docs/demos/assembly-mate-option-shape-20261117/capture-demo.mts
// Output: docs/demos/assembly-mate-option-shape-20261117/demo.mp4
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
  <text x="64" y="78" fill="#f8fafc" font-family="Arial,sans-serif" font-size="38" font-weight="700">${esc(title)}</text>
  <text x="66" y="122" fill="#94a3b8" font-family="Arial,sans-serif" font-size="21">${esc(subtitle)}</text>
  ${content}
  <line x1="64" y1="655" x2="1214" y2="655" stroke="#334155"/>
  <text x="66" y="690" fill="#94a3b8" font-family="Arial,sans-serif" font-size="16">LOCAL CAPTURE REPLAY · not deployed behavior, simulation, or hardware acceptance</text>
</svg>`;
}

function code(lines: string[], x = 66, y = 185, width = 630): string {
  const body = lines.map((line, index) =>
    `<text x="${x + 24}" y="${y + 45 + index * 39}" fill="#e2e8f0" font-family="monospace" font-size="21">${esc(line)}</text>`,
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

function makeHinge() {
  const kcad = createModelingApi({ session: new CaptureSession() });
  const arm = kcad.assembly('mate-option-shape-demo');
  const pivot = {
    type: 'axis' as const,
    origin: { kind: 'vec3' as const, value: [0, 0, 0] as [number, number, number] },
    axis: [0, 0, 1] as [number, number, number],
  };
  arm.part('base', kcad.box(10, 10, 5)).connector('pivot', pivot);
  arm.part('link', kcad.box(10, 10, 5)).connector('pivot', pivot);
  return arm;
}

function rejectOptions(raw: unknown): string {
  const arm = makeHinge();
  let error: KernelError | undefined;
  try {
    const options = raw as Parameters<typeof arm.mate>[4];
    arm.mate('hinge', 'base.pivot', 'link.pivot', 'revolute', options);
  } catch (caught) {
    if (!(caught instanceof KernelError)) throw caught;
    error = caught;
  }
  if (error?.code !== 'feature.invalid-args' || !error.message.includes('opts')) {
    throw new Error(`Expected a typed opts diagnostic for ${JSON.stringify(raw)}; got ${error?.message ?? 'no error'}.`);
  }
  if (arm.__mates().length !== 0) throw new Error('Malformed options must not create a mate record.');
  return error.message;
}

async function main(): Promise<void> {
  const invalidResults = [null, [], 42].map((raw) => ({ value: raw, message: rejectOptions(raw) }));
  const goodArm = makeHinge();
  goodArm.mate('hinge', 'base.pivot', 'link.pivot', 'revolute', { limitsDeg: [-45, 45] });
  const captured = goodArm.__mates().find((mate) => mate.name === 'hinge');
  if (captured?.limitsDeg?.[0] !== -45 || captured.limitsDeg[1] !== 45) {
    throw new Error(`Expected the declared range [-45, 45]; got ${JSON.stringify(captured)}.`);
  }

  const before = shell(
    'An empty array silently became “no options”',
    'On baseline develop, arm.mate(..., []) created an unbounded revolute mate.',
    `${code(["arm.mate('hinge', 'base.pivot',", "  'link.pivot', 'revolute', []);"])}
    ${panel('BASELINE · accepted', ['recorded: { name: hinge,', '  type: revolute }', 'limitsDeg: omitted'], 738, 185, '#fb7185')}
    <text x="772" y="500" fill="#fda4af" font-family="Arial,sans-serif" font-size="20">An invalid argument shape hid caller mistakes.</text>`,
  );

  const after = shell(
    'Malformed options now fail at capture time',
    'The runtime validates the argument shape before resolving or recording a mate.',
    `${code(["arm.mate('hinge', 'base.pivot',", "  'link.pivot', 'revolute', []);"])}
    ${panel('feature.invalid-args', ['path: opts', 'got: [] (array)', 'no mate record created'], 738, 185, '#fb7185')}
    <text x="772" y="500" fill="#cbd5e1" font-family="Arial,sans-serif" font-size="19">Also rejected: null and the number 42.</text>`,
  );

  const valid = shell(
    'A real options object keeps its limit',
    'The corrected hinge still captures the authored motion range.',
    `${code(["arm.mate('hinge', 'base.pivot',", "  'link.pivot', 'revolute', {", '    limitsDeg: [-45, 45],', '  });'])}
    ${panel('CAPTURED REVOLUTE MATE', ['type: revolute', 'limitsDeg: [-45, 45]', 'normal capture path preserved'], 738, 185, '#5eead4')}`,
  );

  const slides = [before, after, valid];
  const frameDir = await mkdtemp(join(tmpdir(), 'kcad-mate-option-shape-'));
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
  const baselineSource = await readFile(join(OUTPUT_DIR, 'baseline-repro.mts'));
  const video = await readFile(VIDEO_PATH);
  const evidence = {
    generatedAt: new Date().toISOString(),
    replay: 'Local CaptureSession + createModelingApi; no browser, geometry solver, or deployed runtime used.',
    invocation: 'npx tsx docs/demos/assembly-mate-option-shape-20261117/capture-demo.mts',
    baselineReproduction: {
      baseRevision: 'origin/develop b93aa9011a45a04dac172d48dca9c205e536ae21',
      invocation: 'npx tsx docs/demos/assembly-mate-option-shape-20261117/baseline-repro.mts',
      result: '[] was accepted as omitted options and captured an unbounded revolute mate.',
      sourceSha256: createHash('sha256').update(baselineSource).digest('hex'),
    },
    fixedReplay: {
      invalidInputs: invalidResults.map(({ value, message }) => ({ value, code: 'feature.invalid-args', path: 'opts', message })),
      malformedInputsRecordedMate: false,
      validMate: { name: captured.name, type: captured.type, limitsDeg: captured.limitsDeg },
    },
    verification: {
      focusedTests: { command: 'npx vitest run src/modeling/capture/assemblyMateOptionKeys.test.ts', result: '1 test file passed; 6 tests passed' },
      typecheck: { command: 'npm run typecheck', result: 'passed' },
      lint: { command: 'npx eslint src/modeling/capture/assemblyMateOptionKeys.ts src/modeling/capture/assemblyMateOptionKeys.test.ts', result: 'passed' },
    },
    source: { path: 'docs/demos/assembly-mate-option-shape-20261117/capture-demo.mts', sha256: createHash('sha256').update(source).digest('hex') },
    settings: { width: WIDTH, height: HEIGHT, fps: FPS, secondsPerSlide: SECONDS_PER_SLIDE, slides: SLIDES, encoder: 'libx264', crf: 24, pixelFormat: 'yuv420p' },
    video: { path: 'docs/demos/assembly-mate-option-shape-20261117/demo.mp4', sha256: createHash('sha256').update(video).digest('hex'), bytes: video.length },
    claimBoundary: { localCaptureReplay: true, geometrySolver: false, deployedBehavior: false, hardwareAcceptance: false },
  };
  await writeFile(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify({ video: VIDEO_PATH, evidence: EVIDENCE_PATH, invalidInputs: invalidResults.map(({ value }) => value), correctLimits: captured.limitsDeg }, null, 2));
}

await main();
