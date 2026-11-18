// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Package hosted static pose renders of the immutable RC buggy revision into
// a short MP4. This does not record the hosted viewer's animation controls.
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)));
const SOURCE = resolve(ROOT, 'original-rc-buggy-v1.kcad.ts');
const OUTPUT = resolve(ROOT, 'original-rc-buggy-animation.mp4');
const EVIDENCE = resolve(ROOT, 'original-render-evidence.json');
const FRAMES = resolve(ROOT, '.original-render-video-frames');
const SOURCE_SHA256 = '7f020f2826d82ed4e35e2193f8644705772997d9800179cdda9fe86e2072b9a3';
const SERVER_BUILD = '0.1.0+a450870ad106@2026-11-12T23:27:09.813Z';
const WIDTH = 640;
const HEIGHT = 360;
const RATIO = -12 / 48;
const MOTOR_DEGREE_SAMPLES = [0, 45, 90, 135, 180, 270, 360, 720] as const;

function frameCaption(inputDeg: number, index: number): string {
  const timeSeconds = inputDeg / 180;
  const axleContractDeg = inputDeg * RATIO;
  const frameNumber = index + 1;
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="' +
    WIDTH +
    '" height="' +
    HEIGHT +
    '">' +
    '<rect x="420" y="14" width="208" height="330" rx="12" fill="#171f2a" stroke="#384451"/>' +
    '<text x="438" y="43" fill="#f2f5f8" font-family="Arial,sans-serif" font-size="16" font-weight="700">RC buggy · revision 1</text>' +
    '<text x="438" y="70" fill="#aeb8c4" font-family="Arial,sans-serif" font-size="13">frame ' +
    frameNumber +
    ' / ' +
    MOTOR_DEGREE_SAMPLES.length +
    ' · t=' +
    timeSeconds.toFixed(2) +
    ' s</text>' +
    '<text x="438" y="115" fill="#ffb454" font-family="Arial,sans-serif" font-size="14">motorDeg input</text>' +
    '<text x="438" y="145" fill="#f2f5f8" font-family="Arial,sans-serif" font-size="22">' +
    inputDeg +
    '°</text>' +
    '<text x="438" y="187" fill="#68b8ff" font-family="Arial,sans-serif" font-size="14">coupling contract</text>' +
    '<text x="438" y="216" fill="#f2f5f8" font-family="Arial,sans-serif" font-size="17">−0.25 × input</text>' +
    '<text x="438" y="242" fill="#f2f5f8" font-family="Arial,sans-serif" font-size="17">= ' +
    axleContractDeg.toFixed(2) +
    '°</text>' +
    '<text x="438" y="278" fill="#aeb8c4" font-family="Arial,sans-serif" font-size="12">hosted static render</text>' +
    '<text x="438" y="298" fill="#68d391" font-family="Arial,sans-serif" font-size="12">animation verify: pass</text>' +
    '<text x="438" y="318" fill="#aeb8c4" font-family="Arial,sans-serif" font-size="12">local MP4 assembly</text>' +
    '<text x="16" y="353" fill="#b9c2cc" font-family="Arial,sans-serif" font-size="12">Static render samples · hosted viewer playback was not captured</text>' +
    '</svg>'
  );
}

async function main(): Promise<void> {
  const source = await readFile(SOURCE);
  const sourceSha256 = createHash('sha256').update(source).digest('hex');
  if (sourceSha256 !== SOURCE_SHA256 || source.byteLength !== 6088) {
    throw new Error('The retained source no longer matches published revision 1.');
  }

  await mkdir(FRAMES, { recursive: true });
  for (let index = 0; index < MOTOR_DEGREE_SAMPLES.length; index++) {
    const inputDeg = MOTOR_DEGREE_SAMPLES[index]!;
    const sourceFrame = resolve(ROOT, 'original-frame-' + String(inputDeg).padStart(4, '0') + '.png');
    const metadata = await sharp(sourceFrame).metadata();
    if (metadata.width !== 640 || metadata.height !== 360) {
      throw new Error('Expected a 640x360 hosted pose render: ' + sourceFrame);
    }
    const cropped = await sharp(sourceFrame)
      .extract({ left: 205, top: 75, width: 235, height: 210 })
      .resize({
        width: 400,
        height: 340,
        fit: 'contain',
        background: { r: 16, g: 21, b: 29, alpha: 1 },
      })
      .png()
      .toBuffer();
    await sharp({
      create: {
        width: WIDTH,
        height: HEIGHT,
        channels: 4,
        background: '#10151d',
      },
    })
      .composite([
        { input: cropped, left: 10, top: 8 },
        { input: Buffer.from(frameCaption(inputDeg, index)), left: 0, top: 0 },
      ])
      .png()
      .toFile(resolve(FRAMES, 'frame-' + String(index).padStart(2, '0') + '.png'));
  }

  const video = spawnSync(
    'ffmpeg',
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-framerate',
      '1',
      '-i',
      resolve(FRAMES, 'frame-%02d.png'),
      '-t',
      String(MOTOR_DEGREE_SAMPLES.length),
      '-r',
      '24',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-crf',
      '22',
      '-movflags',
      '+faststart',
      OUTPUT,
    ],
    { encoding: 'utf8' },
  );
  if (video.status !== 0) throw new Error('ffmpeg failed: ' + (video.stderr || video.error));
  await rm(FRAMES, { recursive: true, force: true });

  const evidence = {
    scenario: 'hosted static render samples from immutable RC buggy revision 1',
    generatedAt: new Date().toISOString(),
    invocation: 'npx tsx docs/demos/issue-1321-coupled-gear/capture-original-rc-animation.ts',
    source: {
      slug: 'nMQXpIBa',
      version: 1,
      file: 'original-rc-buggy-v1.kcad.ts',
      bytes: source.byteLength,
      sha256: sourceSha256,
      privacy: 'public_unlisted',
    },
    serverBuild: SERVER_BUILD,
    localVideo: true,
    localStaticRenderSamples: true,
    hostedViewerPlaybackCaptured: false,
    deployedBehaviorVerified: false,
    hardwareAcceptanceVerified: false,
    hostedAnimationVerification: {
      verified: true,
      verifyEvery: 1,
      collisions: [],
      durationMs: 4000,
      fps: 24,
      encodedFrameCount: 0,
      encodingFailure: 'ffmpeg was not found on the kernelCAD server PATH.',
    },
    hostedPhysicsVerification: {
      ok: true,
      mechanism: 'real',
      failures: [],
      poses: 10,
      joints: 6,
      fastened: 6,
      limitsChecked: 3,
      matesChecked: true,
      sweep: true,
      physics: true,
      skipped: [
        "joint 'front-wheel-right-spin' rotation has no limits, range not checked",
        "joint 'front-wheel-left-spin' rotation has no limits, range not checked",
      ],
    },
    renderPreviewSettings: {
      renderSource: 'static-player',
      views: ['front'],
      focus: ['motor-rotor', 'rear-live-axle'],
      preset: 'publish',
      background: '#10151d',
      shadow: true,
      width: 640,
      height: 360,
      autosave: false,
      parameterOverride: "const motorDeg=param('motorDeg',<sample>,...)",
    },
    geometrySummary: {
      valid: true,
      volumeMm3: 720591.2138600089,
      faceCount: 525,
    },
    signedRatio: RATIO,
    displayedSamples: MOTOR_DEGREE_SAMPLES.map((motorDeg) => ({
      motorDeg,
      sourceTimelineSeconds: Number((motorDeg / 180).toFixed(6)),
      axleContractDegrees: Number((motorDeg * RATIO).toFixed(6)),
      sourceFrame: 'original-frame-' + String(motorDeg).padStart(4, '0') + '.png',
    })),
    visualNote:
      'The MP4 assembles current server static renders at sampled motorDeg values. It is not a capture of the hosted viewer playback.',
  };
  await writeFile(EVIDENCE, JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify({ video: OUTPUT, evidence: EVIDENCE, ...evidence }, null, 2));
}

await main();
