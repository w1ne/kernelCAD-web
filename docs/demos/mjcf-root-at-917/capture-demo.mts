// SPDX-License-Identifier: MIT
// Reproduce the root placement handoff and render its actual output as a short MP4.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../src/modeling/api';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { assemblyToMjcf } from '../../../src/modeling/runtime/mjcfExport';
import { loadMujocoSession } from '../../../src/modeling/runtime/mujocoSession';

const OUTPUT_DIR = dirname(fileURLToPath(import.meta.url));
const INPUT_AT_MM = [125, -40, 60] as const;
const EXPECTED_POSE_M = [0.125, -0.04, 0.06] as const;
const WIDTH = 1280;
const HEIGHT = 720;
const FPS = 20;
const DURATION_S = 7.5;

function xml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function renderSlide(title: string, section: string, lines: readonly string[], note: string): string {
  const code = lines.map((line, index) =>
    `<text x="96" y="${294 + index * 54}" class="code">${xml(line)}</text>`,
  ).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#f3f6fb"/>
  <rect width="${WIDTH}" height="10" fill="#2868d7"/>
  <text x="70" y="74" class="title">${xml(title)}</text>
  <text x="72" y="118" class="subtitle">Root part placement · kernelCAD millimetres to MJCF coordinates</text>
  <rect x="64" y="166" width="1152" height="374" rx="18" fill="#ffffff" stroke="#d8e0ed" stroke-width="2"/>
  <text x="96" y="222" class="section">${xml(section)}</text>
  ${code}
  <text x="72" y="597" class="note">${xml(note)}</text>
  <rect x="72" y="638" width="390" height="34" rx="17" fill="#e4ecfb"/>
  <text x="91" y="661" class="tag">LOCAL XML + FORWARD-KINEMATICS CHECK</text>
  <text x="1210" y="662" text-anchor="end" class="footer">0 integration steps · no deployment or hardware claim</text>
  <style>
    .title { font: 700 42px Arial, sans-serif; fill: #17243a; }
    .subtitle { font: 22px Arial, sans-serif; fill: #5b6a81; }
    .section { font: 700 19px Arial, sans-serif; fill: #475a75; letter-spacing: 1px; }
    .code { font: 26px 'DejaVu Sans Mono', monospace; fill: #19375f; }
    .note { font: 700 24px Arial, sans-serif; fill: #17243a; }
    .tag { font: 700 13px Arial, sans-serif; fill: #244a83; letter-spacing: .5px; }
    .footer { font: 16px Arial, sans-serif; fill: #5b6a81; }
  </style>
</svg>`;
}

async function main(): Promise<void> {
  await mkdir(OUTPUT_DIR, { recursive: true });
  await initOcct();
  const capture = new CaptureSession();
  const kcad = createModelingApi({ session: capture });
  const arm = kcad.assembly('placed-root');
  arm.part('offset-base', kcad.box(20, 20, 20, true), { at: [...INPUT_AT_MM] });

  const exported = await assemblyToMjcf(arm);
  const bodyLine = exported.mjcf.split('\n').find((line) => line.includes('<body name="offset-base"'))?.trim();
  if (bodyLine === undefined) throw new Error('MJCF did not contain the expected root body.');

  const mujoco = await loadMujocoSession(exported.mjcf, exported.bodyOrder, exported.jointOrder);
  let actualPoseM: number[];
  try {
    mujoco.forward();
    const pose = mujoco.xposNow().get('offset-base');
    if (pose === undefined) throw new Error('MuJoCo did not report the root body pose.');
    actualPoseM = [...pose];
  } finally {
    mujoco.dispose();
  }
  const deltaM = actualPoseM.map((value, axis) => value - EXPECTED_POSE_M[axis]!);
  if (deltaM.some((value) => Math.abs(value) > 1e-12)) {
    throw new Error(`Unexpected compiled root pose: ${JSON.stringify(actualPoseM)}`);
  }

  const modelPath = join(OUTPUT_DIR, 'model.xml');
  await writeFile(modelPath, exported.mjcf);
  const tempDir = await mkdtemp(join(tmpdir(), 'kernelcad-mjcf-root-at-'));
  try {
    const slides = [
      renderSlide('Keep the authored root position', 'KERNELCAD INPUT · millimetres', [
        "arm.part('offset-base', box(20, 20, 20, true), {",
        '  at: [125, -40, 60],',
        '});',
      ], 'A free root part should keep its explicit at placement.'),
      renderSlide('Serialize the root in the model coordinate system', 'EMITTED MJCF · metres from the kernelCAD converter', [
        bodyLine,
        `Input at: [${INPUT_AT_MM.join(', ')}] mm`,
        'Expected conversion: divide each coordinate by 1000',
      ], 'The prior output incorrectly replaced this root pos with 0 0 0.'),
      renderSlide('Check the compiled rest pose', 'MUJOCO FORWARD KINEMATICS · no integration step', [
        `xpos: [${actualPoseM.map((value) => value.toFixed(6)).join(', ')}] m`,
        `equivalent: [${INPUT_AT_MM.join(', ')}] mm`,
        `delta from expected: [${deltaM.map((value) => value.toFixed(9)).join(', ')}] m`,
      ], 'Local serialization and forward-kinematics evidence only; simulation not run.'),
    ];
    const imagePaths: string[] = [];
    for (const [index, svg] of slides.entries()) {
      const imagePath = join(tempDir, `slide-${index + 1}.png`);
      await sharp(Buffer.from(svg)).png().toFile(imagePath);
      imagePaths.push(imagePath);
    }
    const concatPath = join(tempDir, 'slides.txt');
    const concatEntry = (path: string) => `file '${path.replaceAll("'", "'\\''")}'`;
    const concatText = imagePaths.map((path) => `${concatEntry(path)}\nduration ${DURATION_S / slides.length}`).join('\n');
    await writeFile(concatPath, `${concatText}\n${concatEntry(imagePaths.at(-1)!)}\n`);

    const videoPath = join(OUTPUT_DIR, 'demo.mp4');
    const ffmpegArgs = [
      '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', concatPath,
      '-t', String(DURATION_S), '-vf', `fps=${FPS},format=yuv420p`,
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '22', '-movflags', '+faststart', videoPath,
    ];
    const recordedFfmpegArgs = ffmpegArgs.map((arg) =>
      arg === concatPath ? '<temporary-slides.txt>' : arg === videoPath ? 'demo.mp4' : arg,
    );
    execFileSync('ffmpeg', ffmpegArgs, { stdio: 'pipe' });
    const probe = JSON.parse(execFileSync('ffprobe', [
      '-v', 'error', '-show_entries', 'stream=codec_name,width,height,r_frame_rate,duration',
      '-of', 'json', videoPath,
    ], { encoding: 'utf8' })) as {
      streams: Array<{ codec_name: string; width: number; height: number; r_frame_rate: string; duration: string }>;
    };
    const video = probe.streams[0];
    if (video === undefined || video.codec_name !== 'h264' || video.width !== WIDTH || video.height !== HEIGHT) {
      throw new Error(`Unexpected demo video metadata: ${JSON.stringify(probe)}`);
    }

    await writeFile(join(OUTPUT_DIR, 'verification.json'), `${JSON.stringify({
      checkedAt: new Date().toISOString(),
      source: 'docs/demos/mjcf-root-at-917/capture-demo.mts',
      invocation: 'npx tsx docs/demos/mjcf-root-at-917/capture-demo.mts',
      exporter: 'assemblyToMjcf(arm)',
      model: 'docs/demos/mjcf-root-at-917/model.xml',
      modelSha256: createHash('sha256').update(exported.mjcf).digest('hex'),
      authoredAtMm: INPUT_AT_MM,
      emittedRootBody: bodyLine,
      compiledRestPoseM: actualPoseM,
      deltaFromExpectedM: deltaM,
      checks: {
        localMjcfSerialization: true,
        mujocoModelLoad: true,
        forwardKinematicsAtRest: true,
        integrationSteps: 0,
        deployedBehavior: false,
        hardwareAcceptance: false,
      },
      video: {
        ffmpegArgs: recordedFfmpegArgs,
        codec: video.codec_name,
        width: video.width,
        height: video.height,
        frameRate: video.r_frame_rate,
        durationSeconds: Number(video.duration),
      },
    }, null, 2)}\n`);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

await main();
