// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Bake the authored animation and make a short, schematic replay from the
// actual world-matrix rotations. This is local bake evidence, not a UI capture.
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { buildModel } from '../../../src/modeling/buildModel';
import { sampleTracks } from '../../../src/modeling/animation/animationSampler';
import {
  bakeAnimationTimeline,
  selectAnimationMetadata,
} from '../../../src/modeling/animation/bakeAnimationTimeline';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)));
const MODEL = resolve(ROOT, 'coupled-gear.kcad.ts');
const FRAMES = resolve(ROOT, '.animation-bake-frames');
const VIDEO = resolve(ROOT, 'animation-bake.mp4');
const EVIDENCE = resolve(ROOT, 'animation-bake-evidence.json');
const WIDTH = 1280;
const HEIGHT = 720;
const RATIO = -12 / 48;
const DEG_TO_RAD = Math.PI / 180;

interface DisplayFrame {
  readonly frameIndex: number;
  readonly timeSeconds: number;
  readonly inputDeg: number;
  readonly motorDeg: number;
  readonly axleDeg: number;
  readonly motorResidualDeg: number;
  readonly axleResidualDeg: number;
}

function zDeg(matrix: ArrayLike<number>): number {
  return Math.atan2(matrix[1]!, matrix[0]!) / DEG_TO_RAD;
}

function wrapDeg(degrees: number): number {
  return ((degrees + 180) % 360 + 360) % 360 - 180;
}

function gearSvg(
  teeth: number,
  pitchRadius: number,
  color: string,
  angleDeg: number,
  cx: number,
  cy: number,
): string {
  const toothMarks = Array.from({ length: teeth }, (_, index) => {
    const angle = (2 * Math.PI * index) / teeth;
    const inner = pitchRadius - 13;
    const outer = pitchRadius - 3;
    return (
      '<line x1="' +
      (inner * Math.cos(angle)).toFixed(1) +
      '" y1="' +
      (inner * Math.sin(angle)).toFixed(1) +
      '" x2="' +
      (outer * Math.cos(angle)).toFixed(1) +
      '" y2="' +
      (outer * Math.sin(angle)).toFixed(1) +
      '"/>'
    );
  }).join('');
  return (
    '<g transform="translate(' +
    cx +
    ' ' +
    cy +
    ') rotate(' +
    angleDeg.toFixed(3) +
    ')">' +
    '<circle r="' +
    pitchRadius +
    '" fill="' +
    color +
    '" fill-opacity=".12" stroke="' +
    color +
    '" stroke-width="3"/>' +
    '<g fill="none" stroke="' +
    color +
    '" stroke-width="3" stroke-linecap="round">' +
    toothMarks +
    '</g>' +
    '<line x1="0" y1="0" x2="' +
    (pitchRadius * 0.82).toFixed(1) +
    '" y2="0" stroke="' +
    color +
    '" stroke-width="7" stroke-linecap="round"/>' +
    '<circle r="8" fill="#10151d" stroke="' +
    color +
    '" stroke-width="3"/>' +
    '</g>'
  );
}

function svgFor(frame: DisplayFrame, displayIndex: number, total: number, fps: number): string {
  const progress = displayIndex / Math.max(total - 1, 1);
  const seconds = frame.timeSeconds.toFixed(3);
  const input = frame.inputDeg.toFixed(2);
  const motor = frame.motorDeg.toFixed(2);
  const axle = frame.axleDeg.toFixed(2);
  const error = Math.max(Math.abs(frame.motorResidualDeg), Math.abs(frame.axleResidualDeg));
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="' +
    WIDTH +
    '" height="' +
    HEIGHT +
    '" viewBox="0 0 ' +
    WIDTH +
    ' ' +
    HEIGHT +
    '">' +
    '<rect width="100%" height="100%" fill="#10151d"/>' +
    '<text x="52" y="43" fill="#f2f5f8" font-family="Arial,sans-serif" font-size="30" font-weight="700">KernelCAD · coupled gear animation bake</text>' +
    '<text x="54" y="76" fill="#aeb8c4" font-family="Arial,sans-serif" font-size="17">12T motor input → 48T rear axle · authored ratio −1/4 · local deterministic bake</text>' +
    gearSvg(12, 60, '#ffb454', frame.motorDeg, 260, 360) +
    gearSvg(48, 240, '#68b8ff', frame.axleDeg, 560, 360) +
    '<rect x="860" y="142" width="371" height="410" rx="12" fill="#171f2a" stroke="#384451"/>' +
    '<text x="885" y="181" fill="#f2f5f8" font-family="Arial,sans-serif" font-size="21" font-weight="700">Baked display frame</text>' +
    '<text x="885" y="216" fill="#aeb8c4" font-family="Arial,sans-serif" font-size="15">frame ' +
    (displayIndex + 1) +
    ' / ' +
    total +
    ' · source ' +
    (frame.frameIndex + 1) +
    '</text>' +
    '<text x="885" y="247" fill="#aeb8c4" font-family="Arial,sans-serif" font-size="15">t = ' +
    seconds +
    ' s · ' +
    fps +
    ' fps</text>' +
    '<text x="885" y="302" fill="#ffb454" font-family="Arial,sans-serif" font-size="16">motor-rotor · 12T</text>' +
    '<text x="885" y="330" fill="#f2f5f8" font-family="Arial,sans-serif" font-size="22">track ' +
    input +
    '°</text>' +
    '<text x="885" y="359" fill="#aeb8c4" font-family="Arial,sans-serif" font-size="15">baked Z ' +
    motor +
    '°</text>' +
    '<text x="885" y="412" fill="#68b8ff" font-family="Arial,sans-serif" font-size="16">rear-live-axle · 48T</text>' +
    '<text x="885" y="441" fill="#f2f5f8" font-family="Arial,sans-serif" font-size="22">baked Z ' +
    axle +
    '°</text>' +
    '<text x="885" y="483" fill="#68d391" font-family="Arial,sans-serif" font-size="16">wrapped ratio error ' +
    error.toFixed(5) +
    '°</text>' +
    '<text x="885" y="519" fill="#aeb8c4" font-family="Arial,sans-serif" font-size="14">no bake collision advisories</text>' +
    '<text x="56" y="637" fill="#d2d9e0" font-family="Arial,sans-serif" font-size="15">Schematic pitch circles and tooth-count marks · rotations from baked world matrices · centers 30 mm apart</text>' +
    '<rect x="55" y="659" width="1170" height="8" rx="4" fill="#26303c"/>' +
    '<rect x="55" y="659" width="' +
    (1170 * progress).toFixed(1) +
    '" height="8" rx="4" fill="#68b8ff"/>' +
    '<text x="55" y="700" fill="#8895a3" font-family="Arial,sans-serif" font-size="13">Local replay only · hosted rendered animation and hardware acceptance were not verified</text>' +
    '</svg>'
  );
}

async function main(): Promise<void> {
  await mkdir(FRAMES, { recursive: true });
  const code = await readFile(MODEL, 'utf8');
  const model = await buildModel({ code, fileName: MODEL, scriptDir: ROOT });
  const animation = selectAnimationMetadata(model);
  if (!animation) throw new Error('The fixture has no authored animation metadata.');

  const schedule = sampleTracks(animation.tracks, animation.fps).frames;
  const baked = await bakeAnimationTimeline(model);
  const motorPart = baked.parts.find((part) => part.name === 'motor-rotor');
  const axlePart = baked.parts.find((part) => part.name === 'rear-live-axle');
  if (!motorPart || !axlePart) throw new Error('Expected both coupled gear parts in the bake.');
  if (baked.frames !== schedule.length) throw new Error('The bake and authored frame schedule differ.');
  if (baked.collisions.length !== 0) throw new Error('The animation bake reported collision advisories.');

  let maxMotorResidualDeg = 0;
  let maxAxleResidualDeg = 0;
  const frames = schedule.map((sample, frameIndex) => {
    const inputDeg = sample.values.motorDeg!;
    const motorDeg = zDeg(motorPart.matrices[frameIndex]!);
    const axleDeg = zDeg(axlePart.matrices[frameIndex]!);
    const motorResidualDeg = wrapDeg(motorDeg - inputDeg);
    const axleResidualDeg = wrapDeg(axleDeg - RATIO * inputDeg);
    maxMotorResidualDeg = Math.max(maxMotorResidualDeg, Math.abs(motorResidualDeg));
    maxAxleResidualDeg = Math.max(maxAxleResidualDeg, Math.abs(axleResidualDeg));
    return {
      frameIndex,
      timeSeconds: frameIndex / animation.fps,
      inputDeg,
      motorDeg,
      axleDeg,
      motorResidualDeg,
      axleResidualDeg,
    };
  });
  if (
    !Number.isFinite(maxMotorResidualDeg) ||
    !Number.isFinite(maxAxleResidualDeg) ||
    maxMotorResidualDeg > 1e-6 ||
    maxAxleResidualDeg > 1e-6
  ) {
    throw new Error(
      'Baked angles must be finite and within the 1e-6° authored-track and signed-coupling tolerance.',
    );
  }

  const selected = Array.from({ length: 7 }, (_, index) => {
    const frameIndex = Math.round((index * (frames.length - 1)) / 6);
    return frames[frameIndex]!;
  });
  for (let index = 0; index < selected.length; index++) {
    const png = Buffer.from(svgFor(selected[index]!, index, selected.length, animation.fps));
    await sharp(png).png().toFile(resolve(FRAMES, 'frame-' + String(index).padStart(2, '0') + '.png'));
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
      String(selected.length),
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
      VIDEO,
    ],
    { encoding: 'utf8' },
  );
  if (video.status !== 0) throw new Error('ffmpeg failed: ' + (video.stderr || video.error));
  await rm(FRAMES, { recursive: true, force: true });

  const evidence = {
    scenario: 'baked animation for the authored 12:48 coupled gear fixture',
    generatedAt: new Date().toISOString(),
    invocation: 'npx tsx docs/demos/issue-1321-coupled-gear/capture-animation-bake-demo.ts',
    modelSource: 'coupled-gear.kcad.ts',
    modelSourceSha256: createHash('sha256').update(code).digest('hex'),
    localReplay: true,
    deployedBehaviorVerified: false,
    renderedOriginalModelVerified: false,
    hardwareAcceptanceVerified: false,
    authoredFps: animation.fps,
    bakedFrameCount: baked.frames,
    videoFrameCount: selected.length,
    videoSeconds: selected.length,
    parts: ['motor-rotor', 'rear-live-axle'],
    signedRatio: RATIO,
    maxMotorTrackResidualDegrees: maxMotorResidualDeg,
    maxAxleCouplingResidualDegrees: maxAxleResidualDeg,
    residualToleranceDegrees: 1e-6,
    collisionAdvisories: baked.collisions.length,
    displayedSamples: selected.map((frame) => ({
      frameIndex: frame.frameIndex,
      timeSeconds: Number(frame.timeSeconds.toFixed(6)),
      motorTrackDegrees: Number(frame.inputDeg.toFixed(6)),
      motorBakedZDegrees: Number(frame.motorDeg.toFixed(6)),
      axleBakedZDegrees: Number(frame.axleDeg.toFixed(6)),
      wrappedCouplingResidualDegrees: Number(frame.axleResidualDeg.toFixed(9)),
    })),
    visualNote: 'Pitch circles and tooth-count marks are schematic. Displayed rotations are sampled from actual bake matrices.',
  };
  await writeFile(EVIDENCE, JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify({ video: VIDEO, evidence: EVIDENCE, ...evidence }, null, 2));
}

await main();
