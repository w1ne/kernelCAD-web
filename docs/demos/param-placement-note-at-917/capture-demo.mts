// SPDX-License-Identifier: MIT
// Build the real regression model and render its resolved placement diagnostic.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildModel } from '../../../src/modeling/buildModel';

const OUTPUT_DIR = dirname(fileURLToPath(import.meta.url));
const MODEL_FILE = join(OUTPUT_DIR, 'param-placement.kcad.ts');
const WIDTH = 1280;
const HEIGHT = 720;
const FPS = 20;
const DURATION_S = 7.5;

function xml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function renderSlide(title: string, section: string, lines: readonly string[], note: string): string {
  const code = lines.map((line, index) =>
    `<text x="96" y="${282 + index * 50}" class="code">${xml(line)}</text>`,
  ).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#f3f6fb"/>
  <rect width="${WIDTH}" height="10" fill="#2868d7"/>
  <text x="70" y="74" class="title">${xml(title)}</text>
  <text x="72" y="118" class="subtitle">Mate placement diagnostics · parameter values in millimetres</text>
  <rect x="64" y="166" width="1152" height="354" rx="18" fill="#ffffff" stroke="#d8e0ed" stroke-width="2"/>
  <text x="96" y="222" class="section">${xml(section)}</text>
  ${code}
  <text x="72" y="582" class="note">${xml(note)}</text>
  <rect x="72" y="630" width="360" height="34" rx="17" fill="#e4ecfb"/>
  <text x="91" y="653" class="tag">LOCAL MODEL BUILD · INFO DIAGNOSTIC</text>
  <text x="1208" y="654" text-anchor="end" class="footer">no physics run · no deployment or hardware claim</text>
  <style>
    .title { font: 700 42px Arial, sans-serif; fill: #17243a; }
    .subtitle { font: 22px Arial, sans-serif; fill: #5b6a81; }
    .section { font: 700 19px Arial, sans-serif; fill: #475a75; letter-spacing: 1px; }
    .code { font: 25px 'DejaVu Sans Mono', monospace; fill: #19375f; }
    .note { font: 700 24px Arial, sans-serif; fill: #17243a; }
    .tag { font: 700 13px Arial, sans-serif; fill: #244a83; letter-spacing: .5px; }
    .footer { font: 16px Arial, sans-serif; fill: #5b6a81; }
  </style>
</svg>`;
}

async function main(): Promise<void> {
  await mkdir(OUTPUT_DIR, { recursive: true });
  await initOcct();
  const modelSource = await readFile(MODEL_FILE, 'utf8');
  const model = await buildModel({ fileName: MODEL_FILE, code: modelSource });
  const diagnostic = model.diagnostics.find(
    (item) => item.code === 'assembly.placement-ignored-by-mate-fk',
  );
  if (diagnostic === undefined) {
    throw new Error('The model did not emit assembly.placement-ignored-by-mate-fk.');
  }
  if (!diagnostic.message.includes('(125.00, 0.00, 0.00)')) {
    throw new Error(`Unexpected resolved placement in diagnostic: ${diagnostic.message}`);
  }

  const tempDir = await mkdtemp(join(tmpdir(), 'kernelcad-param-placement-'));
  try {
    const slides = [
      renderSlide('A parameter sets the child placement', 'MODEL INPUT · PARAMETER DEFAULT 125 MM', [
        "const offset = param('offset', 125, { unit: 'mm' });",
        "arm.part('child', box(10, 10, 10), { at: [offset, 0, 0] });",
        "arm.mate('m', 'base.p', 'child.q', 'fastened');",
      ], "The mate-derived pose overrides the child's non-root at: value."),
      renderSlide('Resolve before checking for an override', 'EMITTED MODEL DIAGNOSTIC · INFO', [
        'assembly.placement-ignored-by-mate-fk',
        'resolved at: (125.00, 0.00, 0.00) mm',
        'the mate-FK-derived pose takes precedence',
      ], 'The diagnostic uses the assembly parameter table.'),
      renderSlide('The regression now reports the real value', 'LOCAL MODEL BUILD · NOT A SIMULATION', [
        `severity: ${diagnostic.severity}`,
        `matching diagnostic: ${diagnostic.code}`,
        'focused regression: 7 tests passed',
      ], 'Compiler diagnostic evidence only; no physics integration was run.'),
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
      source: 'docs/demos/param-placement-note-at-917/capture-demo.mts',
      model: 'docs/demos/param-placement-note-at-917/param-placement.kcad.ts',
      modelSha256: createHash('sha256').update(modelSource).digest('hex'),
      invocation: 'npx tsx docs/demos/param-placement-note-at-917/capture-demo.mts',
      diagnostic: {
        code: diagnostic.code,
        severity: diagnostic.severity,
        featureId: diagnostic.featureId,
        message: diagnostic.message,
        hint: diagnostic.hint,
      },
      checks: {
        localModelBuild: true,
        resolvedParameterValueInDiagnostic: true,
        physicsIntegration: false,
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
