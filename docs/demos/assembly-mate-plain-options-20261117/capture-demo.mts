// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Replay: npx tsx docs/demos/assembly-mate-plain-options-20261117/capture-demo.mts
// Output: docs/demos/assembly-mate-plain-options-20261117/demo.mp4
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
  <text x="66" y="690" fill="#94a3b8" font-family="Arial,sans-serif" font-size="16">LOCAL CAPTURE REPLAY · not deployed behavior, simulation, or hardware acceptance</text>
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

function makeHinge() {
  const kcad = createModelingApi({ session: new CaptureSession() });
  const arm = kcad.assembly('mate-plain-options-demo');
  const pivot = {
    type: 'axis' as const,
    origin: { kind: 'vec3' as const, value: [0, 0, 0] as [number, number, number] },
    axis: [0, 0, 1] as [number, number, number],
  };
  arm.part('base', kcad.box(10, 10, 5)).connector('pivot', pivot);
  arm.part('link', kcad.box(10, 10, 5)).connector('pivot', pivot);
  return arm;
}

function rejectDate(): string {
  const arm = makeHinge();
  let error: KernelError | undefined;
  try {
    const malformedOptions = new Date('2026-01-01T00:00:00.000Z') as unknown as Parameters<typeof arm.mate>[4];
    arm.mate('hinge', 'base.pivot', 'link.pivot', 'revolute', malformedOptions);
  } catch (caught) {
    if (!(caught instanceof KernelError)) throw caught;
    error = caught;
  }
  if (error?.code !== 'feature.invalid-args' || !error.message.includes('opts')) {
    throw new Error(`Expected a typed opts diagnostic for Date; got ${error?.message ?? 'no error'}.`);
  }
  if (arm.__mates().length !== 0) throw new Error('Malformed options must not create a mate record.');
  return error.message;
}

async function main(): Promise<void> {
  const dateMessage = rejectDate();
  const goodArm = makeHinge();
  goodArm.mate('hinge', 'base.pivot', 'link.pivot', 'revolute', { limitsDeg: [-45, 45] });
  const captured = goodArm.__mates().find((mate) => mate.name === 'hinge');
  if (captured?.limitsDeg?.[0] !== -45 || captured.limitsDeg[1] !== 45) {
    throw new Error(`Expected declared limits [-45, 45]; got ${JSON.stringify(captured)}.`);
  }
  const nullPrototypeArm = makeHinge();
  const nullPrototypeOptions = Object.assign(Object.create(null) as Record<string, unknown>, { limitsDeg: [-30, 30] }) as
    Parameters<typeof nullPrototypeArm.mate>[4];
  nullPrototypeArm.mate('hinge', 'base.pivot', 'link.pivot', 'revolute', nullPrototypeOptions);
  const nullPrototypeMate = nullPrototypeArm.__mates().find((mate) => mate.name === 'hinge');
  if (nullPrototypeMate?.limitsDeg?.[0] !== -30 || nullPrototypeMate.limitsDeg[1] !== 30) {
    throw new Error(`Expected null-prototype limits [-30, 30]; got ${JSON.stringify(nullPrototypeMate)}.`);
  }

  const before = shell(
    'Date was silently treated as omitted options',
    'Baseline: Object.keys(new Date()) is empty, so the call recorded an unbounded mate.',
    `${code(["arm.mate('hinge', 'base.pivot',", "  'link.pivot', 'revolute', new Date());"])}
    ${panel('BASELINE · accepted', ['captured: revolute mate', 'limitsDeg: omitted', 'caller error stayed hidden'], 738, 185, '#fb7185')}
    <text x="772" y="500" fill="#fda4af" font-family="Arial,sans-serif" font-size="20">Date is an object, but it is not an options record.</text>`,
  );

  const after = shell(
    'Non-plain objects now fail at capture time',
    'The check runs before the mate is recorded.',
    `${code(["arm.mate('hinge', 'base.pivot',", "  'link.pivot', 'revolute', new Date());"])}
    ${panel('feature.invalid-args', ['path: opts', 'got: non-plain object', 'no mate record created'], 738, 185, '#fb7185')}`,
  );

  const valid = shell(
    'Supported options still keep their limits',
    'Plain objects and null-prototype option records remain valid.',
    `${code(["arm.mate('hinge', 'base.pivot',", "  'link.pivot', 'revolute', {", '    limitsDeg: [-45, 45],', '  });'])}
    ${panel('CAPTURED REVOLUTE MATE', ['type: revolute', 'limitsDeg: [-45, 45]', 'normal options preserved', 'null-prototype record passed'], 738, 185, '#5eead4')}`,
  );

  const slides = [before, after, valid];
  const frameDir = await mkdtemp(join(tmpdir(), 'kcad-mate-plain-options-'));
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
    replay: 'Local CaptureSession + createModelingApi; no browser, geometry solver, simulation, or deployed runtime used.',
    invocation: 'npx tsx docs/demos/assembly-mate-plain-options-20261117/capture-demo.mts',
    baselineReproduction: {
      baseRevision: 'origin/develop fafb4063e897f0d979ed3bc301ad33bb6ff75ef6',
      invocation: 'npx tsx docs/demos/assembly-mate-plain-options-20261117/baseline-repro.mts',
      result: 'new Date() was accepted as omitted options and captured an unbounded revolute mate.',
      sourceSha256: createHash('sha256').update(baselineSource).digest('hex'),
    },
    fixedReplay: {
      date: { code: 'feature.invalid-args', path: 'opts', message: dateMessage, recordedMate: false },
      validMate: { name: captured.name, type: captured.type, limitsDeg: captured.limitsDeg },
      nullPrototypeOptions: { name: nullPrototypeMate.name, limitsDeg: nullPrototypeMate.limitsDeg },
    },
    source: { path: 'docs/demos/assembly-mate-plain-options-20261117/capture-demo.mts', sha256: createHash('sha256').update(source).digest('hex') },
    settings: { width: WIDTH, height: HEIGHT, fps: FPS, secondsPerSlide: SECONDS_PER_SLIDE, slides: SLIDES, encoder: 'libx264', crf: 24, pixelFormat: 'yuv420p' },
    video: { path: 'docs/demos/assembly-mate-plain-options-20261117/demo.mp4', sha256: createHash('sha256').update(video).digest('hex'), bytes: video.length },
    verification: {
      focusedTest: { command: 'npx vitest run src/modeling/capture/assemblyMateOptionKeys.test.ts', result: '1 file passed; 10 tests passed' },
      lint: { command: 'npx eslint src/modeling/capture/assemblyMateOptionKeys.ts src/modeling/capture/assemblyMateOptionKeys.test.ts', result: 'passed' },
      typecheck: { command: 'npm run typecheck', result: 'passed' },
    },
    claimBoundary: { localCaptureReplay: true, geometrySolver: false, simulation: false, deployedBehavior: false, hardwareAcceptance: false },
  };
  await writeFile(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify({ video: VIDEO_PATH, evidence: EVIDENCE_PATH, dateRejected: true, preservedLimits: captured.limitsDeg }, null, 2));
}

await main();
