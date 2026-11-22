// Run the rest-pose exclusion through the real mechanism checker and render
// the captured diagnostics as a short MP4. This does not run motion simulation.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../src/modeling/api';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { checkMechanismTruth } from '../../../src/modeling/runtime/mechanismTruth';

const OUTPUT_DIR = dirname(fileURLToPath(import.meta.url));
const WIDTH = 1280;
const HEIGHT = 720;
const FPS = 20;
const DURATION_S = 8;
const SWEEP_BUDGET = 0;

type Diagnostic = { code: string; message: string; severity?: string };
type CaseResult = {
  mechanism: string;
  sweepChecked: boolean;
  failures: Diagnostic[];
};

function xml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function wrapText(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const candidate = line.length === 0 ? word : `${line} ${word}`;
    if (line.length > 0 && candidate.length > maxChars) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line.length > 0) lines.push(line);
  return lines;
}

function textLines(lines: readonly string[], x: number, y: number, className = 'body', step = 32): string {
  return lines.map((line, index) =>
    `<text x="${x}" y="${y + index * step}" class="${className}">${xml(line)}</text>`,
  ).join('\n');
}

function slide(title: string, section: string, content: string, page: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#f3f6fb"/>
  <rect width="${WIDTH}" height="10" fill="#2868d7"/>
  <text x="68" y="62" class="eyebrow">KERNELCAD · ISSUE #1271</text>
  <text x="68" y="116" class="title">${xml(title)}</text>
  <text x="68" y="158" class="subtitle">${xml(section)}</text>
  <rect x="64" y="194" width="1152" height="390" rx="18" fill="#ffffff" stroke="#d8e0ed" stroke-width="2"/>
  ${content}
  <rect x="68" y="632" width="1144" height="2" fill="#d8e0ed"/>
  <text x="68" y="666" class="foot">LOCAL CAD VALIDATION · sweepBudget 0 · NO MOTION SIMULATION / DEPLOYMENT / HARDWARE ACCEPTANCE</text>
  <text x="1208" y="666" text-anchor="end" class="foot">${page} / 4</text>
  <style>
    .eyebrow { font: 700 15px Arial, sans-serif; fill: #2868d7; letter-spacing: 1.5px; }
    .title { font: 700 38px Arial, sans-serif; fill: #17243a; }
    .subtitle { font: 20px Arial, sans-serif; fill: #5b6a81; }
    .section { font: 700 16px Arial, sans-serif; fill: #536781; letter-spacing: 1px; }
    .body { font: 21px Arial, sans-serif; fill: #20334f; }
    .small { font: 17px Arial, sans-serif; fill: #5b6a81; }
    .code { font: 700 25px 'DejaVu Sans Mono', monospace; fill: #19375f; }
    .green { font: 700 25px Arial, sans-serif; fill: #18824b; }
    .red { font: 700 25px Arial, sans-serif; fill: #bb3944; }
    .amber { font: 700 21px Arial, sans-serif; fill: #a46400; }
    .foot { font: 700 12px Arial, sans-serif; fill: #64748b; letter-spacing: .35px; }
  </style>
</svg>`;
}

function makeSlides(before: CaseResult, after: CaseResult, beforeRest: Diagnostic, afterCodes: string[]): string[] {
  const beforeLines = wrapText(beforeRest.message, 78).slice(0, 5);
  const beforeText = textLines(beforeLines, 100, 335, 'small', 34);
  const afterText = textLines([
    `Ignored rest overlap warning: ${afterCodes.includes('mechanism.ignored-rest-overlap') ? 'present' : 'none'}`,
    `Sampled BREP travel collision: ${after.sweepChecked
      ? (afterCodes.includes('mechanism.interpenetration') ? 'found' : 'none found')
      : 'not checked'}`,
    `Mechanism verdict: ${after.mechanism}`,
    `Travel sweep checked: ${String(after.sweepChecked)}`,
  ], 108, 318, 'body', 48);

  const modelDiagram = `
    <text x="96" y="244" class="section">AUTHORED REST POSE · DIAGRAM NOT TO SCALE</text>
    <rect x="170" y="326" width="390" height="176" rx="10" fill="#4c87d1" fill-opacity=".78" stroke="#2868d7" stroke-width="3"/>
    <rect x="410" y="390" width="390" height="176" rx="10" fill="#df6c6c" fill-opacity=".78" stroke="#bb3944" stroke-width="3"/>
    <rect x="410" y="390" width="150" height="112" fill="#9b65bd" fill-opacity=".76"/>
    <text x="220" y="372" class="code">part a</text>
    <text x="630" y="540" class="code">part b</text>
    <text x="870" y="374" class="body">30 × 30 × 10 mm boxes</text>
    <text x="870" y="418" class="small">b authored at [10, 10, 5] mm</text>
    <text x="870" y="485" class="small">The engine measures the actual</text>
    <text x="870" y="515" class="small">solved rest pose before and after</text>
    <text x="870" y="545" class="small">the symmetric pair declaration.</text>`;

  const beforePanel = `
    <text x="100" y="245" class="section">ACTUAL MECHANISM CHECKER OUTPUT</text>
    <text x="100" y="290" class="red">${xml(beforeRest.code)}</text>
    ${beforeText}
    <text x="100" y="535" class="small">Observed mechanism verdict: ${xml(before.mechanism)} · zero-budget sweep not checked</text>`;

  const afterPanel = `
    <text x="100" y="246" class="section">AFTER ` +
    `<tspan class="code">ignore: [['a', 'b']]</tspan></text>
    <text x="108" y="288" class="green">Pair-specific rest-pose exception applied</text>
    ${afterText}
    <text x="108" y="540" class="amber">Mate gap and joint continuity are still measured.</text>`;

  const scope = `
    <text x="100" y="250" class="section">WHAT THIS REPLAY ESTABLISHES</text>
    ${textLines([
      'Local validation: the same overlapping assembly, before and after the ignore pair.',
      'Motion coverage: sweepBudget = 0; travel is unverified in this replay.',
      'Regression coverage: a separate test keeps ignored pairs active at joint limits.',
      'Simulation: no physics integration or motion simulation was run.',
      'Deployment / hardware: not deployed; no physical hardware acceptance.',
    ], 100, 305, 'body', 48)}`;

  return [
    slide('An intentional rest-pose overlap', 'Two named parts share volume in the authored model.', modelDiagram, 1),
    slide('The unignored pair is diagnosed', 'The failure below is captured from the local CAD mechanism checker.', beforePanel, 2),
    slide('Ignore the pair at rest only', 'The same validator reruns with the explicit symmetric pair exclusion.', afterPanel, 3),
    slide('Keep the evidence scope explicit', 'Validation, motion coverage, simulation and acceptance are separate claims.', scope, 4),
  ];
}

async function runCase(name: string, ignored: boolean, sweepBudget = SWEEP_BUDGET): Promise<CaseResult> {
  const session = new CaptureSession();
  const kcad = createModelingApi({ session });
  const arm = kcad.assembly(name);
  arm.part('a', kcad.box(30, 30, 10))
    .connector('m', { type: 'frame', origin: { kind: 'vec3', value: [15, 15, 5] } });
  arm.part('b', kcad.box(30, 30, 10).translate(10, 10, 5))
    .connector('m', { type: 'frame', origin: { kind: 'vec3', value: [15, 15, 5] } });
  arm.mate('fix', 'a.m', 'b.m', 'fastened');
  if (ignored) await arm.solvedModel({}, { ignore: [['a', 'b']], validate: 'off' });

  const result = await checkMechanismTruth(arm, { sweepBudget });
  return {
    mechanism: result.mechanism,
    sweepChecked: result.coverage?.sweep ?? false,
    failures: result.failures.map(({ code, message, severity }) => ({ code, message, severity })),
  };
}

async function main(): Promise<void> {
  await mkdir(OUTPUT_DIR, { recursive: true });
  await initOcct();
  const before = await runCase('overlap-unignored', false);
  const after = await runCase('overlap-ignored', true);
  const afterFullSweep = await runCase('overlap-ignored-full-sweep', true, 1_000_000);
  const beforeRest = before.failures.find((item) => item.code === 'mechanism.rest-interpenetration');
  const afterCodes = after.failures.map((item) => item.code);
  if (beforeRest === undefined) throw new Error('Expected an unignored rest-pose penetration diagnostic.');
  if (afterCodes.includes('mechanism.rest-interpenetration')) throw new Error('Ignored pair still has a rest-pose penetration diagnostic.');
  if (after.sweepChecked) throw new Error('A zero sweep budget unexpectedly reports checked travel coverage.');
  if (!afterCodes.includes('mechanism.ignored-rest-overlap')) throw new Error('Ignored overlap warning is missing.');
  if (!afterFullSweep.sweepChecked || afterFullSweep.mechanism !== 'unverified' || !afterFullSweep.failures.some((item) => item.code === 'mechanism.ignored-rest-overlap')) {
    throw new Error('A completed sweep must not certify an ignored physical overlap.');
  }

  const sourcePath = fileURLToPath(import.meta.url);
  const sourceText = await readFile(sourcePath, 'utf8');
  const report = {
    checkedAt: new Date().toISOString(),
    invocation: 'npx tsx docs/demos/rest-contact-ignore-1271/capture-demo.mts',
    source: 'docs/demos/rest-contact-ignore-1271/capture-demo.mts',
    sourceSha256: createHash('sha256').update(sourceText).digest('hex'),
    scenario: {
      parts: ['a', 'b'],
      shape: '30 × 30 × 10 mm boxes',
      partBAuthoredTranslationMm: [10, 10, 5],
      mate: 'fastened',
      ignoredPairsAfter: [['a', 'b']],
    },
    settings: { sweepBudget: SWEEP_BUDGET, simulationSteps: 0 },
    results: { before, after, afterFullSweep },
    assertions: {
      baselineRestPenetrationReported: true,
      ignoredRestPenetrationSuppressed: true,
      afterTravelSweepChecked: false,
      completedSweepLeavesIgnoredOverlapUnverified: true,
    },
    scope: {
      validation: 'Direct local checkMechanismTruth calls on the authored CAD assembly.',
      motion: 'The articulated sweep was forced off with sweepBudget 0; this does not certify joint travel.',
      simulation: 'No physics integration or motion simulation was run.',
      deployment: 'Not deployed; branch-local evidence only.',
      hardware: 'No physical hardware was used or accepted.',
    },
  };
  await writeFile(join(OUTPUT_DIR, 'results.json'), `${JSON.stringify(report, null, 2)}\n`);

  const tempDir = await mkdtemp(join(tmpdir(), 'kernelcad-rest-contact-ignore-'));
  try {
    const imagePaths: string[] = [];
    for (const [index, svg] of makeSlides(before, after, beforeRest, afterCodes).entries()) {
      const imagePath = join(tempDir, `slide-${index + 1}.png`);
      await sharp(Buffer.from(svg)).png().toFile(imagePath);
      imagePaths.push(imagePath);
    }
    const concatPath = join(tempDir, 'slides.txt');
    const concatEntry = (path: string) => `file '${path.replaceAll("'", "'\\''")}'`;
    const secondsPerSlide = DURATION_S / imagePaths.length;
    const concatText = imagePaths.map((path) => `${concatEntry(path)}\nduration ${secondsPerSlide}`).join('\n');
    await writeFile(concatPath, `${concatText}\n${concatEntry(imagePaths.at(-1)!)}\n`);
    const videoPath = join(OUTPUT_DIR, 'demo.mp4');
    const ffmpegArgs = [
      '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', concatPath,
      '-t', String(DURATION_S), '-vf', `fps=${FPS},format=yuv420p`,
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '22', '-movflags', '+faststart', videoPath,
    ];
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
      source: 'docs/demos/rest-contact-ignore-1271/capture-demo.mts',
      invocation: 'npx tsx docs/demos/rest-contact-ignore-1271/capture-demo.mts',
      results: 'docs/demos/rest-contact-ignore-1271/results.json',
      video: {
        ffmpegArgs: ffmpegArgs.map((arg) =>
          arg === concatPath ? '<temporary-slides.txt>' : arg === videoPath ? 'demo.mp4' : arg,
        ),
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
