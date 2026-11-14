// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Build a text replay of the recorded `kernelcad validate` output in before.txt and after.txt.
// Run: node docs/demos/coupled-physics-rest-20261114/make-video.mjs
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const HERE = dirname(new URL(import.meta.url).pathname);
// Slides are regenerable; keep them out of the repository.
const FRAMES = process.env.FRAMES_DIR || mkdtempSync(join(tmpdir(), 'coupled-physics-rest-frames-'));
const WIDTH = 1920;
const HEIGHT = 1080;
const INK = '#18212b';
const MUTED = '#52606d';
const WARN = '#a35a00';
const PASS = '#167447';
const MODEL = 'examples/robot-arm/skill-built-supported-arm.kcad.ts';

mkdirSync(FRAMES, { recursive: true });

/** Reduce a recorded CLI transcript to the facts the slides show. */
const parse = file => {
  const raw = readFileSync(join(HERE, file), 'utf8');
  const codes = [...raw.matchAll(/^\s*\[ERROR\] (\S+)$/gm)].map(m => m[1]);
  const residual = raw.match(/scalar coupling '([^']+)' → '([^']+)': maximum residual ([\d.]+°) at ([^,]+), across (\d+) coordinate checks/);
  return {
    failureCount: Number(raw.match(/will not work as built \((\d+) failures\)/)?.[1]),
    exitCode: Number(raw.match(/^exit=(\d+)$/m)?.[1]),
    codes,
    couplingResidual: residual === null
      ? null
      : { source: residual[1], driven: residual[2], residual: residual[3], sample: residual[4], coordinateChecks: Number(residual[5]) },
  };
};
const before = parse('before.txt');
const after = parse('after.txt');

const escapeXml = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;');
const text = (value, x, y, size, color = INK, weight = 400, family = 'DejaVu Sans') =>
  `<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${color}">${escapeXml(value)}</text>`;
const mono = (value, x, y, size, color = INK, weight = 400) => text(value, x, y, size, color, weight, 'DejaVu Sans Mono');
const background = (title, subtitle, slideNo) => `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#ffffff"/>
  ${text(title, 100, 100, 52, INK, 700)}
  ${text(subtitle, 102, 150, 26, MUTED)}
  <line x1="100" y1="${HEIGHT - 92}" x2="${WIDTH - 100}" y2="${HEIGHT - 92}" stroke="#d6dce1" stroke-width="2"/>
  ${text('Text replay of recorded local CLI output · not a renderer capture · the example stays "broken" in both runs', 100, HEIGHT - 48, 19, MUTED)}
  ${text(String(slideNo).padStart(2, '0'), WIDTH - 132, HEIGHT - 48, 19, MUTED)}
`;
const panel = '<rect x="100" y="230" width="1720" height="600" rx="18" fill="#f5f7f9" stroke="#d6dce1" stroke-width="2"/>';
const countCodes = codes => Object.entries(codes.reduce((acc, code) => ({ ...acc, [code]: (acc[code] ?? 0) + 1 }), {}))
  .map(([code, n]) => `${n} × ${code}`);
const resultSlide = (title, subtitle, slideNo, result, restPose, verdict, verdictColor) => `${background(title, subtitle, slideNo)}
    ${panel}
    ${mono(`$ kernelcad validate ${MODEL} --include-interference`, 160, 310, 24, MUTED)}
    ${mono(`MECHANISM BROKEN (${result.failureCount} failures) · exit ${result.exitCode}`, 160, 375, 28, INK)}
    ${mono(`physics rest pose   left-curl ${restPose.left}   right-curl ${restPose.right}`, 160, 450, 28, INK, 700)}
    ${result.couplingResidual === null
      ? mono('mechanism.coupling-residual   not reported', 160, 520, 28, PASS, 700)
      : mono(`mechanism.coupling-residual   ${result.couplingResidual.residual} at ${result.couplingResidual.sample} (tolerance 5°)`, 160, 520, 28, WARN, 700)}
    ${text(`Other failures, unchanged: ${countCodes(result.codes.filter(c => c !== 'mechanism.coupling-residual')).join(', ')}`, 160, 640, 24, MUTED)}
    ${text(verdict, 160, 760, 30, verdictColor, 700)}
  </svg>`;

const slideSvgs = [
  `${background('Mechanism physics · rest pose of a coupled mate', 'Regression: a driven mate must start from the same coordinate as its source.', 1)}
    ${panel}
    ${text('MODEL', 160, 330, 25, MUTED, 700)}
    ${mono("arm.mate('left-curl', ..., 'revolute', { pose: gripDeg })   // gripDeg = 10", 160, 405, 28, INK, 700)}
    ${mono("arm.coupleMates('right-curl', { source: 'left-curl', ratio: -1 })", 160, 460, 28, INK, 700)}
    ${text('The physics model starts every independent joint at coordinate 0, not at the authored pose.', 160, 570, 30, INK)}
    ${text('Expected: right-curl = −1 × left-curl in every pose that the physics check sets.', 160, 630, 30, INK)}
    ${mono(MODEL, 160, 730, 26, MUTED)}
  </svg>`,
  resultSlide('Before · origin/develop cd3eac756', 'The driven mate came from the authored source pose; the source stayed at 0.', 2, before,
    { left: '0°', right: '−10°' },
    'Wrong: the release check started with the coupling already 10° apart.', WARN),
  resultSlide('After · the driven mate follows its source coordinate', 'Rest and swept poses use the same rule. Offsets and coupling chains are applied.', 3, after,
    { left: '0°', right: '0°' },
    'Correct: the coupling holds at rest; no false coupling-residual failure.', PASS),
  `${background('Verification · local regression', 'tests/integration/physics-loop/coupledRestPosePhysics.test.ts', 4)}
    ${panel}
    ${text('PASS', 160, 340, 46, PASS, 700)}
    ${text('2 / 2 coupled-pose tests · both fail without the fix', 160, 420, 40, INK, 700)}
    ${text('Coupled gear and ball/scalar coupling suites: 6 tests passed · typecheck: OK · eslint: OK', 160, 495, 30, INK)}
    ${text('Scope: the poses the physics check sets. The gate still fails this example in both runs.', 160, 610, 26, MUTED)}
    ${text('Rest pose values: the qpos passed to the solver, recorded with a local setPose probe on this example.', 160, 665, 26, MUTED)}
    ${text('No deployment or hardware acceptance claim.', 160, 720, 26, MUTED)}
  </svg>`,
];

const framePaths = [];
for (let index = 0; index < slideSvgs.length; index++) {
  const pngPath = join(FRAMES, `slide-${String(index).padStart(2, '0')}.png`);
  await sharp(Buffer.from(slideSvgs[index])).png().toFile(pngPath);
  framePaths.push(pngPath);
}
await sharp(framePaths[2]).png().toFile(join(HERE, 'poster.png'));

const videoPath = join(HERE, 'demo.mp4');
execFileSync(process.env.FFMPEG || 'ffmpeg', [
  '-y', '-loglevel', 'error', '-framerate', '1/3', '-start_number', '0', '-i', join(FRAMES, 'slide-%02d.png'),
  '-vf', 'fps=24,format=yuv420p', '-c:v', 'libx264', '-crf', '25',
  '-movflags', '+faststart', videoPath,
], { stdio: 'inherit' });

const sha256 = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const probe = JSON.parse(execFileSync(process.env.FFPROBE || 'ffprobe', [
  '-v', 'error', '-show_entries', 'format=duration,size', '-of', 'json', videoPath,
], { encoding: 'utf8' }));
const evidence = {
  type: 'text replay of recorded local CLI output; not a renderer capture',
  model: MODEL,
  invocation: `npx tsx src/agent/cli/index.ts validate ${MODEL} --include-interference --epsilon 0.01`,
  before: { source: 'origin/develop cd3eac756 (mechanismTruthPhysics.ts fix reverted)', file: 'before.txt', sha256: sha256(join(HERE, 'before.txt')), ...before },
  after: { source: 'this branch', file: 'after.txt', sha256: sha256(join(HERE, 'after.txt')), ...after },
  verification: {
    regressionTest: 'npx vitest run tests/integration/physics-loop/coupledRestPosePhysics.test.ts — 2/2 passed; both fail with the fix reverted',
    mechanism: 'broken in both runs; the example also has joint-mesh-gap and mate-gap failures that this change does not touch',
  },
  slides: { count: framePaths.length, secondsEach: 3, tracked: false },
  video: {
    file: 'demo.mp4',
    sha256: sha256(videoPath),
    durationSeconds: Number(probe.format.duration),
    bytes: Number(probe.format.size),
    encoder: 'libx264, CRF 25, 24 fps, yuv420p',
  },
};
writeFileSync(join(HERE, 'video-evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`frames: ${FRAMES}`);
