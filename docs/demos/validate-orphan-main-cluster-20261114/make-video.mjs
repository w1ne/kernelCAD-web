// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Build a text replay of the recorded `kernelcad validate` output in before.json and after.json.
// Run: node docs/demos/validate-orphan-main-cluster-20261114/make-video.mjs
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const HERE = dirname(new URL(import.meta.url).pathname);
// Slides are regenerable; keep them out of the repository.
const FRAMES = process.env.FRAMES_DIR || mkdtempSync(join(tmpdir(), 'validate-orphan-frames-'));
const WIDTH = 1920;
const HEIGHT = 1080;
const INK = '#18212b';
const MUTED = '#52606d';
const WARN = '#a35a00';
const PASS = '#167447';
const MODEL = 'examples/exploded/clamshell-table-first.kcad.ts';

mkdirSync(FRAMES, { recursive: true });
const before = JSON.parse(readFileSync(join(HERE, 'before.json'), 'utf8'));
const after = JSON.parse(readFileSync(join(HERE, 'after.json'), 'utf8'));

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
  ${text('Text replay of recorded local CLI output · not a renderer capture · mechanism status unverified', 100, HEIGHT - 48, 19, MUTED)}
  ${text(String(slideNo).padStart(2, '0'), WIDTH - 132, HEIGHT - 48, 19, MUTED)}
`;
const panel = '<rect x="100" y="230" width="1720" height="600" rx="18" fill="#f5f7f9" stroke="#d6dce1" stroke-width="2"/>';
const diagnosticRows = (result, y0) => result.diagnostics
  .map((d, i) => mono(`${d.code.padEnd(24)} ${d.partName}`, 160, y0 + i * 62, 34, WARN, 700))
  .join('\n');
const mainHint = result => {
  const match = result.diagnostics.map(d => d.hint.match(/main mechanism \(contains '([^']+)'\)/)).find(Boolean);
  return match ? `Hint names the main mechanism: contains '${match[1]}'` : 'No orphan diagnostic; the hinge cluster is the main mechanism.';
};
const resultSlide = (title, subtitle, slideNo, result, verdict, verdictColor) => `${background(title, subtitle, slideNo)}
    ${panel}
    ${mono(`$ kernelcad validate ${MODEL} --json`, 160, 310, 26, MUTED)}
    ${mono(`status: ${result.status} · parts: ${result.partCount} · joints: ${result.jointCount} · diagnostics: ${result.diagnostics.length}`, 160, 380, 28, INK)}
    ${diagnosticRows(result, 470)}
    ${text(mainHint(result), 160, 700, 28, INK)}
    ${text(verdict, 160, 770, 30, verdictColor, 700)}
  </svg>`;

const slideSvgs = [
  `${background('Assembly validate · main mechanism selection', 'Regression: an unmated part declared first must not make the mated cluster an orphan.', 1)}
    ${panel}
    ${text('MODEL ORDER', 160, 330, 25, MUTED, 700)}
    ${text('table (unmated)  →  base  →  lid', 160, 405, 42, INK, 700)}
    ${text('Mate: base–lid · revolute hinge · limits −15° to 135°', 160, 490, 30, MUTED)}
    ${text('Expected: one disconnected body, the table. The hinge pair is the mechanism.', 160, 610, 30, INK)}
    ${mono(MODEL, 160, 700, 26, MUTED)}
  </svg>`,
  resultSlide('Before · origin/develop cd3eac756', 'The component of the first declared part was always the main mechanism.', 2, before,
    'Wrong: the two mated hinge parts are reported as orphans of the lone table.', WARN),
  resultSlide('After · largest connected component is the main mechanism', 'Ties keep declaration order. Same result as with the table declared last.', 3, after,
    'Correct: only the unmated table is reported.', PASS),
  `${background('Verification · local regression', 'src/modeling/mates/validator.test.ts', 4)}
    ${panel}
    ${text('PASS', 160, 340, 46, PASS, 700)}
    ${text('28 / 28 validator tests · 2 new cases fail without the fix', 160, 420, 40, INK, 700)}
    ${text('Related mate suites: 31 files, 344 tests passed · typecheck: OK · eslint: OK', 160, 495, 30, INK)}
    ${text('Scope: validate diagnostics only. The status stays "warning" for the unmated table.', 160, 610, 26, MUTED)}
    ${text('No simulation, deployment, or hardware acceptance claim.', 160, 665, 26, MUTED)}
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
const summary = result => ({
  status: result.status,
  diagnostics: result.diagnostics.map(d => ({ code: d.code, partName: d.partName })),
});
const evidence = {
  type: 'text replay of recorded local CLI output; not a renderer capture',
  model: MODEL,
  invocation: `npx tsx src/agent/cli/index.ts validate ${MODEL} --json`,
  before: { source: 'origin/develop cd3eac756 (validator.ts fix reverted)', file: 'before.json', sha256: sha256(join(HERE, 'before.json')), ...summary(before) },
  after: { source: 'this branch', file: 'after.json', sha256: sha256(join(HERE, 'after.json')), ...summary(after) },
  verification: {
    unitTest: 'npx vitest run src/modeling/mates/validator.test.ts — 28/28 passed; the 2 new cases fail with the fix reverted',
    mechanism: 'unverified; validate ran without --include-interference',
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
