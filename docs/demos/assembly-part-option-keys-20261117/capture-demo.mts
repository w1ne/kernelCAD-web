// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Replay: npx tsx docs/demos/assembly-part-option-keys-20261117/capture-demo.mts
// Output: docs/demos/assembly-part-option-keys-20261117/demo.mp4
// Settings: 1280x720, 24 fps, 3 slides x 3 s, H.264 CRF 24, yuv420p.

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../src/modeling/api';
import type { AssemblyPartOpts } from '../../../src/modeling/capture/assemblyTypes';
import { resolvedPartAt } from '../../../src/modeling/mates/partFrame';
import { KernelError } from '../../../src/shared/intent/kernelError';

const OUTPUT_DIR = dirname(fileURLToPath(import.meta.url));
const VIDEO_PATH = join(OUTPUT_DIR, 'demo.mp4');
const EVIDENCE_PATH = join(OUTPUT_DIR, 'evidence.json');
const WIDTH = 1280;
const HEIGHT = 720;
const FPS = 24;
const SECONDS_PER_SLIDE = 3;
const SLIDES = 3;

function escapeXml(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function svgFrame(title: string, subtitle: string, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#5eead4"/></marker></defs>
  <rect width="100%" height="100%" fill="#111827"/>
  <rect x="0" y="0" width="14" height="${HEIGHT}" fill="#5eead4"/>
  <text x="64" y="78" fill="#f8fafc" font-family="Arial, sans-serif" font-size="38" font-weight="700">${escapeXml(title)}</text>
  <text x="66" y="122" fill="#94a3b8" font-family="Arial, sans-serif" font-size="22">${escapeXml(subtitle)}</text>
  ${body}
  <line x1="64" y1="655" x2="1214" y2="655" stroke="#334155"/>
  <text x="66" y="690" fill="#94a3b8" font-family="Arial, sans-serif" font-size="16">LOCAL API REPLAY · no deployed behavior, simulation, or hardware acceptance claimed</text>
</svg>`;
}

function codeBlock(lines: string[], x: number, y: number, width = 580): string {
  const height = lines.length * 38 + 38;
  const text = lines.map((line, index) =>
    `<text x="${x + 28}" y="${y + 42 + index * 38}" fill="#e2e8f0" font-family="monospace" font-size="22">${escapeXml(line)}</text>`,
  ).join('');
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="14" fill="#1e293b" stroke="#475569"/>${text}`;
}

function cube(x: number, y: number, color: string, label: string): string {
  return `<g transform="translate(${x} ${y})">
    <polygon points="0,40 70,0 140,40 70,80" fill="${color}" opacity="0.92"/>
    <polygon points="0,40 70,80 70,160 0,120" fill="#0f766e"/>
    <polygon points="70,80 140,40 140,120 70,160" fill="#134e4a"/>
    <text x="70" y="190" text-anchor="middle" fill="#cbd5e1" font-family="Arial, sans-serif" font-size="18">${escapeXml(label)}</text>
  </g>`;
}

function wrappedLines(text: string, maxLength: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current.length === 0 ? word : `${current} ${word}`;
    if (next.length > maxLength && current.length > 0) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current.length > 0) lines.push(current);
  return lines;
}

function arrow(x1: number, x2: number, y: number, label: string): string {
  return `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#5eead4" stroke-width="3" marker-end="url(#arrow)"/>
    <text x="${(x1 + x2) / 2}" y="${y - 16}" text-anchor="middle" fill="#99f6e4" font-family="Arial, sans-serif" font-size="18">${escapeXml(label)}</text>`;
}

function diagnosticFrame(code: string, message: string): string {
  const messageLines = wrappedLines(message, 44).slice(0, 7);
  const messageSvg = messageLines.map((line, index) =>
    `<text x="764" y="${274 + index * 25}" fill="#ffe4e6" font-family="monospace" font-size="16">${escapeXml(line)}</text>`,
  ).join('');
  return svgFrame(
    'Unknown placement keys fail clearly',
    'The option path and accepted keys now come from the Assembly.part contract',
    `${codeBlock([
      "arm.part('spacer', box(10, 10, 10), {",
      '  att: [120, 0, 0], // typo',
      '});',
    ], 66, 182, 622)}
    <rect x="730" y="182" width="480" height="274" rx="14" fill="#2a1720" stroke="#fb7185" stroke-width="2"/>
    <text x="764" y="226" fill="#fda4af" font-family="Arial, sans-serif" font-size="22" font-weight="700">${escapeXml(code)}</text>
    ${messageSvg}
    <text x="764" y="501" fill="#cbd5e1" font-family="Arial, sans-serif" font-size="20">The typo is named before geometry is exported.</text>`,
  );
}

async function main(): Promise<void> {
  const badSession = new CaptureSession();
  const badApi = createModelingApi({ session: badSession });
  const badAssembly = badApi.assembly('fixture');
  badAssembly.part('base', badApi.box(10, 10, 10));
  let capturedError: KernelError | undefined;
  try {
    const badOpts = { att: [120, 0, 0] } as unknown as AssemblyPartOpts;
    badAssembly.part('spacer', badApi.box(10, 10, 10), badOpts);
  } catch (error) {
    if (!(error instanceof KernelError)) throw error;
    capturedError = error;
  }
  if (capturedError?.code !== 'feature.invalid-args' || !capturedError.message.includes('opts.att')) {
    throw new Error('Expected the unknown att option to fail with a feature.invalid-args diagnostic at opts.att.');
  }

  const goodSession = new CaptureSession();
  const goodApi = createModelingApi({ session: goodSession });
  const goodAssembly = goodApi.assembly('fixture');
  goodAssembly.part('base', goodApi.box(10, 10, 10));
  goodAssembly.part('spacer', goodApi.box(10, 10, 10), { at: [120, 0, 0] });
  const spacer = goodAssembly.__parts().find((part) => part.name === 'spacer');
  if (spacer === undefined) throw new Error('Corrected placement did not capture the spacer part.');
  const correctedAtMm = resolvedPartAt(spacer.at, goodSession.paramTable);
  if (correctedAtMm[0] !== 120 || correctedAtMm[1] !== 0 || correctedAtMm[2] !== 0) {
    throw new Error(`Expected corrected placement [120, 0, 0] mm; got ${JSON.stringify(correctedAtMm)}.`);
  }

  const badSlide = svgFrame(
    'A placement typo used to move the wrong part',
    'An unrecognized key was dropped, so assembly.part used its default origin.',
    `${codeBlock([
      "arm.part('base', box(10, 10, 10));",
      "arm.part('spacer', box(10, 10, 10), {",
      '  att: [120, 0, 0], // ignored before this fix',
      '});',
    ], 66, 182, 714)}
    <text x="846" y="212" fill="#fda4af" font-family="Arial, sans-serif" font-size="22" font-weight="700">BEFORE · accepted at [0, 0, 0]</text>
    ${cube(860, 282, '#fb7185', 'base')}${cube(930, 302, '#60a5fa', 'spacer')}
    <text x="846" y="514" fill="#cbd5e1" font-family="Arial, sans-serif" font-size="18">The two 10 mm parts share the origin.</text>`,
  );
  const goodSlide = svgFrame(
    'Correct key preserves the intended location',
    'The captured part origin is measured from the AssemblyPart record in millimetres.',
    `${codeBlock([
      "arm.part('base', box(10, 10, 10));",
      "arm.part('spacer', box(10, 10, 10), {",
      '  at: [120, 0, 0],',
      '});',
    ], 66, 182, 656)}
    <text x="790" y="212" fill="#99f6e4" font-family="Arial, sans-serif" font-size="22" font-weight="700">AFTER · captured at [${correctedAtMm.join(', ')}] mm</text>
    ${cube(810, 282, '#5eead4', 'base')}${arrow(950, 1018, 332, '120 mm')}${cube(1030, 282, '#60a5fa', 'spacer')}
    <text x="790" y="514" fill="#cbd5e1" font-family="Arial, sans-serif" font-size="18">Use the at key for explicit placement.</text>`,
  );
  const slides = [badSlide, diagnosticFrame(capturedError.code, capturedError.message), goodSlide];
  const frameDir = await import('node:fs/promises').then(({ mkdtemp }) => mkdtemp(join(tmpdir(), 'kcad-assembly-part-options-')));
  try {
    for (let index = 0; index < FPS * SECONDS_PER_SLIDE * SLIDES; index += 1) {
      const slideIndex = Math.floor(index / (FPS * SECONDS_PER_SLIDE));
      await sharp(Buffer.from(slides[slideIndex]!))
        .png()
        .toFile(join(frameDir, `frame-${String(index).padStart(4, '0')}.png`));
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
  const video = await readFile(VIDEO_PATH);
  const evidence = {
    generatedAt: new Date().toISOString(),
    replay: 'Local CaptureSession + createModelingApi; no browser or deployed runtime used.',
    invocation: 'npx tsx docs/demos/assembly-part-option-keys-20261117/capture-demo.mts',
    source: {
      path: 'docs/demos/assembly-part-option-keys-20261117/capture-demo.mts',
      sha256: createHash('sha256').update(script).digest('hex'),
    },
    settings: {
      width: WIDTH,
      height: HEIGHT,
      fps: FPS,
      secondsPerSlide: SECONDS_PER_SLIDE,
      slides: SLIDES,
      encoder: 'libx264',
      crf: 24,
      pixelFormat: 'yuv420p',
    },
    regression: {
      unknownKey: 'att',
      errorCode: capturedError.code,
      errorMessage: capturedError.message,
      errorPath: 'opts.att',
      priorBehaviorFromOriginDevelop: 'The unknown key was ignored and resolvePartPlacement defaulted missing opts.at to [0, 0, 0] mm.',
    },
    correctedPlacement: {
      part: 'spacer',
      atMm: correctedAtMm,
      source: 'resolvedPartAt(spacer.at, session.paramTable)',
    },
    video: {
      path: 'docs/demos/assembly-part-option-keys-20261117/demo.mp4',
      sha256: createHash('sha256').update(video).digest('hex'),
      bytes: video.length,
    },
    claimBoundary: {
      localCaptureReplay: true,
      simulation: false,
      deployedBehavior: false,
      hardwareAcceptance: false,
    },
  };
  await writeFile(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify({ video: VIDEO_PATH, evidence: EVIDENCE_PATH, errorCode: capturedError.code, errorPath: 'opts.att', correctedAtMm }, null, 2));
}

await main();
