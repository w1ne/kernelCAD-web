// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Replay: npx tsx docs/demos/assembly-mate-option-keys-20261117/capture-demo.mts
// Output: docs/demos/assembly-mate-option-keys-20261117/demo.mp4
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

function lines(value: string, maxLength: number): string[] {
  const out: string[] = [];
  let current = '';
  for (const word of value.split(/\s+/)) {
    const next = current.length === 0 ? word : `${current} ${word}`;
    if (next.length > maxLength && current.length > 0) {
      out.push(current);
      current = word;
    } else current = next;
  }
  if (current.length > 0) out.push(current);
  return out;
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

function code(linesToShow: string[], x = 66, y = 184, width = 640): string {
  const text = linesToShow.map((line, index) =>
    `<text x="${x + 26}" y="${y + 45 + index * 39}" fill="#e2e8f0" font-family="monospace" font-size="22">${esc(line)}</text>`,
  ).join('');
  return `<rect x="${x}" y="${y}" width="${width}" height="${linesToShow.length * 39 + 34}" rx="14" fill="#1e293b" stroke="#475569"/>${text}`;
}

function panel(text: string, x: number, y: number, color: string, width = 470): string {
  const wrapped = lines(text, 38).slice(0, 6).map((line, index) =>
    `<text x="${x + 28}" y="${y + 68 + index * 30}" fill="#e2e8f0" font-family="monospace" font-size="18">${esc(line)}</text>`,
  ).join('');
  return `<rect x="${x}" y="${y}" width="${width}" height="250" rx="14" fill="#17202f" stroke="${color}" stroke-width="2"/>${wrapped}`;
}

function makeHinge() {
  const session = new CaptureSession();
  const kcad = createModelingApi({ session });
  const arm = kcad.assembly('mate-option-demo');
  const pivot = {
    type: 'axis' as const,
    origin: { kind: 'vec3' as const, value: [0, 0, 0] as [number, number, number] },
    axis: [0, 0, 1] as [number, number, number],
  };
  arm.part('base', kcad.box(20, 20, 5)).connector('pivot', pivot);
  arm.part('lid', kcad.box(20, 20, 4)).connector('pivot', pivot);
  return { session, arm };
}

async function main(): Promise<void> {
  const bad = makeHinge();
  let capturedError: KernelError | undefined;
  try {
    const options = { limtsDeg: [-45, 45] } as unknown as Parameters<typeof bad.arm.mate>[4];
    bad.arm.mate('hinge', 'base.pivot', 'lid.pivot', 'revolute', options);
  } catch (error) {
    if (!(error instanceof KernelError)) throw error;
    capturedError = error;
  }
  if (capturedError?.code !== 'feature.invalid-args' || !capturedError.message.includes('opts.limtsDeg')) {
    throw new Error('Expected the misspelled limit to fail at capture time with a feature.invalid-args diagnostic.');
  }
  if (bad.arm.__mates().length !== 0) throw new Error('The rejected mate must not be recorded.');

  const good = makeHinge();
  good.arm.mate('hinge', 'base.pivot', 'lid.pivot', 'revolute', { limitsDeg: [-45, 45] });
  const capturedMate = good.arm.__mates().find((mate) => mate.name === 'hinge');
  if (capturedMate?.limitsDeg?.[0] !== -45 || capturedMate.limitsDeg[1] !== 45) {
    throw new Error(`Expected the corrected hinge range [-45, 45]; got ${JSON.stringify(capturedMate)}.`);
  }

  const before = shell(
    'A typo silently removed the hinge stop',
    'Baseline reproduction on origin/develop: the mate was recorded with no limitsDeg field.',
    `${code(["arm.mate('hinge', 'base.pivot',", "  'lid.pivot', 'revolute', {", '  limtsDeg: [-45, 45], // typo', '});'])}
    ${panel('BEFORE · mate captured without a range. The intended ±45° travel stop was absent.', 748, 184, '#fb7185')}
    <text x="784" y="500" fill="#fda4af" font-family="Arial,sans-serif" font-size="22" font-weight="700">Unbounded joint · range omitted</text>`,
  );

  const errorSummary = capturedError.message.match(/got an unknown option '[^']+'/i)?.[0] ?? capturedError.message;
  const diagnosticLines = lines(errorSummary, 37).map((line, index) =>
    `<text x="778" y="296" dy="${index * 30}" fill="#ffe4e6" font-family="monospace" font-size="16">${esc(line)}</text>`,
  ).join('');
  const diagnostic = shell(
    'The option error now identifies the typo',
    'Runtime capture rejects unknown keys, including options held in object variables.',
    `${code(["arm.mate('hinge', 'base.pivot',", "  'lid.pivot', 'revolute', {", '  limtsDeg: [-45, 45],', '});'])}
    <rect x="748" y="184" width="462" height="310" rx="14" fill="#2a1720" stroke="#fb7185" stroke-width="2"/>
    <text x="778" y="232" fill="#fda4af" font-family="Arial,sans-serif" font-size="22" font-weight="700">${esc(capturedError.code)}</text>
    <text x="778" y="270" fill="#cbd5e1" font-family="monospace" font-size="17">Path: opts.limtsDeg</text>
    ${diagnosticLines}
    <text x="778" y="446" fill="#cbd5e1" font-family="Arial,sans-serif" font-size="18">No mate record is created on failure.</text>`,
  );

  const corrected = shell(
    'The intended revolute range is preserved',
    'The corrected option is captured on the real Assembly mate record.',
    `${code(["arm.mate('hinge', 'base.pivot',", "  'lid.pivot', 'revolute', {", '  limitsDeg: [-45, 45],', '});'])}
    <rect x="748" y="184" width="462" height="250" rx="14" fill="#102923" stroke="#5eead4" stroke-width="2"/>
    <text x="778" y="232" fill="#99f6e4" font-family="Arial,sans-serif" font-size="22" font-weight="700">CAPTURED HINGE</text>
    <text x="778" y="286" fill="#e2e8f0" font-family="monospace" font-size="21">type: ${esc(capturedMate.type)}</text>
    <text x="778" y="326" fill="#e2e8f0" font-family="monospace" font-size="21">limitsDeg: [${capturedMate.limitsDeg.join(', ')}]</text>
    <text x="778" y="382" fill="#cbd5e1" font-family="Arial,sans-serif" font-size="18">The authored ±45° range is preserved.</text>`,
  );

  const slides = [before, diagnostic, corrected];
  const frameDir = await mkdtemp(join(tmpdir(), 'kcad-mate-option-keys-'));
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

  const scriptPath = fileURLToPath(import.meta.url);
  const script = await readFile(scriptPath);
  const baselineScript = await readFile(join(OUTPUT_DIR, 'baseline-repro.mts'));
  const video = await readFile(VIDEO_PATH);
  const evidence = {
    generatedAt: new Date().toISOString(),
    replay: 'Local CaptureSession + createModelingApi; no browser, geometry solver, or deployed runtime used.',
    invocation: 'npx tsx docs/demos/assembly-mate-option-keys-20261117/capture-demo.mts',
    source: {
      path: 'docs/demos/assembly-mate-option-keys-20261117/capture-demo.mts',
      sha256: createHash('sha256').update(script).digest('hex'),
    },
    baselineReproductionSource: {
      path: 'docs/demos/assembly-mate-option-keys-20261117/baseline-repro.mts',
      sha256: createHash('sha256').update(baselineScript).digest('hex'),
      invocation: 'npx tsx docs/demos/assembly-mate-option-keys-20261117/baseline-repro.mts on baseline 642f9a398',
    },
    settings: { width: WIDTH, height: HEIGHT, fps: FPS, secondsPerSlide: SECONDS_PER_SLIDE, slides: SLIDES, encoder: 'libx264', crf: 24, pixelFormat: 'yuv420p' },
    baseline: {
      baseRevision: 'origin/develop 642f9a398',
      requestOption: 'limtsDeg: [-45, 45]',
      capturedMate: { name: 'hinge', type: 'revolute' },
      limitsDeg: 'omitted; typo silently dropped',
      reproduction: 'npx tsx docs/demos/assembly-mate-option-keys-20261117/baseline-repro.mts on baseline 642f9a398',
    },
    fixedReplay: {
      errorCode: capturedError.code,
      errorPath: 'opts.limtsDeg',
      errorMessage: capturedError.message,
      mateRecordedAfterError: bad.arm.__mates().length > 0,
      correctedMate: { name: capturedMate.name, type: capturedMate.type, limitsDeg: capturedMate.limitsDeg },
    },
    video: {
      path: 'docs/demos/assembly-mate-option-keys-20261117/demo.mp4',
      sha256: createHash('sha256').update(video).digest('hex'),
      bytes: video.length,
    },
    claimBoundary: { localCaptureReplay: true, geometrySolver: false, deployedBehavior: false, hardwareAcceptance: false },
  };
  await writeFile(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify({ video: VIDEO_PATH, evidence: EVIDENCE_PATH, errorCode: capturedError.code, errorPath: 'opts.limtsDeg', corrected: capturedMate.limitsDeg }, null, 2));
}

await main();
