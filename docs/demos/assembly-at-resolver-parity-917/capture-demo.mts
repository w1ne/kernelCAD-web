// SPDX-License-Identifier: MIT
// Build both supported assembly input paths, measure their BREP bounds, and
// render a short local-verification demo from those measured results.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import type { FeatureLowerer } from '../../../src/kernel/backends/backend';
import { initOcct, type OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { isSceneBackend, type SceneBackend } from '../../../src/kernel/backends/sceneBackend';
import { OcctLowerer } from '../../../src/modeling/backends/occt/occtLowerer';
import { RecomputeEngine } from '../../../src/modeling/compute/recomputeEngine';
import { runScript } from '../../../src/modeling/runtime/runScript';
import type { FeatureRecord } from '../../../src/shared/intent/featureRecord';

const OUT = dirname(fileURLToPath(import.meta.url));
const MODEL = join(OUT, 'model.kcad.ts');
const WIDTH = 1280;
const HEIGHT = 720;
const FPS = 20;
const DURATION = 10;
const EPSILON = 1e-6;

type Bounds = { min: [number, number, number]; max: [number, number, number] };
type PartBounds = Record<string, Bounds>;

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function boundsForScene(scene: SceneBackend): PartBounds {
  const output: PartBounds = {};
  for (const part of scene.parts) {
    const box = (part.shape as OcctBackend).clone().applyTransform(part.worldTransform).boundingBox();
    output[part.name] = {
      min: [box.min[0], box.min[1], box.min[2]],
      max: [box.max[0], box.max[1], box.max[2]],
    };
  }
  return output;
}

function closeBounds(a: Bounds, b: Bounds): boolean {
  return [...a.min, ...a.max].every((value, i) => Math.abs(value - [...b.min, ...b.max][i]) <= EPSILON);
}

async function buildBounds(
  records: readonly FeatureRecord[],
  paramTable: Awaited<ReturnType<typeof runScript>>['paramTable'],
  resolverOnly: boolean,
): Promise<PartBounds> {
  const occt = new OcctLowerer();
  const lowerer: FeatureLowerer = resolverOnly
    ? {
        target: occt.target,
        supports: occt.supports,
        lower: (record, inputs) => occt.lower(
          record,
          record.kind === 'assemblyModel' || record.kind === 'solvedAssembly'
            ? { ...inputs, paramTable: undefined }
            : inputs,
        ),
      }
    : occt;
  const result = await new RecomputeEngine(lowerer).run(records, { paramTable });
  const errors = result.diagnostics.filter((item) => item.severity === 'error');
  assert(errors.length === 0, `Recompute failed: ${JSON.stringify(errors)}`);
  const scene = result.shapes.get(records[records.length - 1]!.id);
  assert(isSceneBackend(scene), 'The model did not build to an assembly scene.');
  return boundsForScene(scene);
}

function assertExpected(bounds: PartBounds, mountMinX: number): void {
  const dx = mountMinX - 90;
  const expectedMount: Bounds = { min: [mountMinX, -10, -5], max: [mountMinX + 20, 10, 5] };
  const expectedValve: Bounds = { min: [97 + dx, -8, 5], max: [109 + dx, -2, 13] };
  assert(closeBounds(bounds.mount!, expectedMount), `Unexpected mount bounds: ${JSON.stringify(bounds.mount)}`);
  assert(closeBounds(bounds.valve!, expectedValve), `Unexpected valve bounds: ${JSON.stringify(bounds.valve)}`);
}

function esc(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function diagram(bounds: PartBounds, startX: number): string {
  const scale = 4;
  const x = (value: number) => 170 + (value - startX) * scale;
  const z = (value: number) => 410 - (value + 15) * scale;
  const rect = (part: Bounds, fill: string) => `<rect x="${x(part.min[0])}" y="${z(part.max[2])}" width="${(part.max[0] - part.min[0]) * scale}" height="${(part.max[2] - part.min[2]) * scale}" rx="7" fill="${fill}" stroke="#1f3552" stroke-width="3"/>`;
  const mountLabel = `<text x="${x((bounds.mount!.min[0] + bounds.mount!.max[0]) / 2)}" y="${z(0) + 6}" text-anchor="middle" class="part">mount</text>`;
  const valveLabel = `<text x="${x((bounds.valve!.min[0] + bounds.valve!.max[0]) / 2)}" y="${z(9) + 6}" text-anchor="middle" class="part">valve</text>`;
  return `<g>${rect(bounds.mount!, '#cbd6e6')}${rect(bounds.valve!, '#72a4ef')}${mountLabel}${valveLabel}</g>`;
}

function slide(title: string, section: string, lines: readonly string[], note: string, scene?: { bounds: PartBounds; startX: number }): string {
  const codeX = scene === undefined ? 82 : 620;
  const code = lines.map((line, i) => `<text x="${codeX}" y="${278 + i * 48}" class="code">${esc(line)}</text>`).join('\n');
  const sectionX = scene === undefined ? 92 : 620;
  const geometry = scene === undefined ? '' : `
    <rect x="100" y="176" width="480" height="302" rx="16" fill="#fff" stroke="#d6deea" stroke-width="2"/>
    ${diagram(scene.bounds, scene.startX)}
    <text x="340" y="506" text-anchor="middle" class="small">front view · boxes from measured scene bounds</text>
  `;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
    <rect width="${WIDTH}" height="${HEIGHT}" fill="#f3f6fb"/><rect width="${WIDTH}" height="9" fill="#2868d7"/>
    <text x="64" y="70" class="title">${esc(title)}</text>
    <text x="66" y="112" class="subtitle">Param-driven mate placement · dimensions in millimetres</text>
    <rect x="64" y="158" width="1152" height="372" rx="18" fill="#fff" stroke="#d6deea" stroke-width="2"/>
    <text x="${sectionX}" y="208" class="section">${esc(section)}</text>
    ${geometry}
    <g>${code}</g>
    <text x="70" y="588" class="note">${esc(note)}</text>
    <rect x="70" y="630" width="302" height="34" rx="17" fill="#e4ecfb"/>
    <text x="88" y="653" class="tag">LOCAL MODEL BUILD · BREP BOUNDS</text>
    <text x="1210" y="653" text-anchor="end" class="footer">no physics simulation · no deployment or hardware claim</text>
    <style>
      .title{font:700 38px Arial,sans-serif;fill:#17243a}.subtitle{font:20px Arial,sans-serif;fill:#5b6a81}
      .section{font:700 16px Arial,sans-serif;fill:#475a75;letter-spacing:1px}.code{font:19px 'DejaVu Sans Mono',monospace;fill:#19375f}
      .note{font:700 21px Arial,sans-serif;fill:#17243a}.tag{font:700 12px Arial,sans-serif;fill:#244a83;letter-spacing:.4px}
      .footer,.small{font:14px Arial,sans-serif;fill:#5b6a81}.part{font:700 14px Arial,sans-serif;fill:#17243a}
    </style>
  </svg>`;
}

async function renderVideo(initial: PartBounds, edited: PartBounds): Promise<{ args: string[]; codec: string; durationSeconds: number }> {
  const tempDir = await mkdtemp(join(tmpdir(), 'kernelcad-at-resolver-parity-'));
  const videoPath = join(OUT, 'demo.mp4');
  try {
    const frames = [
      slide('A mate positions the authored parts', 'MODEL INPUT · TWO PARAMETER-DRIVEN `at:` VALUES', [
        "mount: at [mountX, 0, 0] · default 100 mm",
        "valve: at [0, 0, valveLift] · default 27 mm",
        "mate('fastened', 'mount.seat', 'valve.base')",
      ], 'The part shape and its mate connector must use the same resolved offset.'),
      slide('The resolver-only path matches', 'DEFAULT PARAMETERS · STANDARD VS RECORD RESOLVER', [
        `mount X ${initial.mount!.min[0]}..${initial.mount!.max[0]} · Z ${initial.mount!.min[2]}..${initial.mount!.max[2]} mm`,
        `valve X ${initial.valve!.min[0]}..${initial.valve!.max[0]} · Z ${initial.valve!.min[2]}..${initial.valve!.max[2]} mm`,
        'standard = resolver-only · PASS',
      ], 'Front-view diagram is scaled from the measured OCCT bounding boxes.', { bounds: initial, startX: 80 }),
      slide('Parameter edits keep the parts aligned', 'EDIT · mountX 100 → 60 mm · valveLift 27 → 40 mm', [
        `mount X ${edited.mount!.min[0]}..${edited.mount!.max[0]} · Z ${edited.mount!.min[2]}..${edited.mount!.max[2]} mm`,
        `valve X ${edited.valve!.min[0]}..${edited.valve!.max[0]} · Z ${edited.valve!.min[2]}..${edited.valve!.max[2]} mm`,
        'standard = resolver-only · PASS',
      ], 'The authored valve offset is superseded by the fastened mate in both paths.', { bounds: edited, startX: 40 }),
      slide('Regression evidence is local and bounded', 'FOCUSED VERIFY · mateAtPlacement.test.ts', [
        '2 input paths × model() and solvedModel()',
        '26 integration checks pass after the repair',
        'simulation, deployment and hardware: not checked',
      ], 'This validates local geometry lowering only; no physics run or hosted build was performed.'),
    ];
    const imagePaths: string[] = [];
    for (const [i, frame] of frames.entries()) {
      const imagePath = join(tempDir, `slide-${i + 1}.png`);
      await sharp(Buffer.from(frame)).png().toFile(imagePath);
      imagePaths.push(imagePath);
    }
    const concatPath = join(tempDir, 'slides.txt');
    const list = imagePaths.map((path) => `file '${path.replaceAll("'", "'\\''")}'\nduration ${DURATION / frames.length}`).join('\n');
    await writeFile(concatPath, `${list}\nfile '${imagePaths.at(-1)!}'\n`);
    const ffmpegArgs = [
      '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', concatPath,
      '-t', String(DURATION), '-vf', `fps=${FPS},format=yuv420p`, '-c:v', 'libx264',
      '-preset', 'medium', '-crf', '22', '-movflags', '+faststart', videoPath,
    ];
    execFileSync('ffmpeg', ffmpegArgs, { stdio: 'pipe' });
    const probe = JSON.parse(execFileSync('ffprobe', [
      '-v', 'error', '-show_entries', 'stream=codec_name,duration', '-of', 'json', videoPath,
    ], { encoding: 'utf8' })) as { streams?: Array<{ codec_name?: string; duration?: string }> };
    const stream = probe.streams?.[0];
    assert(stream?.codec_name === 'h264', `Unexpected video codec: ${JSON.stringify(probe)}`);
    const recordedArgs = ffmpegArgs.map((arg) => arg === concatPath ? '<temporary-slides.txt>' : arg === videoPath ? 'demo.mp4' : arg);
    return { args: recordedArgs, codec: stream.codec_name, durationSeconds: Number(stream.duration) };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  await mkdir(OUT, { recursive: true });
  await initOcct();
  const source = await readFile(MODEL, 'utf8');
  const { records, paramTable } = await runScript({ code: source, fileName: MODEL });

  const initialStandard = await buildBounds(records, paramTable, false);
  const initialResolverOnly = await buildBounds(records, paramTable, true);
  assertExpected(initialStandard, 90);
  for (const name of ['mount', 'valve']) {
    assert(closeBounds(initialStandard[name]!, initialResolverOnly[name]!), `${name} differs in the resolver-only path.`);
  }

  paramTable.set('mountX', 60);
  paramTable.set('valveLift', 40);
  const editedStandard = await buildBounds(records, paramTable, false);
  const editedResolverOnly = await buildBounds(records, paramTable, true);
  assertExpected(editedStandard, 50);
  for (const name of ['mount', 'valve']) {
    assert(closeBounds(editedStandard[name]!, editedResolverOnly[name]!), `${name} differs after the parameter edit.`);
  }

  const video = await renderVideo(initialStandard, editedStandard);
  const verification = {
    checkedAt: new Date().toISOString(),
    invocation: 'npx tsx docs/demos/assembly-at-resolver-parity-917/capture-demo.mts',
    fixture: 'docs/demos/assembly-at-resolver-parity-917/model.kcad.ts',
    fixtureSha256: createHash('sha256').update(source).digest('hex'),
    comparison: 'standard parameter table vs assembly lowerer with resolveRecord and no paramTable',
    initial: { parameters: { mountX: 100, valveLift: 27 }, standard: initialStandard, resolverOnly: initialResolverOnly },
    edited: { parameters: { mountX: 60, valveLift: 40 }, standard: editedStandard, resolverOnly: editedResolverOnly },
    checks: {
      localModelBuild: true,
      measuredBrepBoundsMatch: true,
      defaultAndEditedParameters: true,
      physicsSimulation: false,
      deployedBehavior: false,
      hardwareAcceptance: false,
    },
    video: {
      ffmpegArgs: video.args,
      codec: video.codec,
      width: WIDTH,
      height: HEIGHT,
      frameRate: `${FPS}/1`,
      durationSeconds: video.durationSeconds,
    },
  };
  await writeFile(join(OUT, 'verification.json'), `${JSON.stringify(verification, null, 2)}\n`);
}

await main();
