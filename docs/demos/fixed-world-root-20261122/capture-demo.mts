// SPDX-License-Identifier: MIT
// Capture the real local script, solver and OCCT bounds before making the video.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { runScript } from '../../../src/composition/runScript';
import type { Assembly } from '../../../src/modeling/capture/assembly';
import { reviewJointTopology } from '../../../src/modeling/mates/jointTopology';
import { solveMates } from '../../../src/modeling/mates/solver';
import { RecomputeEngine } from '../../../src/modeling/compute/recomputeEngine';
import { OcctLowerer } from '../../../src/modeling/backends/occt/occtLowerer';
import { initOcct, type OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { isSceneBackend } from '../../../src/kernel/backends/sceneBackend';

const OUT = dirname(fileURLToPath(import.meta.url));
const MODEL = join(OUT, 'model.kcad.ts');
const WIDTH = 1280, HEIGHT = 720, FPS = 20, SECONDS = 12;
const hash = (text: string) => createHash('sha256').update(text).digest('hex');
type Bounds = { min: readonly number[]; max: readonly number[] };
type Measurement = { travelMm: number; diagnosticCodes: string[]; solveStatus: string; positions: Record<string, readonly number[]>; bounds: Record<string, Bounds> };
function check(ok: boolean, message: string): asserts ok { if (!ok) throw new Error(message); }
const near = (a: readonly number[], b: readonly number[]) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]!) < 1e-6);

async function measure(code: string, travelMm: number): Promise<Measurement> {
  const run = await runScript({ code, fileName: MODEL });
  run.paramTable.set('travelMm', travelMm);
  const arm = [...run.session.assemblies.values()][0] as Assembly;
  const solved = await solveMates(arm);
  const result = await new RecomputeEngine(new OcctLowerer()).run(run.records, { paramTable: run.paramTable });
  check(!result.diagnostics.some(d => d.severity === 'error'), JSON.stringify(result.diagnostics));
  const scene = result.shapes.get(run.records.at(-1)!.id);
  check(isSceneBackend(scene), 'Expected a lowered assembly scene');
  const bounds = Object.fromEntries(scene.parts.map(part => [part.name,
    (part.shape as OcctBackend).clone().applyTransform(part.worldTransform).boundingBox()]));
  return { travelMm, solveStatus: solved.status, diagnosticCodes: reviewJointTopology(arm).diagnostics.map(d => d.code),
    positions: Object.fromEntries([...solved.poses].map(([name, t]) => [name, t.point([0, 0, 0])])), bounds };
}
function esc(text: string): string { return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'); }
function frontView(m: Measurement): string {
  const x = (mm: number) => 160 + mm * 8, z = (mm: number) => 470 - mm * 8;
  const grid = [-10, 0, 10, 20, 30, 40, 50].map(mm => `<line x1="${x(mm)}" y1="265" x2="${x(mm)}" y2="482" stroke="#dce3ec"/><text x="${x(mm)}" y="510" text-anchor="middle" class="small">${mm}</text>`).join('');
  const bodies = ['base', 'slide'].map(name => {
    const b = m.bounds[name]!;
    return `<rect x="${x(b.min[0]!)}" y="${z(b.max[2]!)}" width="${(b.max[0]! - b.min[0]!) * 8}" height="${(b.max[2]! - b.min[2]!) * 8}" fill="${name === 'base' ? '#b9c8da' : '#4076cc'}" stroke="#263e5d" stroke-width="2"/><text x="${x((b.min[0]! + b.max[0]!) / 2)}" y="${z((b.min[2]! + b.max[2]!) / 2) + 6}" text-anchor="middle" class="part">${name}</text>`;
  }).join('');
  return `${grid}<line x1="80" y1="482" x2="590" y2="482" stroke="#7b8da8"/>${bodies}<text x="340" y="548" text-anchor="middle" class="small">X in mm · front projection of measured BREP bounds</text>`;
}
function frame(title: string, m: Measurement, lines: string[], note: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#f4f7fb"/><rect width="${WIDTH}" height="8" fill="#235dc0"/>
  <text x="55" y="68" class="title">${esc(title)}</text>
  <text x="57" y="110" class="subtitle">Two-body placement fixture · slide declared first, base declared second</text>
  <rect x="55" y="145" width="1170" height="430" rx="16" fill="white" stroke="#d9e2ef"/>
  <text x="82" y="190" class="heading">ACTUAL LOCAL GEOMETRY</text>${frontView(m)}
  <text x="650" y="190" class="heading">SOURCE AND MEASURED RESULT</text>
  ${lines.map((line, i) => `<text x="650" y="245" transform="translate(0 ${i * 45})" class="code">${esc(line)}</text>`).join('')}
  <text x="58" y="615" class="note">${esc(note)}</text>
  <text x="58" y="665" class="footer">Local solver + OCCT build · no load, physics, deployed-runtime or hardware acceptance claim</text>
  <style>.title{font:700 36px Arial;fill:#162840}.subtitle{font:20px Arial;fill:#516982}.heading{font:700 15px Arial;fill:#516982;letter-spacing:1px}.code{font:18px 'DejaVu Sans Mono';fill:#183957}.small{font:14px Arial;fill:#516982}.part{font:700 16px Arial;fill:#10243e}.note{font:700 21px Arial;fill:#162840}.footer{font:16px Arial;fill:#516982}</style></svg>`;
}

await initOcct();
const source = await readFile(MODEL, 'utf8');
const anchorLine = "arm.virtualJoint('world-base', { type: 'fixed', parentFrame: 'world', childLink: 'base' });";
check(source.includes(anchorLine), 'Expected the existing virtualJoint declaration');
const undeclared = await measure(source.replace(anchorLine, ''), 5);
check(undeclared.diagnosticCodes.includes('assembly.connectivity.assumed-root'), 'Undeclared root must retain its warning');
check(near(undeclared.positions.slide!, [0, 0, 4]), 'Fallback must still ground the first part');
const poses = await Promise.all([0, 5, 15].map(travel => measure(source, travel)));
for (const m of poses) {
  check(m.solveStatus === 'solved' && m.diagnosticCodes.length === 0, JSON.stringify(m));
  check(near(m.positions.base!, [20, 0, 0]), 'The explicit base moved');
  check(near(m.bounds.base!.min, [20, 0, 0]) && near(m.bounds.base!.max, [50, 12, 4]), 'Lowered base bounds changed');
  check(near(m.positions.slide!, [20 + m.travelMm, 0, 4]), 'Solver slide pose differs');
  check(near(m.bounds.slide!.min, [20 + m.travelMm, 0, 4]), 'Lowered slide pose differs');
}
const images = [
  frame('Without a declaration, the first part is assumed fixed', undeclared,
    ['No fixed world joint declared', 'travel = 5 mm', 'slide stays at X = 0 mm', `base moves to X = ${undeclared.positions.base![0]} mm`, 'review: assumed-root'],
    'The existing fallback remains visible as a diagnostic.'),
  frame('An explicit world joint fixes the named base', poses[1]!,
    ["type: 'fixed'", "parentFrame: 'world'", "childLink: 'base'", 'base stays at X = 20 mm', 'slide moves to X = 25 mm'],
    'The existing virtualJoint API selects the same root for review, solve and geometry.'),
  frame('Travel changes while the base stays fixed', poses[2]!,
    ['travel: 0 → 5 → 15 mm', 'base X: 20 → 20 → 20 mm', 'slide X: 20 → 25 → 35 mm', 'solver = OCCT bounds', 'review diagnostics: 0'],
    'Three independently evaluated poses agree within 0.000001 mm.'),
];
for (const [i, svg] of images.entries()) await sharp(Buffer.from(svg)).png().toFile(join(OUT, `frame-${i + 1}.png`));
const list = images.map((_, i) => `file 'frame-${i + 1}.png'\nduration ${SECONDS / images.length}`).join('\n');
await writeFile(join(OUT, 'slides.txt'), `${list}\nfile 'frame-${images.length}.png'\n`);
const ffmpegArgs = ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', 'slides.txt', '-t', String(SECONDS),
  '-vf', `fps=${FPS},format=yuv420p`, '-c:v', 'libx264', '-preset', 'medium', '-crf', '22', '-movflags', '+faststart', 'demo.mp4'];
execFileSync('ffmpeg', ffmpegArgs, { cwd: OUT, stdio: 'pipe' });
const video = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_name,width,height,r_frame_rate,duration', '-of', 'json', join(OUT, 'demo.mp4')], { encoding: 'utf8' }));
check(video.streams[0]?.codec_name === 'h264' && Number(video.streams[0]?.duration) === SECONDS, 'Unexpected encoded video');
const sourceFiles = ['mates/solverRoot.ts', 'mates/jointTopology.ts', 'mates/solver.ts', 'mates/loopAdapter.ts',
  'capture/assemblyModel.ts', 'capture/assemblySolve.ts', 'capture/assemblyFeatureRecords.ts', 'backends/occt/lowerers/assembly.ts'];
const implementationHashes = Object.fromEntries(await Promise.all(sourceFiles.map(async file => [file, hash(await readFile(join(OUT, '../../../src/modeling', file), 'utf8'))])));
await writeFile(join(OUT, 'verification.json'), JSON.stringify({ checkedAt: new Date().toISOString(),
  invocation: 'npx tsx docs/demos/fixed-world-root-20261122/capture-demo.mts', sourceSha256: hash(source), generatorSha256: hash(await readFile(fileURLToPath(import.meta.url), 'utf8')), implementationHashes,
  toleranceMm: 1e-6, undeclared, declared: poses, video: { ...video.streams[0], ffmpegArgs },
  checks: { localScriptBuild: true, fixedNonFirstBase: true, solverMatchesOcct: true, undeclaredWarningRetained: true,
    physicalGuideDesign: false, loadQualification: false, physicsSimulation: false, deployedRuntime: false, hardwareAcceptance: false } }, null, 2) + '\n');
console.log('Recorded 3 declared poses, fallback diagnostic, OCCT bounds and 12-second H.264 demo.');
